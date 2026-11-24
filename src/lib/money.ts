export function applyKey(current: string, key: string): string {
  if (key === 'back') return current.slice(0, -1)
  if (key === '.') {
    if (current.includes('.')) return current
    return `${current === '' ? '0' : current}.`
  }
  if (!/^\d$/.test(key)) return current
  const next = current === '0' ? key : current + key
  const [intPart, decPart] = next.split('.')
  if ((intPart ?? '').length > 6) return current
  if (decPart !== undefined && decPart.length > 2) return current
  return next
}

export function yuanToCents(raw: string): number {
  if (!raw || raw === '.' || raw === '0.') return 0
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.round(value * 100)
}

export function centsToInput(cents: number): string {
  if (cents <= 0) return ''
  const value = Math.round(cents)
  const yuan = Math.floor(value / 100)
  const rem = value % 100
  if (rem === 0) return String(yuan)
  if (rem % 10 === 0) return `${yuan}.${rem / 10}`
  return `${yuan}.${String(rem).padStart(2, '0')}`
}

export function formatYuan(cents: number): string {
  const value = Math.abs(Math.round(cents))
  const rem = String(value % 100).padStart(2, '0')
  const yuan = String(Math.floor(value / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${yuan}.${rem}`
}

export function formatYuanSymbol(cents: number): string {
  const sign = cents < 0 ? '−' : ''
  return `${sign}¥${formatYuan(cents)}`
}
