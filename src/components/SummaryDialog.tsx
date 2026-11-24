import { useStore } from '../context/Store.tsx'
import { formatMonth, shiftMonth, currentYm } from '../lib/date.ts'
import { DEMO_BUDGET_CENTS } from '../lib/defaults.ts'
import { formatYuan } from '../lib/money.ts'
import { summarizeMonth } from '../lib/stats.ts'
import { Button } from './ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog.tsx'

export function SummaryDialog() {
  const { entries, demoEntries, categories, meta, summary, closeSummary } = useStore()
  const month = shiftMonth(currentYm(), -1)
  const usingDemo = summary.source === 'demo'
  const source = usingDemo ? demoEntries : entries
  const cap = usingDemo ? DEMO_BUDGET_CENTS : meta.budget
  const card = summarizeMonth(source, categories, month, cap)
  const expense = card.expense
  const needShare = expense > 0 ? Math.round((card.need / expense) * 100) : 0
  const wantShare = expense > 0 ? 100 - needShare : 0
  const empty = card.income === 0 && card.expense === 0

  return (
    <Dialog open={summary.open} onOpenChange={(open) => { if (!open) closeSummary() }}>
      <DialogContent>
        <div data-testid="summary-card">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle>{formatMonth(month)}小结</DialogTitle>
            {usingDemo ? <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">示例</span> : null}
          </div>
          {empty ? (
            <DialogDescription className="mt-3">上个月没有记账。新的一个月，从一笔开始。</DialogDescription>
          ) : (
            <>
              <DialogDescription className="mt-1">看一眼上个月，这个月接着记。</DialogDescription>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">收入</dt>
                  <dd className="tabular-nums text-income">¥{formatYuan(card.income)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">支出</dt>
                  <dd className="tabular-nums text-expense">¥{formatYuan(card.expense)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">{card.income - card.expense >= 0 ? '结余' : '超支'}</dt>
                  <dd className="tabular-nums">¥{formatYuan(Math.abs(card.income - card.expense))}</dd>
                </div>
              </dl>
              <p className="mt-4 text-sm font-medium">
                {card.budget === 'unset' && (usingDemo ? '按示例预算来看。' : '当时没有设预算。')}
                {card.budget === 'inside' && `预算守住了，还剩 ¥${formatYuan((card.cap ?? 0) - card.expense)}`}
                {card.budget === 'exact' && '预算刚好用完。'}
                {card.budget === 'over' && `预算超了 ¥${formatYuan(card.expense - (card.cap ?? 0))}`}
              </p>
              {expense > 0 ? (
                <>
                  <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full bg-need" style={{ width: `${needShare}%` }} />
                    <div className="h-full bg-want" style={{ width: `${wantShare}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-xs">
                    <span className="text-need">必要 ¥{formatYuan(card.need)} · {needShare}%</span>
                    <span className="text-want">想要 ¥{formatYuan(card.want)} · {wantShare}%</span>
                  </div>
                </>
              ) : null}
              {card.top.length > 0 ? (
                <div className="mt-4">
                  <p className="text-sm text-muted">花得最多</p>
                  <ul className="mt-2 space-y-1.5">
                    {card.top.map((slice) => (
                      <li key={slice.id} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <i className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
                          {slice.name}
                        </span>
                        <span className="tabular-nums">¥{formatYuan(slice.cents)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
          <Button className="mt-5 w-full" onClick={closeSummary}>
            知道了
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
