import type { Category, EntryType, Meta } from '../types.ts'

export function activeCategories(categories: Category[], type: EntryType): Category[] {
  return categories
    .filter((category) => category.type === type && !category.archived)
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, 'zh'))
}

export function defaultCategoryId(categories: Category[], type: EntryType, meta: Meta): string {
  const list = activeCategories(categories, type)
  const last = meta.lastCategoryId[type]
  if (last && list.some((category) => category.id === last)) return last
  return list[0]?.id ?? ''
}

export function categoryLookup(categories: Category[]): Map<string, Category> {
  return new Map(categories.map((category) => [category.id, category]))
}
