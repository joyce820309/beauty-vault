import { Snowflake, Flower2 } from 'lucide-react'
import { useTheme, type Theme } from '@/contexts/ThemeContext'
import type { LucideIcon } from 'lucide-react'

const themes: { value: Theme; Icon: LucideIcon; label: string }[] = [
  { value: 'summer', Icon: Snowflake, label: 'Summer' },
  { value: 'spring', Icon: Flower2, label: 'Spring' },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 bg-[var(--color-bg-muted)] rounded-full p-1">
      {themes.map(({ value, Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={`Light ${label}`}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all min-h-0 ${
            theme === value
              ? 'bg-[var(--color-bg-card)] shadow-sm text-[var(--color-primary)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <Icon size={12} strokeWidth={theme === value ? 2 : 1.5} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
