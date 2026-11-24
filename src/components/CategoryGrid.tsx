import type { Category } from '../types.ts'

export function CategoryGrid({
  categories,
  selectedId,
  onSelect,
}: {
  categories: Category[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  if (categories.length === 0) {
    return <p className="rounded-2xl bg-surface-2 px-3 py-4 text-sm text-muted">没有可用分类。到「我的」里加一个。</p>
  }
  return (
    <div className="grid grid-cols-5 gap-2">
      {categories.map((category) => {
        const selected = category.id === selectedId
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            aria-pressed={selected}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-xs"
            style={{
              background: selected ? `color-mix(in srgb, ${category.color} 22%, var(--surface))` : 'var(--surface-2)',
              boxShadow: selected ? `inset 0 0 0 2px ${category.color}` : undefined,
            }}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: category.color }} />
            <span className="line-clamp-2 w-full text-center leading-tight">{category.name}</span>
          </button>
        )
      })}
    </div>
  )
}
