import { useState } from 'react'
import { useStore } from '../context/Store.tsx'
import { useGoTo } from '../components/Nav.tsx'
import { EntryEditor } from '../components/EntryEditor.tsx'
import { MonthSwitcher } from '../components/MonthSwitcher.tsx'
import { Dialog, DialogContent, DialogTitle } from '../components/ui/dialog.tsx'
import { Button } from '../components/ui/button.tsx'
import { categoryLookup } from '../lib/categories.ts'
import { currentYm, formatLongDate, shiftMonth } from '../lib/date.ts'
import { formatYuan } from '../lib/money.ts'
import { groupByDate, inMonth, sumAmount } from '../lib/stats.ts'

export function ListView() {
  const { entries, categories, today, ledgerMonth } = useStore()
  const go = useGoTo()
  const [month, setMonth] = useState(ledgerMonth)
  const [trackedLedger, setTrackedLedger] = useState(ledgerMonth)
  const [editingId, setEditingId] = useState<string | null>(null)
  if (trackedLedger !== ledgerMonth) {
    setTrackedLedger(ledgerMonth)
    setMonth(ledgerMonth)
  }

  const monthEntries = inMonth(entries, month)
  const groups = groupByDate(monthEntries)
  const lookup = categoryLookup(categories)
  const editing = entries.find((entry) => entry.id === editingId) ?? null
  const maxMonth = currentYm()
  const minMonth = shiftMonth(maxMonth, -36)

  return (
    <div data-testid="ledger">
      <h1 className="text-xl font-semibold">明细</h1>
      <div className="mt-3">
        <MonthSwitcher value={month} onChange={setMonth} min={minMonth} max={maxMonth} />
      </div>
      <div className="mt-3 flex justify-between text-sm">
        <span className="text-expense">支出 ¥{formatYuan(sumAmount(monthEntries, 'expense'))}</span>
        <span className="text-income">收入 ¥{formatYuan(sumAmount(monthEntries, 'income'))}</span>
      </div>
      {groups.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="text-base font-medium">这个月还没有账</p>
          <p className="mt-1 text-sm text-muted">记第一笔，只要几秒。</p>
          <Button className="mt-4" onClick={() => go('add')}>
            去记一笔
          </Button>
        </div>
      ) : (
        groups.map((group) => {
          const expense = sumAmount(group.entries, 'expense')
          const income = sumAmount(group.entries, 'income')
          return (
            <section key={group.date} className="mt-4">
              <div className="flex items-baseline justify-between px-1 text-sm text-muted">
                <span>
                  {formatLongDate(group.date)}
                  {group.date === today ? ' · 今天' : ''}
                </span>
                <span className="tabular-nums">
                  {expense > 0 ? <span className="text-expense">−¥{formatYuan(expense)}</span> : null}
                  {income > 0 ? <span className="ml-2 text-income">+¥{formatYuan(income)}</span> : null}
                </span>
              </div>
              <div className="mt-1.5 space-y-2">
                {group.entries.map((entry) => {
                  const category = lookup.get(entry.categoryId)
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setEditingId(entry.id)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-surface px-3 py-3 text-left"
                    >
                      <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: category?.color ?? '#8A8178' }} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate font-medium">{category?.name ?? '未分类'}</span>
                          {entry.auto ? <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent">自动</span> : null}
                          {entry.necessity === 'want' ? (
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px] text-want"
                              style={{ background: 'color-mix(in srgb, var(--want) 18%, var(--surface))' }}
                            >
                              想要
                            </span>
                          ) : null}
                        </span>
                        {entry.note ? <span className="mt-0.5 block truncate text-sm text-muted">{entry.note}</span> : null}
                      </span>
                      <span className={`shrink-0 tabular-nums ${entry.type === 'expense' ? 'text-expense' : 'text-income'}`}>
                        {entry.type === 'expense' ? '−' : '+'}¥{formatYuan(entry.amount)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })
      )}
      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditingId(null) }}>
        <DialogContent side="bottom">
          <DialogTitle className="sr-only">修改记录</DialogTitle>
          {editing ? <EntryEditor entry={editing} onDone={() => setEditingId(null)} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
