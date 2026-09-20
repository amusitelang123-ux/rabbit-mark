/** Money helpers: internal integer-cent arithmetic to avoid float drift. */

export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

export function fromCents(cents: number): number {
  return cents / 100
}

export function addMoney(...amounts: number[]): number {
  return fromCents(amounts.reduce((sum, a) => sum + toCents(a), 0))
}

export function subMoney(a: number, b: number): number {
  return fromCents(toCents(a) - toCents(b))
}

export function mulMoney(a: number, qty: number): number {
  return fromCents(toCents(a) * qty)
}

export function formatMoney(amount: number): string {
  return amount.toFixed(2)
}

/** Split for the Amazon-style superscript price rendering. */
export function splitPrice(amount: number): { symbol: string; int: string; dec: string } {
  const [int, dec = '00'] = amount.toFixed(2).split('.')
  return { symbol: '¥', int, dec }
}
