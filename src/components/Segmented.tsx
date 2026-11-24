import { cn } from '../lib/cn.ts'

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; activeClass?: string }[]
  label: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1 rounded-2xl bg-surface-2 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn('h-10 rounded-xl text-sm font-medium', active ? (option.activeClass ?? 'bg-surface text-ink shadow-sm') : 'text-muted')}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
