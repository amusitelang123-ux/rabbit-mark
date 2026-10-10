import crypto from 'node:crypto'

/**
 * 图形验证码（U-41 防爆破）。
 * 单实例内存存储 + TTL；校验后立即失效（一次性消费），避免重放。
 * 生产多实例部署时应换成 Redis，并将 CAPTCHA_ENABLED 按需开启。
 */

/** 去掉 0/O/1/I 等易混淆字符 */
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXY3456789'
const CODE_LENGTH = 4
const TTL_MS = 5 * 60 * 1000
const MAX_ENTRIES = 5000
const COLORS = ['#1f2733', '#2d3a4d', '#c0392b', '#2f9e44', '#7048e8']

interface Entry {
  code: string
  expireAt: number
}

const store = new Map<string, Entry>()

function sweep(): void {
  const now = Date.now()
  for (const [key, value] of store) {
    if (value.expireAt <= now) store.delete(key)
  }
  if (store.size > MAX_ENTRIES) {
    const overflow = store.size - MAX_ENTRIES
    let i = 0
    for (const key of store.keys()) {
      if (i >= overflow) break
      store.delete(key)
      i += 1
    }
  }
}

function randomCode(): string {
  let out = ''
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    out += CHARS[crypto.randomInt(CHARS.length)]
  }
  return out
}

function buildSvg(code: string): string {
  const width = 120
  const height = 40
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="#f2f4f7" rx="6"/>`,
  ]

  for (let i = 0; i < 4; i += 1) {
    parts.push(
      `<line x1="${crypto.randomInt(width)}" y1="${crypto.randomInt(height)}" x2="${crypto.randomInt(width)}" y2="${crypto.randomInt(height)}" stroke="${COLORS[crypto.randomInt(COLORS.length)]}" stroke-width="1" opacity="0.45"/>`,
    )
  }

  const step = width / (code.length + 1)
  code.split('').forEach((char, index) => {
    const x = step * (index + 1)
    const y = height / 2 + 8 + (crypto.randomInt(7) - 3)
    const rotate = crypto.randomInt(31) - 15
    parts.push(
      `<text x="${x.toFixed(1)}" y="${y}" font-family="Menlo,Consolas,monospace" font-size="24" font-weight="700" fill="${COLORS[crypto.randomInt(COLORS.length)]}" text-anchor="middle" transform="rotate(${rotate} ${x.toFixed(1)} ${y})">${char}</text>`,
    )
  })

  for (let i = 0; i < 24; i += 1) {
    parts.push(
      `<circle cx="${crypto.randomInt(width)}" cy="${crypto.randomInt(height)}" r="1" fill="${COLORS[crypto.randomInt(COLORS.length)]}" opacity="0.5"/>`,
    )
  }

  parts.push('</svg>')
  return parts.join('')
}

export interface CaptchaResult {
  captchaId: string
  /** 可直接用于 <img src> 的 data URI */
  image: string
  expireIn: number
}

export function createCaptcha(): CaptchaResult {
  sweep()
  const captchaId = crypto.randomUUID()
  const code = randomCode()
  store.set(captchaId, { code, expireAt: Date.now() + TTL_MS })

  const svg = buildSvg(code)
  return {
    captchaId,
    image: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    expireIn: Math.floor(TTL_MS / 1000),
  }
}

/** 校验并一次性消费；无论对错都会失效，防止重放爆破 */
export function verifyCaptcha(captchaId: string, input: string): boolean {
  const entry = store.get(captchaId)
  if (!entry) return false
  store.delete(captchaId)
  if (entry.expireAt <= Date.now()) return false
  return entry.code.toLowerCase() === String(input ?? '').trim().toLowerCase()
}

/** 可通过 CAPTCHA_ENABLED=false 在本地联调时关闭 */
export function captchaEnabled(): boolean {
  return process.env.CAPTCHA_ENABLED !== 'false'
}
