import type { ApiResponse } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE ?? '/api/client/v1'

type RequestOptions = Omit<RequestInit, 'body'> & {
  params?: Record<string, string | number | undefined>
  body?: unknown
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
    })
  }
  return url.pathname + url.search
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('xtx_access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Unified HTTP transport. Business code must not call fetch directly.
 * Injects auth token and normalizes the `{ code, message, data }` envelope.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
    localStorage.removeItem('xtx_access_token')
    throw new Error('未登录或登录已过期')
  }

  const json = (await res.json()) as ApiResponse<T>
  if (json.code !== 0) throw new Error(json.message || '请求失败')
  return json.data
}

export const http = {
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
