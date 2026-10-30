import type {
  AiAdapter,
  AiChatRequest,
  AiChatResult,
  AiToolCall,
  AiUsage,
} from './types'

/**
 * 演示适配器：无需 API Key、无需外网，用于本地联调与答辩兜底。
 * 会模拟一次 function calling（订单/物流问题），以便离线验证工具链路。
 */

const ORDER_HINT = /订单|物流|快递|发货|到货|签收|单号|到哪|退款|退货/

function lastUserContent(request: AiChatRequest): string {
  for (let i = request.messages.length - 1; i >= 0; i -= 1) {
    if (request.messages[i].role === 'user') return request.messages[i].content
  }
  return ''
}

function estimateUsage(request: AiChatRequest, content: string): AiUsage {
  const promptChars = request.messages.reduce((sum, m) => sum + m.content.length, 0)
  const promptTokens = Math.ceil(promptChars / 2)
  const completionTokens = Math.ceil(content.length / 2)
  return { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens }
}

function parseToolResult(request: AiChatRequest): Record<string, unknown> | null {
  for (let i = request.messages.length - 1; i >= 0; i -= 1) {
    const message = request.messages[i]
    if (message.role !== 'tool') continue
    try {
      return JSON.parse(message.content) as Record<string, unknown>
    } catch {
      return null
    }
  }
  return null
}

function composeAnswer(question: string, tool: Record<string, unknown> | null): string {
  const lower = question.toLowerCase()
  const orderNo = typeof tool?.orderNo === 'string' ? tool.orderNo : ''
  const statusText = typeof tool?.statusText === 'string' ? tool.statusText : ''

  if (/物流|快递|单号|到哪|签收/.test(lower)) {
    const company = typeof tool?.company === 'string' ? tool.company : ''
    const trackingNo = typeof tool?.trackingNo === 'string' ? tool.trackingNo : ''
    const traces = Array.isArray(tool?.traces) ? tool.traces : []
    const latest = traces.length ? String((traces[0] as { text?: string })?.text ?? '') : ''

    if (company || trackingNo || traces.length) {
      return `已查到订单 ${orderNo} 的物流：${company || '承运商'}${trackingNo ? `，运单号 ${trackingNo}` : ''}。${
        latest ? `最新节点：${latest}。` : '目前还没有新的轨迹节点。'
      }如果 48 小时内仍无更新，可以点「转人工」让我帮你催件。\n\n（当前为演示模式，接入 DeepSeek 后会结合知识库给出更完整的回答）`
    }
    return `订单 ${orderNo}${statusText ? `当前是「${statusText}」` : ''}，暂未查到物流信息。${
      statusText === '已取消' || statusText === '已退款'
        ? '这笔订单已经关闭，不会再有物流更新；如已付款可在订单详情查看退款进度。'
        : '通常是商家尚未发货；待发货订单可在订单详情点「提醒发货」。'
    }\n\n（当前为演示模式）`
  }

  if (/退款|退货|换货|售后/.test(lower)) {
    return `售后可以这样处理：在订单详情点「申请售后」，选择仅退款 / 退货退款 / 换货，并上传凭证。签收后 7 天内支持无理由退货（商品需保持完好、不影响二次销售）；质量问题由平台承担运费。\n\n（当前为演示模式，退款结果以客服审核为准）`
  }

  if (/发票/.test(lower)) {
    return '订单完成后可以在订单详情申请电子发票，填写抬头与税号，一般 1-3 个工作日开具；专票需要补充开票资料并联系人工客服。\n\n（当前为演示模式）'
  }

  if (/发货|什么时候|多久/.test(lower)) {
    return `${
      statusText ? `订单 ${orderNo} 当前是「${statusText}」。` : ''
    }现货商品一般在付款后 48 小时内发出，大促期间可能顺延 1-2 天；发货后物流轨迹约 24 小时内更新。\n\n（当前为演示模式）`
  }

  if (/优惠券|满减|秒杀/.test(lower)) {
    return '优惠券可以在「个人中心 → 我的优惠券」查看，结算页会自动推荐最优可用券；秒杀商品不与其他满减叠加，具体以结算页金额为准。\n\n（当前为演示模式）'
  }

  return `关于「${question.slice(0, 30)}」，我目前掌握的信息还不够准确。你可以补充订单号或具体商品，我再帮你查；也可以点「转人工」由客服跟进。\n\n（当前为演示模式，配置 DEEPSEEK_API_KEY 后会启用完整知识库问答）`
}

export class MockAiAdapter implements AiAdapter {
  readonly name = 'mock'
  readonly model = 'mock-customer-service'
  readonly configured = true

  async chat(request: AiChatRequest): Promise<AiChatResult> {
    const startedAt = Date.now()
    const question = lastUserContent(request)
    const hasToolResult = request.messages.some((m) => m.role === 'tool')

    // 首次命中订单类问题：模拟模型发起一次工具调用
    if (!hasToolResult && request.tools?.length && ORDER_HINT.test(question)) {
      const name = /物流|快递|单号|到哪|签收/.test(question)
        ? 'get_order_logistics'
        : 'get_order_detail'
      const toolCalls: AiToolCall[] = [{ id: `mock_${Date.now()}`, name, arguments: '{}' }]
      await new Promise((resolve) => setTimeout(resolve, 120))
      return {
        content: '',
        toolCalls,
        finishReason: 'tool_calls',
        usage: estimateUsage(request, ''),
        model: this.model,
        latencyMs: Date.now() - startedAt,
      }
    }

    const answer = composeAnswer(question, parseToolResult(request))
    const chunks = answer.match(/[\s\S]{1,18}/g) ?? [answer]
    for (const chunk of chunks) {
      if (request.signal?.aborted) break
      request.onDelta?.(chunk)
      await new Promise((resolve) => setTimeout(resolve, 18))
    }

    return {
      content: answer,
      toolCalls: [],
      finishReason: 'stop',
      usage: estimateUsage(request, answer),
      model: this.model,
      latencyMs: Date.now() - startedAt,
    }
  }
}

export const mockAiAdapter = new MockAiAdapter()
