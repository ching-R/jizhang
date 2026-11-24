import { formatMonth, shiftMonth } from '../lib/date.ts'
import { IconChevron } from './Icons.tsx'

export function MonthSwitcher({
  value,
  onChange,
  min,
  max,
}: {
  value: string
  onChange: (value: string) => void
  min: string
  max: string
}) {
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        className="grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-ink disabled:opacity-30"
        disabled={value <= min}
        onClick={() => onChange(shiftMonth(value, -1))}
        aria-label="上个月"
      >
        <IconChevron direction="left" />
      </button>
      <h2 className="text-base font-semibold">{formatMonth(value)}</h2>
      <button
        type="button"
        className="grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-ink disabled:opacity-30"
        disabled={value >= max}
        onClick={() => onChange(shiftMonth(value, 1))}
        aria-label="下个月"
      >
        <IconChevron direction="right" />
      </button>
    </div>
  )
}
