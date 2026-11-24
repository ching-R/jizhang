import { useState } from 'react'
import { useStore } from '../context/Store.tsx'
import { activeCategories } from '../lib/categories.ts'
import { currentYm, formatLongDate, isYmd } from '../lib/date.ts'
import { PALETTE } from '../lib/defaults.ts'
import { downloadBackup, parseBackup } from '../lib/backup.ts'
import { centsToInput, formatYuan, yuanToCents } from '../lib/money.ts'
import { inMonth, progressRatio, savedSince, sumAmount } from '../lib/stats.ts'
import type { Category, EntryType, Goal, Necessity } from '../types.ts'
import { BudgetStatus } from './BudgetStatus.tsx'
import { Button } from './ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog.tsx'
import { Input } from './ui/input.tsx'
import { Switch } from './ui/switch.tsx'

export function GoalCard() {
  const { entries, meta, setGoal, flash } = useStore()
  const goal = meta.goal
  const [editing, setEditing] = useState(goal == null)
  const [name, setName] = useState(goal?.name ?? '暑假旅行')
  const [target, setTarget] = useState(goal ? centsToInput(goal.target) : '3000')
  const [startDate, setStartDate] = useState(goal?.startDate ?? currentYm() + '-01')

  const saved = goal ? savedSince(entries, goal.startDate) : 0
  const ratio = goal ? progressRatio(saved, goal.target) : 0

  const save = () => {
    const amount = yuanToCents(target)
    if (!name.trim() || amount <= 0 || !isYmd(startDate)) {
      flash('写上名字、目标和开始日期')
      return
    }
    const next: Goal = {
      name: name.trim().slice(0, 20),
      target: amount,
      startDate,
      createdAt: goal?.createdAt ?? Date.now(),
      celebrated: goal?.celebrated ?? { p25: false, p50: false, p100: false },
    }
    void setGoal(next).then((ok) => {
      if (ok) setEditing(false)
    })
  }

  return (
    <section className="rounded-[24px] bg-surface p-4" data-testid="goal-card">
      <h2 className="text-base font-semibold">储蓄目标</h2>
      <p className="mt-1 text-sm text-muted">已攒 = 从开始那天起的全部收入 − 全部支出。只算这一天和之后的账，可以是负数。</p>
      {goal && !editing ? (
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-lg font-medium">{goal.name}</p>
            <p className="shrink-0 text-sm tabular-nums text-muted">{Math.min(100, Math.round(ratio * 100))}%</p>
          </div>
          <p className="mt-1 text-sm tabular-nums">
            {saved < 0 ? `目前超支 ¥${formatYuan(saved)}` : `已攒 ¥${formatYuan(saved)}`} / ¥{formatYuan(goal.target)}
          </p>
          <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, ratio * 100)}%` }} />
            <span className="absolute inset-y-0 w-px bg-ink/15" style={{ left: '25%' }} />
            <span className="absolute inset-y-0 w-px bg-ink/15" style={{ left: '50%' }} />
          </div>
          <p className="mt-2 text-xs text-muted">
            {saved >= goal.target ? '目标达成。' : saved < 0 ? '先把这段时间的支出记清楚。' : `还差 ¥${formatYuan(goal.target - saved)}`}
            {' · '}从 {formatLongDate(goal.startDate)} 起算。
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>修改</Button>
            <Button variant="ghost" onClick={() => void setGoal(null)}>清除目标</Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <Input value={name} onChange={(event) => setName(event.target.value)} aria-label="目标名称" placeholder="比如 暑假旅行" maxLength={20} />
          <Input value={target} onChange={(event) => setTarget(event.target.value)} aria-label="目标金额" inputMode="decimal" placeholder="3000" />
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            aria-label="开始日期"
            className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base"
          />
          <div className={goal ? 'grid grid-cols-2 gap-2' : ''}>
            {goal ? <Button variant="outline" onClick={() => setEditing(false)}>取消</Button> : null}
            <Button className="w-full" onClick={save}>设好</Button>
          </div>
        </div>
      )}
    </section>
  )
}

export function BudgetCard() {
  const { entries, meta, today, setBudget, flash } = useStore()
  const [raw, setRaw] = useState(meta.budget ? centsToInput(meta.budget) : '')
  const spent = sumAmount(inMonth(entries, today.slice(0, 7)), 'expense')

  return (
    <section className="rounded-[24px] bg-surface p-4" data-testid="budget-card">
      <h2 className="text-base font-semibold">每月预算</h2>
      <p className="mt-1 text-sm text-muted">给每个月的支出设一个上限。用到 80% 和用完时，首页会提醒。</p>
      <div className="mt-3 flex gap-2">
        <Input value={raw} onChange={(event) => setRaw(event.target.value)} aria-label="每月预算金额" inputMode="decimal" placeholder="比如 2000" />
        <Button
          className="shrink-0"
          onClick={() => {
            const amount = yuanToCents(raw)
            if (amount <= 0) {
              flash('预算要大于 0')
              return
            }
            void setBudget(amount)
          }}
        >
          保存
        </Button>
      </div>
      <div className="mt-3">
        <BudgetStatus spent={spent} cap={meta.budget} />
      </div>
      {meta.budget != null ? (
        <button type="button" className="mt-2 text-sm text-muted" onClick={() => { setRaw(''); void setBudget(null) }}>
          清除预算
        </button>
      ) : null}
    </section>
  )
}

export function CategoryManager() {
  const { categories, entries, recurrings, addCategory, updateCategory, archiveCategory, deleteCategory } = useStore()
  const [type, setType] = useState<EntryType>('expense')
  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[0] ?? '#E07A5F')
  const visible = categories.filter((category) => category.type === type && !category.archived).sort((a, b) => a.sort - b.sort)
  const archived = categories.filter((category) => category.type === type && category.archived)

  return (
    <section className="rounded-[24px] bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">分类</h2>
        <div className="grid grid-cols-2 rounded-xl bg-surface-2 p-1 text-sm">
          {(['expense', 'income'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setType(item)}
              className={`h-9 rounded-lg px-3 ${type === item ? 'bg-surface font-medium' : 'text-muted'}`}
            >
              {item === 'expense' ? '支出' : '收入'}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {visible.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            used={entries.some((entry) => entry.categoryId === category.id) || recurrings.some((item) => item.categoryId === category.id)}
            canArchive={visible.length > 1}
            onUpdate={updateCategory}
            onArchive={archiveCategory}
            onDelete={deleteCategory}
          />
        ))}
      </div>
      {archived.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted">已归档</p>
          {archived.map((category) => (
            <div key={category.id} className="flex items-center justify-between gap-2 rounded-2xl bg-surface-2 px-3 py-2">
              <span className="flex items-center gap-2 text-sm text-muted">
                <i className="h-3 w-3 rounded-full" style={{ background: category.color }} />
                {category.name}
              </span>
              <button type="button" className="text-sm text-accent" onClick={() => void archiveCategory(category.id, false)}>
                恢复
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-3 space-y-2">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="新分类名称" aria-label="新分类名称" maxLength={12} />
        <Palette value={color} onChange={setColor} />
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            void addCategory({ type, name, color }).then((ok) => {
              if (ok) setName('')
            })
          }}
        >
          添加分类
        </Button>
      </div>
    </section>
  )
}

function CategoryRow({
  category,
  used,
  canArchive,
  onUpdate,
  onArchive,
  onDelete,
}: {
  category: Category
  used: boolean
  canArchive: boolean
  onUpdate: (category: Category) => Promise<boolean>
  onArchive: (id: string, archived: boolean) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}) {
  const [name, setName] = useState(category.name)
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl bg-surface-2 p-3">
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`${category.name}的颜色`} className="h-10 w-10 shrink-0 rounded-full" style={{ background: category.color }} onClick={() => setOpen((value) => !value)} />
        <input
          value={name}
          aria-label={`${category.name}名称`}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => {
            const next = name.trim()
            if (!next || next === category.name) {
              setName(category.name)
              return
            }
            void onUpdate({ ...category, name: next })
          }}
          className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-base"
        />
      </div>
      {open ? (
        <div className="mt-2">
          <Palette value={category.color} onChange={(color) => void onUpdate({ ...category, color })} />
        </div>
      ) : null}
      <div className="mt-2 flex justify-end gap-3 text-sm">
        <button type="button" className="text-muted disabled:opacity-40" disabled={!canArchive} onClick={() => void onArchive(category.id, true)}>
          归档
        </button>
        {!used ? (
          <button type="button" className="text-danger" onClick={() => void onDelete(category.id)}>
            删除
          </button>
        ) : null}
      </div>
    </div>
  )
}

function Palette({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="listbox" aria-label="分类颜色">
      {PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          onClick={() => onChange(color)}
          className="h-8 w-8 rounded-full"
          style={{ background: color, boxShadow: value.toLowerCase() === color.toLowerCase() ? 'inset 0 0 0 2px white, 0 0 0 2px var(--ink)' : undefined }}
        />
      ))}
    </div>
  )
}

export function RecurringManager() {
  const { recurrings, categories, addRecurring, updateRecurring, deleteRecurring, flash } = useStore()
  const expenseCategories = activeCategories(categories, 'expense')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('话费')
  const [amount, setAmount] = useState('59')
  const [categoryId, setCategoryId] = useState(expenseCategories.find((item) => item.id === 'exp-comm')?.id ?? expenseCategories[0]?.id ?? '')
  const [day, setDay] = useState('5')
  const [necessity, setNecessity] = useState<Necessity>('need')

  return (
    <section className="rounded-[24px] bg-surface p-4">
      <h2 className="text-base font-semibold">固定支出</h2>
      <p className="mt-1 text-sm text-muted">话费、会员这种每月一次的账，打开应用时会自动记下，漏掉的月份会补上。标成「自动」。</p>
      <div className="mt-3 space-y-2">
        {recurrings.length === 0 ? <p className="text-sm text-muted">还没有固定支出。</p> : null}
        {recurrings.map((item) => {
          const category = categories.find((category) => category.id === item.categoryId)
          return (
            <div key={item.id} className="rounded-2xl bg-surface-2 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted">
                    每月 {item.day} 日 · ¥{formatYuan(item.amount)} · {category?.name ?? '未分类'} · {item.necessity === 'want' ? '想要' : '必要'}
                  </p>
                </div>
                <Switch
                  checked={item.enabled}
                  label={`${item.name}自动记账`}
                  onCheckedChange={(checked) => void updateRecurring({ ...item, enabled: checked })}
                />
              </div>
              <button type="button" className="mt-2 text-sm text-danger" onClick={() => void deleteRecurring(item.id)}>
                删除规则
              </button>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-muted">重新打开后从当前该记的月份开始，停用期间不补记。没有这一天的月份，记在当月最后一天。</p>
      {open ? (
        <div className="mt-3 space-y-2">
          <Input value={name} onChange={(event) => setName(event.target.value)} aria-label="固定支出名称" placeholder="名称" maxLength={20} />
          <Input value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="固定支出金额" inputMode="decimal" placeholder="金额" />
          <label className="block text-sm text-muted">
            分类
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="mt-1 h-12 w-full rounded-2xl border border-line bg-surface px-3 text-base text-ink"
            >
              {expenseCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-muted">
            每月几号
            <Input value={day} onChange={(event) => setDay(event.target.value)} inputMode="numeric" aria-label="每月几号" className="mt-1" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['need', 'want'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setNecessity(item)}
                className={`h-11 rounded-2xl text-sm ${necessity === item ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted'}`}
              >
                {item === 'need' ? '必要' : '想要'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button
              onClick={() => {
                const cents = yuanToCents(amount)
                const dayNumber = Number(day)
                if (!name.trim() || cents <= 0 || !categoryId || !Number.isInteger(dayNumber)) {
                  flash('把名称、金额、分类和日期填完整')
                  return
                }
                void addRecurring({ name, amount: cents, categoryId, day: dayNumber, necessity }).then((ok) => {
                  if (ok) setOpen(false)
                })
              }}
            >
              添加
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" className="mt-3 w-full" onClick={() => setOpen(true)}>
          添加固定支出
        </Button>
      )}
    </section>
  )
}

export function BackupPanel() {
  const store = useStore()
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <section className="rounded-[24px] border border-want/40 bg-surface p-4">
      <h2 className="text-base font-semibold">备份</h2>
      <p className="mt-2 text-sm leading-relaxed">
        账本只存在这台手机的浏览器里。清除浏览器数据、换浏览器或换手机，记录会消失。换机前请先导出 JSON 备份。
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          onClick={() => {
            downloadBackup({
              entries: store.entries,
              categories: store.categories,
              recurrings: store.recurrings,
              meta: store.meta,
            })
            store.flash('已导出备份')
          }}
        >
          导出
        </Button>
        <label className="inline-flex h-12 cursor-pointer items-center justify-center rounded-2xl bg-accent px-4 text-base font-medium text-accent-ink">
          导入
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              void file.text().then((text) => {
                const parsed = parseBackup(text)
                if (!parsed.ok) {
                  setError(parsed.error)
                  setPending(null)
                  return
                }
                setError(null)
                setPending(text)
              })
            }}
          />
        </label>
      </div>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      <Dialog open={pending !== null} onOpenChange={(open) => { if (!open) setPending(null) }}>
        <DialogContent>
          <DialogTitle>用备份覆盖当前账本？</DialogTitle>
          <DialogDescription className="mt-2">还没导出的记录会丢失。导入后示例数据会关掉。</DialogDescription>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setPending(null)}>取消</Button>
            <Button
              onClick={() => {
                if (!pending) return
                const parsed = parseBackup(pending)
                if (!parsed.ok) {
                  setError(parsed.error)
                  setPending(null)
                  return
                }
                void store.importState(parsed.state).then((ok) => {
                  if (!ok) return
                  store.flash(parsed.skipped > 0 ? `已导入，跳过 ${parsed.skipped} 笔无效记录` : `已导入 ${parsed.state.entries.length} 笔`)
                  setPending(null)
                })
              }}
            >
              覆盖导入
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
