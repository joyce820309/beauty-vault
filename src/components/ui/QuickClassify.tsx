import { useState, useEffect, useRef } from 'react'
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
  const { makeupCategories, skincareCategories, getCategoryLabel } = useCategories()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  const categories = item.item_type === 'makeup' ? makeupCategories : skincareCategories
  const isUnclassified = !item.item_type || !item.category

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

  const typeLabel = item.item_type === 'makeup' ? '化妝品' : item.item_type === 'skincare' ? '保養品' : null
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
            {t === 'makeup'
              ? <Sparkle size={10} strokeWidth={1.5} />
              : <Droplets size={10} strokeWidth={1.5} />
            }
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
            <div className="absolute left-0 top-full mt-1 z-50 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-lg py-1 min-w-[120px] max-h-52 overflow-y-auto"
              style={{ animation: 'selectFadeIn 0.1s ease' }}
            >
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onMouseDown={() => setCategory(cat.value)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors min-h-0 ${
                    item.category === cat.value
                      ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-dark)] font-medium'
                      : 'text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
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
