import type { ApiResponse } from './types'
import { readStored } from '@/utils/authStorage'

type RequestOptions = Omit<RequestInit, 'body'> & {
  params?: Record<string, string | number | undefined>
  body?: unknown
}

export interface HttpClient {
  get: <T>(path: string, params?: RequestOptions['params']) => Promise<T>
  post: <T>(path: string, body?: unknown) => Promise<T>
  put: <T>(path: string, body?: unknown) => Promise<T>
  delete: <T>(path: string, body?: unknown) => Promise<T>
  upload: <T>(path: string, file: File, field?: string) => Promise<T>
  /** SSE：逐事件回调，直到服务端结束或客户端 abort */
  stream: (path: string, body: unknown, handlers: StreamHandlers) => Promise<void>
}

export interface StreamHandlers {
  onEvent: (event: string, data: unknown) => void
  signal?: AbortSignal
}

/**
 * 统一 HTTP 传输工厂：注入指定 token、规范化 `{ code, message, data }` 信封。
 * 用户端与管理端使用不同的 baseUrl 与 token key，互不干扰。
 * 业务代码不得直接调用 fetch。
 */
export function createHttp(baseUrl: string, tokenKey: string): HttpClient {
  function buildUrl(path: string, params?: RequestOptions['params']): string {
    const url = new URL(`${baseUrl}${path}`, window.location.origin)
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
      })
    }
    return url.pathname + url.search
  }

  function authHeaders(): Record<string, string> {
    const token = readStored(tokenKey)
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, body, headers, ...rest } = options
    const isFormData = body instanceof FormData
    const res = await fetch(buildUrl(path, params), {
      ...rest,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...authHeaders(),
        ...headers,
      },
      body: body === undefined || isFormData ? (body as BodyInit | undefined) : JSON.stringify(body),
    })

    if (res.status === 401) {
      localStorage.removeItem(tokenKey)
      sessionStorage.removeItem(tokenKey)
      throw new Error('未登录或登录已过期')
    }

    const json = (await res.json()) as ApiResponse<T>
    if (json.code !== 0) throw new Error(json.message || '请求失败')
    return json.data
  }

  /**
   * SSE 解析：按空行切事件，`event:` 为事件名，多行 `data:` 拼接后按 JSON 解析。
   * 服务端若返回普通 JSON（例如参数错误），这里转成可读的 Error。
   */
  async function stream(path: string, body: unknown, handlers: StreamHandlers): Promise<void> {
    const res = await fetch(buildUrl(path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...authHeaders(),
      },
      body: JSON.stringify(body),
      signal: handlers.signal,
    })

    if (res.status === 401) {
      localStorage.removeItem(tokenKey)
      sessionStorage.removeItem(tokenKey)
      throw new Error('未登录或登录已过期')
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (!res.ok || !contentType.includes('text/event-stream')) {
      const text = await res.text().catch(() => '')
      let message = `请求失败（${res.status}）`
      try {
        const json = JSON.parse(text) as ApiResponse<unknown>
        if (json?.message) message = json.message
      } catch {
        // 非 JSON 响应，保留默认提示
      }
      throw new Error(message)
    }

    if (!res.body) throw new Error('浏览器不支持流式响应')

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    const dispatch = (block: string): void => {
      if (!block.trim()) return
      let event = 'message'
      const dataLines: string[] = []
      for (const rawLine of block.split('\n')) {
        const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
        if (!line || line.startsWith(':')) continue
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
      }
      if (!dataLines.length) return
      const data = dataLines.join('\n')
      try {
        handlers.onEvent(event, JSON.parse(data) as unknown)
      } catch {
        handlers.onEvent(event, data)
      }
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let index = buffer.indexOf('\n\n')
      while (index >= 0) {
        dispatch(buffer.slice(0, index))
        buffer = buffer.slice(index + 2)
        index = buffer.indexOf('\n\n')
      }
    }
    dispatch(buffer)
  }

  return {
    get: <T>(path: string, params?: RequestOptions['params']) => request<T>(path, { method: 'GET', params }),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
    put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
    delete: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
    upload: <T>(path: string, file: File, field = 'file') => {
      const form = new FormData()
      form.append(field, file)
      return request<T>(path, { method: 'POST', body: form })
    },
    stream,
  }
}

/** 用户端 HTTP 客户端 */
export const http = createHttp(import.meta.env.VITE_API_BASE ?? '/api/client/v1', 'xtx_access_token')
