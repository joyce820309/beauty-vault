import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check, Plus, Pencil, Trash2, X } from 'lucide-react'
import { createCategory, updateCategory, deleteCategory } from '@/lib/supabase/categories'
import { useCategories, type Category } from '@/contexts/CategoriesContext'

interface Props {
  value: string
  onChange: (value: string) => void
  itemType: 'makeup' | 'skincare'
  label?: string
  error?: string
}

export function CategorySelect({ value, onChange, itemType, label, error }: Props) {
  const { makeupCategories, skincareCategories, reload } = useCategories()
  const categories = itemType === 'makeup' ? makeupCategories : skincareCategories

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'idle' | 'add' | 'edit' | 'delete'>(    'idle')
  const [target, setTarget] = useState<Category | null>(null)
  const [inputVal, setInputVal] = useState('')
  const [saving, setSaving] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selectedLabel = categories.find((c) => c.value === value)?.label ?? ''

  const filtered = useMemo(() => {
    if (!search.trim()) return categories
    const q = search.toLowerCase()
    return categories.filter((c) => c.label.toLowerCase().includes(q))
  }, [categories, search])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
        setMode('idle')
        setTarget(null)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        setSearch('')
        setMode('idle')
        setTarget(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  function select(val: string) {
    onChange(val)
    setOpen(false)
    setSearch('')
    setMode('idle')
    setTarget(null)
  }

  function startAdd() {
    setMode('add')
    setInputVal('')
    setTarget(null)
  }

  function startEdit(cat: Category, e: React.MouseEvent) {
    e.stopPropagation()
    setMode('edit')
    setTarget(cat)
    setInputVal(cat.label)
  }

  function startDelete(cat: Category, e: React.MouseEvent) {
    e.stopPropagation()
    setMode('delete')
    setTarget(cat)
  }

  function cancelMode() {
    setMode('idle')
    setTarget(null)
    setInputVal('')
  }

  async function handleAdd() {
    if (!inputVal.trim()) return
    setSaving(true)
    const slug = inputVal.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_一-鿿]/g, '')
    const nextOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order)) + 1 : 0
    await createCategory({ item_type: itemType, value: slug, label: inputVal.trim(), sort_order: nextOrder })
    await reload()
    setMode('idle')
    setInputVal('')
    setSaving(false)
  }

  async function handleEdit() {
    if (!target || !inputVal.trim()) return
    setSaving(true)
    await updateCategory(target.id, inputVal.trim())
    await reload()
    setMode('idle')
    setTarget(null)
    setInputVal('')
    setSaving(false)
  }

  async function handleDelete() {
    if (!target) return
    setSaving(true)
    await deleteCategory(target.id)
    if (value === target.value) onChange('')
    await reload()
    setMode('idle')
    setTarget(null)
    setSaving(false)
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text)] mb-1">{label}</label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm text-left',
          'bg-[var(--color-bg-card)] transition-all duration-150',
          open
            ? 'border-[var(--color-primary)] shadow-[0_0_0_3px_var(--color-focus-ring)]'
            : error
            ? 'border-red-400'
            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/60',
        ].join(' ')}
      >
        <span className={selectedLabel ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}>
          {selectedLabel || '請選擇類別'}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.5}
          className={`text-[var(--color-text-muted)] transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 w-full mt-1.5 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden"
          style={{ animation: 'selectFadeIn 0.12s ease' }}
        >
          {/* 搜尋框 */}
          <div className="px-3 py-2 border-b border-[var(--color-border)]">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋類別…"
              className="w-full text-sm bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            />
          </div>

          {/* 選項列表 */}
          <div className="py-1 max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2.5 text-sm text-[var(--color-text-muted)]">沒有符合的類別</p>
            ) : (
              filtered.map((cat) => (
                <div
                  key={cat.value}
                  className={`flex items-center justify-between px-3 py-2 text-sm transition-colors group ${
                    cat.value === value
                      ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-dark)] font-medium'
                      : 'text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]'
                  }`}
                >
                  <button
                    type="button"
                    onMouseDown={() => select(cat.value)}
                    className="flex-1 text-left min-h-0 flex items-center gap-2"
                  >
                    <span>{cat.label}</span>
                    {cat.value === value && <Check size={12} strokeWidth={2.5} className="text-[var(--color-primary)]" />}
                  </button>
                  {/* 編輯 / 刪除（hover 才顯示） */}
                  {cat.id !== 0 && (
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onMouseDown={(e) => startEdit(cat, e)}
                        className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-accent)] min-h-0 min-w-0"
                      >
                        <Pencil size={12} strokeWidth={1.8} />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => startDelete(cat, e)}
                        className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-danger)] min-h-0 min-w-0"
                      >
                        <Trash2 size={12} strokeWidth={1.8} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* 底部操作區 */}
          <div className="border-t border-[var(--color-border)] px-3 py-2">
            {mode === 'idle' && (
              <button
                type="button"
                onMouseDown={startAdd}
                className="flex items-center gap-1.5 text-sm text-[var(--color-primary)] font-medium min-h-0 hover:underline"
              >
                <Plus size={14} strokeWidth={2} />
                新增類別
              </button>
            )}

            {(mode === 'add' || mode === 'edit') && (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); mode === 'add' ? handleAdd() : handleEdit() }
                    if (e.key === 'Escape') cancelMode()
                  }}
                  placeholder={mode === 'add' ? '新類別名稱' : '修改名稱'}
                  className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  type="button"
                  onMouseDown={mode === 'add' ? handleAdd : handleEdit}
                  disabled={saving || !inputVal.trim()}
                  className="px-2.5 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-medium min-h-0 disabled:opacity-40"
                >
                  {saving ? '…' : '確認'}
                </button>
                <button
                  type="button"
                  onMouseDown={cancelMode}
                  className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] min-h-0 min-w-0"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            )}

            {mode === 'delete' && target && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-[var(--color-text-muted)]">
                  確定刪除「<span className="text-[var(--color-danger)] font-medium">{target.label}</span>」？
                </p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onMouseDown={handleDelete}
                    disabled={saving}
                    className="px-2.5 py-1.5 rounded-lg bg-[var(--color-danger)] text-white text-xs font-medium min-h-0 disabled:opacity-40"
                  >
                    {saving ? '…' : '刪除'}
                  </button>
                  <button
                    type="button"
                    onMouseDown={cancelMode}
                    className="px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] text-xs min-h-0"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
