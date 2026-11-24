import { PALETTE } from '../lib/defaults.ts'
import { formatYuan } from '../lib/money.ts'
import { pendingCelebrations, progressRatio, savedSince } from '../lib/stats.ts'
import { useStore } from '../context/Store.tsx'
import { Button } from './ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog.tsx'

const COPY = {
  p25: { title: '已经攒下四分之一', detail: '慢慢来，也算数。' },
  p50: { title: '一半了', detail: '继续这样记下去。' },
  p100: { title: '目标达成', detail: '这是你一笔笔记下来的。' },
} as const

export function Celebrate() {
  const { entries, meta, summary, markCelebrated } = useStore()
  const goal = meta.goal
  const saved = goal ? savedSince(entries, goal.startDate) : 0
  const pending = goal && !summary.open ? pendingCelebrations(saved, goal.target, goal.celebrated) : []
  const level = pending[0]
  if (!goal || !level) return null
  const ratio = progressRatio(saved, goal.target)
  const copy = COPY[level]

  return (
    <Dialog open onOpenChange={(open) => { if (!open) void markCelebrated(level) }}>
      <DialogContent className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]" aria-hidden="true">
          {PALETTE.slice(0, 16).map((color, index) => (
            <span
              key={`${level}-${color}-${index}`}
              className="confetti-piece"
              style={{ left: `${(index * 17) % 100}%`, background: color, animationDelay: `${(index % 5) * 40}ms` }}
            />
          ))}
        </div>
        <p className="text-sm text-muted">储蓄目标</p>
        <DialogTitle className="mt-1 text-2xl">{copy.title}</DialogTitle>
        <DialogDescription className="mt-2">{copy.detail}</DialogDescription>
        <p className="mt-4 text-sm">
          {goal.name} · 已攒 ¥{formatYuan(Math.max(0, saved))} / ¥{formatYuan(goal.target)} · {Math.min(100, Math.round(ratio * 100))}%
        </p>
        <Button className="mt-5 w-full" onClick={() => void markCelebrated(level)}>
          收下
        </Button>
      </DialogContent>
    </Dialog>
  )
}
