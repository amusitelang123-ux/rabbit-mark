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
  }
}

/** 用户端 HTTP 客户端 */
export const http = createHttp(import.meta.env.VITE_API_BASE ?? '/api/client/v1', 'xtx_access_token')
