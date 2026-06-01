import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { InstallPrompt } from '@/components/ui/InstallPrompt'

export default function Layout() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans">
      <InstallPrompt />
      {/* Desktop sidebar */}
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
      <div className="lg:hidden flex flex-col min-h-screen">
        <header className="flex justify-end px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-card)]">
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto pb-20 px-4 pt-4">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
