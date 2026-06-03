import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search, X, AlertTriangle, Inbox, LayoutGrid, Table2, ArrowUpDown, ArrowUp, ArrowDown, SlidersHorizontal } from 'lucide-react'
import { useItems } from '@/hooks/useItems'
import { ItemCard } from '@/components/ui/ItemCard'
import { ItemTable } from '@/components/ui/ItemTable'
import { ItemCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SENSITIVE_SKIN_OPTIONS } from '@/utils/categories'
import { useCategories } from '@/contexts/CategoriesContext'
import { getExpiryLevel } from '@/utils/expiry'
import type { ItemType, SensitiveSkinStatus } from '@/types/database'

type TypeFilter = ItemType | 'all'
type SkinFilter = SensitiveSkinStatus | 'all'
type StatusKey = 'expired' | 'urgent' | 'warning' | 'caution' | 'notice' | 'watching' | 'disposed'
type ViewMode = 'card' | 'table'

const STATUS_OPTIONS: { key: StatusKey; label: string; color: string; bg: string }[] = [
  { key: 'expired',  label: '已過期', color: 'var(--color-text-muted)',  bg: 'var(--color-bg-muted)' },
  { key: 'urgent',   label: '緊急',   color: 'var(--color-danger)',      bg: 'color-mix(in srgb, var(--color-danger) 15%, transparent)' },
  { key: 'warning',  label: '警告',   color: 'var(--color-warning)',     bg: 'color-mix(in srgb, var(--color-warning) 15%, transparent)' },
  { key: 'caution',  label: '注意',   color: 'var(--color-caution)',     bg: 'color-mix(in srgb, var(--color-caution) 15%, transparent)' },
  { key: 'notice',   label: '通知',   color: 'var(--color-accent)',      bg: 'color-mix(in srgb, var(--color-accent) 15%, transparent)' },
  { key: 'watching', label: '觀察中', color: 'var(--color-accent)',      bg: 'color-mix(in srgb, var(--color-accent) 15%, transparent)' },
  { key: 'disposed', label: '已丟棄', color: 'var(--color-text-muted)',  bg: 'var(--color-bg-muted)' },
]
type SortKey = 'seq_no' | 'created_at' | 'purchase_date' | 'exp_date' | 'brand' | 'name' | 'rating'
type SortDir = 'asc' | 'desc'

const LS_VIEW_KEY     = 'beauty-vault:items-view'
const LS_SORT_KEY     = 'beauty-vault:items-sort'
const LS_FILTER_KEY   = 'beauty-vault:items-filter'
const LS_SEARCH_KEY   = 'beauty-vault:items-search'

function getInitialFilters() {
  try {
    const saved = localStorage.getItem(LS_FILTER_KEY)
    if (!saved) return { type: 'all' as TypeFilter, status: [] as StatusKey[], category: [] as string[], skin: 'all' as SkinFilter }
    return JSON.parse(saved)
  } catch {
    return { type: 'all' as TypeFilter, status: [] as StatusKey[], category: [] as string[], skin: 'all' as SkinFilter }
  }
}

function saveFilters(f: { type: TypeFilter; status: StatusKey[]; category: string[]; skin: SkinFilter }) {
  try { localStorage.setItem(LS_FILTER_KEY, JSON.stringify(f)) } catch {}
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'seq_no',        label: '#' },
  { key: 'created_at',    label: '新增日期' },
  { key: 'purchase_date', label: '購買日期' },
  { key: 'exp_date',      label: '到期日期' },
  { key: 'brand',         label: '品牌' },
  { key: 'name',          label: '品名' },
  { key: 'rating',        label: '評分' },
]

function getInitialSort(): { key: SortKey; dir: SortDir } {
  try {
    const saved = localStorage.getItem(LS_SORT_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return { key: 'created_at', dir: 'desc' }
}

function getInitialView(): ViewMode {
  try { return (localStorage.getItem(LS_VIEW_KEY) as ViewMode) ?? 'card' }
  catch { return 'card' }
}

const activeChip = 'bg-[var(--color-primary)] text-white'
const inactiveChip = 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
const activeSecondary = 'bg-[var(--color-text)] text-white'
const inactiveSecondary = 'text-[var(--color-text-muted)]'
const inactiveCategoryStyle = { backgroundColor: 'rgba(222, 206, 213, 0.32)' }

const HEALTH_LABELS: Record<string, string> = {
  'no-category':      '顯示未設定類別的品項',
  'no-expiry':        '顯示未設定效期的品項',
  'no-purchase-date': '顯示未設定購入日期的品項',
}

export default function ItemListPage() {
  const [searchParams] = useSearchParams()
  const healthFilter = searchParams.get('filter')
  const { items, loading, error } = useItems()
  const { makeupCategories, skincareCategories, makeupParents, skincareParents, getChildren } = useCategories()
  const [search, setSearch] = useState(() => {
    try { return localStorage.getItem(LS_SEARCH_KEY) ?? '' } catch { return '' }
  })
  const [view, setView] = useState<ViewMode>(getInitialView)
  const [sort, setSort] = useState(getInitialSort)
  const [showFilter, setShowFilter] = useState(false)
  const [hideDisposed, setHideDisposed] = useState(true)

  const _init = getInitialFilters()
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(_init.type)
  const [skinFilter, setSkinFilter] = useState<SkinFilter>(_init.skin)
  const [statusFilters, setStatusFilters] = useState<Set<StatusKey>>(new Set(_init.status))
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set(_init.category))

  function persist(patch: Partial<{ type: TypeFilter; status: StatusKey[]; category: string[]; skin: SkinFilter }>) {
    saveFilters({
      type: typeFilter, status: [...statusFilters], category: [...categoryFilters], skin: skinFilter,
      ...patch,
    })
  }

  function toggleStatus(key: StatusKey) {
    setStatusFilters(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      persist({ status: [...next] })
      return next
    })
  }

  function toggleCategory(val: string) {
    setCategoryFilters(prev => {
      const next = new Set(prev)
      next.has(val) ? next.delete(val) : next.add(val)
      persist({ category: [...next] })
      return next
    })
  }

  function switchView(v: ViewMode) {
    setView(v)
    try { localStorage.setItem(LS_VIEW_KEY, v) } catch {}
  }

  function handleSortKey(key: SortKey) {
    setSort((prev) => {
      const next = prev.key === key
        ? { key, dir: (prev.dir === 'asc' ? 'desc' : 'asc') as SortDir }
        : { key, dir: 'asc' as SortDir }
      try { localStorage.setItem(LS_SORT_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const filtered = useMemo(() => {
    const hasStatus = statusFilters.size > 0
    const hasCat = categoryFilters.size > 0
    const list = items.filter((item) => {
      // 狀態篩選（多選 OR）
      if (hasStatus) {
        const level = getExpiryLevel(item.exp_date)
        const match = [...statusFilters].some(s => {
          if (s === 'disposed') return item.disposal_status === 'disposed'
          if (s === 'watching') return item.disposal_status === 'watching'
          return item.disposal_status !== 'disposed' && level === s
        })
        if (!match) return false
      } else {
        if (hideDisposed && item.disposal_status === 'disposed') return false
      }
      if (typeFilter !== 'all' && item.item_type !== typeFilter) return false
      // 類別篩選（多選 OR）
      if (hasCat && !categoryFilters.has(item.category ?? '')) return false
      if (skinFilter !== 'all') {
        if (item.item_type !== 'skincare') return false
        if (item.sensitive_skin_ok !== skinFilter) return false
      }
      if (search.trim()) {
        const q = search.toLowerCase()
        const fields = [item.brand_zh, item.brand_en, item.name_zh, item.name_en, item.shade_zh, item.shade_en, item.purchase_date, item.exp_date, item.mfg_date]
        if (!fields.some((f) => f?.toLowerCase().includes(q))) return false
      }
      if (healthFilter === 'no-category'      && item.category)      return false
      if (healthFilter === 'no-expiry'        && item.exp_date)       return false
      if (healthFilter === 'no-purchase-date' && item.purchase_date)  return false
      return true
    })

    const { key, dir } = sort
    const mul = dir === 'asc' ? 1 : -1

    list.sort((a, b) => {
      let va: string | number | null = null
      let vb: string | number | null = null
      if (key === 'brand') {
        va = (a.brand_en || a.brand_zh || '').toLowerCase()
        vb = (b.brand_en || b.brand_zh || '').toLowerCase()
      } else if (key === 'name') {
        va = (a.name_en || a.name_zh || '').toLowerCase()
        vb = (b.name_en || b.name_zh || '').toLowerCase()
      } else if (key === 'rating') {
        va = a.rating ?? -1
        vb = b.rating ?? -1
      } else if (key === 'seq_no') {
        va = a.seq_no ?? Infinity
        vb = b.seq_no ?? Infinity
      } else {
        // 日期欄位：null 永遠排在最後
        va = (a[key] as string | null)
        vb = (b[key] as string | null)
      }
      // null last（不受排序方向影響）
      if (va === null && vb === null) return 0
      if (va === null) return 1
      if (vb === null) return -1
      if (va < vb) return -1 * mul
      if (va > vb) return 1 * mul
      return 0
    })

    return list
  }, [items, typeFilter, categoryFilters, skinFilter, search, sort, statusFilters, hideDisposed, healthFilter])

  const toggleBtn = (v: ViewMode, Icon: React.ElementType) => (
    <button
      onClick={() => switchView(v)}
      className={`p-1.5 rounded-lg transition-colors min-h-0 min-w-0 ${
        view === v
          ? 'bg-[var(--color-primary)] text-white'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]'
      }`}
    >
      <Icon size={16} strokeWidth={1.8} />
    </button>
  )

  return (
    <div>
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">品項管理</h2>
        <div className="flex items-center gap-2">
          {/* 視圖切換 */}
          <div className="flex items-center gap-0.5 border border-[var(--color-border)] rounded-lg p-0.5">
            {toggleBtn('card', LayoutGrid)}
            {toggleBtn('table', Table2)}
          </div>
          <Link
            to="/items/new"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--color-primary)] text-white shadow-sm"
          >
            <Plus size={18} strokeWidth={2} />
          </Link>
        </div>
      </div>

      {/* 健康篩選 banner */}
      {healthFilter && HEALTH_LABELS[healthFilter] && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
          <span className="text-xs text-amber-700 flex-1">{HEALTH_LABELS[healthFilter]}</span>
          <Link to="/items" className="text-xs text-amber-600 font-medium hover:underline min-h-0">
            清除
          </Link>
        </div>
      )}

      {/* 搜尋列 */}
      <div className="relative mb-3">
        <Search size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); try { localStorage.setItem(LS_SEARCH_KEY, e.target.value) } catch {} }}
          placeholder="搜尋品牌、品名、色號…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-bg-muted)] focus:outline-none focus:border-[var(--color-primary)]"
        />
        {search && (
          <button
            onClick={() => { setSearch(''); try { localStorage.removeItem(LS_SEARCH_KEY) } catch {} }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] min-h-0 min-w-0 w-5 h-5 flex items-center justify-center"
          >
            <X size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* 類型篩選 + 篩選按鈕 */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex gap-2 flex-1 overflow-x-auto scrollbar-hide">
          {([
            { id: 'active',   label: '現有',  type: 'all'      as TypeFilter, disposed: true  },
            { id: 'all',      label: '全部',  type: 'all'      as TypeFilter, disposed: false },
            { id: 'makeup',   label: '化妝品', type: 'makeup'   as TypeFilter, disposed: true  },
            { id: 'skincare', label: '保養品', type: 'skincare' as TypeFilter, disposed: true  },
          ] as const).map(({ id, label, type, disposed }) => {
            const isActive =
              id === 'active'   ? (typeFilter === 'all'      && hideDisposed) :
              id === 'all'      ? (typeFilter === 'all'      && !hideDisposed) :
              id === 'makeup'   ? (typeFilter === 'makeup') :
                                  (typeFilter === 'skincare')
            return (
              <button
                key={id}
                onClick={() => {
                  setTypeFilter(type)
                  setHideDisposed(disposed)
                  setCategoryFilters(new Set())
                  setSkinFilter('all')
                  persist({ type, category: [], skin: 'all' })
                }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-0 ${
                  isActive ? activeChip : inactiveChip
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* 篩選按鈕 */}
        {(() => {
          const activeCount = statusFilters.size + categoryFilters.size + (skinFilter !== 'all' ? 1 : 0)
          return (
            <button
              onClick={() => setShowFilter((v) => !v)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors min-h-0 ${
                showFilter || activeCount > 0
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text)]'
              }`}
            >
              <SlidersHorizontal size={13} strokeWidth={2} />
              篩選
              {activeCount > 0 && (
                <span className="bg-white/30 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {activeCount}
                </span>
              )}
            </button>
          )
        })()}
      </div>

      {/* 進階篩選面板 */}
      {showFilter && (
        <div className="bg-[var(--color-bg-muted)] rounded-2xl p-3 mb-3 space-y-3">
          {/* 狀態（多選） */}
          <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-1.5 font-medium">效期狀態 <span className="opacity-60">（可多選）</span></p>
            <div className="flex gap-1.5 flex-wrap">
              {STATUS_OPTIONS.map(({ key, label, color, bg }) => {
                const active = statusFilters.has(key)
                return (
                  <button
                    key={key}
                    onClick={() => toggleStatus(key)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors min-h-0 border border-transparent"
                    style={active
                      ? { backgroundColor: bg, color, borderColor: 'transparent' }
                      : { backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }
                    }
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 類別（按大類分組，多選） */}
          {(() => {
            const parents  = typeFilter === 'makeup' ? makeupParents  : typeFilter === 'skincare' ? skincareParents  : [...makeupParents, ...skincareParents]
            const flatLeafs = typeFilter === 'makeup' ? makeupCategories : typeFilter === 'skincare' ? skincareCategories : [...makeupCategories, ...skincareCategories]
            if (flatLeafs.length === 0) return null

            function toggleParent(parent: typeof parents[0]) {
              const kids = getChildren(parent.id)
              if (kids.length === 0) return
              const allActive = kids.every(k => categoryFilters.has(k.value))
              setCategoryFilters(prev => {
                const next = new Set(prev)
                kids.forEach(k => allActive ? next.delete(k.value) : next.add(k.value))
                return next
              })
            }

            return (
              <div>
                <p className="text-xs text-[var(--color-text-muted)] mb-1.5 font-medium">類別 <span className="opacity-60">（可多選，點大類選整組）</span></p>
                {parents.length > 0 ? (
                  <div className="space-y-2">
                    {parents.map(parent => {
                      const kids = getChildren(parent.id)
                      if (kids.length === 0) return null
                      const allActive = kids.every(k => categoryFilters.has(k.value))
                      const someActive = kids.some(k => categoryFilters.has(k.value))
                      return (
                        <div key={parent.id}>
                          <button
                            onClick={() => toggleParent(parent)}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors min-h-0 mb-1 ${
                              allActive ? 'bg-[var(--color-text)] text-white' :
                              someActive ? 'bg-[var(--color-text)]/30 text-[var(--color-text)]' :
                              'text-[var(--color-text-muted)]'
                            }`}
                          >
                            {parent.label}
                          </button>
                          <div className="flex gap-1.5 flex-wrap pl-1">
                            {kids.map(c => {
                              const active = categoryFilters.has(c.value)
                              return (
                                <button key={c.value} onClick={() => toggleCategory(c.value)}
                                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors min-h-0 ${active ? activeSecondary : inactiveSecondary}`}
                                  style={active ? undefined : inactiveCategoryStyle}>
                                  {c.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                    {/* 未分組子類 */}
                    {flatLeafs.filter(c => !parents.some(p => p.id === c.parent_id)).map(c => {
                      const active = categoryFilters.has(c.value)
                      return (
                        <button key={c.value} onClick={() => toggleCategory(c.value)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors min-h-0 ${active ? activeSecondary : inactiveSecondary}`}
                          style={active ? undefined : inactiveCategoryStyle}>
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex gap-1.5 flex-wrap">
                    {flatLeafs.map(c => {
                      const active = categoryFilters.has(c.value)
                      return (
                        <button key={c.value} onClick={() => toggleCategory(c.value)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors min-h-0 ${active ? activeSecondary : inactiveSecondary}`}
                          style={active ? undefined : inactiveCategoryStyle}>
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}

          {/* 敏感肌（保養品才顯示） */}
          {(typeFilter === 'skincare' || skinFilter !== 'all') && (
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-1.5 font-medium">敏感肌</p>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => { setSkinFilter('all'); persist({ skin: 'all' }) }}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors min-h-0 ${
                    skinFilter === 'all' ? activeSecondary : inactiveSecondary
                  }`}
                >
                  不限
                </button>
                {SENSITIVE_SKIN_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => { setSkinFilter(o.value); persist({ skin: o.value }) }}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors min-h-0 ${
                      skinFilter === o.value ? activeSecondary : inactiveSecondary
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 清除全部 */}
          {(statusFilters.size > 0 || categoryFilters.size > 0 || skinFilter !== 'all') && (
            <button
              onClick={() => { setStatusFilters(new Set()); setCategoryFilters(new Set()); setSkinFilter('all'); persist({ status: [], category: [], skin: 'all' }) }}
              className="text-xs text-[var(--color-primary)] hover:underline min-h-0"
            >
              清除全部篩選
            </button>
          )}
        </div>
      )}

      {/* 結果數 + 排序（卡片模式才顯示排序） */}
      {!loading && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[var(--color-text-muted)]">
              共 {filtered.length} 筆{items.length !== filtered.length && `（篩選自 ${items.length} 筆）`}
            </p>
          </div>
          {view === 'card' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <ArrowUpDown size={12} strokeWidth={1.8} className="text-[var(--color-text-muted)] flex-shrink-0" />
              {SORT_OPTIONS.map(({ key, label }) => {
                const active = sort.key === key
                return (
                  <button
                    key={key}
                    onClick={() => handleSortKey(key)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors min-h-0 ${
                      active
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {label}
                    {active && (
                      sort.dir === 'asc'
                        ? <ArrowUp size={10} strokeWidth={2.5} />
                        : <ArrowDown size={10} strokeWidth={2.5} />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 列表 */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <ItemCardSkeleton key={i} />)}
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
              <Link to="/items/new" className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm">
                新增品項
              </Link>
            ) : undefined
          }
        />
      ) : view === 'table' ? (
        <ItemTable items={filtered} />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => <ItemCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  )
}
