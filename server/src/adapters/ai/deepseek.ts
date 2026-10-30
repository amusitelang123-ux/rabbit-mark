import { config } from '../../config'
import { ERR } from '../../constants'
import { AppError } from '../../utils/errors'
import type {
  AiAdapter,
  AiChatRequest,
  AiChatResult,
  AiMessage,
  AiToolCall,
  AiUsage,
} from './types'

/**
 * DeepSeek 适配器：OpenAI Chat Completions 兼容协议。
 * - 默认地址 https://api.deepseek.com，模型 deepseek-chat
 * - 支持 function calling 与 SSE 流式
 * - 密钥只从 config.ai.apiKey 读取，任何异常信息都不回显密钥
 */

interface WireToolCallDelta {
  index?: number
  id?: string
  function?: { name?: string; arguments?: string }
}

interface WireChoice {
  message?: {
    content?: string | null
    tool_calls?: {
      id?: string
      function?: { name?: string; arguments?: string }
    }[]
  }
  delta?: {
    content?: string | null
    tool_calls?: WireToolCallDelta[]
  }
  finish_reason?: string | null
}

interface WireResponse {
  model?: string
  choices?: WireChoice[]
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  error?: { message?: string }
}

const EMPTY_USAGE: AiUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }

function toWireMessage(message: AiMessage): Record<string, unknown> {
  if (message.role === 'tool') {
    return { role: 'tool', content: message.content, tool_call_id: message.toolCallId }
  }
  if (message.role === 'assistant' && message.toolCalls?.length) {
    return {
      role: 'assistant',
      content: message.content || null,
      tool_calls: message.toolCalls.map((call) => ({
        id: call.id,
        type: 'function',
        function: { name: call.name, arguments: call.arguments },
      })),
    }
  }
  return { role: message.role, content: message.content }
}

function mapUsage(raw: WireResponse['usage']): AiUsage {
  if (!raw) return { ...EMPTY_USAGE }
  return {
    promptTokens: Number(raw.prompt_tokens ?? 0),
    completionTokens: Number(raw.completion_tokens ?? 0),
    totalTokens: Number(raw.total_tokens ?? 0),
  }
}

/** 合并「外部取消信号」与「本地超时」，返回可清理的 AbortSignal */
function withTimeout(external?: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('ai timeout')), config.ai.timeoutMs)

  const onAbort = () => controller.abort(external?.reason)
  if (external) {
    if (external.aborted) controller.abort(external.reason)
    else external.addEventListener('abort', onAbort, { once: true })
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer)
      external?.removeEventListener('abort', onAbort)
    },
  }
}

function toAppError(error: unknown): AppError {
  const name = (error as { name?: string })?.name
  if (name === 'AbortError') {
    return new AppError('AI 服务响应超时，请稍后重试', ERR.AI_UNAVAILABLE, 504)
  }
  if (error instanceof AppError) return error
  return new AppError('AI 服务暂时不可用，请转人工客服', ERR.AI_UNAVAILABLE, 502)
}

export class DeepSeekAdapter implements AiAdapter {
  readonly name = 'deepseek'
  readonly model = config.ai.model

  get configured(): boolean {
    return Boolean(config.ai.apiKey)
  }

  async chat(request: AiChatRequest): Promise<AiChatResult> {
    if (!this.configured) {
      throw new AppError('未配置 DEEPSEEK_API_KEY', ERR.AI_NOT_CONFIGURED, 503)
    }

    const stream = Boolean(request.stream && request.onDelta)
    const startedAt = Date.now()
    const { signal, cleanup } = withTimeout(request.signal)

    const body: Record<string, unknown> = {
      model: this.model,
      messages: request.messages.map(toWireMessage),
      temperature: request.temperature ?? config.ai.temperature,
      max_tokens: request.maxTokens ?? config.ai.maxTokens,
      stream,
    }
    if (stream) body.stream_options = { include_usage: true }
    if (request.tools?.length) {
      body.tools = request.tools
      body.tool_choice = 'auto'
    }

    try {
      const response = await fetch(`${config.ai.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.ai.apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        const detail = text.slice(0, 200)
        console.error('[ai] deepseek http error', response.status, detail)
        if (response.status === 401 || response.status === 403) {
          throw new AppError('DeepSeek 鉴权失败，请检查 API Key', ERR.AI_NOT_CONFIGURED, 503)
        }
        if (response.status === 429) {
          throw new AppError('AI 服务调用频率超限，请稍后重试', ERR.RATE_LIMIT, 429)
        }
        throw new AppError('AI 服务暂时不可用，请转人工客服', ERR.AI_UNAVAILABLE, 502)
      }

      if (stream) {
        return await this.consumeStream(response, request, startedAt, cleanup)
      }
      return await this.consumeJson(response, startedAt, cleanup)
    } catch (error) {
      cleanup()
      throw toAppError(error)
    }
  }

  private async consumeJson(
    response: Response,
    startedAt: number,
    cleanup: () => void,
  ): Promise<AiChatResult> {
    const payload = (await response.json()) as WireResponse
    cleanup()

    if (payload.error?.message) {
      console.error('[ai] deepseek error payload', payload.error.message)
      throw new AppError('AI 服务返回错误，请稍后重试', ERR.AI_UNAVAILABLE, 502)
    }

    const choice = payload.choices?.[0]
    const toolCalls: AiToolCall[] = (choice?.message?.tool_calls ?? []).map((call, index) => ({
      id: call.id || `call_${index}`,
      name: call.function?.name || '',
      arguments: call.function?.arguments || '{}',
    }))

    return {
      content: choice?.message?.content ?? '',
      toolCalls,
      finishReason: choice?.finish_reason ?? 'stop',
      usage: mapUsage(payload.usage),
      model: payload.model || this.model,
      latencyMs: Date.now() - startedAt,
    }
  }

  private async consumeStream(
    response: Response,
    request: AiChatRequest,
    startedAt: number,
    cleanup: () => void,
  ): Promise<AiChatResult> {
    const reader = response.body?.getReader()
    if (!reader) {
      cleanup()
      throw new AppError('AI 服务未返回数据流', ERR.AI_UNAVAILABLE, 502)
    }

    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let content = ''
    let finishReason = 'stop'
    let usage: AiUsage = { ...EMPTY_USAGE }
    let model = this.model
    const toolCalls = new Map<number, { id: string; name: string; arguments: string }>()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // SSE 以空行分隔事件；这里按行处理，兼容 \r\n
        let newlineIndex = buffer.indexOf('\n')
        while (newlineIndex >= 0) {
          const line = buffer.slice(0, newlineIndex).replace(/\r$/, '')
          buffer = buffer.slice(newlineIndex + 1)
          newlineIndex = buffer.indexOf('\n')

          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (!data || data === '[DONE]') continue

          let chunk: WireResponse
          try {
            chunk = JSON.parse(data) as WireResponse
          } catch {
            continue
          }
          if (chunk.error?.message) {
            console.error('[ai] deepseek stream error', chunk.error.message)
            throw new AppError('AI 服务返回错误，请稍后重试', ERR.AI_UNAVAILABLE, 502)
          }
          if (chunk.model) model = chunk.model
          if (chunk.usage) usage = mapUsage(chunk.usage)

          const choice = chunk.choices?.[0]
          if (!choice) continue
          if (choice.finish_reason) finishReason = choice.finish_reason

          const deltaContent = choice.delta?.content
          if (deltaContent) {
            content += deltaContent
            request.onDelta?.(deltaContent)
          }

          for (const delta of choice.delta?.tool_calls ?? []) {
            const index = delta.index ?? 0
            const current = toolCalls.get(index) ?? { id: '', name: '', arguments: '' }
            if (delta.id) current.id = delta.id
            if (delta.function?.name) current.name = delta.function.name
            if (delta.function?.arguments) current.arguments += delta.function.arguments
            toolCalls.set(index, current)
          }
        }
      }
    } catch (error) {
      cleanup()
      throw toAppError(error)
    }

    cleanup()
    return {
      content,
      toolCalls: [...toolCalls.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([index, call]) => ({
          id: call.id || `call_${index}`,
          name: call.name,
          arguments: call.arguments || '{}',
        })),
      finishReason,
      usage,
      model,
      latencyMs: Date.now() - startedAt,
    }
  }
}

export const deepseekAdapter = new DeepSeekAdapter()
