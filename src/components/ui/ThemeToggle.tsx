import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? '切換為淺色模式' : '切換為深色模式'}
      className={[
        'relative flex items-center w-14 h-7 rounded-full border transition-all duration-300 min-h-0 min-w-0',
        isDark
          ? 'bg-[var(--color-bg-muted)] border-[var(--color-border)]'
          : 'bg-[var(--color-primary-light)] border-[var(--color-primary-light)]',
      ].join(' ')}
    >
      {/* 滑動圓球 */}
      <span
        className={[
          'absolute flex items-center justify-center w-5 h-5 rounded-full shadow-sm transition-all duration-300',
          isDark
            ? 'translate-x-[30px] bg-[var(--color-primary)]'
            : 'translate-x-[3px] bg-[var(--color-primary)]',
        ].join(' ')}
      >
        {isDark
          ? <Moon size={11} strokeWidth={2} className="text-white" />
          : <Sun size={11} strokeWidth={2} className="text-white" />
        }
      </span>

      {/* 背景 icon（對側） */}
      <span className={`absolute transition-opacity duration-200 ${isDark ? 'left-2 opacity-40' : 'right-2 opacity-40'}`}>
        {isDark
          ? <Sun size={10} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
          : <Moon size={10} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
        }
      </span>
    </button>
  )
}
