import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
  disabled?: boolean
}

interface SelectProps<T extends string = string> {
  value: T | ''
  onChange: (value: T) => void
  options: SelectOption<T>[]
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function Select<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = '請選擇',
  label,
  error,
  disabled,
  size = 'md',
}: SelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedLabel = options.find((o) => o.value === value)?.label ?? ''

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // 偵測下方空間，決定向上還是向下展開
  const calcDropDirection = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    setDropUp(spaceBelow < 240 && spaceAbove > spaceBelow)
  }, [])

  // 選中項目自動捲入視野
  useEffect(() => {
    if (!open || !dropdownRef.current) return
    const el = dropdownRef.current.querySelector('[aria-selected="true"]') as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [open])

  function select(val: T) {
    onChange(val)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">{label}</label>
      )}

      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { calcDropDirection(); setOpen((v) => !v) } }}
        className={[
          'w-full flex items-center justify-between rounded-xl border text-left focus:outline-none',
          size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-2.5 text-sm',
          'bg-[var(--color-bg-card)] transition-all duration-150',
          open
            ? 'border-[var(--color-primary)] shadow-[0_0_0_3px_var(--color-focus-ring)]'
            : error
            ? 'border-red-400'
            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/60',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <span className={selectedLabel ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.5}
          className={`text-[var(--color-text-muted)] transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {/* Dropdown panel */}
      {open && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden ${dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}
          style={{ animation: 'selectFadeIn 0.12s ease' }}
          role="listbox"
        >
          <div className="py-1 max-h-56 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--color-border) transparent' }}>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                disabled={opt.disabled}
                onMouseDown={() => !opt.disabled && select(opt.value)}
                className={[
                  'w-full flex items-center justify-between text-left transition-colors min-h-0',
                  size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2.5 text-sm',
                  opt.value === value
                    ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-dark)] font-medium'
                    : 'text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]',
                  opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                ].join(' ')}
              >
                <span>{opt.label}</span>
                {opt.value === value && (
                  <Check size={13} strokeWidth={2} className="text-[var(--color-primary)] flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
