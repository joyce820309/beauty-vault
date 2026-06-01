import { useState, useMemo, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, Search, X, RotateCcw, Sparkle, Droplets } from 'lucide-react'
import { getExpiryItems, updateDisposalStatus } from '@/lib/supabase/items'
import { getExpiryLevel, expiryColors } from '@/utils/expiry'
import { ItemCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import type { Item, DisposalStatus } from '@/types/database'
import { differenceInDays, parseISO, format } from 'date-fns'

type Tab = 'all' | 'kept' | 'disposed'

const LEVEL_ORDER = { urgent: 0, warning: 1, caution: 2, ok: 3 }

function getDaysLeft(expDate: string) {
  return differenceInDays(parseISO(expDate), new Date())
}

function ExpiryStatusBadge({ expDate }: { expDate: string }) {
  const level = getExpiryLevel(expDate)
  const days = getDaysLeft(expDate)
  const color = expiryColors[level]

  const text = days < 0
    ? `過期 ${Math.abs(days)} 天`
    : level === 'ok'
    ? `${format(parseISO(expDate), 'yyyy/MM/dd')} 到期`
    : `剩 ${days} 天`

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ color, backgroundColor: `${color}18` }}
    >
      {text}
    </span>
  )
}

export default function ExpiryLogPage() {
  const { showToast } = useToast()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('kept')
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<number | null>(null)

  const loadItems = useCallback(async () => {
    setLoading(true)
    const { data } = await getExpiryItems()
    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  async function toggleDisposal(item: Item) {
    const next: DisposalStatus = item.disposal_status === 'disposed' ? 'kept' : 'disposed'
    setUpdating(item.id)
    const { error } = await updateDisposalStatus(item.id, next)
    if (error) {
      showToast('更新失敗', 'error')
    } else {
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, disposal_status: next } : i))
      showToast(next === 'disposed' ? '已標記為丟棄' : '已恢復為待處理')
    }
    setUpdating(null)
  }

  const filtered = useMemo(() => {
    return items
      .filter((item) => {
        if (tab === 'kept') return item.disposal_status !== 'disposed'
        if (tab === 'disposed') return item.disposal_status === 'disposed'
        return true
      })
      .filter((item) => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return [item.brand_en, item.brand_zh, item.name_en, item.name_zh]
          .some((f) => f?.toLowerCase().includes(q))
      })
      .sort((a, b) => {
        if (tab === 'disposed') return b.exp_date!.localeCompare(a.exp_date!)
        const la = LEVEL_ORDER[getExpiryLevel(a.exp_date)]
        const lb = LEVEL_ORDER[getExpiryLevel(b.exp_date)]
        if (la !== lb) return la - lb
        return a.exp_date!.localeCompare(b.exp_date!)
      })
  }, [items, tab, search])

  const keptCount = items.filter((i) => i.disposal_status !== 'disposed').length
  const disposedCount = items.filter((i) => i.disposal_status === 'disposed').length
  const urgentCount = items.filter((i) => {
    const l = getExpiryLevel(i.exp_date)
    return (l === 'urgent' || l === 'warning') && i.disposal_status !== 'disposed'
  }).length

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'kept', label: '待處理', count: keptCount },
    { key: 'disposed', label: '已丟棄', count: disposedCount },
    { key: 'all', label: '全部', count: items.length },
  ]

  return (
    <div>
      {/* 標題 */}
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">即期管理</h2>
        {urgentCount > 0 && !loading && (
          <p className="text-xs text-[var(--color-danger)] mt-0.5">{urgentCount} 筆需要注意</p>
        )}
      </div>

      {/* 搜尋 */}
      <div className="relative mb-3">
        <Search size={15} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋品牌、品名…"
          className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-bg-muted)] focus:outline-none"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 min-h-0 min-w-0 w-5 h-5 flex items-center justify-center text-[var(--color-text-muted)]"
          >
            <X size={13} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Tab 列 */}
      <div className="flex gap-2 mb-4">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-0 ${
              tab === key
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]'
            }`}
          >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              tab === key ? 'bg-white/25' : 'bg-[var(--color-border)]'
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <ItemCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          Icon={CalendarClock}
          title={tab === 'disposed' ? '還沒有丟棄紀錄' : '沒有符合的品項'}
          description={items.length === 0 ? '品項需要設定有效期限才會顯示在這裡' : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isDisposed = item.disposal_status === 'disposed'
            const level = getExpiryLevel(item.exp_date)
            const name = item.name_en || item.name_zh || '（未命名）'
            const brand = item.brand_en || item.brand_zh || ''
            const isUpdating = updating === item.id

            return (
              <div
                key={item.id}
                className={`border rounded-2xl bg-[var(--color-bg-card)] overflow-hidden transition-all ${
                  isDisposed
                    ? 'border-[var(--color-border)] opacity-60'
                    : level === 'urgent' ? 'border-[var(--color-danger)]/40'
                    : level === 'warning' ? 'border-[var(--color-warning)]/40'
                    : level === 'caution' ? 'border-[var(--color-caution)]/40'
                    : 'border-[var(--color-border)]'
                }`}
              >
                {/* 上半：品項資訊 */}
                <Link to={`/items/${item.id}`} className="flex items-center gap-3 px-4 pt-3 pb-2">
                  {/* 縮圖 */}
                  <div className="w-11 h-11 rounded-xl bg-[var(--color-bg-muted)] flex-shrink-0 overflow-hidden">
                    {item.image_url
                      ? <img src={item.image_url} alt={name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]">
                          {item.item_type === 'makeup'
                            ? <Sparkle size={18} strokeWidth={1.5} />
                            : <Droplets size={18} strokeWidth={1.5} />
                          }
                        </div>
                    }
                  </div>

                  {/* 文字 */}
                  <div className="flex-1 min-w-0">
                    {brand && <p className="text-xs text-[var(--color-text-muted)] truncate">{brand}</p>}
                    <p className={`text-sm font-medium truncate mt-0.5 ${isDisposed ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'}`}>
                      {name}
                    </p>
                  </div>

                  {/* 到期標籤 */}
                  <div className="flex-shrink-0">
                    {isDisposed
                      ? <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-muted)] px-2 py-0.5 rounded-full">已丟棄</span>
                      : <ExpiryStatusBadge expDate={item.exp_date!} />
                    }
                  </div>
                </Link>

                {/* 下半：操作列 */}
                <div className="flex border-t border-[var(--color-border)]">
                  <Link
                    to={`/items/${item.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] transition-colors min-h-0"
                  >
                    <span>查看詳情</span>
                  </Link>

                  <div className="w-px bg-[var(--color-border)]" />

                  <button
                    onClick={() => toggleDisposal(item)}
                    disabled={isUpdating}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors min-h-0 disabled:opacity-50 ${
                      isDisposed
                        ? 'text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]'
                        : 'text-[var(--color-danger)] hover:bg-red-50'
                    }`}
                  >
                    {isUpdating ? (
                      <span className="text-[var(--color-text-muted)]">更新中…</span>
                    ) : isDisposed ? (
                      <>
                        <RotateCcw size={13} strokeWidth={2} />
                        <span>恢復待處理</span>
                      </>
                    ) : (
                      <>
                        <span>✓</span>
                        <span>標記已丟棄</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="h-8" />
    </div>
  )
}
