import { useState, useMemo } from 'react'
import { Search, X, SearchX } from 'lucide-react'
import { useItemSearch } from '@/hooks/useItems'
import { ItemCard } from '@/components/ui/ItemCard'
import { ItemCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Item } from '@/types/database'

function scoreItem(item: Item, query: string): number {
  const q = query.toLowerCase()
  const fields = [
    item.brand_en, item.brand_zh,
    item.name_en, item.name_zh,
    item.shade_en, item.shade_zh,
    item.note,
  ]
  let score = 0
  for (const f of fields) {
    if (!f) continue
    const v = f.toLowerCase()
    if (v === q) { score += 100; continue }
    if (v.startsWith(q)) { score += 50; continue }
    if (v.includes(q)) { score += 10 }
  }
  return score
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const { items, loading } = useItemSearch(query)

  const sorted = useMemo(
    () => query.trim()
      ? [...items].sort((a, b) => scoreItem(b, query) - scoreItem(a, query))
      : items,
    [items, query]
  )

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">搜尋</h2>

      {/* 搜尋列 */}
      <div className="relative mb-4">
        <Search size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="品牌、品名、色號、備註…"
          className="w-full pl-10 pr-10 py-3 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-bg-muted)] focus:outline-none focus:border-[var(--color-primary)]"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] min-h-0 min-w-0 w-5 h-5 flex items-center justify-center"
          >
            <X size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* 結果 */}
      {!query.trim() ? (
        <EmptyState
          Icon={Search}
          title="輸入關鍵字開始搜尋"
          description="可搜尋品牌、品名、色號或備註"
        />
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <ItemCardSkeleton key={i} />)}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          Icon={SearchX}
          title={`找不到「${query}」`}
          description="換個關鍵字試試"
        />
      ) : (
        <>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">找到 {sorted.length} 筆結果</p>
          <div className="space-y-3">
            {sorted.map((item) => <ItemCard key={item.id} item={item} />)}
          </div>
        </>
      )}
    </div>
  )
}
