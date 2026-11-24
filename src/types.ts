export type EntryType = 'expense' | 'income'
export type Necessity = 'need' | 'want'
export type ThemeMode = 'system' | 'light' | 'dark'
export type Milestone = 'p25' | 'p50' | 'p100'

export interface Category {
  id: string
  type: EntryType
  name: string
  color: string
  sort: number
  archived: boolean
}

export interface Entry {
  id: string
  type: EntryType
  amount: number
  categoryId: string
  note: string
  date: string
  necessity: Necessity | null
  recurringId: string | null
  auto: boolean
  createdAt: number
  updatedAt: number
}

export interface Recurring {
  id: string
  name: string
  amount: number
  categoryId: string
  day: number
  necessity: Necessity
  enabled: boolean
  startMonth: string
  appliedThrough: string | null
  createdAt: number
}

export interface Goal {
  name: string
  target: number
  startDate: string
  createdAt: number
  celebrated: { p25: boolean; p50: boolean; p100: boolean }
}

export interface Meta {
  theme: ThemeMode
  budget: number | null
  goal: Goal | null
  summarySeenFor: string | null
  lastCategoryId: { expense: string | null; income: string | null }
  demo: boolean
}

export interface AppState {
  entries: Entry[]
  categories: Category[]
  recurrings: Recurring[]
  meta: Meta
}

export interface NewEntry {
  type: EntryType
  amount: number
  categoryId: string
  note: string
  date: string
  necessity: Necessity | null
}
