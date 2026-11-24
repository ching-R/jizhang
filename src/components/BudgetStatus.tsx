import { budgetLevel } from '../lib/stats.ts'
import { formatYuan } from '../lib/money.ts'

export function BudgetStatus({ spent, cap, compact = false }: { spent: number; cap: number | null; compact?: boolean }) {
  if (cap == null) {
    return <p className={compact ? 'text-sm text-muted' : 'text-sm text-muted'}>还没设置每月预算</p>
  }
  const level = budgetLevel(spent, cap)
  const ratio = cap > 0 ? spent / cap : 1
  const width = Math.min(100, Math.max(0, ratio * 100))
  const color = level === 'over' ? 'var(--danger)' : level === 'warn' ? 'var(--warn)' : 'var(--income)'
  let text = `还剩 ¥${formatYuan(cap - spent)}`
  if (spent > cap) text = `已超出预算 ¥${formatYuan(spent - cap)}`
  else if (spent === cap) text = '预算刚好用完'
  else if (level === 'warn') text = `已用 ${Math.round(ratio * 100)}%，还剩 ¥${formatYuan(cap - spent)}`

  if (compact) {
    return (
      <span className="text-sm font-medium" style={{ color }}>
        {text}
      </span>
    )
  }

  return (
    <div>
      <p className="text-sm font-medium" style={{ color }}>
        {text}
      </p>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full" style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  )
}
