import { useEffect } from 'react'
import { IconBackspace } from './Icons.tsx'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const

export function Keypad({ onKey }: { onKey: (key: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" data-testid="keypad">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onKey(key)}
          className="flex h-12 items-center justify-center rounded-2xl bg-surface text-xl font-medium text-ink shadow-[0_1px_0_rgba(60,40,20,0.04)] active:bg-surface-2"
          aria-label={key === 'back' ? '删除' : key}
        >
          {key === 'back' ? <IconBackspace /> : key}
        </button>
      ))}
    </div>
  )
}

export function useAmountKeys(
  press: (key: string) => void,
  onEnter: () => void,
  options?: { enabled?: boolean; allowInDialog?: boolean },
) {
  const enabled = options?.enabled ?? true
  const allowInDialog = options?.allowInDialog ?? false
  useEffect(() => {
    if (!enabled) return
    const onKey = (event: KeyboardEvent) => {
      if (!allowInDialog && document.querySelector('[role="dialog"]')) return
      const target = event.target
      if (target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }
      if (/^\d$/.test(event.key) || event.key === '.') {
        event.preventDefault()
        press(event.key)
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        press('back')
      } else if (event.key === 'Enter') {
        event.preventDefault()
        onEnter()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [allowInDialog, enabled, onEnter, press])
}
