/**
 * 分享工具（U-66）：
 * 优先调用系统分享面板（Web Share API），不支持时复制链接。
 * 返回结果用于 Toast 文案。
 */
export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

export interface SharePayload {
  title?: string
  text?: string
  url: string
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 继续走兼容降级
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

export async function shareLink(payload: SharePayload): Promise<ShareResult> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(payload)
      return 'shared'
    } catch (err) {
      // 用户取消分享时不应降级为复制
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled'
    }
  }
  return (await copyText(payload.url)) ? 'copied' : 'failed'
}
