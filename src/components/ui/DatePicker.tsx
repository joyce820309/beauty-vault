import { useState, useRef, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight, ChevronDown, CalendarDays, X,
} from 'lucide-react'
import {
  format, parse, isValid, isToday, isSameMonth, isSameDay,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, subMonths, getYear, getMonth, setYear, setMonth,
} from 'date-fns'
import { zhTW } from 'date-fns/locale'

interface DatePickerProps {
  value: string        // 'yyyy-MM-dd' or ''
  onChange: (value: string) => void
  label?: string
  required?: boolean
  placeholder?: string
  error?: string
  disabled?: boolean
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const THIS_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 30 }, (_, i) => THIS_YEAR - 20 + i)
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: i, label: `${i + 1} 月` }))

export function DatePicker({ value, onChange, label, required, placeholder = '選擇日期', error, disabled }: DatePickerProps) {
  const parsed = value ? parse(value, 'yyyy-MM-dd', new Date()) : null
  const selected = parsed && isValid(parsed) ? parsed : null

  const [open, setOpen] = useState(false)
  const [view, setView] = useState<Date>(selected ?? new Date())
  const [headerMode, setHeaderMode] = useState<'calendar' | 'year' | 'month'>('calendar')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setHeaderMode('calendar')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // 重置 view 到已選日期所在月份
  useEffect(() => {
    if (open && selected) setView(selected)
  }, [open])

  function selectDate(day: Date) {
    onChange(format(day, 'yyyy-MM-dd'))
    setOpen(false)
    setHeaderMode('calendar')
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
  }

  // 月曆的日期格
  const monthStart = startOfMonth(view)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(endOfMonth(view), { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const displayValue = selected ? format(selected, 'yyyy 年 M 月 d 日', { locale: zhTW }) : ''

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
          {label}
          {required && <span className="ml-0.5 text-[var(--color-primary)]">*</span>}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={[
          'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-left',
          'bg-[var(--color-bg-card)] transition-all duration-150',
          open
            ? 'border-[var(--color-primary)] shadow-[0_0_0_3px_var(--color-focus-ring)]'
            : error
            ? 'border-red-400'
            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/60',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <CalendarDays size={15} strokeWidth={1.5} className="text-[var(--color-text-muted)] flex-shrink-0" />
        <span className={`flex-1 ${displayValue ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
          {displayValue || placeholder}
        </span>
        {selected && (
          <span
            role="button"
            onMouseDown={clear}
            className="p-0.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] transition-colors"
          >
            <X size={13} strokeWidth={2} />
          </span>
        )}
        <ChevronDown
          size={14}
          strokeWidth={1.5}
          className={`text-[var(--color-text-muted)] transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {/* Calendar panel */}
      {open && (
        <div
          className="absolute z-50 mt-1.5 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-xl overflow-hidden w-72"
          style={{ animation: 'selectFadeIn 0.12s ease' }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setView(subMonths(view, 1))}
              className="p-1.5 rounded-lg hover:bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] min-h-0 min-w-0 transition-colors"
            >
              <ChevronLeft size={15} strokeWidth={1.5} />
            </button>

            <div className="flex items-center gap-1">
              {/* 年份按鈕 */}
              <button
                type="button"
                onClick={() => setHeaderMode(headerMode === 'year' ? 'calendar' : 'year')}
                className={[
                  'flex items-center gap-0.5 px-2 py-1 rounded-lg text-sm font-semibold transition-colors min-h-0',
                  headerMode === 'year'
                    ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]'
                    : 'hover:bg-[var(--color-bg-muted)] text-[var(--color-text)]',
                ].join(' ')}
              >
                {getYear(view)} 年
                <ChevronDown size={11} strokeWidth={2} className={`transition-transform ${headerMode === 'year' ? 'rotate-180' : ''}`} />
              </button>

              {/* 月份按鈕 */}
              <button
                type="button"
                onClick={() => setHeaderMode(headerMode === 'month' ? 'calendar' : 'month')}
                className={[
                  'flex items-center gap-0.5 px-2 py-1 rounded-lg text-sm font-semibold transition-colors min-h-0',
                  headerMode === 'month'
                    ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]'
                    : 'hover:bg-[var(--color-bg-muted)] text-[var(--color-text)]',
                ].join(' ')}
              >
                {getMonth(view) + 1} 月
                <ChevronDown size={11} strokeWidth={2} className={`transition-transform ${headerMode === 'month' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setView(addMonths(view, 1))}
              className="p-1.5 rounded-lg hover:bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] min-h-0 min-w-0 transition-colors"
            >
              <ChevronRight size={15} strokeWidth={1.5} />
            </button>
          </div>

          {/* 年份選擇 grid */}
          {headerMode === 'year' && (
            <div className="p-3 grid grid-cols-4 gap-1 max-h-52 overflow-y-auto">
              {YEAR_OPTIONS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => { setView(setYear(view, y)); setHeaderMode('calendar') }}
                  className={[
                    'py-2 rounded-lg text-sm transition-colors min-h-0',
                    y === getYear(view)
                      ? 'bg-[var(--color-primary)] text-white font-semibold'
                      : y === THIS_YEAR
                      ? 'border border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'hover:bg-[var(--color-bg-muted)] text-[var(--color-text)]',
                  ].join(' ')}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* 月份選擇 grid */}
          {headerMode === 'month' && (
            <div className="p-3 grid grid-cols-4 gap-1">
              {MONTH_OPTIONS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => { setView(setMonth(view, m.value)); setHeaderMode('calendar') }}
                  className={[
                    'py-2 rounded-lg text-sm transition-colors min-h-0',
                    m.value === getMonth(view)
                      ? 'bg-[var(--color-primary)] text-white font-semibold'
                      : 'hover:bg-[var(--color-bg-muted)] text-[var(--color-text)]',
                  ].join(' ')}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* 月曆 grid */}
          {headerMode === 'calendar' && (
            <div className="p-3">
              {/* 星期列 */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="text-center text-xs text-[var(--color-text-muted)] py-1 font-medium">
                    {w}
                  </div>
                ))}
              </div>

              {/* 日期格 */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {days.map((day) => {
                  const isSelected = selected ? isSameDay(day, selected) : false
                  const isThisMonth = isSameMonth(day, view)
                  const isTodayDate = isToday(day)

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => selectDate(day)}
                      className={[
                        'aspect-square flex items-center justify-center rounded-full text-sm transition-colors min-h-0 min-w-0 mx-auto w-8 h-8',
                        isSelected
                          ? 'bg-[var(--color-primary)] text-white font-semibold shadow-sm'
                          : isTodayDate && isThisMonth
                          ? 'border border-[var(--color-primary)] text-[var(--color-primary)] font-semibold hover:bg-[var(--color-primary-light)]'
                          : isThisMonth
                          ? 'text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]'
                          : 'text-[var(--color-text-muted)]/40 hover:bg-[var(--color-bg-muted)]',
                      ].join(' ')}
                    >
                      {format(day, 'd')}
                    </button>
                  )
                })}
              </div>

              {/* 今天捷徑 */}
              <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => selectDate(new Date())}
                  className="w-full py-1.5 rounded-lg text-xs text-[var(--color-primary)] font-medium hover:bg-[var(--color-primary-light)] transition-colors min-h-0"
                >
                  今天
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
