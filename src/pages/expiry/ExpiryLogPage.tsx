import { useState, useMemo, useCallback, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarClock, Search, X, RotateCcw, Trash2, Eye, EyeOff, Sparkle, Palette, Milk } from 'lucide-react'
import { getExpiryItems, updateDisposalStatus, deleteItem, updateDisposalWithReason, updateDisposalReason } from '@/lib/supabase/items'
import { DisposalReasonModal } from '@/components/ui/DisposalReasonModal'
import { getExpiryLevel, expiryColors, type ExpiryLevel } from '@/utils/expiry'
import { ItemCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { useCategories } from '@/contexts/CategoriesContext'
import type { Item, DisposalStatus, DisposalReason } from '@/types/database'
import { differenceInDays, parseISO, format } from 'date-fns'

type Tab = 'all' | 'kept' | 'watching' | 'disposed'

type LevelFilter = Exclude<ExpiryLevel, 'ok'>

const LEVEL_FILTERS: { key: LevelFilter; label: string }[] = [
  { key: 'expired', label: '已過期' },
  { key: 'urgent',  label: '緊急' },
  { key: 'warning', label: '警告' },
  { key: 'caution', label: '注意' },
  { key: 'notice',  label: '通知' },
]

const LEVEL_ORDER = { expired: 0, urgent: 1, warning: 2, caution: 3, notice: 4, ok: 5 }

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
  const { getCategoryLabel } = useCategories()
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const initialTab = (searchParams.get('tab') as Tab | null)
  const [tab, setTab] = useState<Tab>(initialTab ?? 'kept')
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<number | null>(null)
  const [disposalModalItem, setDisposalModalItem] = useState<Item | null>(null)

  const initialFilter = searchParams.get('filter') as LevelFilter | null
  const [levelFilters, setLevelFilters] = useState<Set<LevelFilter>>(
    initialFilter && LEVEL_FILTERS.some(f => f.key === initialFilter)
      ? new Set([initialFilter])
      : new Set()
  )

  function toggleLevel(key: LevelFilter) {
    setLevelFilters(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const loadItems = useCallback(async () => {
    setLoading(true)
    const { data } = await getExpiryItems()
    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  async function setStatus(item: Item, next: DisposalStatus) {
    setUpdating(item.id)
    const { error } = await updateDisposalStatus(item.id, next)
    if (error) {
      showToast('更新失敗', 'error')
    } else {
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, disposal_status: next } : i))
      const msg = next === 'watching' ? '已標記為觀察中'
        : next === 'disposed' ? '已標記為已丟棄'
        : '已恢復為待處理'
      showToast(msg)
    }
    setUpdating(null)
  }

  async function handleDispose(reason: DisposalReason) {
    if (!disposalModalItem) return
    const target = disposalModalItem
    setUpdating(target.id)
    const { error } = await updateDisposalWithReason(target.id, reason)
    if (error) { showToast('更新失敗', 'error') }
    else {
      setItems(prev => prev.map(i => i.id === target.id ? { ...i, disposal_status: 'disposed', disposal_reason: reason } : i))
      showToast(reason === 'finished' ? '已記錄為用完 ✅' : '已記錄為提早丟棄')
    }
    setUpdating(null)
    setDisposalModalItem(null)
  }

  async function handleReasonChange(reason: DisposalReason) {
    if (!disposalModalItem) return
    const target = disposalModalItem
    setUpdating(target.id)
    const { error } = await updateDisposalReason(target.id, reason)
    if (error) { showToast('更新失敗', 'error') }
    else {
      setItems(prev => prev.map(i => i.id === target.id ? { ...i, disposal_reason: reason } : i))
      showToast('丟棄原因已更新')
    }
    setUpdating(null)
    setDisposalModalItem(null)
  }

  async function handleDelete(item: Item) {
    if (!confirm(`確定要刪除「${item.name_en || item.name_zh || '此品項'}」的紀錄？`)) return
    setUpdating(item.id)
    await deleteItem(item.id)
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    showToast('已刪除')
    setUpdating(null)
  }

  const filtered = useMemo(() => {
    return items
      .filter((item) => {
        if (tab === 'kept') return !item.disposal_status || item.disposal_status === 'kept'
        if (tab === 'watching') return item.disposal_status === 'watching'
        if (tab === 'disposed') return item.disposal_status === 'disposed'
        return true
      })
      .filter((item) => {
        if (levelFilters.size === 0) return true
        const level = getExpiryLevel(item.exp_date)
        return levelFilters.has(level as LevelFilter)
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
  }, [items, tab, search, levelFilters])

  const keptCount = items.filter((i) => !i.disposal_status || i.disposal_status === 'kept').length
  const watchingCount = items.filter((i) => i.disposal_status === 'watching').length
  const disposedCount = items.filter((i) => i.disposal_status === 'disposed').length
  const urgentCount = items.filter((i) => {
    const l = getExpiryLevel(i.exp_date)
    return (l === 'expired' || l === 'urgent' || l === 'warning') && i.disposal_status !== 'disposed'
  }).length

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'kept', label: '待處理', count: keptCount },
    { key: 'watching', label: '觀察中', count: watchingCount },
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
      <div className="flex gap-1.5 mb-2">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors min-h-0 ${
              tab === key
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]'
            }`}
          >
            {label}
            <span className={`text-xs px-1 py-0 rounded-full leading-4 ${
              tab === key ? 'bg-white/25' : 'bg-[var(--color-border)]'
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* 效期狀態篩選（可多選） */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {LEVEL_FILTERS.map(({ key, label }) => {
          const active = levelFilters.has(key)
          return (
            <button
              key={key}
              onClick={() => toggleLevel(key)}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors min-h-0 border"
              style={active
                ? { backgroundColor: `${expiryColors[key]}18`, color: expiryColors[key], borderColor: `${expiryColors[key]}40` }
                : { backgroundColor: 'var(--color-bg-muted)', color: 'var(--color-text-muted)', borderColor: 'transparent' }
              }
            >
              {label}
            </button>
          )
        })}
        {levelFilters.size > 0 && (
          <button onClick={() => setLevelFilters(new Set())} className="text-xs text-[var(--color-primary)] hover:underline min-h-0 px-1">
            清除
          </button>
        )}
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
            const isWatching = item.disposal_status === 'watching'
            const level = getExpiryLevel(item.exp_date)
            const nameLine = [item.name_en, item.name_zh].filter(Boolean).join(' / ') || '（未命名）'
            const brand = item.brand_en || item.brand_zh || ''
            const shadeLine = [
              item.shade_en ? `#${item.shade_en}` : '',
              item.shade_zh || '',
            ].filter(Boolean).join(' / ')
            const isUpdating = updating === item.id

            return (
              <div
                key={item.id}
                className={`border rounded-2xl bg-[var(--color-bg-card)] overflow-hidden transition-all ${
                  isDisposed
                    ? 'border-[var(--color-border)] opacity-50'
                    : isWatching
                    ? 'border-[var(--color-accent)]/40'
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
                      ? <img src={item.image_url} alt={nameLine} className="w-full h-full object-cover" />
                      : (() => {
                          const isMakeup = item.item_type === 'makeup'
                          const isSkincare = item.item_type === 'skincare'
                          const hasType = isMakeup || isSkincare
                          const bgStyle = !hasType ? { backgroundColor: '#f4efef' } : isMakeup ? { backgroundColor: '#fce8ee' } : { backgroundColor: '#ede8f5' }
                          const iconColor = !hasType ? 'var(--color-text-muted)' : isMakeup ? '#c4768a' : '#9b8dc4'
                          return (
                            <div className="w-full h-full flex items-center justify-center" style={bgStyle}>
                              {!hasType
                                ? <Sparkle size={18} strokeWidth={1.5} style={{ color: iconColor }} />
                                : isMakeup
                                ? <Palette size={18} strokeWidth={1.5} style={{ color: iconColor }} />
                                : <Milk size={18} strokeWidth={1.5} style={{ color: iconColor }} />
                              }
                            </div>
                          )
                        })()
                    }
                  </div>

                  {/* 文字 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--color-text-muted)] truncate">
                      {[brand, getCategoryLabel(item.category)].filter(Boolean).join(' · ')}
                    </p>
                    <p className={`text-sm font-medium truncate mt-0.5 ${isDisposed ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'}`}>
                      {nameLine}
                    </p>
                    {shadeLine && (
                      <p className="text-xs text-[var(--color-text-muted)] truncate">{shadeLine}</p>
                    )}
                  </div>

                  {/* 到期標籤 */}
                  <div className="flex-shrink-0">
                    {isDisposed
                      ? <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-muted)] px-2 py-0.5 rounded-full">已丟棄</span>
                      : isWatching
                      ? <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: 'var(--color-accent)', backgroundColor: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }}>觀察中</span>
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

                  {isDisposed ? (
                    /* 已丟棄：原因 + 恢復 + 刪除 */
                    <>
                      <button
                        onClick={() => setDisposalModalItem(item)}
                        disabled={isUpdating}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] transition-colors min-h-0 disabled:opacity-50"
                      >
                        <span>{item.disposal_reason === 'finished' ? '已用完' : item.disposal_reason === 'discarded' ? '未用完丟棄' : '編輯原因'}</span>
                      </button>
                      <div className="w-px bg-[var(--color-border)]" />
                      <button
                        onClick={() => setStatus(item, 'kept')}
                        disabled={isUpdating}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors min-h-0 disabled:opacity-50"
                      >
                        {isUpdating ? <span className="text-[var(--color-text-muted)]">更新中…</span> : <><RotateCcw size={13} strokeWidth={2} /><span>恢復</span></>}
                      </button>
                      <div className="w-px bg-[var(--color-border)]" />
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={isUpdating}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-[var(--color-danger)] hover:bg-[var(--color-primary-light)] transition-colors min-h-0 disabled:opacity-50"
                      >
                        <Trash2 size={13} strokeWidth={1.5} />
                        <span>刪除</span>
                      </button>
                    </>
                  ) : (
                    /* 待處理 / 觀察中：顯示兩顆按鈕 */
                    <>
                      <button
                        onClick={() => setStatus(item, isWatching ? 'kept' : 'watching')}
                        disabled={isUpdating}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors min-h-0 disabled:opacity-50 ${
                          isWatching
                            ? 'text-[var(--color-accent)] bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20'
                            : 'text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10'
                        }`}
                      >
                        {isUpdating ? (
                          <span className="text-[var(--color-text-muted)]">更新中…</span>
                        ) : isWatching ? (
                          <><EyeOff size={13} strokeWidth={1.5} /><span>取消觀察</span></>
                        ) : (
                          <><Eye size={13} strokeWidth={1.5} /><span>標記觀察中</span></>
                        )}
                      </button>

                      <div className="w-px bg-[var(--color-border)]" />

                      <button
                        onClick={() => setDisposalModalItem(item)}
                        disabled={isUpdating}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors min-h-0 disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <span className="text-[var(--color-text-muted)]">更新中…</span>
                        ) : (
                          <><Trash2 size={13} strokeWidth={1.5} /><span>標記已丟棄</span></>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="h-8" />

      {/* 丟棄原因 Modal */}
      {disposalModalItem && (
        <DisposalReasonModal
          current={disposalModalItem.disposal_reason}
          onSelect={disposalModalItem.disposal_status === 'disposed' ? handleReasonChange : handleDispose}
          onCancel={() => setDisposalModalItem(null)}
          loading={updating === disposalModalItem.id}
        />
      )}
    </div>
  )
}
