import { describe, expect, it } from 'vitest'
import { parseBackup, serializeBackup } from './backup.ts'
import { defaultCategoryId } from './categories.ts'
import { addDays, currentYm, lastDueMonth, scheduledYmd, shiftMonth } from './date.ts'
import { defaultMeta, DEMO_BUDGET_CENTS } from './defaults.ts'
import { buildDemo } from './demo.ts'
import { applyKey, centsToInput, yuanToCents } from './money.ts'
import { applyRecurring, resumeRecurring } from './recurring.ts'
import { budgetLevel, buildSankey, computeStreak, pendingCelebrations, savedSince } from './stats.ts'
import type { AppState, Entry, Recurring } from '../types.ts'

const today = new Date(2026, 10, 24)

function entry(partial: Partial<Entry> & Pick<Entry, 'id' | 'date' | 'amount' | 'type'>): Entry {
  return {
    categoryId: 'exp-food',
    note: '',
    necessity: partial.type === 'expense' ? 'need' : null,
    recurringId: null,
    auto: false,
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  }
}

describe('money keypad', () => {
  it('types decimals and blocks a third decimal place', () => {
    let raw = ''
    for (const key of ['1', '2', '.', '5', '0', '9']) raw = applyKey(raw, key)
    expect(raw).toBe('12.50')
    expect(yuanToCents(raw)).toBe(1250)
  })

  it('replaces a lone zero and keeps a leading zero before the dot', () => {
    expect(applyKey('0', '5')).toBe('5')
    expect(applyKey('', '.')).toBe('0.')
    expect(applyKey('0.', '5')).toBe('0.5')
    expect(centsToInput(1250)).toBe('12.5')
    expect(centsToInput(5)).toBe('0.05')
  })
})

describe('dates and streak', () => {
  it('shifts across the new year and clamps short months', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(scheduledYmd('2026-02', 31)).toBe('2026-02-28')
    expect(lastDueMonth(new Date(2026, 1, 28), 31)).toBe('2026-02')
    expect(lastDueMonth(new Date(2026, 1, 27), 31)).toBe('2026-01')
    expect(lastDueMonth(new Date(2026, 10, 24), 31)).toBe('2026-10')
  })

  it('keeps a streak alive through yesterday and breaks after a gap', () => {
    expect(computeStreak(['2026-03-01', '2026-02-28', '2026-02-27'], '2026-03-01')).toBe(3)
    expect(computeStreak(['2026-02-28', '2026-02-27'], '2026-03-01')).toBe(2)
    expect(computeStreak(['2026-02-27'], '2026-03-01')).toBe(0)
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
  })
})

describe('recurring catch-up', () => {
  const base: Recurring = {
    id: 'phone',
    name: '话费',
    amount: 5900,
    categoryId: 'exp-comm',
    day: 31,
    necessity: 'need',
    enabled: true,
    startMonth: '2026-09',
    appliedThrough: null,
    createdAt: 1,
  }

  it('catches missed months and clamps the 31st', () => {
    const result = applyRecurring([], [base], today)
    expect(result.added.map((item) => item.date)).toEqual(['2026-09-30', '2026-10-31'])
    expect(result.added.every((item) => item.auto)).toBe(true)
    expect(result.recurrings[0]?.appliedThrough).toBe('2026-10')
    const again = applyRecurring(result.entries, result.recurrings, today)
    expect(again.added).toHaveLength(0)
  })

  it('does not recreate a deleted auto entry', () => {
    const once = applyRecurring([], [base], today)
    const kept = once.entries.filter((item) => item.date !== '2026-10-31')
    const again = applyRecurring(kept, once.recurrings, today)
    expect(again.added).toHaveLength(0)
  })

  it('skips the gap when a rule is turned back on', () => {
    const paused: Recurring = { ...base, enabled: false, appliedThrough: '2026-03', day: 5 }
    const resumed = resumeRecurring(paused, today)
    const result = applyRecurring([], [resumed], today)
    expect(result.added.map((item) => item.date)).toEqual(['2026-11-05'])
  })
})

describe('budget, savings, sankey', () => {
  it('warns at 80% and crosses 100%', () => {
    expect(budgetLevel(79, 100)).toBe('ok')
    expect(budgetLevel(80, 100)).toBe('warn')
    expect(budgetLevel(100, 100)).toBe('over')
  })

  it('counts savings from the goal start date', () => {
    const entries = [
      entry({ id: 'a', type: 'income', amount: 1000, date: '2026-10-31', categoryId: 'inc-living' }),
      entry({ id: 'b', type: 'income', amount: 2000, date: '2026-11-01', categoryId: 'inc-living' }),
      entry({ id: 'c', type: 'expense', amount: 500, date: '2026-11-02' }),
    ]
    expect(savedSince(entries, '2026-11-01')).toBe(1500)
  })

  it('celebrates each new milestone once', () => {
    const flags = { p25: false, p50: false, p100: false }
    expect(pendingCelebrations(250, 1000, flags)).toEqual(['p25'])
    expect(pendingCelebrations(1000, 1000, flags)).toEqual(['p25', 'p50', 'p100'])
    expect(pendingCelebrations(1000, 1000, { p25: true, p50: true, p100: true })).toEqual([])
  })

  it('balances sankey links', () => {
    const entries = [
      entry({ id: 'in', type: 'income', amount: 10_000, date: '2026-11-01', categoryId: 'inc-living' }),
      entry({ id: 'food', type: 'expense', amount: 3_000, date: '2026-11-02' }),
      entry({ id: 'shop', type: 'expense', amount: 2_000, date: '2026-11-03', categoryId: 'exp-shop' }),
    ]
    const model = buildSankey(entries, [])
    expect(model).not.toBeNull()
    const incoming = new Map<string, number>()
    for (const link of model?.links ?? []) incoming.set(link.target, (incoming.get(link.target) ?? 0) + link.cents)
    expect(incoming.get('surplus')).toBe(5_000)
    expect([...(model?.links ?? [])].reduce((sum, link) => sum + link.cents, 0)).toBe(10_000)
  })
})

describe('demo data and backup', () => {
  it('stays inside today and lands the current month in the budget warning band', () => {
    const entries = buildDemo(today)
    expect(entries.every((item) => item.date <= '2026-11-24')).toBe(true)
    expect(entries.some((item) => item.auto)).toBe(true)
    expect(entries.some((item) => item.necessity === 'want')).toBe(true)
    const spent = entries
      .filter((item) => item.type === 'expense' && item.date.startsWith('2026-11'))
      .reduce((sum, item) => sum + item.amount, 0)
    expect(spent / DEMO_BUDGET_CENTS).toBeGreaterThanOrEqual(0.8)
    expect(spent / DEMO_BUDGET_CENTS).toBeLessThan(1)
    const months = new Set(entries.map((item) => item.date.slice(0, 7)))
    const overspent = [...months].some((month) => {
      let income = 0
      let expense = 0
      for (const item of entries) {
        if (!item.date.startsWith(month)) continue
        if (item.type === 'income') income += item.amount
        else expense += item.amount
      }
      return expense > income
    })
    expect(overspent).toBe(true)
  })

  it('round-trips a backup and rejects other files', () => {
    const state: AppState = {
      entries: [entry({ id: 'e1', type: 'expense', amount: 100, date: '2026-11-24' })],
      categories: [],
      recurrings: [],
      meta: defaultMeta(),
    }
    const parsed = parseBackup(serializeBackup(state))
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.state.entries).toHaveLength(1)
      expect(parsed.state.categories.length).toBeGreaterThan(0)
      expect(parsed.state.meta.demo).toBe(false)
    }
    expect(parseBackup('{"app":"other"}').ok).toBe(false)
    expect(defaultMeta().demo).toBe(false)
    expect(defaultCategoryId(parsed.ok ? parsed.state.categories : [], 'expense', defaultMeta())).toBe('exp-food')
    expect(currentYm(today)).toBe('2026-11')
  })
})
