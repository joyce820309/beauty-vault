import { Outlet, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { InstallPrompt } from '@/components/ui/InstallPrompt'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { useTriggerRefresh } from '@/contexts/RefreshContext'

const PULL_TO_REFRESH_PATHS = new Set(['/', '/my'])

export default function Layout() {
  const triggerRefresh = useTriggerRefresh()
  const { pathname } = useLocation()

  const pullEnabled = PULL_TO_REFRESH_PATHS.has(pathname)

  async function handleRefresh() {
    await new Promise<void>((resolve) => {
      triggerRefresh()
      setTimeout(resolve, 800)   // 給足夠時間讓 fetch 啟動
    })
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans">
      <InstallPrompt />

      {/* Desktop sidebar — 不需要下拉刷新 */}
      <div className="hidden lg:flex">
        <Sidebar />
        <div className="flex-1 ml-64 min-h-screen flex flex-col">
          <header className="flex justify-end px-6 py-3 border-b border-[var(--color-border)]">
            <ThemeToggle />
          </header>
          <main className="flex-1 px-6 py-6 max-w-4xl">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden flex flex-col h-screen">
        <header className="flex-shrink-0 flex justify-end px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-card)]">
          <ThemeToggle />
        </header>

        <div className="flex-1 min-h-0 pb-[env(safe-area-inset-bottom)]">
          <PullToRefresh onRefresh={pullEnabled ? handleRefresh : null}>
            <div className="px-4 pt-4 pb-24">
              <Outlet />
            </div>
          </PullToRefresh>
        </div>

        <BottomNav />
      </div>
    </div>
  )
}
