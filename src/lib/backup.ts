import { cloneCategories, defaultMeta } from './defaults.ts'
import { isYm, isYmd, ymd } from './date.ts'
import type { AppState, Category, Entry, EntryType, Goal, Meta, Necessity, Recurring, ThemeMode } from '../types.ts'

export interface BackupFile {
  app: 'jizhang'
  version: 1
  exportedAt: string
  entries: Entry[]
  categories: Category[]
  recurrings: Recurring[]
  meta: Meta
}

export function serializeBackup(state: AppState): string {
  const file: BackupFile = {
    app: 'jizhang',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: state.entries,
    categories: state.categories,
    recurrings: state.recurrings,
    meta: state.meta,
  }
  return JSON.stringify(file, null, 2)
}

export function downloadBackup(state: AppState): void {
  const blob = new Blob([serializeBackup(state)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `记账备份-${ymd(new Date())}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function parseBackup(text: string): { ok: true; state: AppState; skipped: number } | { ok: false; error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(text.replace(/^\uFEFF/, ''))
  } catch {
    return { ok: false, error: '这个文件不是记账备份' }
  }
  if (!isRecord(raw) || raw.app !== 'jizhang') return { ok: false, error: '这个文件不是记账备份' }
  if (raw.version !== 1) return { ok: false, error: '备份版本无法识别' }
  if (!Array.isArray(raw.entries) || !Array.isArray(raw.categories) || !Array.isArray(raw.recurrings)) {
    return { ok: false, error: '备份内容不完整' }
  }

  let skipped = 0
  const entries: Entry[] = []
  for (const item of raw.entries) {
    const entry = parseEntry(item)
    if (entry) entries.push(entry)
    else skipped += 1
  }
  const categories = dedupe(raw.categories.map(parseCategory).filter((item): item is Category => item !== null))
  const recurrings = dedupe(raw.recurrings.map(parseRecurring).filter((item): item is Recurring => item !== null))
  const meta = parseMeta(raw.meta) ?? defaultMeta()
  return {
    ok: true,
    skipped,
    state: {
      entries: dedupe(entries),
      categories: categories.length > 0 ? categories : cloneCategories(),
      recurrings,
      meta,
    },
  }
}

function parseEntry(value: unknown): Entry | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || value.id.length === 0) return null
  if (value.type !== 'expense' && value.type !== 'income') return null
  if (!isCents(value.amount)) return null
  if (typeof value.categoryId !== 'string' || value.categoryId.length === 0) return null
  if (typeof value.date !== 'string' || !isYmd(value.date)) return null
  const type = value.type
  let necessity: Necessity | null = null
  if (value.necessity === 'need' || value.necessity === 'want') necessity = value.necessity
  else if (type === 'expense') necessity = 'need'
  return {
    id: value.id,
    type,
    amount: value.amount,
    categoryId: value.categoryId,
    note: typeof value.note === 'string' ? value.note.slice(0, 100) : '',
    date: value.date,
    necessity: type === 'income' ? null : necessity,
    recurringId: typeof value.recurringId === 'string' ? value.recurringId : null,
    auto: value.auto === true,
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : Date.now(),
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : Date.now(),
  }
}

function parseCategory(value: unknown): Category | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || value.id.length === 0) return null
  if (value.type !== 'expense' && value.type !== 'income') return null
  if (typeof value.name !== 'string' || value.name.trim().length === 0) return null
  return {
    id: value.id,
    type: value.type,
    name: value.name.trim().slice(0, 12),
    color: typeof value.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.color) ? value.color : '#8A8178',
    sort: typeof value.sort === 'number' && Number.isFinite(value.sort) ? value.sort : 0,
    archived: value.archived === true,
  }
}

function parseRecurring(value: unknown): Recurring | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || value.id.length === 0) return null
  if (typeof value.name !== 'string' || value.name.trim().length === 0) return null
  if (!isCents(value.amount)) return null
  if (typeof value.categoryId !== 'string') return null
  if (typeof value.startMonth !== 'string' || !isYm(value.startMonth)) return null
  const necessity: Necessity = value.necessity === 'want' ? 'want' : 'need'
  const day = typeof value.day === 'number' ? Math.min(31, Math.max(1, Math.round(value.day))) : 1
  const applied = typeof value.appliedThrough === 'string' && isYm(value.appliedThrough) ? value.appliedThrough : null
  return {
    id: value.id,
    name: value.name.trim().slice(0, 20),
    amount: value.amount,
    categoryId: value.categoryId,
    day,
    necessity,
    enabled: value.enabled !== false,
    startMonth: value.startMonth,
    appliedThrough: applied,
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : Date.now(),
  }
}

function parseMeta(value: unknown): Meta | null {
  if (!isRecord(value)) return null
  const base = defaultMeta()
  const theme: ThemeMode = value.theme === 'light' || value.theme === 'dark' || value.theme === 'system' ? value.theme : 'system'
  const budget = typeof value.budget === 'number' && Number.isInteger(value.budget) && value.budget > 0 ? value.budget : null
  return {
    theme,
    budget,
    goal: parseGoal(value.goal),
    summarySeenFor: typeof value.summarySeenFor === 'string' && isYm(value.summarySeenFor) ? value.summarySeenFor : null,
    lastCategoryId: {
      expense: nestedId(value.lastCategoryId, 'expense'),
      income: nestedId(value.lastCategoryId, 'income'),
    },
    demo: value.demo === true ? true : base.demo,
  }
}

function parseGoal(value: unknown): Goal | null {
  if (!isRecord(value)) return null
  if (typeof value.name !== 'string' || value.name.trim().length === 0) return null
  if (!isCents(value.target)) return null
  if (typeof value.startDate !== 'string' || !isYmd(value.startDate)) return null
  const flags = isRecord(value.celebrated) ? value.celebrated : {}
  return {
    name: value.name.trim().slice(0, 20),
    target: value.target,
    startDate: value.startDate,
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : Date.now(),
    celebrated: {
      p25: flags.p25 === true,
      p50: flags.p50 === true,
      p100: flags.p100 === true,
    },
  }
}

function nestedId(value: unknown, key: EntryType): string | null {
  if (!isRecord(value)) return null
  const id = value[key]
  return typeof id === 'string' && id.length > 0 ? id : null
}

function isCents(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 10_000_000_000
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function dedupe<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>()
  for (const item of items) map.set(item.id, item)
  return [...map.values()]
}
