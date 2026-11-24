import { useStore } from '../context/Store.tsx'
import { BackupPanel, BudgetCard, CategoryManager, GoalCard, RecurringManager } from '../components/ManagePanels.tsx'
import { Segmented } from '../components/Segmented.tsx'
import { Switch } from '../components/ui/switch.tsx'
import type { ThemeMode } from '../types.ts'

export function MoreView() {
  const { meta, setTheme, setDemo } = useStore()
  return (
    <div className="space-y-3" data-testid="more-page">
      <h1 className="text-xl font-semibold">我的</h1>
      <GoalCard />
      <BudgetCard />
      <section className="rounded-[24px] bg-surface p-4">
        <h2 className="text-base font-semibold">外观</h2>
        <div className="mt-3">
          <Segmented
            label="外观"
            value={meta.theme}
            onChange={(theme) => void setTheme(theme)}
            options={[
              { value: 'system' as ThemeMode, label: '跟随系统' },
              { value: 'light' as ThemeMode, label: '浅色' },
              { value: 'dark' as ThemeMode, label: '深色' },
            ]}
          />
        </div>
      </section>
      <CategoryManager />
      <RecurringManager />
      <section className="rounded-[24px] bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">示例数据</h2>
            <p className="mt-1 text-sm text-muted">用一份虚构的大学生账本预览统计图，不会改你的记录。默认关闭。</p>
          </div>
          <Switch checked={meta.demo} label="示例数据" onCheckedChange={(checked) => void setDemo(checked)} />
        </div>
      </section>
      <BackupPanel />
      <section className="rounded-[24px] bg-surface p-4">
        <h2 className="text-base font-semibold">装到主屏幕</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          第一次需要联网打开。之后没网也能记账。安卓 Chrome：菜单里选「安装应用」或「添加到主屏幕」，装好后长按图标，点「记一笔」会直接进来。iPhone 请用 Safari：分享 → 添加到主屏幕。
        </p>
      </section>
    </div>
  )
}
