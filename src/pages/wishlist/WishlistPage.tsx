import { useState, useEffect, useCallback, forwardRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Trash2, ExternalLink, ShoppingBag, Check, Pencil, X, Heart, Zap, Camera } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
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

// 中文或原文擇一必填
const schema = z.object({
  item_type:  z.enum(['makeup', 'skincare']).optional(),
  brand:      z.string().optional(),
  name_zh:    z.string().optional(),
  name_en:    z.string().optional(),
  shade:      z.string().optional(),
  price_type: z.enum(['normal', 'split', 'gift']).optional(),
  price:      z.coerce.number().int().nonnegative().optional().or(z.literal('')),
  url:        z.string().optional(),
  note:       z.string().optional(),
}).refine(
  (d) => !!(d.name_zh?.trim() || d.name_en?.trim()),
  { message: '品名中文或原文至少填一個', path: ['name_zh'] }
)

type FormData = z.infer<typeof schema>

function Field({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
        {label}
        {required && <span className="text-[var(--color-primary)] ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-primary-dark)' }}>
          {error}
        </p>
      )}
    </div>
  )
}

const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
>(({ error, className, ...rest }, ref) => (
  <input
    {...rest}
    ref={ref}
    className={`w-full px-3 py-2.5 rounded-xl text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none transition-all ${
      error
        ? 'border-2 border-[var(--color-primary)] shadow-[0_0_0_3px_var(--color-focus-ring)]'
        : 'border border-[var(--color-border)]'
    } ${className ?? ''}`}
  />
))

function WishForm({
  defaultValues,
  defaultImageUrl,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  defaultValues?: Partial<FormData>
  defaultImageUrl?: string | null
  onSubmit: (data: FormData, imageFile: File | null, imageUrl: string | null) => Promise<void>
  onCancel: () => void
  submitLabel: string
}) {
  const [submitting, setSubmitting] = useState(false)
  const [showCurrency, setShowCurrency] = useState(false)
  const [foreignAmt, setForeignAmt] = useState('')
  const [fxRate, setFxRate] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(defaultImageUrl ?? null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { item_type: 'makeup', price_type: 'normal', ...defaultValues },
    mode: 'onChange',
    reValidateMode: 'onChange',
  })
  const priceType = watch('price_type')
  const itemType = watch('item_type') ?? 'makeup'

  function handleImageFile(file: File) {
    setImageFile(file)
    setImageUrl(URL.createObjectURL(file))
  }

  const onValid = async (data: FormData) => {
    setSubmitting(true)
    await onSubmit(data, imageFile, imageUrl)
    setSubmitting(false)
  }

  const activeType = 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
  const inactiveType = 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border-[var(--color-border)]'

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4">
      {/* 品項類型 */}
      <div className="flex gap-2">
        {(['makeup', 'skincare'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setValue('item_type', t)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors min-h-0 ${
              itemType === t ? activeType : inactiveType
            }`}
          >
            {t === 'makeup' ? '化妝品' : '保養品'}
          </button>
        ))}
      </div>

      <Field label="品牌">
        <Input {...register('brand')} placeholder="選填" />
      </Field>

      {/* 品名：中文或原文擇一必填 */}
      <div>
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-sm font-medium text-[var(--color-text)]">品名</span>
          <span className="text-[var(--color-primary)] text-xs">*</span>
          <span className="text-xs text-[var(--color-text-muted)]">擇一必填</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input {...register('name_zh')} placeholder="中文品名" error={!!errors.name_zh} />
          </div>
          <div>
            <Input {...register('name_en')} placeholder="英 / 日 / 韓文" />
          </div>
        </div>
        {errors.name_zh && (
          <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-primary-dark)' }}>
            {errors.name_zh.message}
          </p>
        )}
      </div>

      <Field label="色號">
        <Input {...register('shade')} placeholder="選填" />
      </Field>

      {/* 預算 + 類型 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--color-text)]">預算（NTD）</label>
        <div className="flex gap-2">
          {([
            { value: 'normal', label: '一般' },
            { value: 'split', label: '組合價' },
            { value: 'gift', label: '贈品' },
          ] as const).map((t) => (
            <button key={t.value} type="button"
              onClick={() => setValue('price_type', t.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors min-h-0 ${
                priceType === t.value
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border-[var(--color-border)]'
              }`}
            >{t.label}</button>
          ))}
        </div>
        {priceType === 'gift' ? (
          <p className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-muted)] px-3 py-2 rounded-xl">
            贈品，不填預算
          </p>
        ) : (
          <div className="space-y-1">
            <div className="relative">
              <Input type="number" {...register('price')} placeholder={priceType === 'split' ? '分攤金額' : '選填'} />
              <button type="button" onClick={() => setShowCurrency((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-primary)] font-medium min-h-0 min-w-0"
              >外幣換算</button>
            </div>
            {showCurrency && (
              <div className="bg-[var(--color-bg-muted)] rounded-xl p-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '🇯🇵 JPY', rate: '0.22' },
                    { label: '🇰🇷 KRW', rate: '0.024' },
                    { label: '🇺🇸 USD', rate: '32' },
                    { label: '🇪🇺 EUR', rate: '35' },
                    { label: '🇬🇧 GBP', rate: '41' },
                    { label: '🇭🇰 HKD', rate: '4.1' },
                  ].map((c) => (
                    <button key={c.label} type="button" onClick={() => setFxRate(c.rate)}
                      className={`px-2 py-1 rounded-lg text-xs border transition-colors min-h-0 ${
                        fxRate === c.rate ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-[var(--color-bg-card)] text-[var(--color-text)] border-[var(--color-border)]'
                      }`}
                    >{c.label}</button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" value={foreignAmt} onChange={(e) => setForeignAmt(e.target.value)}
                    placeholder="外幣金額"
                    className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm bg-[var(--color-bg-card)] text-[var(--color-text)] focus:outline-none"
                  />
                  <span className="text-xs text-[var(--color-text-muted)]">×</span>
                  <input type="number" value={fxRate} onChange={(e) => setFxRate(e.target.value)}
                    placeholder="匯率" className="w-16 px-2 py-2 rounded-xl border border-[var(--color-border)] text-sm bg-[var(--color-bg-card)] text-[var(--color-text)] focus:outline-none"
                  />
                  <button type="button" disabled={!foreignAmt || !fxRate}
                    onClick={() => { setValue('price', Math.round(Number(foreignAmt) * Number(fxRate))); setShowCurrency(false); setForeignAmt('') }}
                    className="px-3 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-medium min-h-0 disabled:opacity-40"
                  >填入</button>
                </div>
                {foreignAmt && fxRate && (
                  <p className="text-xs text-[var(--color-primary)] font-medium">
                    ≈ NT$ {Math.round(Number(foreignAmt) * Number(fxRate)).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Field label="參考網站">
        <Input
          {...register('url')}
          placeholder="https://..."
        />
      </Field>

      <Field label="圖片">
        <label className="cursor-pointer inline-block">
          {imageUrl ? (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[var(--color-bg-muted)]">
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setImageFile(null); setImageUrl(null) }}
                className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center min-h-0 min-w-0"
              >
                <X size={10} strokeWidth={2} />
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center gap-1 text-[var(--color-text-muted)] hover:border-[var(--color-primary)] transition-colors bg-[var(--color-bg-muted)]">
              <Camera size={18} strokeWidth={1.5} />
              <span className="text-[10px]">上傳</span>
            </div>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleImageFile(f)
            e.target.value = ''
          }} />
        </label>
      </Field>

      <Field label="備註">
        <textarea
          {...register('note')}
          rows={2}
          placeholder="選填"
          className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none resize-none"
        />
      </Field>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] min-h-0"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium min-h-0 disabled:opacity-60"
        >
          {submitting ? '儲存中…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

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
      currency:         null,
      fragrance:        null,
      is_dud:           false,
      is_sample:        false,
      is_favorite:      false,
      volume_ml:        null,
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
          title={tab === 'purchased' ? '還沒有已購品項' : '採購清單是空的'}
          description="點右上角「新增」加入想買的品項"
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
                              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]">
                                {item.shade}
                              </span>
                            )}
                            {item.price_type === 'gift' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
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
                            <p className="text-xs text-[var(--color-text-muted)] mt-1.5 leading-relaxed">{item.note}</p>
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
