import { useMemo, useState } from 'react'
import { useStore } from '../context/Store.tsx'
import { useGoTo } from '../components/Nav.tsx'
import { BudgetStatus } from '../components/BudgetStatus.tsx'
import { DonutChart, SankeyChartView, StackedBarChart } from '../components/Charts.tsx'
import { MonthSwitcher } from '../components/MonthSwitcher.tsx'
import { Segmented } from '../components/Segmented.tsx'
import { Switch } from '../components/ui/switch.tsx'
import { Button } from '../components/ui/button.tsx'
import { currentYm, formatMonth, shiftMonth, yearOf } from '../lib/date.ts'
import { DEMO_BUDGET_CENTS } from '../lib/defaults.ts'
import { formatYuan } from '../lib/money.ts'
import { buildSankey, buildYearStack, expenseSlices, inMonth, inYear, necessitySplit, sumAmount } from '../lib/stats.ts'

export function StatsView() {
  const { entries, categories, meta, demoEntries, resolvedTheme, setDemo, openSummary } = useStore()
  const go = useGoTo()
  const [month, setMonth] = useState(currentYm())
  const [flow, setFlow] = useState<'month' | 'year'>('month')
  const source = meta.demo ? demoEntries : entries
  const maxMonth = currentYm()
  const minMonth = shiftMonth(maxMonth, -24)
  const year = yearOf(month)

  const monthEntries = useMemo(() => inMonth(source, month), [source, month])
  const yearEntries = useMemo(() => inYear(source, year), [source, year])
  const slices = useMemo(() => expenseSlices(monthEntries, categories), [monthEntries, categories])
  const stack = useMemo(() => buildYearStack(source, categories, year), [source, categories, year])
  const flowEntries = flow === 'month' ? monthEntries : yearEntries
  const sankey = useMemo(() => buildSankey(flowEntries, categories), [flowEntries, categories])
  const income = sumAmount(monthEntries, 'income')
  const expense = sumAmount(monthEntries, 'expense')
  const net = income - expense
  const { need, want } = necessitySplit(monthEntries)
  const needShare = expense > 0 ? need / expense : 0
  const cap = meta.demo ? DEMO_BUDGET_CENTS : meta.budget

  return (
    <div data-testid="stats-page">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-xl font-semibold">统计</h1>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-sm text-muted">示例</span>
          <Switch checked={meta.demo} label="示例数据" onCheckedChange={(checked) => void setDemo(checked)} />
        </div>
      </div>
      {meta.demo ? (
        <p className="mt-3 rounded-2xl bg-accent-soft px-3 py-2 text-sm">正在预览示例数据，你的账本没有改动。</p>
      ) : null}
      <div className="mt-3">
        <MonthSwitcher value={month} onChange={setMonth} min={minMonth} max={maxMonth} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-[24px] bg-surface p-3 text-center">
        <div>
          <p className="text-xs text-muted">收入</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-income">¥{formatYuan(income)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">支出</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-expense">¥{formatYuan(expense)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">{net >= 0 ? '结余' : '超支'}</p>
          <p className={`mt-1 text-sm font-semibold tabular-nums ${net >= 0 ? 'text-income' : 'text-expense'}`}>¥{formatYuan(Math.abs(net))}</p>
        </div>
      </div>

      <section className="mt-3 rounded-[24px] bg-surface p-4">
        <h2 className="text-sm font-medium">必要和想要</h2>
        {expense === 0 ? (
          <p className="mt-2 text-sm text-muted">这个月还没有支出</p>
        ) : (
          <>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full bg-need" style={{ width: `${needShare * 100}%` }} />
              <div className="h-full bg-want" style={{ width: `${(1 - needShare) * 100}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-need">必要 ¥{formatYuan(need)}</span>
              <span className="text-want">想要 ¥{formatYuan(want)}</span>
            </div>
          </>
        )}
      </section>

      <section className="mt-3 rounded-[24px] bg-surface p-4" data-testid="stats-budget">
        <h2 className="text-sm font-medium">本月预算</h2>
        {meta.demo ? <p className="mt-1 text-xs text-muted">示例预算每月 ¥{formatYuan(DEMO_BUDGET_CENTS)}，只用来预览提醒。</p> : null}
        <div className="mt-2">
          <BudgetStatus spent={expense} cap={cap} />
        </div>
        {!meta.demo && meta.budget == null ? (
          <button type="button" className="mt-2 text-sm text-accent" onClick={() => go('more')}>
            去设置每月预算
          </button>
        ) : null}
      </section>

      <section className="mt-3 rounded-[24px] bg-surface p-4">
        <h2 className="text-sm font-medium">支出构成</h2>
        <div className="mt-2">
          <DonutChart slices={slices} theme={resolvedTheme} />
        </div>
      </section>

      <section className="mt-3 rounded-[24px] bg-surface p-4">
        <h2 className="text-sm font-medium">{year} 年各月支出</h2>
        <p className="mt-1 text-xs text-muted">每个月按分类堆叠。</p>
        <div className="mt-2">
          <StackedBarChart stack={stack} theme={resolvedTheme} />
        </div>
      </section>

      <section className="mt-3 rounded-[24px] bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">钱的流向</h2>
        </div>
        <p className="mt-1 text-xs text-muted">左边是收入来源，右边是支出和结余。</p>
        <div className="mt-3">
          <Segmented
            label="流向范围"
            value={flow}
            onChange={setFlow}
            options={[
              { value: 'month', label: '本月' },
              { value: 'year', label: '今年' },
            ]}
          />
        </div>
        <div className="mt-2">
          <SankeyChartView model={sankey} theme={resolvedTheme} />
        </div>
      </section>

      <Button
        variant="outline"
        className="mt-4 w-full"
        data-testid="open-summary"
        onClick={() => openSummary(meta.demo ? 'demo' : 'real')}
      >
        看{formatMonth(shiftMonth(currentYm(), -1))}小结
      </Button>
    </div>
  )
}
