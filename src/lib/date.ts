const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function ymd(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function parseYmd(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1)
}

export function isYmd(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return ymd(parseYmd(value)) === value
}

export function isYm(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false
  const [year, month] = value.split('-').map(Number)
  return (year ?? 0) >= 1970 && (month ?? 0) >= 1 && (month ?? 0) <= 12
}

export function currentYm(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function shiftMonth(ym: string, delta: number): string {
  const [year, month] = ym.split('-').map(Number)
  const date = new Date(year ?? 1970, (month ?? 1) - 1 + delta, 1)
  return currentYm(date)
}

export function enumerateMonths(from: string, to: string): string[] {
  if (from > to) return []
  const out: string[] = []
  let cursor = from
  while (cursor <= to && out.length < 600) {
    out.push(cursor)
    cursor = shiftMonth(cursor, 1)
  }
  return out
}

export function recentMonths(today: Date, count: number): string[] {
  const end = currentYm(today)
  const start = shiftMonth(end, -(count - 1))
  return enumerateMonths(start, end)
}

export function daysInMonth(ym: string): number {
  const [year, month] = ym.split('-').map(Number)
  return new Date(year ?? 1970, month ?? 1, 0).getDate()
}

export function scheduledYmd(ym: string, day: number): string {
  const last = daysInMonth(ym)
  const clamped = Math.min(last, Math.max(1, day))
  return `${ym}-${String(clamped).padStart(2, '0')}`
}

export function lastDueMonth(today: Date, day: number): string {
  const ym = currentYm(today)
  const scheduled = scheduledYmd(ym, day)
  if (ymd(today) >= scheduled) return ym
  return shiftMonth(ym, -1)
}

export function addDays(value: string, delta: number): string {
  const date = parseYmd(value)
  date.setDate(date.getDate() + delta)
  return ymd(date)
}

export function formatMonth(ym: string): string {
  const [year, month] = ym.split('-')
  return `${year}年${Number(month)}月`
}

export function formatLongDate(value: string): string {
  const date = parseYmd(value)
  return `${date.getMonth() + 1}月${date.getDate()}日 周${WEEKDAYS[date.getDay()] ?? ''}`
}

export function yearOf(ym: string): number {
  return Number(ym.slice(0, 4))
}
