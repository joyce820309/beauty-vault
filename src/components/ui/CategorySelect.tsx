import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check, Plus, X } from 'lucide-react'
import { createCategory } from '@/lib/supabase/categories'
import { useCategories, type Category } from '@/contexts/CategoriesContext'

interface Props {
  value: string
  onChange: (value: string) => void
  itemType: 'makeup' | 'skincare'
  label?: string
  error?: string
}

export function CategorySelect({ value, onChange, itemType, label, error }: Props) {
  const {
    makeupCategories, skincareCategories,
    makeupParents, skincareParents,
    getChildren, getCategoryLabel, getParentOf,
    reload,
  } = useCategories()

  const leafCategories = itemType === 'makeup' ? makeupCategories : skincareCategories
  const parents        = itemType === 'makeup' ? makeupParents    : skincareParents

  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')
  const [addMode, setAddMode] = useState(false)
  const [addParentId, setAddParentId] = useState<number | null>(null)
  const [addLabel, setAddLabel]       = useState('')
  const [saving, setSaving]           = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef    = useRef<HTMLInputElement>(null)

  // 顯示文字：大類 › 子類
  const parentCat = getParentOf(value)
  const selectedLabel = value
    ? (parentCat ? `${parentCat.label} › ${getCategoryLabel(value)}` : getCategoryLabel(value))
    : ''

  const searchedLeafs = useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase()
    return leafCategories.filter(c => c.label.toLowerCase().includes(q))
  }, [leafCategories, search])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) close()
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  function close() {
    setOpen(false); setSearch(''); setAddMode(false)
    setAddParentId(null); setAddLabel('')
  }

  function select(val: string) { onChange(val); close() }

  async function handleAdd() {
    const trimmed = addLabel.trim()
    if (!trimmed) return
    setSaving(true)
    const slug = `custom_${Date.now()}`
    const nextOrder = leafCategories.length > 0 ? Math.max(...leafCategories.map(c => c.sort_order)) + 1 : 0
    const { data } = await createCategory({
      item_type: itemType, value: slug, label: trimmed,
      sort_order: nextOrder, parent_id: addParentId,
    })
    await reload()
    if (data) select((data as Category).value)
    setSaving(false); setAddMode(false); setAddLabel('')
  }

  function renderList() {
    // 搜尋模式：平鋪
    if (searchedLeafs) {
      if (searchedLeafs.length === 0)
        return <p className="px-3 py-2.5 text-sm text-[var(--color-text-muted)]">沒有符合的類別</p>
      return searchedLeafs.map(cat => <LeafRow key={cat.value} cat={cat} selected={value === cat.value} onSelect={select} />)
    }
    // 有大類：分組顯示
    if (parents.length > 0) {
      return parents.map(parent => {
        const children = getChildren(parent.id)
        if (children.length === 0) return null
        return (
          <div key={parent.id}>
            <p className="px-3 pt-2 pb-0.5 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide select-none">
              {parent.label}
            </p>
            {children.map(cat => <LeafRow key={cat.value} cat={cat} selected={value === cat.value} indent onSelect={select} />)}
          </div>
        )
      })
    }
    // 無大類（INITIAL）：平鋪
    return leafCategories.map(cat => <LeafRow key={cat.value} cat={cat} selected={value === cat.value} onSelect={select} />)
  }

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="block text-sm font-medium text-[var(--color-text)] mb-1">{label}</label>}

      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={[
          'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm text-left',
          'bg-[var(--color-bg-card)] transition-all duration-150',
          open ? 'border-[var(--color-primary)] shadow-[0_0_0_3px_var(--color-focus-ring)]'
            : error ? 'border-red-400'
            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/60',
        ].join(' ')}
      >
        <span className={selectedLabel ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}>
          {selectedLabel || '請選擇類別'}
        </span>
        <ChevronDown size={14} strokeWidth={1.5}
          className={`text-[var(--color-text-muted)] transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {open && (
        <div className="absolute z-50 w-full mt-1.5 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden"
          style={{ animation: 'selectFadeIn 0.12s ease' }}>

          <div className="px-3 py-2 border-b border-[var(--color-border)]">
            <input ref={searchRef} type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜尋類別…"
              className="w-full text-sm bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none" />
          </div>

          <div className="py-1 max-h-56 overflow-y-auto">{renderList()}</div>

          <div className="border-t border-[var(--color-border)] px-3 py-2">
            {!addMode ? (
              <button type="button" onMouseDown={() => setAddMode(true)}
                className="flex items-center gap-1.5 text-sm text-[var(--color-primary)] font-medium min-h-0 hover:underline">
                <Plus size={14} strokeWidth={2} />新增子類
              </button>
            ) : (
              <div className="space-y-1.5">
                {parents.length > 0 && (
                  <select value={addParentId ?? ''}
                    onChange={e => setAddParentId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full text-xs px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] text-[var(--color-text)] focus:outline-none">
                    <option value="">不指定大類</option>
                    {parents.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                )}
                <div className="flex items-center gap-2">
                  <input autoFocus type="text" value={addLabel}
                    onChange={e => setAddLabel(e.target.value)}
                    onKeyDown={e => {
                      if (e.nativeEvent.isComposing) return
                      if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
                      if (e.key === 'Escape') { setAddMode(false); setAddLabel('') }
                    }}
                    placeholder="子類名稱"
                    className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]" />
                  <button type="button" onMouseDown={handleAdd} disabled={saving || !addLabel.trim()}
                    className="px-2.5 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-medium min-h-0 disabled:opacity-40">
                    {saving ? '…' : '確認'}
                  </button>
                  <button type="button" onMouseDown={() => { setAddMode(false); setAddLabel('') }}
                    className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] min-h-0 min-w-0">
                    <X size={14} strokeWidth={2} />
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

function LeafRow({ cat, selected, indent, onSelect }: {
  cat: Category; selected: boolean; indent?: boolean; onSelect: (v: string) => void
}) {
  return (
    <button type="button" onMouseDown={() => onSelect(cat.value)}
      className={`w-full flex items-center gap-2 text-sm transition-colors min-h-0 text-left ${
        indent ? 'px-6 py-1.5' : 'px-3 py-2'
      } ${
        selected
          ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-dark)] font-medium'
          : 'text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]'
      }`}>
      <span className="flex-1">{cat.label}</span>
      {selected && <Check size={12} strokeWidth={2.5} className="text-[var(--color-primary)] flex-shrink-0" />}
    </button>
  )
}
