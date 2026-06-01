import { NavLink } from 'react-router-dom'
import { Home, Package, Search, BarChart2, User } from 'lucide-react'

const navItems = [
  { to: '/', label: '首頁', Icon: Home },
  { to: '/items', label: '品項', Icon: Package },
  { to: '/search', label: '搜尋', Icon: Search },
  { to: '/stats', label: '統計', Icon: BarChart2 },
  { to: '/my', label: '我的', Icon: User },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-bg-card)] border-t border-[var(--color-border)] z-50">
      <div className="flex">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 text-xs transition-colors ${
                isActive
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} className="mb-1" />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
