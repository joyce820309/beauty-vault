import { useState, useRef, useEffect } from 'react'

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  label?: string
  error?: string
}

export function Combobox({ value, onChange, options, placeholder, label, error }: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(inputValue.toLowerCase())
  )

  useEffect(() => { setInputValue(value) }, [value])

  // 使用者打字時重置游標
  useEffect(() => { setActiveIndex(-1) }, [inputValue])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // 自動捲動讓 active 項目保持可見
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const item = listRef.current.children[activeIndex] as HTMLElement
    item?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setActiveIndex(0)
      } else {
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
      }
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
      return
    }
    if (e.key === 'Enter' && open && activeIndex >= 0) {
      e.preventDefault()
      const selected = filtered[activeIndex]
      onChange(selected)
      setInputValue(selected)
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  function select(opt: string) {
    onChange(opt)
    setInputValue(opt)
    setOpen(false)
    setActiveIndex(-1)
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">{label}</label>
      )}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value)
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-[var(--color-bg-card)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] ${
          error ? 'border-red-400' : 'border-[var(--color-border)]'
        }`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-lg max-h-48 overflow-y-auto"
        >
          {filtered.map((opt, idx) => (
            <li key={opt}>
              <button
                type="button"
                onMouseDown={() => select(opt)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors min-h-0 ${
                  idx === activeIndex
                    ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]'
                    : 'text-[var(--color-text)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary-dark)]'
                }`}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
