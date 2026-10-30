/**
 * 登录态存储：勾选「记住我」写入 localStorage（跨会话保留），
 * 未勾选写入 sessionStorage（关闭标签页即失效）。
 * 读取时 sessionStorage 优先，避免同一浏览器多标签以不同记住状态登录时互相覆盖。
 */
export const REMEMBER_KEY = 'xtx_remember_me'

export function readStored(key: string): string {
  return sessionStorage.getItem(key) ?? localStorage.getItem(key) ?? ''
}

export function writeStored(key: string, value: string, remember: boolean): void {
  if (remember) {
    localStorage.setItem(key, value)
    sessionStorage.removeItem(key)
  } else {
    sessionStorage.setItem(key, value)
    localStorage.removeItem(key)
  }
}

export function removeStored(key: string): void {
  localStorage.removeItem(key)
  sessionStorage.removeItem(key)
}

/** 读取「记住我」偏好，默认开启（首次登录行为与旧版一致） */
export function readRemember(): boolean {
  return localStorage.getItem(REMEMBER_KEY) !== '0'
}

export function writeRemember(remember: boolean): void {
  localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0')
}
