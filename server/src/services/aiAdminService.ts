import { Op, QueryTypes, col, fn, type WhereOptions } from 'sequelize'
import { sequelize } from '../config/database'
import { AiCallLog, AiConversation, AiMessage, User } from '../models'
import { buildPage } from '../utils/response'
import { formatDate } from '../utils/serializers'
import { maskPhone } from '../utils/helpers'
import { knowledgeStats, syncKnowledgeBase } from './aiKnowledgeService'
import { aiMode } from '../adapters/ai'
import type { AiCitation } from './aiPrompt'

/** 后台：AI 客服的会话、消息、用量与知识库运维 */

export interface AdminAiConversationQuery {
  keyword?: string
  status?: number
  page?: number
  pageSize?: number
}

export async function listConversations(query: AdminAiConversationQuery = {}) {
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 10))

  const conditions: WhereOptions[] = []
  if (query.status !== undefined) conditions.push({ status: query.status })
  if (query.keyword) {
    const kw = `%${query.keyword}%`
    conditions.push({
      [Op.or]: [
        { title: { [Op.like]: kw } },
        { lastMessage: { [Op.like]: kw } },
        { orderNo: { [Op.like]: kw } },
      ],
    } as WhereOptions)
  }
  const where: WhereOptions = conditions.length ? { [Op.and]: conditions } : {}

  const { rows, count } = await AiConversation.findAndCountAll({
    where,
    include: [{ model: User, as: 'user' }],
    order: [['lastMessageAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    distinct: true,
  })

  const list = rows.map((row) => {
    const user = row.get('user') as User | null
    return {
      id: Number(row.id),
      userId: row.userId ? Number(row.userId) : null,
      nickname: user?.nickname || user?.username || '匿名用户',
      phone: maskPhone(user?.phone),
      orderNo: row.orderNo ?? '',
      title: row.title ?? '',
      status: row.status,
      messageCount: row.messageCount,
      lastMessage: row.lastMessage ?? '',
      lastMessageAt: row.lastMessageAt ? formatDate(row.lastMessageAt) : null,
      createdAt: formatDate(row.createdAt),
    }
  })

  return buildPage(list, page, pageSize, count)
}

export async function getConversationMessages(conversationId: number) {
  const conversation = await AiConversation.findByPk(conversationId)
  if (!conversation) return null

  const rows = await AiMessage.findAll({
    where: { conversationId },
    order: [['id', 'ASC']],
    limit: 200,
  })

  return rows.map((row) => ({
    id: Number(row.id),
    role: row.role,
    content: row.content,
    citations: Array.isArray(row.citations) ? (row.citations as AiCitation[]) : [],
    toolCalls: Array.isArray(row.toolCalls) ? (row.toolCalls as unknown[]) : [],
    tokens: row.tokens,
    model: row.model ?? '',
    latencyMs: row.latencyMs ?? 0,
    createdAt: formatDate(row.createdAt),
  }))
}

interface UsageAggregate {
  calls: number
  tokens: number
  cost: number
  avgLatency: number
  failures: number
}

async function aggregate(since: Date): Promise<UsageAggregate> {
  const row = (await AiCallLog.findOne({
    where: { createdAt: { [Op.gte]: since } },
    attributes: [
      [fn('COUNT', col('id')), 'calls'],
      [fn('SUM', col('total_tokens')), 'tokens'],
      [fn('SUM', col('cost')), 'cost'],
      [fn('AVG', col('latency_ms')), 'avgLatency'],
      [fn('SUM', col('status')), 'successCount'],
    ],
    raw: true,
  })) as unknown as {
    calls?: number | string
    tokens?: number | string | null
    cost?: number | string | null
    avgLatency?: number | string | null
    successCount?: number | string | null
  } | null

  const calls = Number(row?.calls ?? 0)
  const success = Number(row?.successCount ?? 0)
  return {
    calls,
    tokens: Number(row?.tokens ?? 0),
    cost: Number(row?.cost ?? 0),
    avgLatency: Math.round(Number(row?.avgLatency ?? 0)),
    failures: Math.max(0, calls - success),
  }
}

export async function usageStats() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const week = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)

  const [todayAgg, weekAgg] = await Promise.all([aggregate(today), aggregate(week)])
  const knowledge = await knowledgeStats()

  const daily = (await sequelize.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date,
            COUNT(*) AS calls,
            COALESCE(SUM(total_tokens), 0) AS tokens,
            COALESCE(SUM(cost), 0) AS cost
       FROM ai_call_logs
      WHERE created_at >= :since
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
      ORDER BY date ASC`,
    { replacements: { since: week }, type: QueryTypes.SELECT },
  )) as unknown as { date: string; calls: number | string; tokens: number | string; cost: number | string }[]

  const [conversations, messages] = await Promise.all([
    AiConversation.count(),
    AiMessage.count(),
  ])

  const mode = aiMode()
  return {
    mode: mode.mode,
    model: mode.model,
    usingFallback: mode.usingFallback,
    today: todayAgg,
    week: weekAgg,
    totals: { conversations, messages, knowledgeChunks: knowledge.chunks },
    knowledgeIndexedAt: knowledge.indexedAt,
    daily: daily.map((item) => ({
      date: String(item.date).slice(0, 10),
      calls: Number(item.calls ?? 0),
      tokens: Number(item.tokens ?? 0),
      cost: Number(Number(item.cost ?? 0).toFixed(4)),
    })),
  }
}

export async function rebuildKnowledge() {
  return syncKnowledgeBase()
}
