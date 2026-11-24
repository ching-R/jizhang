import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Celebrate } from './components/Celebrate.tsx'
import { Nav, NavProvider, type Tab } from './components/Nav.tsx'
import { SummaryDialog } from './components/SummaryDialog.tsx'
import { useStore } from './context/Store.tsx'
import { AddView } from './views/AddView.tsx'
import { ListView } from './views/ListView.tsx'
import { MoreView } from './views/MoreView.tsx'
const StatsView = lazy(() => import('./views/StatsView.tsx').then((module) => ({ default: module.StatsView })))

function tabFromLocation(): Tab {
  const hash = window.location.hash.replace('#', '')
  if (hash === 'list' || hash === 'stats' || hash === 'more') return hash
  return 'add'
}

function initialTab(): Tab {
  const url = new URL(window.location.href)
  if (url.searchParams.get('add') === '1') {
    url.searchParams.delete('add')
    url.hash = ''
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    return 'add'
  }
  return tabFromLocation()
}

export default function App() {
  const { toast } = useStore()
  const [tab, setTab] = useState<Tab>(initialTab)
  useEffect(() => {
    const onHash = () => setTab(tabFromLocation())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const selectTab = useCallback((next: Tab) => {
    setTab(next)
    const url = new URL(window.location.href)
    url.hash = next === 'add' ? '' : next
    url.searchParams.delete('add')
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }, [])

  return (
    <NavProvider value={selectTab}>
      <div className="relative mx-auto flex h-full w-full max-w-[480px] flex-col overflow-hidden bg-bg text-ink">
        <main className="min-h-0 flex-1 overflow-hidden">
          {tab === 'add' ? (
            <AddView />
          ) : (
            <div className="h-full overflow-y-auto px-4 pt-[max(12px,env(safe-area-inset-top))] pb-8">
              {tab === 'list' ? <ListView /> : null}
              {tab === 'stats' ? (
                <Suspense fallback={<p className="pt-8 text-sm text-muted">正在准备图表…</p>}>
                  <StatsView />
                </Suspense>
              ) : null}
              {tab === 'more' ? <MoreView /> : null}
            </div>
          )}
        </main>
        <Nav tab={tab} onChange={selectTab} />
        {toast ? (
          <div className="pointer-events-none absolute top-[max(12px,env(safe-area-inset-top))] left-1/2 z-40 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-bg shadow-lg">
            {toast}
          </div>
        ) : null}
        <SummaryDialog />
        <Celebrate />
      </div>
    </NavProvider>
  )
}
