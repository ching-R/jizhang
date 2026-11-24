import { categoryLookup } from './categories.ts'
import { DEFICIT_COLOR, SURPLUS_COLOR } from './defaults.ts'
import type { Category, Entry, EntryType, Goal, Milestone } from '../types.ts'

export interface Slice {
  id: string
  name: string
  color: string
  cents: number
}

export interface YearStack {
  labels: string[]
  series: { id: string; name: string; color: string; cents: number[] }[]
}

export interface SankeyModel {
  nodes: { key: string; label: string; color: string }[]
  links: { source: string; target: string; cents: number }[]
}

export interface MonthSummary {
  month: string
  income: number
  expense: number
  need: number
  want: number
  top: Slice[]
  budget: 'unset' | 'inside' | 'exact' | 'over'
  cap: number | null
}

export function sumAmount(entries: Entry[], type?: EntryType): number {
  let total = 0
  for (const entry of entries) {
    if (type && entry.type !== type) continue
    total += entry.amount
  }
  return total
}

export function necessitySplit(entries: Entry[]): { need: number; want: number } {
  let need = 0
  let want = 0
  for (const entry of entries) {
    if (entry.type !== 'expense') continue
    if (entry.necessity === 'want') want += entry.amount
    else need += entry.amount
  }
  return { need, want }
}

export function savedSince(entries: Entry[], startDate: string): number {
  let income = 0
  let expense = 0
  for (const entry of entries) {
    if (entry.date < startDate) continue
    if (entry.type === 'income') income += entry.amount
    else expense += entry.amount
  }
  return income - expense
}

export function budgetLevel(spent: number, cap: number): 'ok' | 'warn' | 'over' {
  if (cap <= 0) return spent > 0 ? 'over' : 'ok'
  if (spent >= cap) return 'over'
  if (spent * 5 >= cap * 4) return 'warn'
  return 'ok'
}

export function progressRatio(saved: number, target: number): number {
  if (target <= 0) return 0
  return Math.max(0, saved / target)
}

export function pendingCelebrations(saved: number, target: number, flags: Goal['celebrated']): Milestone[] {
  if (target <= 0 || saved <= 0) return []
  const ratio = saved / target
  const out: Milestone[] = []
  if (ratio >= 0.25 && !flags.p25) out.push('p25')
  if (ratio >= 0.5 && !flags.p50) out.push('p50')
  if (ratio >= 1 && !flags.p100) out.push('p100')
  return out
}

export function computeStreak(dates: string[], today: string): number {
  const set = new Set(dates.filter((date) => date <= today))
  let cursor = today
  if (!set.has(cursor)) {
    const yesterday = shiftDay(today, -1)
    if (!set.has(yesterday)) return 0
    cursor = yesterday
  }
  let count = 0
  while (set.has(cursor) && count < 5000) {
    count += 1
    cursor = shiftDay(cursor, -1)
  }
  return count
}

function shiftDay(value: string, delta: number): string {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1)
  date.setDate(date.getDate() + delta)
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

export function inMonth(entries: Entry[], ym: string): Entry[] {
  return entries.filter((entry) => entry.date.startsWith(ym))
}

export function inYear(entries: Entry[], year: number): Entry[] {
  const prefix = `${year}-`
  return entries.filter((entry) => entry.date.startsWith(prefix))
}

export function expenseSlices(entries: Entry[], categories: Category[]): Slice[] {
  const totals = new Map<string, number>()
  for (const entry of entries) {
    if (entry.type !== 'expense' || entry.amount <= 0) continue
    totals.set(entry.categoryId, (totals.get(entry.categoryId) ?? 0) + entry.amount)
  }
  const lookup = categoryLookup(categories)
  return [...totals.entries()]
    .filter(([, cents]) => cents > 0)
    .map(([id, cents]) => {
      const category = lookup.get(id)
      return {
        id,
        name: category?.name ?? '未分类',
        color: category?.color ?? '#8A8178',
        cents,
      }
    })
    .sort((a, b) => b.cents - a.cents)
}

export function buildYearStack(entries: Entry[], categories: Category[], year: number): YearStack {
  const labels = Array.from({ length: 12 }, (_, index) => `${index + 1}月`)
  const totals = new Map<string, number[]>()
  const prefix = `${year}-`
  for (const entry of entries) {
    if (entry.type !== 'expense' || !entry.date.startsWith(prefix)) continue
    const monthIndex = Number(entry.date.slice(5, 7)) - 1
    if (monthIndex < 0 || monthIndex > 11) continue
    let row = totals.get(entry.categoryId)
    if (!row) {
      row = Array.from({ length: 12 }, () => 0)
      totals.set(entry.categoryId, row)
    }
    row[monthIndex] = (row[monthIndex] ?? 0) + entry.amount
  }
  const series: YearStack['series'] = []
  const seen = new Set<string>()
  const ordered = [...categories].sort((a, b) => a.sort - b.sort)
  for (const category of ordered) {
    const row = totals.get(category.id)
    if (!row || row.every((value) => value === 0)) continue
    seen.add(category.id)
    series.push({ id: category.id, name: category.name, color: category.color, cents: row })
  }
  for (const [id, row] of totals) {
    if (seen.has(id) || row.every((value) => value === 0)) continue
    series.push({ id, name: '未分类', color: '#8A8178', cents: row })
  }
  return { labels, series }
}

export function buildSankey(entries: Entry[], categories: Category[]): SankeyModel | null {
  const lookup = categoryLookup(categories)
  const income = new Map<string, number>()
  const expense = new Map<string, number>()
  for (const entry of entries) {
    if (entry.amount <= 0) continue
    const bucket = entry.type === 'income' ? income : expense
    bucket.set(entry.categoryId, (bucket.get(entry.categoryId) ?? 0) + entry.amount)
  }
  const totalIn = [...income.values()].reduce((sum, value) => sum + value, 0)
  const totalOut = [...expense.values()].reduce((sum, value) => sum + value, 0)
  if (totalIn === 0 && totalOut === 0) return null
  const surplus = totalIn - totalOut

  const funds: { key: string; label: string; color: string; cents: number }[] = []
  const uses: { key: string; label: string; color: string; cents: number }[] = []

  for (const [id, cents] of [...income.entries()].filter(([, cents]) => cents > 0).sort((a, b) => b[1] - a[1])) {
    const category = lookup.get(id)
    funds.push({
      key: `in:${id}`,
      label: category?.name ?? '未分类',
      color: category?.color ?? '#8A8178',
      cents,
    })
  }
  if (surplus < 0) {
    funds.push({ key: 'deficit', label: '超支', color: DEFICIT_COLOR, cents: -surplus })
  }

  for (const [id, cents] of [...expense.entries()].filter(([, cents]) => cents > 0).sort((a, b) => b[1] - a[1])) {
    const category = lookup.get(id)
    uses.push({
      key: `out:${id}`,
      label: category?.name ?? '未分类',
      color: category?.color ?? '#8A8178',
      cents,
    })
  }
  if (surplus > 0) {
    uses.push({ key: 'surplus', label: '结余', color: SURPLUS_COLOR, cents: surplus })
  }
  if (funds.length === 0 || uses.length === 0) return null

  const useTotal = uses.reduce((sum, item) => sum + item.cents, 0)
  const links: SankeyModel['links'] = []
  for (const fund of funds) {
    let allocated = 0
    uses.forEach((use, index) => {
      const cents = index === uses.length - 1 ? fund.cents - allocated : Math.floor((fund.cents * use.cents) / useTotal)
      allocated += cents
      if (cents > 0) links.push({ source: fund.key, target: use.key, cents })
    })
  }

  return {
    nodes: [...funds, ...uses].map(({ key, label, color }) => ({ key, label, color })),
    links,
  }
}

export function summarizeMonth(entries: Entry[], categories: Category[], month: string, cap: number | null): MonthSummary {
  const list = inMonth(entries, month)
  const income = sumAmount(list, 'income')
  const expense = sumAmount(list, 'expense')
  const { need, want } = necessitySplit(list)
  const top = expenseSlices(list, categories).slice(0, 3)
  let budget: MonthSummary['budget'] = 'unset'
  if (cap != null && cap > 0) {
    if (expense > cap) budget = 'over'
    else if (expense === cap) budget = 'exact'
    else budget = 'inside'
  }
  return { month, income, expense, need, want, top, budget, cap }
}

export function groupByDate(entries: Entry[]): { date: string; entries: Entry[] }[] {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  const groups: { date: string; entries: Entry[] }[] = []
  for (const entry of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.date === entry.date) last.entries.push(entry)
    else groups.push({ date: entry.date, entries: [entry] })
  }
  return groups
}
