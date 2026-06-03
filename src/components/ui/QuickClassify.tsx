import { useState, useEffect, useRef, useMemo } from 'react'
import { Sparkle, Droplets, ChevronDown } from 'lucide-react'
import { useCategories } from '@/contexts/CategoriesContext'
import { updateItem } from '@/lib/supabase/items'
import { useToast } from '@/components/ui/Toast'
import type { Item, ItemType } from '@/types/database'

interface Props {
  item: Item
  onUpdated: (patch: Partial<Item>) => void
}

export function QuickClassify({ item, onUpdated }: Props) {
  const {
    makeupCategories, skincareCategories,
    makeupParents, skincareParents,
    getChildren, getCategoryLabel,
  } = useCategories()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const categories = item.item_type === 'makeup' ? makeupCategories : skincareCategories
  const parents    = item.item_type === 'makeup' ? makeupParents    : skincareParents
  const isUnclassified = !item.item_type || !item.category

  // 依顯示順序建立 flat 清單供鍵盤導航用
  const flatOptions = useMemo(() => {
    if (parents.length > 0) return parents.flatMap(p => getChildren(p.id))
    return categories
  }, [parents, categories, getChildren])

  // 開關下拉時重置游標
  useEffect(() => { setActiveIndex(-1) }, [open])

  // 讓 active 項目捲動進視窗
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const buttons = listRef.current.querySelectorAll('button')
    buttons[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function setType(type: ItemType) {
    if (item.item_type === type) return
    setSaving(true)
    const { error } = await updateItem(item.id, { item_type: type, category: null })
    if (error) { showToast('更新失敗', 'error') }
    else { onUpdated({ item_type: type, category: null }); showToast('已更新類型') }
    setSaving(false)
  }

  async function setCategory(cat: string) {
    setSaving(true)
    const { error } = await updateItem(item.id, { category: cat })
    if (error) { showToast('更新失敗', 'error') }
    else { onUpdated({ category: cat }); setOpen(false); showToast('已更新類別') }
    setSaving(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActiveIndex(0) }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, flatOptions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      setCategory(flatOptions[activeIndex].value)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const catLabel = getCategoryLabel(item.category)

  return (
    <div ref={containerRef} className="flex items-center gap-1.5 flex-wrap">
      {/* 類型切換：化妝品 / 保養品 */}
      <div className="flex gap-1">
        {(['makeup', 'skincare'] as const).map((t) => (
          <button
            key={t}
            type="button"
            disabled={saving}
            onClick={() => setType(t)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors min-h-0 disabled:opacity-50 ${
              item.item_type === t
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
            }`}
          >
            {t === 'makeup' ? <Sparkle size={10} strokeWidth={1.5} /> : <Droplets size={10} strokeWidth={1.5} />}
            {t === 'makeup' ? '化妝品' : '保養品'}
          </button>
        ))}
      </div>

      {/* 類別下拉 */}
      {item.item_type && (
        <div className="relative">
          <button
            type="button"
            disabled={saving}
            onClick={() => setOpen((v) => !v)}
            onKeyDown={handleKeyDown}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors min-h-0 disabled:opacity-50 ${
              item.category
                ? 'bg-[var(--color-bg-muted)] text-[var(--color-text)] border-[var(--color-border)]'
                : 'bg-[var(--color-primary-light)] text-[var(--color-primary-dark)] border-[var(--color-primary)]/40 animate-pulse'
            }`}
          >
            {item.category ? catLabel : '選類別'}
            <ChevronDown size={10} strokeWidth={2} className={open ? 'rotate-180' : ''} />
          </button>

          {open && (
            <div
              ref={listRef}
              className="absolute left-0 top-full mt-1 z-50 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-lg py-1 min-w-[140px] max-h-64 overflow-y-auto"
              style={{ animation: 'selectFadeIn 0.1s ease' }}
            >
              {parents.length > 0
                ? parents.map((parent) => {
                    const children = getChildren(parent.id)
                    if (children.length === 0) return null
                    return (
                      <div key={parent.id}>
                        <p className="px-3 pt-2 pb-0.5 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide select-none">
                          {parent.label}
                        </p>
                        {children.map((cat) => {
                          const idx = flatOptions.findIndex(o => o.value === cat.value)
                          return (
                            <button
                              key={cat.value}
                              type="button"
                              onMouseDown={() => setCategory(cat.value)}
                              onMouseEnter={() => setActiveIndex(idx)}
                              className={`w-full text-left px-4 py-1.5 text-xs transition-colors min-h-0 ${
                                item.category === cat.value
                                  ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-dark)] font-medium'
                                  : activeIndex === idx
                                  ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]'
                                  : 'text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]'
                              }`}
                            >
                              {cat.label}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })
                : categories.map((cat) => {
                    const idx = flatOptions.findIndex(o => o.value === cat.value)
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onMouseDown={() => setCategory(cat.value)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors min-h-0 ${
                          item.category === cat.value
                            ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-dark)] font-medium'
                            : activeIndex === idx
                            ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]'
                            : 'text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    )
                  })
              }
            </div>
          )}
        </div>
      )}

      {/* 未分類提示 */}
      {isUnclassified && (
        <span className="text-[10px] text-[var(--color-primary)] opacity-70">← 請分類</span>
      )}
    </div>
  )
}
