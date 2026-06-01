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
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(inputValue.toLowerCase())
  )

  useEffect(() => { setInputValue(value) }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-[var(--color-bg-card)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] ${
          error ? 'border-red-400' : 'border-[var(--color-border)]'
        }`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                onMouseDown={() => { onChange(opt); setInputValue(opt); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary-dark)] transition-colors min-h-0"
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
