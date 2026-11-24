import type { Category, Meta } from '../types.ts'

export const PALETTE = [
  '#E07A5F',
  '#D4533A',
  '#C46B4A',
  '#C9842A',
  '#D4A054',
  '#C4A15A',
  '#8A7A4B',
  '#3E7C6F',
  '#1F7A62',
  '#2E8B9A',
  '#3D7A9A',
  '#5C6B8A',
  '#6A5A8A',
  '#B85C6E',
  '#8A8178',
  '#4A6670',
]

export const SURPLUS_COLOR = '#1B6B56'
export const DEFICIT_COLOR = '#D4533A'
export const DEMO_BUDGET_CENTS = 220_000

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'exp-food', type: 'expense', name: '餐饮', color: '#E07A5F', sort: 0, archived: false },
  { id: 'exp-transit', type: 'expense', name: '交通', color: '#3D7A9A', sort: 1, archived: false },
  { id: 'exp-shop', type: 'expense', name: '购物', color: '#C46B4A', sort: 2, archived: false },
  { id: 'exp-fun', type: 'expense', name: '娱乐', color: '#C9842A', sort: 3, archived: false },
  { id: 'exp-study', type: 'expense', name: '学习', color: '#3E7C6F', sort: 4, archived: false },
  { id: 'exp-comm', type: 'expense', name: '通讯网络', color: '#5C6B8A', sort: 5, archived: false },
  { id: 'exp-daily', type: 'expense', name: '日用', color: '#8A7A4B', sort: 6, archived: false },
  { id: 'exp-med', type: 'expense', name: '医疗', color: '#B85C6E', sort: 7, archived: false },
  { id: 'exp-social', type: 'expense', name: '人情', color: '#D4A054', sort: 8, archived: false },
  { id: 'exp-other', type: 'expense', name: '其他', color: '#8A8178', sort: 9, archived: false },
  { id: 'inc-living', type: 'income', name: '生活费', color: '#1F7A62', sort: 0, archived: false },
  { id: 'inc-job', type: 'income', name: '兼职', color: '#2E8B9A', sort: 1, archived: false },
  { id: 'inc-award', type: 'income', name: '奖学金', color: '#C4A15A', sort: 2, archived: false },
  { id: 'inc-other', type: 'income', name: '其他', color: '#8A8178', sort: 3, archived: false },
]

export function defaultMeta(): Meta {
  return {
    theme: 'system',
    budget: null,
    goal: null,
    summarySeenFor: null,
    lastCategoryId: { expense: null, income: null },
    demo: false,
  }
}

export function cloneCategories(): Category[] {
  return DEFAULT_CATEGORIES.map((category) => ({ ...category }))
}
