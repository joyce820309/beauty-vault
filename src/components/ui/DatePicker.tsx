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

interface ShortcutDef {
  label: string
  getDate: () => Date
}

interface DatePickerProps {
  value: string        // 'yyyy-MM-dd' or ''
  onChange: (value: string) => void
  label?: string
  required?: boolean
  placeholder?: string
  error?: string
  disabled?: boolean
  shortcuts?: ShortcutDef[]
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const THIS_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 30 }, (_, i) => THIS_YEAR + 9 - i)
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: i, label: `${i + 1} 月` }))

// 全形數字／分隔符號（注音輸入法）→ 半形，方便手動輸入日期
function toHalfWidth(str: string): string {
  return str
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[／]/g, '/')
    .replace(/[．。]/g, '.')
    .replace(/[－—]/g, '-')
}

// 允許 yyyy-MM-dd / yyyy/M/d / yyyy.MM.dd / yyyyMMdd 等手動輸入格式
function parseTypedDate(text: string): Date | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const parts = trimmed.split(/[^0-9]+/).filter(Boolean)
  let y: string, m: string, d: string
  if (parts.length === 3) {
    [y, m, d] = parts
  } else if (parts.length === 1 && parts[0].length === 8) {
    y = parts[0].slice(0, 4)
    m = parts[0].slice(4, 6)
    d = parts[0].slice(6, 8)
  } else {
    return null
  }

  if (y.length !== 4) return null
  m = m.padStart(2, '0')
  d = d.padStart(2, '0')
  if (m.length !== 2 || d.length !== 2) return null

  const iso = `${y}-${m}-${d}`
  const parsed = parse(iso, 'yyyy-MM-dd', new Date())
  if (!isValid(parsed) || format(parsed, 'yyyy-MM-dd') !== iso) return null
  return parsed
}

export function DatePicker({ value, onChange, label, required, placeholder = '選擇日期', error, disabled, shortcuts }: DatePickerProps) {
  const parsed = value ? parse(value, 'yyyy-MM-dd', new Date()) : null
  const selected = parsed && isValid(parsed) ? parsed : null

  const [open, setOpen] = useState(false)
  const [view, setView] = useState<Date>(selected ?? new Date())
  const [headerMode, setHeaderMode] = useState<'calendar' | 'year' | 'month'>('calendar')
  // null = 未在編輯，顯示美化格式；非 null = 使用者正在手動輸入的原始文字
  const [editText, setEditTextState] = useState<string | null>(null)
  const [localError, setLocalError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editTextRef = useRef<string | null>(null)

  function setEditText(v: string | null) {
    editTextRef.current = v
    setEditTextState(v)
  }

  function commitEdit() {
    const text = editTextRef.current
    if (text === null) return
    const trimmed = text.trim()
    if (trimmed === '') {
      onChange('')
      setEditText(null)
      setLocalError(false)
      return
    }
    const parsedDate = parseTypedDate(trimmed)
    if (parsedDate) {
      onChange(format(parsedDate, 'yyyy-MM-dd'))
      setEditText(null)
      setLocalError(false)
    } else {
      setLocalError(true)
    }
  }

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        commitEdit()
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
    setEditText(null)
    setLocalError(false)
    setOpen(false)
    setHeaderMode('calendar')
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setEditText(null)
    setLocalError(false)
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    setOpen(true)
    if (editTextRef.current === null) setEditText(value || '')
    e.target.select()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLocalError(false)
    setEditText(toHalfWidth(e.target.value))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit()
      setOpen(false)
      setHeaderMode('calendar')
    } else if (e.key === 'Escape') {
      setEditText(null)
      setLocalError(false)
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  // Tab 切到表單其他欄位時收起面板；焦點落在面板內（如切換年月）則不受影響
  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    commitEdit()
    const next = e.relatedTarget as Node | null
    if (next && !containerRef.current?.contains(next)) {
      setOpen(false)
      setHeaderMode('calendar')
    }
  }

  function handleWrapperClick(e: React.MouseEvent<HTMLDivElement>) {
    if (disabled) return
    if (e.target === e.currentTarget) inputRef.current?.focus()
  }

  // 月曆的日期格
  const monthStart = startOfMonth(view)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(endOfMonth(view), { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const displayValue = selected ? format(selected, 'yyyy 年 M 月 d 日', { locale: zhTW }) : ''
  const showError = localError || !!error

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
          {label}
          {required && <span className="ml-0.5 text-[var(--color-primary)]">*</span>}
        </label>
      )}

      {/* Trigger（可點開日曆，也可直接手動輸入） */}
      <div
        onClick={handleWrapperClick}
        className={[
          'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-left',
          'bg-[var(--color-bg-card)] transition-all duration-150',
          open
            ? 'border-[var(--color-primary)] shadow-[0_0_0_3px_var(--color-focus-ring)]'
            : showError
            ? 'border-red-400'
            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/60',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text',
        ].join(' ')}
      >
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          className="min-h-0 min-w-0 flex-shrink-0"
        >
          <CalendarDays size={15} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
        </button>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={editText ?? displayValue}
          onFocus={handleFocus}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={editText !== null ? 'yyyy-MM-dd' : placeholder}
          className="flex-1 min-w-0 bg-transparent outline-none text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] disabled:cursor-not-allowed"
        />
        {selected && !editText && (
          <span
            role="button"
            onMouseDown={clear}
            className="p-0.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] transition-colors"
          >
            <X size={13} strokeWidth={2} />
          </span>
        )}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          className="min-h-0 min-w-0 flex-shrink-0"
        >
          <ChevronDown
            size={14}
            strokeWidth={1.5}
            className={`text-[var(--color-text-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {localError ? (
        <p className="text-xs text-red-500 mt-1">日期格式不正確，請輸入例如 2028-09-01</p>
      ) : error ? (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      ) : null}

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

              {/* 今天 + 自訂捷徑 */}
              <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex gap-1">
                <button
                  type="button"
                  onClick={() => selectDate(new Date())}
                  className="flex-1 py-1.5 rounded-lg text-xs text-[var(--color-primary)] font-medium hover:bg-[var(--color-primary-light)] transition-colors min-h-0"
                >
                  今天
                </button>
                {shortcuts?.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => selectDate(s.getDate())}
                    className="flex-1 py-1.5 rounded-lg text-xs text-[var(--color-primary)] font-medium hover:bg-[var(--color-primary-light)] transition-colors min-h-0"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
