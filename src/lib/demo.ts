import { cloneCategories } from './defaults.ts'
import { parseYmd, recentMonths, scheduledYmd, ymd } from './date.ts'
import type { Category, Entry, Necessity } from '../types.ts'

const FOOD_DAYS = [2, 5, 8, 11, 14, 17, 20, 23, 27]
const SNACK_DAYS = [3, 10, 16, 22]
const TRANSIT_DAYS = [4, 12, 19, 25]
const SHOP_DAYS = [9, 21]
const FUN_DAYS = [6, 18]
const STUDY_DAYS = [13]
const DAILY_DAYS = [7, 15]

const FOOD_NOTES = ['食堂', '早餐', '盖饭', '面条']
const CURRENT_MONTH = {
  foodNeed: 98_000,
  foodWant: 15_000,
  traffic: 8_600,
  shop: 44_000,
  fun: 12_000,
  phone: 5_900,
  member: 2_500,
  daily: 4_200,
}

export function demoCategories(): Category[] {
  return cloneCategories()
}

export function buildDemo(today: Date): Entry[] {
  const todayStr = ymd(today)
  const months = recentMonths(today, 12)
  const entries: Entry[] = []
  let clock = 0

  const push = (partial: {
    date: string
    type: Entry['type']
    amount: number
    categoryId: string
    note: string
    necessity: Necessity | null
    auto?: boolean
    recurringId?: string | null
  }) => {
    if (partial.date > todayStr || partial.amount <= 0) return
    clock += 1
    const createdAt = parseYmd(partial.date).getTime() + clock
    entries.push({
      id: `demo:${partial.date}:${partial.categoryId}:${clock}`,
      type: partial.type,
      amount: partial.amount,
      categoryId: partial.categoryId,
      note: partial.note,
      date: partial.date,
      necessity: partial.type === 'expense' ? partial.necessity : null,
      recurringId: partial.recurringId ?? null,
      auto: partial.auto ?? false,
      createdAt,
      updatedAt: createdAt,
    })
  }

  const spread = (total: number, count: number): number[] => {
    if (count <= 0 || total <= 0) return []
    const base = Math.floor(total / count)
    let remainder = total - base * count
    return Array.from({ length: count }, () => {
      const extra = remainder > 0 ? 1 : 0
      remainder -= extra
      return base + extra
    })
  }

  const datesFor = (ym: string, days: number[]): string[] => {
    const unique = [...new Set(days.map((day) => scheduledYmd(ym, day)))]
    const picked = unique.filter((date) => date <= todayStr)
    if (picked.length === 0 && `${ym}-01` <= todayStr) return [`${ym}-01`]
    return picked
  }

  const addSpread = (
    ym: string,
    total: number,
    days: number[],
    categoryId: string,
    necessity: Necessity,
    notes: string[],
  ) => {
    const dates = datesFor(ym, days)
    const parts = spread(total, dates.length)
    dates.forEach((date, index) => {
      push({
        date,
        type: 'expense',
        amount: parts[index] ?? 0,
        categoryId,
        note: notes[index % notes.length] ?? '',
        necessity,
      })
    })
  }

  months.forEach((ym, index) => {
    const current = index === months.length - 1
    push({
      date: `${ym}-01`,
      type: 'income',
      amount: 200_000,
      categoryId: 'inc-living',
      note: '生活费',
      necessity: null,
    })
    if (current || index % 3 !== 2) {
      push({
        date: scheduledYmd(ym, 16),
        type: 'income',
        amount: current ? 120_000 : 80_000 + index * 4_000,
        categoryId: 'inc-job',
        note: '兼职',
        necessity: null,
      })
    }
    if (ym.endsWith('-09')) {
      push({
        date: scheduledYmd(ym, 10),
        type: 'income',
        amount: 300_000,
        categoryId: 'inc-award',
        note: '奖学金',
        necessity: null,
      })
    }

    if (current) {
      addSpread(ym, CURRENT_MONTH.foodNeed, FOOD_DAYS, 'exp-food', 'need', FOOD_NOTES)
      addSpread(ym, CURRENT_MONTH.foodWant, SNACK_DAYS, 'exp-food', 'want', ['奶茶'])
      addSpread(ym, CURRENT_MONTH.traffic, TRANSIT_DAYS, 'exp-transit', 'need', ['地铁'])
      addSpread(ym, CURRENT_MONTH.shop, SHOP_DAYS, 'exp-shop', 'want', ['衣服'])
      addSpread(ym, CURRENT_MONTH.fun, FUN_DAYS, 'exp-fun', 'want', ['电影'])
      addSpread(ym, CURRENT_MONTH.daily, DAILY_DAYS, 'exp-daily', 'need', ['超市'])
    } else {
      addSpread(ym, 80_000 + index * 1_800, FOOD_DAYS, 'exp-food', 'need', FOOD_NOTES)
      addSpread(ym, 12_000 + (index % 3) * 2_000, SNACK_DAYS, 'exp-food', 'want', ['奶茶'])
      addSpread(ym, 6_000 + (index % 4) * 1_500, TRANSIT_DAYS, 'exp-transit', 'need', ['地铁'])
      addSpread(ym, 8_000 + (index % 5) * 12_000, SHOP_DAYS, 'exp-shop', 'want', ['衣服'])
      addSpread(ym, 5_000 + (index % 3) * 4_000, FUN_DAYS, 'exp-fun', 'want', ['电影'])
      if (index % 2 === 0) addSpread(ym, 3_500, STUDY_DAYS, 'exp-study', 'need', ['打印'])
      addSpread(ym, 3_000 + (index % 3) * 800, DAILY_DAYS, 'exp-daily', 'need', ['超市'])
      if (index % 4 === 0) addSpread(ym, 7_000, [11], 'exp-med', 'need', ['感冒药'])
      if (index % 5 === 3) addSpread(ym, 20_000, [20], 'exp-social', 'need', ['聚餐'])
      if (index === 7) addSpread(ym, 220_000, [18], 'exp-shop', 'want', ['耳机'])
    }

    push({
      date: scheduledYmd(ym, 5),
      type: 'expense',
      amount: current ? CURRENT_MONTH.phone : 5_900,
      categoryId: 'exp-comm',
      note: '话费',
      necessity: 'need',
      auto: true,
      recurringId: 'demo-phone',
    })
    push({
      date: scheduledYmd(ym, 12),
      type: 'expense',
      amount: current ? CURRENT_MONTH.member : 2_500,
      categoryId: 'exp-fun',
      note: '视频会员',
      necessity: 'want',
      auto: true,
      recurringId: 'demo-member',
    })
  })

  return entries
}
