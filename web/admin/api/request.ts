import { createHttp } from '@/api/request'

/** 管理端 HTTP 客户端：前缀 /api/admin，独端 token key */
export const adminHttp = createHttp('/api/admin', 'xtx_admin_token')

const TOKEN_KEY = 'xtx_admin_token'

/** 下载管理端文件（如订单 CSV）：带鉴权头，触发浏览器下载 */
export async function adminDownload(
  path: string,
  params: Record<string, unknown>,
  filename: string,
): Promise<void> {
  const url = new URL(`/api/admin${path}`, window.location.origin)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  })
  const token = localStorage.getItem(TOKEN_KEY)
  const res = await fetch(url.pathname + url.search, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('导出失败')
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
}
