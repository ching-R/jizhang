import { useState } from 'react'
import { useStore } from '../context/Store.tsx'
import { defaultCategoryId } from '../lib/categories.ts'
import { isYmd } from '../lib/date.ts'
import { applyKey, centsToInput, yuanToCents } from '../lib/money.ts'
import type { Entry, EntryType, Necessity } from '../types.ts'
import { AmountDisplay, EntryFields } from './EntryFields.tsx'
import { Keypad, useAmountKeys } from './Keypad.tsx'
import { Button } from './ui/button.tsx'

export function EntryEditor({ entry, onDone }: { entry: Entry; onDone: () => void }) {
  const { categories, meta, updateEntry, deleteEntry, flash } = useStore()
  const [type, setType] = useState<EntryType>(entry.type)
  const [raw, setRaw] = useState(centsToInput(entry.amount))
  const [categoryId, setCategoryId] = useState(entry.categoryId)
  const [note, setNote] = useState(entry.note)
  const [date, setDate] = useState(entry.date)
  const [necessity, setNecessity] = useState<Necessity>(entry.necessity === 'want' ? 'want' : 'need')
  const [confirming, setConfirming] = useState(false)

  const changeType = (next: EntryType) => {
    setType(next)
    const current = categories.find((category) => category.id === categoryId)
    if (!current || current.type !== next) setCategoryId(defaultCategoryId(categories, next, meta))
  }

  const save = () => {
    const amount = yuanToCents(raw)
    if (amount <= 0 || !categoryId || !isYmd(date)) {
      flash('先填一个大于 0 的金额')
      return
    }
    void updateEntry({
      ...entry,
      type,
      amount,
      categoryId,
      note: note.trim(),
      date,
      necessity: type === 'expense' ? necessity : null,
      updatedAt: Date.now(),
    }).then((ok) => {
      if (!ok) return
      flash('已保存')
      onDone()
    })
  }

  useAmountKeys((key) => setRaw((current) => applyKey(current, key)), save, { allowInDialog: true, enabled: !confirming })

  if (confirming) {
    return (
      <div>
        <p className="text-lg font-semibold">删除这条记录？</p>
        <p className="mt-2 text-sm text-muted">
          {entry.auto ? '删掉后，这个月不会再自动补上这一笔。' : '删掉之后就不能恢复了。'}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setConfirming(false)}>
            取消
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              void deleteEntry(entry.id).then((ok) => {
                if (!ok) return
                flash('已删除')
                onDone()
              })
            }}
          >
            删除
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">改一笔</p>
          {entry.auto ? <p className="text-xs text-muted">这是自动记下的固定支出，改动只影响这一笔。</p> : null}
        </div>
        <AmountDisplay raw={raw} type={type} />
      </div>
      <EntryFields
        type={type}
        necessity={necessity}
        categoryId={categoryId}
        note={note}
        date={date}
        categories={categories}
        onType={changeType}
        onNecessity={setNecessity}
        onCategory={setCategoryId}
        onNote={setNote}
        onDate={setDate}
      />
      <div className="mt-3">
        <Keypad onKey={(key) => setRaw((current) => applyKey(current, key))} />
      </div>
      <div className="mt-3 grid grid-cols-[1fr_2fr] gap-2">
        <Button variant="outline" onClick={() => setConfirming(true)}>
          删除
        </Button>
        <Button onClick={save}>保存</Button>
      </div>
    </div>
  )
}
