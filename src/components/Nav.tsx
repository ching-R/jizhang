import { createContext, useContext, type ReactNode } from 'react'
import { cn } from '../lib/cn.ts'
import { IconBook, IconChart, IconList, IconUser } from './Icons.tsx'

export type Tab = 'add' | 'list' | 'stats' | 'more'

const NavContext = createContext<(tab: Tab) => void>(() => {})

export function useGoTo() {
  return useContext(NavContext)
}

export function NavProvider({ value, children }: { value: (tab: Tab) => void; children: ReactNode }) {
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

const ITEMS: { id: Tab; label: string; icon: typeof IconBook; testId: string }[] = [
  { id: 'add', label: '记账', icon: IconBook, testId: 'nav-add' },
  { id: 'list', label: '明细', icon: IconList, testId: 'nav-list' },
  { id: 'stats', label: '统计', icon: IconChart, testId: 'nav-stats' },
  { id: 'more', label: '我的', icon: IconUser, testId: 'nav-more' },
]

export function Nav({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="grid shrink-0 grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]" aria-label="主导航">
      {ITEMS.map((item) => {
        const active = tab === item.id
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            data-testid={item.testId}
            onClick={() => onChange(item.id)}
            className={cn('flex h-16 flex-col items-center justify-center gap-0.5 text-xs', active ? 'text-accent' : 'text-muted')}
            aria-current={active ? 'page' : undefined}
          >
            <Icon />
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
