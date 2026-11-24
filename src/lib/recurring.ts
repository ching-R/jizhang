import { lastDueMonth, scheduledYmd, shiftMonth, enumerateMonths } from './date.ts'
import type { Entry, Recurring } from '../types.ts'

export interface RecurringPlan {
  entries: Entry[]
  recurrings: Recurring[]
  added: Entry[]
}

export function applyRecurring(entries: Entry[], recurrings: Recurring[], today: Date): RecurringPlan {
  const added: Entry[] = []
  const existing = new Set(entries.map((entry) => entry.id))
  const next = recurrings.map((recurring) => {
    if (!recurring.enabled) return recurring
    const due = lastDueMonth(today, recurring.day)
    const from = recurring.appliedThrough ? shiftMonth(recurring.appliedThrough, 1) : recurring.startMonth
    if (from > due) return recurring
    let applied = recurring.appliedThrough
    for (const month of enumerateMonths(from, due)) {
      const id = `auto:${recurring.id}:${month}`
      if (!existing.has(id)) {
        const now = Date.now()
        const entry: Entry = {
          id,
          type: 'expense',
          amount: recurring.amount,
          categoryId: recurring.categoryId,
          note: recurring.name,
          date: scheduledYmd(month, recurring.day),
          necessity: recurring.necessity,
          recurringId: recurring.id,
          auto: true,
          createdAt: now,
          updatedAt: now,
        }
        added.push(entry)
        existing.add(id)
      }
      applied = month
    }
    return { ...recurring, appliedThrough: applied }
  })
  return {
    entries: added.length > 0 ? [...entries, ...added] : entries,
    recurrings: next,
    added,
  }
}

/** Skip months that passed while a rule was turned off, then record the current due month. */
export function resumeRecurring(recurring: Recurring, today: Date): Recurring {
  const due = lastDueMonth(today, recurring.day)
  const skipThrough = shiftMonth(due, -1)
  if (recurring.startMonth > skipThrough) return { ...recurring, enabled: true }
  if (recurring.appliedThrough != null && recurring.appliedThrough >= skipThrough) {
    return { ...recurring, enabled: true }
  }
  return { ...recurring, enabled: true, appliedThrough: skipThrough }
}
