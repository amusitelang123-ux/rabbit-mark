import { Op, type WhereOptions } from 'sequelize'
import { config } from '../config'
import { ERR, ORDER_STATUS_TEXT } from '../constants'
import { AppError } from '../utils/errors'
import { formatDate } from '../utils/serializers'
import { maskPhone } from '../utils/helpers'
import { getAiAdapter, aiMode } from '../adapters/ai'
import type { AiMessage as ChatMessage, AiUsage } from '../adapters/ai'
import {
  AiCallLog,
  AiConversation,
  AiMessage as AiMessageRow,
  Order,
  OrderItem,
  OrderLogistics,
  User,
} from '../models'
import { searchKnowledge } from './aiKnowledgeService'
import {
  AI_DISCLAIMER,
  AI_QUICK_QUESTIONS,
  AI_TOOLS,
  AI_WELCOME,
  buildSystemPrompt,
  toCitations,
  type AiCitation,
  type OrderSnapshot,
} from './aiPrompt'
import * as feedbackService from './feedbackService'

/**
 * 智能客服编排：
 *   知识检索 → 订单快照 → 提示词 → 模型（含工具调用）→ 落库与审计
 *
 * 关键约束：
 * - 金额/库存/订单状态只读，AI 不参与任何写操作
 * - 工具只能查当前用户自己的订单
 * - 所有输出都落 ai_messages，调用成本落 ai_call_logs
 */

const ZERO_USAGE: AiUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
const MAX_MESSAGE_LENGTH = 500
const RATE_LIMIT_PER_MINUTE = 12
const TOOL_ROUNDS = 3
const ORDER_SPECIFIC = /订单|物流|快递|单号|到哪|发货|到货|签收|催|退款进度|退到哪/

export type AiStreamEvent =
  | { type: 'meta'; conversationId: number }
  | { type: 'thinking'; text: string }
  | { type: 'delta'; text: string }
  | { type: 'tool'; name: string; label: string }
  | {
      type: 'done'
      conversationId: number
      messageId: number
      content: string
      citations: AiCitation[]
      usage: AiUsage
      grounded: boolean
      mode: 'deepseek' | 'mock'
    }
  | { type: 'error'; message: string }

export type AiEventHandler = (event: AiStreamEvent) => void

export interface ChatInput {
  userId: number
  message: string
  conversationId?: number
  orderNo?: string
  signal?: AbortSignal
  emit: AiEventHandler
}

export interface ChatOutcome {
  conversationId: number
  messageId: number
  content: string
  citations: AiCitation[]
  usage: AiUsage
  mode: 'deepseek' | 'mock'
}

interface ToolTrace {
  name: string
  arguments: string
  result: unknown
}

/** 简单的进程内限流：单用户每分钟最多 12 次提问 */
const rateBuckets = new Map<number, number[]>()

function checkRateLimit(userId: number): void {
  const now = Date.now()
  const bucket = (rateBuckets.get(userId) ?? []).filter((at) => now - at < 60_000)
  if (bucket.length >= RATE_LIMIT_PER_MINUTE) {
    throw new AppError('提问太频繁了，请稍后再试', ERR.RATE_LIMIT, 429)
  }
  bucket.push(now)
  rateBuckets.set(userId, bucket)
  if (rateBuckets.size > 5000) rateBuckets.clear()
}

function estimateCost(usage: AiUsage): string {
  const cost =
    (usage.promptTokens / 1_000_000) * config.ai.priceInPerM +
    (usage.completionTokens / 1_000_000) * config.ai.priceOutPerM
  return cost.toFixed(4)
}

async function assertBudget(): Promise<void> {
  if (aiMode().mode !== 'deepseek') return
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const spent = await AiCallLog.sum('cost', {
    where: { createdAt: { [Op.gte]: start }, status: 1 },
  })
  if (Number(spent) >= config.ai.dailyBudget) {
    throw new AppError(
      '今日 AI 客服额度已用完，请点「转人工」由客服跟进',
      ERR.AI_BUDGET_EXCEEDED,
      429,
    )
  }
}

function extractOrderNo(message: string): string | null {
  const match = message.match(/[A-Za-z]{0,3}\d{10,32}/)
  return match ? match[0] : null
}

function normalizeMessage(raw: string): string {
  const message = raw.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim()
  if (!message) throw new AppError('请输入要咨询的问题')
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new AppError(`单条消息不能超过 ${MAX_MESSAGE_LENGTH} 字`)
  }
  return message
}

async function resolveConversation(input: ChatInput, message: string): Promise<AiConversation> {
  if (input.conversationId) {
    const conversation = await AiConversation.findOne({
      where: { id: input.conversationId, userId: input.userId },
    })
    if (!conversation) {
      throw new AppError('会话不存在或已失效', ERR.AI_CONVERSATION_NOT_FOUND, 404)
    }
    if (input.orderNo && !conversation.orderNo) {
      conversation.orderNo = input.orderNo
      await conversation.save()
    }
    return conversation
  }

  return AiConversation.create({
    userId: input.userId,
    orderNo: input.orderNo ?? null,
    title: message.slice(0, 100),
    source: 'contact',
    status: 1,
    messageCount: 0,
    lastMessage: message.slice(0, 255),
    lastMessageAt: new Date(),
  })
}

async function loadHistory(conversationId: number): Promise<ChatMessage[]> {
  const rows = await AiMessageRow.findAll({
    where: { conversationId, role: { [Op.in]: ['user', 'assistant'] } },
    order: [['id', 'DESC']],
    limit: config.ai.maxHistory,
  })
  return rows
    .reverse()
    .map((row) => ({
      role: row.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: row.content.slice(0, 600),
    }))
}

async function loadUserNickname(userId: number): Promise<string> {
  const user = await User.findByPk(userId, { attributes: ['nickname', 'username'] })
  return user?.nickname || user?.username || '小兔用户'
}

interface OrderContext {
  snapshot: OrderSnapshot
  orderNo: string
}

async function loadOrderContext(userId: number, orderNo: string | null): Promise<OrderContext | null> {
  if (!orderNo || !/^[A-Za-z0-9-]{6,32}$/.test(orderNo)) return null

  const order = await Order.findOne({
    where: { orderNo, userId, userDeleted: 0 },
    include: [{ model: OrderItem, as: 'items' }],
  })
  if (!order) return null

  const items = (order.get('items') as OrderItem[] | null) ?? []
  const itemCount = items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0)
  const receiver = order.receiverName
    ? `${order.receiverName}${order.receiverPhone ? ` ${maskPhone(order.receiverPhone)}` : ''}`
    : '未填写'

  return {
    orderNo: order.orderNo,
    snapshot: {
      orderNo: order.orderNo,
      statusText: ORDER_STATUS_TEXT[order.status] ?? '未知状态',
      payAmount: Number(order.payAmount ?? 0).toFixed(2),
      itemCount,
      createdAt: order.createdAt ? formatDate(order.createdAt) : '—',
      shipTime: order.shipTime ? formatDate(order.shipTime) : '',
      receiver,
    },
  }
}

function toolLabel(name: string, orderNo: string): string {
  return name === 'get_order_logistics' ? `已查询订单 ${orderNo} 的物流` : `已查询订单 ${orderNo} 的状态`
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  context: { userId: number; orderNo: string },
): Promise<{ result: unknown; label: string }> {
  const requested =
    typeof args.order_no === 'string' && args.order_no.trim()
      ? args.order_no.trim()
      : context.orderNo

  if (!requested) {
    return {
      result: { error: '没有可查询的订单号，请先向用户确认订单号' },
      label: '未提供订单号',
    }
  }
  if (!/^[A-Za-z0-9-]{6,32}$/.test(requested)) {
    return { result: { error: '订单号格式不正确' }, label: '订单号格式不正确' }
  }

  const order = await Order.findOne({
    where: { orderNo: requested, userId: context.userId, userDeleted: 0 },
    include: [
      { model: OrderItem, as: 'items' },
      { model: OrderLogistics, as: 'logistics' },
    ],
  })
  if (!order) {
    return {
      result: { error: '未找到该订单，或该订单不属于当前用户' },
      label: '未找到订单',
    }
  }

  const items = (order.get('items') as OrderItem[] | null) ?? []
  const itemCount = items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0)

  if (name === 'get_order_logistics') {
    const logistics = order.get('logistics') as OrderLogistics | null
    const traces = (logistics?.traces ?? []).slice(0, 3)
    return {
      result: {
        orderNo: order.orderNo,
        statusText: ORDER_STATUS_TEXT[order.status] ?? '',
        company: logistics?.company ?? '',
        trackingNo: logistics?.trackingNo ?? '',
        shipTime: order.shipTime ? formatDate(order.shipTime) : '',
        traces,
        note: logistics ? '' : '商家尚未发货，暂无物流信息',
      },
      label: toolLabel(name, order.orderNo),
    }
  }

  return {
    result: {
      orderNo: order.orderNo,
      statusText: ORDER_STATUS_TEXT[order.status] ?? '',
      payAmount: Number(order.payAmount ?? 0).toFixed(2),
      totalAmount: Number(order.totalAmount ?? 0).toFixed(2),
      itemCount,
      createdAt: order.createdAt ? formatDate(order.createdAt) : '',
      payTime: order.payTime ? formatDate(order.payTime) : '',
      shipTime: order.shipTime ? formatDate(order.shipTime) : '',
      receiver: order.receiverName ?? '',
      receiverPhone: maskPhone(order.receiverPhone),
    },
    label: toolLabel(name, order.orderNo),
  }
}

function addUsage(a: AiUsage, b: AiUsage): AiUsage {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  }
}

function parseToolArguments(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || '{}') as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

interface ConverseResult {
  content: string
  usage: AiUsage
  model: string
  trace: ToolTrace[]
}

/**
 * 订单类问题：先走非流式工具轮次拿到真实数据，再生成最终回答。
 * 非订单类问题：直接流式输出，首字延迟更低。
 */
async function converse(
  baseMessages: ChatMessage[],
  context: { userId: number; orderNo: string },
  preferTools: boolean,
  signal: AbortSignal | undefined,
  emit: AiEventHandler,
): Promise<ConverseResult> {
  const adapter = getAiAdapter()
  const messages = [...baseMessages]
  const trace: ToolTrace[] = []
  let usage: AiUsage = { ...ZERO_USAGE }
  let model = adapter.model

  if (preferTools) {
    emit({ type: 'thinking', text: '正在查询你的订单信息…' })
    for (let round = 0; round < TOOL_ROUNDS; round += 1) {
      const result = await adapter.chat({
        messages,
        tools: AI_TOOLS,
        stream: false,
        maxTokens: 600,
        signal,
      })
      usage = addUsage(usage, result.usage)
      model = result.model

      if (!result.toolCalls.length) {
        return { content: result.content, usage, model, trace }
      }

      messages.push({ role: 'assistant', content: result.content, toolCalls: result.toolCalls })
      for (const call of result.toolCalls) {
        const { result: toolResult, label } = await executeTool(
          call.name,
          parseToolArguments(call.arguments),
          context,
        )
        trace.push({ name: call.name, arguments: call.arguments, result: toolResult })
        emit({ type: 'tool', name: call.name, label })
        messages.push({
          role: 'tool',
          toolCallId: call.id,
          content: JSON.stringify(toolResult),
        })
      }
    }

    // 工具轮次用尽仍未收敛：兜底提示，避免无限循环
    return {
      content: '这个问题需要人工核实一下，建议点「转人工」由客服跟进。',
      usage,
      model,
      trace,
    }
  }

  const result = await adapter.chat({
    messages,
    tools: AI_TOOLS,
    stream: true,
    signal,
    onDelta: (text) => emit({ type: 'delta', text }),
  })
  usage = addUsage(usage, result.usage)
  model = result.model

  // 模型在流式轮次里要求调用工具（少见）：执行后用工具结果再流式生成一次
  if (!result.content && result.toolCalls.length) {
    messages.push({ role: 'assistant', content: '', toolCalls: result.toolCalls })
    for (const call of result.toolCalls) {
      const { result: toolResult, label } = await executeTool(
        call.name,
        parseToolArguments(call.arguments),
        context,
      )
      trace.push({ name: call.name, arguments: call.arguments, result: toolResult })
      emit({ type: 'tool', name: call.name, label })
      messages.push({ role: 'tool', toolCallId: call.id, content: JSON.stringify(toolResult) })
    }
    const followUp = await adapter.chat({
      messages,
      stream: true,
      signal,
      onDelta: (text) => emit({ type: 'delta', text }),
    })
    usage = addUsage(usage, followUp.usage)
    model = followUp.model
    return { content: followUp.content, usage, model, trace }
  }

  return { content: result.content, usage, model, trace }
}

export function publicConfig() {
  const mode = aiMode()
  return {
    enabled: config.ai.enabled,
    mode: mode.mode,
    model: mode.model,
    usingFallback: mode.usingFallback,
    welcome: AI_WELCOME,
    quickQuestions: AI_QUICK_QUESTIONS,
    disclaimer: AI_DISCLAIMER,
  }
}

export async function chat(input: ChatInput): Promise<ChatOutcome> {
  if (!config.ai.enabled) {
    throw new AppError('AI 客服暂未开启，请使用在线留言', ERR.AI_UNAVAILABLE, 503)
  }

  const message = normalizeMessage(input.message)
  checkRateLimit(input.userId)
  await assertBudget()

  const conversation = await resolveConversation(input, message)
  input.emit({ type: 'meta', conversationId: Number(conversation.id) })

  // 先取历史（不含本轮），再落用户消息，避免历史里重复本轮提问
  const history = await loadHistory(conversation.id)

  await AiMessageRow.create({
    conversationId: conversation.id,
    role: 'user',
    content: message,
    citations: null,
    toolCalls: null,
    tokens: 0,
    model: null,
    latencyMs: null,
  })

  const startedAt = Date.now()
  const mode = aiMode().mode

  try {
    const [nickname, knowledge] = await Promise.all([
      loadUserNickname(input.userId),
      searchKnowledge(message),
    ])
    const citations = toCitations(knowledge)

    const orderNo = conversation.orderNo || input.orderNo || extractOrderNo(message)
    const orderContext = await loadOrderContext(input.userId, orderNo)
    const systemPrompt = buildSystemPrompt({
      nickname,
      order: orderContext?.snapshot ?? null,
      knowledge,
    })

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ]

    const preferTools = Boolean(orderContext) && ORDER_SPECIFIC.test(message)
    const result = await converse(
      messages,
      { userId: input.userId, orderNo: orderContext?.orderNo ?? orderNo ?? '' },
      preferTools,
      input.signal,
      input.emit,
    )

    let content = result.content.trim()
    if (!content) {
      content = '抱歉，我这边暂时没能给出答案。你可以换个说法，或点「转人工」由客服跟进。'
    }
    // 工具路径是非流式的，拿到最终结果后一次性推给前端；普通路径已在 converse 里增量推送
    if (preferTools) input.emit({ type: 'delta', text: content })

    const assistantRow = await AiMessageRow.create({
      conversationId: conversation.id,
      role: 'assistant',
      content,
      citations: citations.length ? citations : null,
      toolCalls: result.trace.length ? result.trace : null,
      tokens: result.usage.totalTokens,
      model: result.model,
      latencyMs: Date.now() - startedAt,
    })

    await conversation.update({
      messageCount: conversation.messageCount + 2,
      lastMessage: content.slice(0, 255),
      lastMessageAt: new Date(),
      orderNo: conversation.orderNo ?? orderContext?.orderNo ?? null,
    })

    await AiCallLog.create({
      module: 'chat',
      userId: input.userId,
      conversationId: conversation.id,
      model: result.model,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
      // 演示模式不产生真实费用，避免后台成本统计失真
      cost: mode === 'deepseek' ? estimateCost(result.usage) : '0.0000',
      latencyMs: Date.now() - startedAt,
      status: 1,
      error: null,
    })

    input.emit({
      type: 'done',
      conversationId: Number(conversation.id),
      messageId: Number(assistantRow.id),
      content,
      citations,
      usage: result.usage,
      grounded: knowledge.length > 0 || result.trace.length > 0,
      mode,
    })

    return {
      conversationId: Number(conversation.id),
      messageId: Number(assistantRow.id),
      content,
      citations,
      usage: result.usage,
      mode,
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'AI 客服暂时不可用'
    await AiCallLog.create({
      module: 'chat',
      userId: input.userId,
      conversationId: conversation.id,
      model: aiMode().model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cost: '0',
      latencyMs: Date.now() - startedAt,
      status: 0,
      error: messageText.slice(0, 200),
    }).catch(() => undefined)

    // 用户消息已落库；失败时补一条助手占位，避免会话历史断层
    await AiMessageRow.create({
      conversationId: conversation.id,
      role: 'assistant',
      content: `（系统提示）${messageText}`,
      citations: null,
      toolCalls: null,
      tokens: 0,
      model: null,
      latencyMs: Date.now() - startedAt,
    }).catch(() => undefined)

    input.emit({ type: 'error', message: messageText })
    throw error
  }
}

export interface ConversationDto {
  id: number
  orderNo: string
  title: string
  status: number
  messageCount: number
  lastMessage: string
  lastMessageAt: string | null
  createdAt: string
}

function toConversationDto(row: AiConversation): ConversationDto {
  return {
    id: Number(row.id),
    orderNo: row.orderNo ?? '',
    title: row.title ?? '',
    status: row.status,
    messageCount: row.messageCount,
    lastMessage: row.lastMessage ?? '',
    lastMessageAt: row.lastMessageAt ? formatDate(row.lastMessageAt) : null,
    createdAt: formatDate(row.createdAt),
  }
}

export async function listConversations(
  userId: number,
  orderNo?: string,
): Promise<ConversationDto[]> {
  // 未传订单号时只返回「通用会话」，避免帮助中心把某笔订单的会话混进来
  const where: WhereOptions = orderNo ? { userId, orderNo } : { userId, orderNo: null }
  const rows = await AiConversation.findAll({
    where,
    order: [['lastMessageAt', 'DESC']],
    limit: 20,
  })
  return rows.map(toConversationDto)
}

export interface MessageDto {
  id: number
  role: string
  content: string
  citations: AiCitation[]
  toolCalls: ToolTrace[]
  createdAt: string
}

export async function getMessages(userId: number, conversationId: number): Promise<MessageDto[]> {
  const conversation = await AiConversation.findOne({
    where: { id: conversationId, userId },
  })
  if (!conversation) throw new AppError('会话不存在', ERR.AI_CONVERSATION_NOT_FOUND, 404)

  const rows = await AiMessageRow.findAll({
    where: { conversationId, role: { [Op.in]: ['user', 'assistant'] } },
    order: [['id', 'ASC']],
    limit: 100,
  })
  return rows.map((row) => ({
    id: Number(row.id),
    role: row.role,
    content: row.content,
    citations: Array.isArray(row.citations) ? (row.citations as AiCitation[]) : [],
    toolCalls: Array.isArray(row.toolCalls) ? (row.toolCalls as ToolTrace[]) : [],
    createdAt: formatDate(row.createdAt),
  }))
}

export async function transferToHuman(
  userId: number,
  conversationId: number,
  note?: string,
): Promise<{ feedbackId: number; conversationId: number }> {
  const conversation = await AiConversation.findOne({
    where: { id: conversationId, userId },
  })
  if (!conversation) throw new AppError('会话不存在', ERR.AI_CONVERSATION_NOT_FOUND, 404)

  const rows = await AiMessageRow.findAll({
    where: { conversationId },
    order: [['id', 'DESC']],
    limit: 6,
  })
  const timeline = rows
    .reverse()
    .map((row) => `${row.role === 'user' ? '用户' : 'AI'}：${row.content.slice(0, 160)}`)
    .join('\n')
  const summary = note?.trim() || '用户在与 AI 客服沟通后请求转人工。'
  const content = `【AI 客服转人工】\n${summary}\n\n最近对话：\n${timeline}`.slice(0, 1900)

  const feedback = await feedbackService.createFeedback(userId, {
    type: 1,
    content,
    orderNo: conversation.orderNo ?? undefined,
  })

  conversation.status = 2
  await conversation.save()

  return { feedbackId: feedback.id, conversationId: Number(conversation.id) }
}
