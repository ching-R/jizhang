import { useState } from 'react'
import { useStore } from '../context/Store.tsx'
import { useGoTo } from '../components/Nav.tsx'
import { AmountDisplay, EntryFields } from '../components/EntryFields.tsx'
import { BudgetStatus } from '../components/BudgetStatus.tsx'
import { Keypad, useAmountKeys } from '../components/Keypad.tsx'
import { Button } from '../components/ui/button.tsx'
import { defaultCategoryId } from '../lib/categories.ts'
import { formatLongDate, isYmd } from '../lib/date.ts'
import { applyKey, formatYuan, yuanToCents } from '../lib/money.ts'
import { computeStreak, inMonth, progressRatio, savedSince, sumAmount } from '../lib/stats.ts'
import type { EntryType, Necessity } from '../types.ts'

export function AddView() {
  const { entries, categories, meta, today, addEntry, flash } = useStore()
  const go = useGoTo()
  const [type, setType] = useState<EntryType>('expense')
  const [necessity, setNecessity] = useState<Necessity>('need')
  const [categoryId, setCategoryId] = useState(() => defaultCategoryId(categories, 'expense', meta))
  const [raw, setRaw] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today)
  const [saving, setSaving] = useState(false)

  const changeType = (next: EntryType) => {
    setType(next)
    setCategoryId(defaultCategoryId(categories, next, meta))
  }

  const save = () => {
    if (saving) return
    const amount = yuanToCents(raw)
    if (amount <= 0 || !categoryId) {
      flash(categoryId ? '先输入金额' : '先选一个分类')
      return
    }
    if (!isYmd(date)) {
      flash('日期不对')
      return
    }
    setSaving(true)
    void addEntry({
      type,
      amount,
      categoryId,
      note,
      date,
      necessity: type === 'expense' ? necessity : null,
    }).then((ok) => {
      setSaving(false)
      if (!ok) return
      flash(`已记下 ¥${formatYuan(amount)}`)
      setRaw('')
      setNote('')
      try {
        navigator.vibrate?.(12)
      } catch {
        // Vibration is optional.
      }
    })
  }

  useAmountKeys((key) => setRaw((current) => applyKey(current, key)), save)

  const streak = computeStreak(entries.map((entry) => entry.date), today)
  const recordedToday = entries.some((entry) => entry.date === today)
  const spent = sumAmount(inMonth(entries, today.slice(0, 7)), 'expense')
  const goal = meta.goal
  const saved = goal ? savedSince(entries, goal.startDate) : 0
  const ratio = goal ? progressRatio(saved, goal.target) : 0

  return (
    <div data-testid="quick-add" className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-semibold">记账</h1>
          <p className="text-sm text-muted">{formatLongDate(today)}</p>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-sm">{streak > 0 ? `已连续记账 ${streak} 天` : '从今天开始记账'}</p>
          <button type="button" className="text-right" onClick={() => go('more')}>
            <BudgetStatus spent={spent} cap={meta.budget} compact />
          </button>
        </div>
        {goal ? (
          <button type="button" className="mt-2 w-full text-left" onClick={() => go('more')}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{goal.name}</span>
              <span className="shrink-0 tabular-nums text-muted">
                {saved < 0 ? `超支 ¥${formatYuan(saved)}` : `已攒 ¥${formatYuan(saved)}`} · {Math.min(100, Math.round(ratio * 100))}%
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, ratio * 100)}%` }} />
            </div>
          </button>
        ) : null}
        {!recordedToday ? (
          <p
            className="mt-2 rounded-2xl px-3 py-2 text-sm"
            style={{ background: 'color-mix(in srgb, var(--want) 16%, var(--surface))' }}
          >
            今天还没记账，花几秒记一笔吧。
          </p>
        ) : null}
        <div className="mt-3 pb-3">
          <EntryFields
            type={type}
            necessity={necessity}
            categoryId={categoryId}
            note={note}
            date={date}
            categories={categories}
            onType={changeType}
            onNecessity={setNecessity}
            onCategory={setCategoryId}
            onNote={setNote}
            onDate={setDate}
          />
        </div>
      </div>
      <div className="shrink-0 border-t border-line bg-bg px-4 pt-2 pb-3">
        <AmountDisplay raw={raw} type={type} />
        <div className="mt-2">
          <Keypad onKey={(key) => setRaw((current) => applyKey(current, key))} />
        </div>
        <Button className="mt-2 w-full" data-testid="save-entry" disabled={saving || yuanToCents(raw) <= 0 || !categoryId} onClick={save}>
          记一笔
        </Button>
      </div>
    </div>
  )
}
