import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, X, AlertTriangle, Inbox } from 'lucide-react'
import { useItems } from '@/hooks/useItems'
import { ItemCard } from '@/components/ui/ItemCard'
import { ItemCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { MAKEUP_CATEGORIES, SKINCARE_CATEGORIES, SENSITIVE_SKIN_OPTIONS } from '@/utils/categories'
import type { ItemType, SensitiveSkinStatus } from '@/types/database'

type TypeFilter = ItemType | 'all'
type SkinFilter = SensitiveSkinStatus | 'all'

const activeChip = 'bg-[var(--color-primary)] text-white'
const inactiveChip = 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
const activeSecondary = 'bg-[var(--color-text)] text-white'
const inactiveSecondary = 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]'

export default function ItemListPage() {
  const { items, loading, error } = useItems()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [skinFilter, setSkinFilter] = useState<SkinFilter>('all')

  const categories = typeFilter === 'makeup'
    ? MAKEUP_CATEGORIES
    : typeFilter === 'skincare'
    ? SKINCARE_CATEGORIES
    : []

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter !== 'all' && item.item_type !== typeFilter) return false
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
      if (skinFilter !== 'all') {
        if (item.item_type !== 'skincare') return false
        if (item.sensitive_skin_ok !== skinFilter) return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const fields = [item.brand_zh, item.brand_en, item.name_zh, item.name_en, item.shade_zh, item.shade_en]
        if (!fields.some((f) => f?.toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [items, typeFilter, categoryFilter, skinFilter, search])

  return (
    <div>
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">品項管理</h2>
        <Link
          to="/items/new"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary)] text-white shadow-sm"
        >
          <Plus size={20} strokeWidth={2} />
        </Link>
      </div>

      {/* 搜尋列 */}
      <div className="relative mb-3">
        <Search size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋品牌、品名、色號…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-bg-muted)] focus:outline-none focus:border-[var(--color-primary)]"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] min-h-0 min-w-0 w-5 h-5 flex items-center justify-center"
          >
            <X size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* 類型篩選 */}
      <div className="flex gap-2 mb-2 overflow-x-auto pb-1 scrollbar-hide">
        {(['all', 'makeup', 'skincare'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTypeFilter(t); setCategoryFilter('all'); setSkinFilter('all') }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-0 ${
              typeFilter === t ? activeChip : inactiveChip
            }`}
          >
            {t === 'all' ? '全部' : t === 'makeup' ? '化妝品' : '保養品'}
          </button>
        ))}
      </div>

      {/* 類別篩選 */}
      {categories.length > 0 && (
        <div className="flex gap-2 mb-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors min-h-0 ${
              categoryFilter === 'all' ? activeSecondary : inactiveSecondary
            }`}
          >
            全部類別
          </button>
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategoryFilter(c.value)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors min-h-0 ${
                categoryFilter === c.value ? activeSecondary : inactiveSecondary
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* 敏感肌篩選（保養品） */}
      {(typeFilter === 'skincare' || skinFilter !== 'all') && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSkinFilter('all')}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors min-h-0 ${
              skinFilter === 'all' ? activeSecondary : inactiveSecondary
            }`}
          >
            不限
          </button>
          {SENSITIVE_SKIN_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setSkinFilter(o.value)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors min-h-0 ${
                skinFilter === o.value ? activeSecondary : inactiveSecondary
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {/* 結果數 */}
      {!loading && (
        <p className="text-xs text-[var(--color-text-muted)] mb-3">共 {filtered.length} 筆</p>
      )}

      {/* 列表 */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <ItemCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <EmptyState Icon={AlertTriangle} title="載入失敗" description={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          Icon={Inbox}
          title="沒有符合的品項"
          description={items.length === 0 ? '點右上角 + 新增第一筆品項' : '試試調整搜尋條件'}
          action={
            items.length === 0 ? (
              <Link
                to="/items/new"
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm"
              >
                新增品項
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => <ItemCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  )
}
