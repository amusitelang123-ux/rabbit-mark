const PALETTES = [
  ['#ffd8a8', '#ff922b'],
  ['#a5d8ff', '#1c7ed6'],
  ['#b2f2bb', '#2f9e44'],
  ['#ffc9c9', '#e03131'],
  ['#d0bfff', '#7048e8'],
  ['#99e9f2', '#0c8599'],
  ['#f5d0fe', '#ae3ec9'],
  ['#e9ecef', '#868e96'],
  ['#ffec99', '#f08c00'],
  ['#c0eb75', '#66a80f'],
]

function hash(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0
  }
  return h
}

const LABEL_MAP: Record<string, string> = {
  数码: '📱',
  服饰: '👕',
  家居: '🛋️',
  生鲜: '🥬',
  美妆: '💄',
  母婴: '🍼',
  运动: '🏀',
  图书: '📚',
  耳机: '🎧',
  手机: '📱',
  笔记本: '💻',
  相机: '📷',
}

function pickEmoji(seed: string): string {
  for (const key of Object.keys(LABEL_MAP)) {
    if (seed.includes(key)) return LABEL_MAP[key]
  }
  return '🛍️'
}

/**
 * Generate a self-contained SVG placeholder as a data URI.
 * Avoids external image dependencies so the demo runs fully offline.
 */
export function placeholder(seed: string, label = '', w = 400, h = 400): string {
  const h1 = hash(seed)
  const [c1, c2] = PALETTES[h1 % PALETTES.length]
  const text = label || seed
  const short = text.length > 8 ? `${text.slice(0, 8)}…` : text
  const emoji = pickEmoji(seed)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
</linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<text x="50%" y="44%" font-size="${Math.round(h * 0.3)}" text-anchor="middle" dominant-baseline="central">${emoji}</text>
<text x="50%" y="78%" font-size="${Math.round(h * 0.06)}" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="600">${escapeXml(short)}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function avatar(seed: string): string {
  const h = hash(seed)
  const [c1, c2] = PALETTES[h % PALETTES.length]
  const letter = (seed.trim()[0] || '兔').toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<circle cx="32" cy="32" r="32" fill="url(#g)"/>
<text x="32" y="33" font-size="28" text-anchor="middle" dominant-baseline="central" fill="#fff" font-family="sans-serif" font-weight="700">${escapeXml(letter)}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
