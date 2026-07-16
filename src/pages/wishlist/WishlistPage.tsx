import { useState, useEffect, useCallback } from 'react'
import { CollapsibleNote } from '@/components/ui/AutoTextarea'
import { WishForm, type WishFormData } from './WishForm'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Trash2, ExternalLink, ShoppingBag, Check, Pencil, X, Heart, Zap, Search } from 'lucide-react'
import {
  getWishlist, createWishlistItem,
  updateWishlistItem, deleteWishlistItem,
  uploadWishlistImage,
} from '@/lib/supabase/wishlist'
import { getFavoriteItems, createItem } from '@/lib/supabase/items'
import type { Item, ItemType } from '@/types/database'
import { useToast } from '@/components/ui/Toast'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import type { WishlistItem } from '@/types/database'

type FormData = WishFormData

export default function WishlistPage() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [favorites, setFavorites] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [tab, setTab] = useState<'all' | 'pending' | 'purchased' | 'favorites'>('pending')
  const [typeFilter, setTypeFilter] = useState<'all' | 'makeup' | 'skincare'>('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: wishData }, { data: favData }] = await Promise.all([
      getWishlist(),
      getFavoriteItems(),
    ])
    setItems(wishData ?? [])
    setFavorites(favData ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd(data: FormData, imageFile: File | null, imageUrl: string | null) {
    let finalImageUrl = imageUrl
    if (imageFile) {
      const url = await uploadWishlistImage(imageFile)
      if (url) finalImageUrl = url
      else showToast('圖片上傳失敗，品項仍會儲存（不含圖片）', 'error')
    }
    const { error } = await createWishlistItem({
      item_type:    data.item_type ?? 'makeup',
      brand:        data.brand || null,
      name_zh:      data.name_zh || null,
      name_en:      data.name_en || null,
      shade:        data.shade || null,
      price_type:   data.price_type ?? 'normal',
      price:        data.price_type === 'gift' ? 0 : (data.price === '' ? null : Number(data.price) || null),
      url:          data.url || null,
      ...(finalImageUrl !== null ? { image_url: finalImageUrl } : {}),
      note:         data.note || null,
      is_purchased: false,
    })
    if (error) { showToast('新增失敗', 'error'); return }
    showToast('已加入採購清單')
    setShowAddForm(false)
    await load()
  }

  async function handleEdit(id: number, data: FormData, imageFile: File | null, imageUrl: string | null) {
    let finalImageUrl = imageUrl
    if (imageFile) {
      const url = await uploadWishlistImage(imageFile)
      if (url) finalImageUrl = url
      else showToast('圖片上傳失敗，品項仍會儲存（不含圖片）', 'error')
    }
    const { error } = await updateWishlistItem(id, {
      item_type:  data.item_type ?? 'makeup',
      brand:      data.brand || null,
      name_zh:    data.name_zh || null,
      name_en:    data.name_en || null,
      shade:      data.shade || null,
      price_type: data.price_type ?? 'normal',
      price:      data.price_type === 'gift' ? 0 : (data.price === '' ? null : Number(data.price) || null),
      url:        data.url || null,
      image_url:  finalImageUrl ?? undefined,
      note:       data.note || null,
    })
    if (error) { showToast('更新失敗', 'error'); return }
    showToast('已更新')
    setEditingId(null)
    await load()
  }

  async function togglePurchased(item: WishlistItem) {
    const newPurchased = !item.is_purchased
    await updateWishlistItem(item.id, { is_purchased: newPurchased })
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_purchased: newPurchased } : i))

    if (!newPurchased) {
      showToast('已移回待購')
      return
    }

    // 標記為已購入 → 自動建立品項
    const { data: newItem, error } = await createItem({
      item_type:        (item.item_type ?? 'makeup') as ItemType,
      brand_en:         item.brand || null,
      brand_zh:         null,
      name_zh:          item.name_zh,
      name_en:          item.name_en,
      shade_en:         item.shade || null,
      shade_zh:         null,
      category:         null,
      subcategory:      null,
      mfg_date:         null,
      exp_date:         null,
      price:            item.price ?? null,
      price_type:       item.price_type ?? null,
      original_price:   null,
      purchase_date:    null,
      image_url:        item.image_url ?? null,
      note:             item.note ?? null,
      rating:           null,
      review:           null,
      sensitive_skin_ok: null,
      disposal_status:  'kept',
      disposal_reason:  null,
      currency:         null,
      fragrance:        null,
      is_dud:           false,
      is_sample:        false,
      is_favorite:      false,
      volume_ml:        null,
      channel:          null,
      ignore_health:    false,
    })

    if (error || !newItem) {
      showToast('已標記為已購，但品項建立失敗', 'error')
      return
    }

    showToast('已購入！正在跳轉至品項編輯…')
    navigate(`/items/${newItem.id}/edit`)
  }

  async function handleDelete(id: number) {
    if (!confirm('確定要刪除此品項？')) return
    await deleteWishlistItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    showToast('已刪除')
  }

  const filtered = items.filter((i) => {
    if (typeFilter !== 'all' && (i.item_type ?? 'makeup') !== typeFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const fields = [i.brand, i.name_zh, i.name_en, i.shade, i.price != null ? String(i.price) : null]
      if (!fields.some((f) => f?.toLowerCase().includes(q))) return false
    }
    if (tab === 'pending') return !i.is_purchased
    if (tab === 'purchased') return i.is_purchased
    return true
  })

  const pendingCount = items.filter((i) => !i.is_purchased).length
  const purchasedCount = items.filter((i) => i.is_purchased).length

  const tabs = [
    { key: 'pending'   as const, label: '待購',   count: pendingCount },
    { key: 'purchased' as const, label: '已購',   count: purchasedCount },
    { key: 'all'       as const, label: '全部',   count: items.length },
    { key: 'favorites' as const, label: '最愛',   count: favorites.length },
  ]

  return (
    <div>
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">採購清單</h2>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium min-h-0"
          >
            <Plus size={15} strokeWidth={2} />
            新增
          </button>
        )}
      </div>

      {/* 新增表單 */}
      {showAddForm && (
        <div className="bg-[var(--color-bg-muted)] rounded-2xl p-4 mb-5">
          <p className="text-sm font-semibold text-[var(--color-text)] mb-4">新增品項</p>
          <WishForm
            onSubmit={handleAdd}
            onCancel={() => setShowAddForm(false)}
            submitLabel="加入清單"
          />
        </div>
      )}

      {/* 搜尋列 */}
      <div className="relative mb-3">
        <Search size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋品牌、品名、色號、金額…"
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
      <div className="flex gap-2 mb-3">
        {([
          { key: 'all'      as const, label: '全部' },
          { key: 'makeup'   as const, label: '化妝品' },
          { key: 'skincare' as const, label: '保養品' },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTypeFilter(key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-0 ${
              typeFilter === key
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab */}
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
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-white/25' : 'bg-[var(--color-border)]'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* 最愛品項列表 */}
      {tab === 'favorites' && !loading && (
        favorites.length === 0 ? (
          <EmptyState Icon={Heart} title="還沒有最愛品項" description="在品項詳情頁按 ♡ 加入最愛" />
        ) : (
          <div className="space-y-2">
            {favorites.map((fav) => {
              const name = [fav.name_en, fav.name_zh].filter(Boolean).join(' / ') || '（未命名）'
              const brand = fav.brand_en || fav.brand_zh || ''
              const shade = fav.shade_en || fav.shade_zh || ''
              return (
                <Link
                  key={fav.id}
                  to={`/items/${fav.id}`}
                  className="flex items-center gap-3 px-4 py-3 border border-[var(--color-border)] rounded-2xl bg-[var(--color-bg-card)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]/30 transition-colors"
                >
                  <Heart size={14} strokeWidth={0} fill="var(--color-primary)" className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--color-text-muted)] truncate">{brand}</p>
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">{name}</p>
                    {shade && <p className="text-xs text-[var(--color-text-muted)] truncate">#{shade}</p>}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {fav.disposal_status === 'disposed' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]">已丟棄</span>
                    )}
                    {fav.is_dud && (
                      <Zap size={13} strokeWidth={0} fill="var(--color-accent)" />
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )
      )}

      {/* Wishlist 列表 */}
      {tab !== 'favorites' && loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : tab !== 'favorites' && filtered.length === 0 ? (
        <EmptyState
          Icon={ShoppingBag}
          title={search.trim() ? '找不到符合的品項' : tab === 'purchased' ? '還沒有已購品項' : '採購清單是空的'}
          description={search.trim() ? '試試調整搜尋關鍵字' : '點右上角「新增」加入想買的品項'}
        />
      ) : tab !== 'favorites' && (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isEditing = editingId === item.id
            const displayName = item.name_zh || item.name_en || '（未命名）'
            const subName = item.name_zh && item.name_en ? item.name_en : null

            return (
              <div
                key={item.id}
                className={`border rounded-2xl bg-[var(--color-bg-card)] overflow-hidden transition-all ${
                  item.is_purchased ? 'border-[var(--color-border)] opacity-60' : 'border-[var(--color-border)]'
                }`}
              >
                {isEditing ? (
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-[var(--color-text)]">編輯品項</p>
                      <button onClick={() => setEditingId(null)} className="min-h-0 min-w-0 p-1 text-[var(--color-text-muted)]">
                        <X size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                    <WishForm
                      defaultValues={{
                        item_type: item.item_type ?? 'makeup',
                        brand:     item.brand ?? '',
                        name_zh:   item.name_zh ?? '',
                        name_en:   item.name_en ?? '',
                        shade:     item.shade ?? '',
                        price:     item.price ?? '',
                        url:       item.url ?? '',
                        note:      item.note ?? '',
                      }}
                      defaultImageUrl={item.image_url}
                      onSubmit={(data, imageFile, imageUrl) => handleEdit(item.id, data, imageFile, imageUrl)}
                      onCancel={() => setEditingId(null)}
                      submitLabel="儲存"
                    />
                  </div>
                ) : (
                  <>
                    {/* 品項資訊 */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/my/wishlist/${item.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(`/my/wishlist/${item.id}`)
                        }
                      }}
                      className="px-4 pt-3 pb-2 cursor-pointer hover:bg-[var(--color-primary-light)]/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          {item.brand && (
                            <p className="text-xs text-[var(--color-text-muted)] mb-0.5">{item.brand}</p>
                          )}
                          <p className={`text-sm font-medium text-[var(--color-text)] ${item.is_purchased ? 'line-through' : ''}`}>
                            {displayName}
                          </p>
                          {subName && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{subName}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {item.shade && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]">
                                {item.shade}
                              </span>
                            )}
                            {item.price_type === 'gift' && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[var(--color-freebie-badge-bg)] text-[var(--color-freebie-badge-text)]">
                                贈品
                              </span>
                            )}
                            {item.price_type === 'split' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] font-medium">
                                組合價
                              </span>
                            )}
                            {item.price_type !== 'gift' && item.price != null && item.price > 0 && (
                              <span className="text-xs text-[var(--color-text-muted)]">
                                NT$ {item.price.toLocaleString()}
                              </span>
                            )}
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline min-h-0"
                              >
                                <ExternalLink size={11} strokeWidth={1.5} />
                                參考連結
                              </a>
                            )}
                          </div>
                          {item.note && (
                            <div className="mt-1.5">
                              <CollapsibleNote text={item.note} className="text-xs text-[var(--color-text-muted)]" />
                            </div>
                          )}
                        </div>
                        {item.image_url && (
                          <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-[var(--color-bg-muted)]">
                            <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 操作列 */}
                    <div className="flex border-t border-[var(--color-border)]">
                      <button
                        onClick={() => togglePurchased(item)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors min-h-0 ${
                          item.is_purchased
                            ? 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]'
                            : 'text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]'
                        }`}
                      >
                        <Check size={13} strokeWidth={2} />
                        {item.is_purchased ? '移回待購' : '標記已購'}
                      </button>

                      <div className="w-px bg-[var(--color-border)]" />

                      <button
                        onClick={() => setEditingId(item.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] transition-colors min-h-0"
                      >
                        <Pencil size={12} strokeWidth={1.5} />
                        編輯
                      </button>

                      <div className="w-px bg-[var(--color-border)]" />

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-[var(--color-danger)] hover:bg-red-50 transition-colors min-h-0"
                      >
                        <Trash2 size={12} strokeWidth={1.5} />
                        刪除
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="h-8" />
    </div>
  )
}
