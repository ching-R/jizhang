import { activeCategories } from '../lib/categories.ts'
import type { Category, EntryType, Necessity } from '../types.ts'
import { CategoryGrid } from './CategoryGrid.tsx'
import { Input } from './ui/input.tsx'
import { Segmented } from './Segmented.tsx'

export function EntryFields({
  type,
  necessity,
  categoryId,
  note,
  date,
  categories,
  onType,
  onNecessity,
  onCategory,
  onNote,
  onDate,
}: {
  type: EntryType
  necessity: Necessity
  categoryId: string
  note: string
  date: string
  categories: Category[]
  onType: (type: EntryType) => void
  onNecessity: (necessity: Necessity) => void
  onCategory: (id: string) => void
  onNote: (note: string) => void
  onDate: (date: string) => void
}) {
  const visible = activeCategories(categories, type)
  const current = categories.find((category) => category.id === categoryId)
  const list = current && current.type === type && !visible.some((category) => category.id === current.id) ? [current, ...visible] : visible
  return (
    <div className="space-y-2">
      <Segmented
        label="收入或支出"
        value={type}
        onChange={onType}
        options={[
          { value: 'expense', label: '支出', activeClass: 'bg-surface text-expense shadow-sm' },
          { value: 'income', label: '收入', activeClass: 'bg-surface text-income shadow-sm' },
        ]}
      />
      {type === 'expense' ? (
        <Segmented
          label="必要或想要"
          value={necessity}
          onChange={onNecessity}
          options={[
            { value: 'need', label: '必要', activeClass: 'bg-surface text-need shadow-sm' },
            { value: 'want', label: '想要', activeClass: 'bg-surface text-want shadow-sm' },
          ]}
        />
      ) : null}
      <CategoryGrid categories={list} selectedId={categoryId} onSelect={onCategory} />
      <div className="flex gap-2">
        <Input value={note} onChange={(event) => onNote(event.target.value)} placeholder="备注，可空" maxLength={100} aria-label="备注" className="h-12 min-w-0 flex-1" />
        <input
          type="date"
          value={date}
          onChange={(event) => onDate(event.target.value)}
          aria-label="日期"
          className="h-12 w-[9.5rem] shrink-0 rounded-2xl border border-line bg-surface px-2 text-base text-ink"
        />
      </div>
    </div>
  )
}

export function AmountDisplay({ raw, type }: { raw: string; type: EntryType }) {
  return (
    <p
      className={`text-[40px] leading-none font-semibold tracking-tight tabular-nums ${type === 'expense' ? 'text-expense' : 'text-income'}`}
      aria-live="polite"
    >
      <span className="mr-1 text-[22px] font-medium">¥</span>
      {raw || '0'}
    </p>
  )
}
