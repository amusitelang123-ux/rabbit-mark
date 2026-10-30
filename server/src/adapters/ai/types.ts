/**
 * AI 适配器抽象：对齐 OpenAI Chat Completions 协议（DeepSeek 完全兼容），
 * 新增厂商只需实现 AiAdapter 并在 registry 注册。
 */

export type AiRole = 'system' | 'user' | 'assistant' | 'tool'

export interface AiToolCall {
  id: string
  name: string
  /** JSON 字符串，由业务侧解析并校验 */
  arguments: string
}

export interface AiMessage {
  role: AiRole
  content: string
  /** role=tool 时回填对应的 tool_call id */
  toolCallId?: string
  /** role=assistant 且触发工具调用时回填 */
  toolCalls?: AiToolCall[]
}

export interface AiToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface AiUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface AiChatRequest {
  messages: AiMessage[]
  tools?: AiToolDefinition[]
  temperature?: number
  maxTokens?: number
  /** 是否以流式返回；仅当同时提供 onDelta 时生效 */
  stream?: boolean
  signal?: AbortSignal
  onDelta?: (text: string) => void
}

export interface AiChatResult {
  content: string
  toolCalls: AiToolCall[]
  finishReason: string
  usage: AiUsage
  model: string
  latencyMs: number
}

export interface AiAdapter {
  readonly name: string
  readonly model: string
  /** 是否具备真实调用条件（Key 已配置） */
  readonly configured: boolean
  chat(request: AiChatRequest): Promise<AiChatResult>
}
