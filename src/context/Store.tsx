import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { loadApp, removeCategory, removeEntry, removeRecurring, replaceAll, saveCategory, saveEntriesAndRecurring, saveEntry, saveMeta } from '../lib/db.ts'
import { currentYm, parseYmd, shiftMonth, ymd } from '../lib/date.ts'
import { buildDemo } from '../lib/demo.ts'
import { applyRecurring, resumeRecurring } from '../lib/recurring.ts'
import type { AppState, Category, Entry, EntryType, Goal, Meta, Milestone, Necessity, NewEntry, Recurring, ThemeMode } from '../types.ts'

export type ResolvedTheme = 'light' | 'dark'
export type SummarySource = 'real' | 'demo'

interface StoreValue {
  entries: Entry[]
  categories: Category[]
  recurrings: Recurring[]
  meta: Meta
  today: string
  demoEntries: Entry[]
  resolvedTheme: ResolvedTheme
  toast: string | null
  ledgerMonth: string
  summary: { open: boolean; source: SummarySource }
  flash: (message: string) => void
  openSummary: (source: SummarySource) => void
  closeSummary: () => void
  addEntry: (input: NewEntry) => Promise<boolean>
  updateEntry: (entry: Entry) => Promise<boolean>
  deleteEntry: (id: string) => Promise<boolean>
  addCategory: (input: { type: EntryType; name: string; color: string }) => Promise<boolean>
  updateCategory: (category: Category) => Promise<boolean>
  archiveCategory: (id: string, archived: boolean) => Promise<boolean>
  deleteCategory: (id: string) => Promise<boolean>
  addRecurring: (input: { name: string; amount: number; categoryId: string; day: number; necessity: Necessity }) => Promise<boolean>
  updateRecurring: (recurring: Recurring) => Promise<boolean>
  deleteRecurring: (id: string) => Promise<boolean>
  setBudget: (budget: number | null) => Promise<boolean>
  setGoal: (goal: Goal | null) => Promise<boolean>
  markCelebrated: (level: Milestone) => Promise<boolean>
  setTheme: (theme: ThemeMode) => Promise<boolean>
  setDemo: (demo: boolean) => Promise<boolean>
  importState: (state: AppState) => Promise<boolean>
}

const StoreContext = createContext<StoreValue | null>(null)

function applyTheme(theme: ThemeMode): ResolvedTheme {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#141311' : '#f3f0ea')
  try {
    localStorage.setItem('jizhang-theme', theme)
  } catch {
    // Theme still applies for this visit when storage is blocked.
  }
  return dark ? 'dark' : 'light'
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )
  const [ledgerMonth, setLedgerMonth] = useState(currentYm())
  const [summary, setSummary] = useState<{ open: boolean; source: SummarySource }>({ open: false, source: 'real' })
  const stateRef = useRef<AppState | null>(null)
  const chainRef = useRef(Promise.resolve())
  const toastTimer = useRef(0)
  const realSummaryDismissed = useRef(false)

  const flash = useCallback((message: string) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 1800)
  }, [])

  const commit = useCallback(
    (recipe: (current: AppState) => Promise<AppState>) => {
      const run = chainRef.current.then(async () => {
        const current = stateRef.current
        if (!current) return false
        const next = await recipe(current)
        stateRef.current = next
        setState(next)
        return true
      }).catch((reason: unknown) => {
        console.error(reason)
        flash('没能保存，请重试')
        return false
      })
      chainRef.current = run.then(() => undefined)
      return run
    },
    [flash],
  )

  useEffect(() => {
    let alive = true
    loadApp()
      .then((loaded) => {
        if (!alive) return
        stateRef.current = loaded.state
        setState(loaded.state)
        if (loaded.added.length === 1) flash(`已自动记下「${loaded.added[0]?.note ?? '固定支出'}」`)
        else if (loaded.added.length > 1) flash(`已自动记下 ${loaded.added.length} 笔固定支出`)
      })
      .catch(() => {
        if (alive) setError('账本打不开。请允许浏览器在本地保存数据，然后重新打开。')
      })
    return () => {
      alive = false
    }
  }, [flash])

  const theme = state?.meta.theme
  useEffect(() => {
    if (!theme) return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const run = () => setResolvedTheme(applyTheme(theme))
    run()
    media.addEventListener('change', run)
    return () => media.removeEventListener('change', run)
  }, [theme])

  useEffect(() => {
    if (!state || realSummaryDismissed.current) return
    if (state.meta.summarySeenFor === currentYm()) return
    const previous = shiftMonth(currentYm(), -1)
    if (state.entries.some((entry) => entry.date.startsWith(previous))) {
      setSummary({ open: true, source: 'real' })
    }
  }, [state])

  const today = ymd(new Date())
  const demoEntries = useMemo(() => buildDemo(parseYmd(today)), [today])

  const value = useMemo<StoreValue | null>(() => {
    if (!state) return null
    const dismissSummary = () =>
      commit(async (current) => {
        const meta: Meta = { ...current.meta, summarySeenFor: currentYm() }
        await saveMeta(meta)
        return { ...current, meta }
      })

    return {
      entries: state.entries,
      categories: state.categories,
      recurrings: state.recurrings,
      meta: state.meta,
      today,
      demoEntries,
      resolvedTheme,
      toast,
      ledgerMonth,
      summary,
      flash,
      openSummary: (source) => setSummary({ open: true, source }),
      closeSummary: () => {
        setSummary((current) => {
          if (current.source === 'real') {
            realSummaryDismissed.current = true
            void dismissSummary()
          }
          return { ...current, open: false }
        })
      },
      addEntry: (input) => {
        setLedgerMonth(input.date.slice(0, 7))
        return commit(async (current) => {
          const now = Date.now()
          const entry: Entry = {
            id: crypto.randomUUID(),
            type: input.type,
            amount: input.amount,
            categoryId: input.categoryId,
            note: input.note.trim(),
            date: input.date,
            necessity: input.type === 'expense' ? (input.necessity ?? 'need') : null,
            recurringId: null,
            auto: false,
            createdAt: now,
            updatedAt: now,
          }
          const meta: Meta = {
            ...current.meta,
            lastCategoryId: { ...current.meta.lastCategoryId, [input.type]: input.categoryId },
          }
          await saveEntry(entry, meta)
          return { ...current, entries: [...current.entries, entry], meta }
        })
      },
      updateEntry: (entry) => {
        setLedgerMonth(entry.date.slice(0, 7))
        return commit(async (current) => {
          const meta: Meta = {
            ...current.meta,
            lastCategoryId: { ...current.meta.lastCategoryId, [entry.type]: entry.categoryId },
          }
          await saveEntry(entry, meta)
          return { ...current, entries: current.entries.map((item) => (item.id === entry.id ? entry : item)), meta }
        })
      },
      deleteEntry: (id) =>
        commit(async (current) => {
          await removeEntry(id)
          return { ...current, entries: current.entries.filter((item) => item.id !== id) }
        }),
      addCategory: (input) =>
        commit(async (current) => {
          const name = input.name.trim()
          if (!name) return current
          if (current.categories.some((item) => item.type === input.type && item.name === name && !item.archived)) {
            flash('已经有这个分类了')
            return current
          }
          const sort = current.categories.reduce((max, item) => Math.max(max, item.sort), 0) + 1
          const category: Category = {
            id: crypto.randomUUID(),
            type: input.type,
            name: name.slice(0, 12),
            color: input.color,
            sort,
            archived: false,
          }
          await saveCategory(category)
          return { ...current, categories: [...current.categories, category] }
        }),
      updateCategory: (category) =>
        commit(async (current) => {
          const name = category.name.trim()
          if (!name) return current
          if (current.categories.some((item) => item.id !== category.id && item.type === category.type && item.name === name && !item.archived)) {
            flash('已经有这个分类了')
            return current
          }
          const next = { ...category, name: name.slice(0, 12) }
          await saveCategory(next)
          return { ...current, categories: current.categories.map((item) => (item.id === next.id ? next : item)) }
        }),
      archiveCategory: (id, archived) =>
        commit(async (current) => {
          const category = current.categories.find((item) => item.id === id)
          if (!category) return current
          if (archived) {
            const remaining = current.categories.filter((item) => item.type === category.type && !item.archived && item.id !== id)
            if (remaining.length === 0) {
              flash('至少留一个分类')
              return current
            }
          }
          const next = { ...category, archived }
          await saveCategory(next)
          return { ...current, categories: current.categories.map((item) => (item.id === id ? next : item)) }
        }),
      deleteCategory: (id) =>
        commit(async (current) => {
          const category = current.categories.find((item) => item.id === id)
          if (!category) return current
          const used = current.entries.some((item) => item.categoryId === id) || current.recurrings.some((item) => item.categoryId === id)
          if (used) {
            flash('这个分类已有记录，只能归档')
            return current
          }
          const remaining = current.categories.filter((item) => item.type === category.type && !item.archived && item.id !== id)
          if (!category.archived && remaining.length === 0) {
            flash('至少留一个分类')
            return current
          }
          await removeCategory(id)
          return { ...current, categories: current.categories.filter((item) => item.id !== id) }
        }),
      addRecurring: (input) =>
        commit(async (current) => {
          const name = input.name.trim()
          if (!name || input.amount <= 0) return current
          const recurring: Recurring = {
            id: crypto.randomUUID(),
            name: name.slice(0, 20),
            amount: input.amount,
            categoryId: input.categoryId,
            day: Math.min(31, Math.max(1, Math.round(input.day))),
            necessity: input.necessity,
            enabled: true,
            startMonth: currentYm(),
            appliedThrough: null,
            createdAt: Date.now(),
          }
          const applied = applyRecurring(current.entries, [...current.recurrings, recurring], new Date())
          await saveEntriesAndRecurring(applied.added, applied.recurrings)
          if (applied.added.length === 1) flash(`已自动记下「${applied.added[0]?.note ?? name}」`)
          else if (applied.added.length > 1) flash(`已自动记下 ${applied.added.length} 笔固定支出`)
          return { ...current, entries: applied.entries, recurrings: applied.recurrings }
        }),
      updateRecurring: (recurring) =>
        commit(async (current) => {
          const previous = current.recurrings.find((item) => item.id === recurring.id)
          if (!previous) return current
          let next: Recurring = {
            ...recurring,
            name: recurring.name.trim().slice(0, 20),
            day: Math.min(31, Math.max(1, Math.round(recurring.day))),
          }
          if (!previous.enabled && next.enabled) next = resumeRecurring(next, new Date())
          const list = current.recurrings.map((item) => (item.id === next.id ? next : item))
          const applied = applyRecurring(current.entries, list, new Date())
          await saveEntriesAndRecurring(applied.added, applied.recurrings)
          if (applied.added.length === 1) flash(`已自动记下「${applied.added[0]?.note ?? next.name}」`)
          else if (applied.added.length > 1) flash(`已自动记下 ${applied.added.length} 笔固定支出`)
          return { ...current, entries: applied.entries, recurrings: applied.recurrings }
        }),
      deleteRecurring: (id) =>
        commit(async (current) => {
          await removeRecurring(id)
          return { ...current, recurrings: current.recurrings.filter((item) => item.id !== id) }
        }),
      setBudget: (budget) =>
        commit(async (current) => {
          const meta = { ...current.meta, budget }
          await saveMeta(meta)
          return { ...current, meta }
        }),
      setGoal: (goal) =>
        commit(async (current) => {
          const meta = { ...current.meta, goal }
          await saveMeta(meta)
          return { ...current, meta }
        }),
      markCelebrated: (level) =>
        commit(async (current) => {
          if (!current.meta.goal) return current
          const meta = {
            ...current.meta,
            goal: { ...current.meta.goal, celebrated: { ...current.meta.goal.celebrated, [level]: true } },
          }
          await saveMeta(meta)
          return { ...current, meta }
        }),
      setTheme: (theme) =>
        commit(async (current) => {
          const meta = { ...current.meta, theme }
          await saveMeta(meta)
          return { ...current, meta }
        }),
      setDemo: (demo) =>
        commit(async (current) => {
          const meta = { ...current.meta, demo }
          await saveMeta(meta)
          return { ...current, meta }
        }),
      importState: (next) =>
        commit(async () => {
          const applied = applyRecurring(next.entries, next.recurrings, new Date())
          const imported: AppState = {
            entries: applied.entries,
            categories: next.categories,
            recurrings: applied.recurrings,
            meta: { ...next.meta, demo: false },
          }
          await replaceAll(imported)
          return imported
        }),
    }
  }, [commit, demoEntries, flash, ledgerMonth, resolvedTheme, state, summary, today, toast])

  if (error) {
    return (
      <div className="grid h-full place-items-center bg-bg px-8 text-center text-ink">
        <div>
          <p className="text-xl font-semibold">账本打不开</p>
          <p className="mt-2 text-sm text-muted">{error}</p>
        </div>
      </div>
    )
  }

  if (!value) {
    return (
      <div className="grid h-full place-items-center bg-bg text-ink">
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-accent text-2xl text-accent-ink">记</div>
          <p className="mt-4 text-sm text-muted">正在打开账本…</p>
        </div>
      </div>
    )
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext)
  if (!value) throw new Error('记账数据还没准备好')
  return value
}
