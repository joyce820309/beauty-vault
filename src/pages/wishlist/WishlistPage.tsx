import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, ExternalLink, ShoppingBag, Check, Pencil, X, Heart, Zap } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  getWishlist, createWishlistItem,
  updateWishlistItem, deleteWishlistItem,
} from '@/lib/supabase/wishlist'
import { getFavoriteItems } from '@/lib/supabase/items'
import type { Item } from '@/types/database'
import { useToast } from '@/components/ui/Toast'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import type { WishlistItem } from '@/types/database'

// 中文或原文擇一必填
const schema = z.object({
  brand:      z.string().optional(),
  name_zh:    z.string().optional(),
  name_en:    z.string().optional(),
  shade:      z.string().optional(),
  price_type: z.enum(['normal', 'split', 'gift']).optional(),
  price:      z.coerce.number().int().nonnegative().optional().or(z.literal('')),
  url:        z.string().url('請輸入有效網址').optional().or(z.literal('')),
  note:       z.string().optional(),
}).superRefine((d, ctx) => {
  if (!d.name_zh?.trim() && !d.name_en?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['name_zh'], message: '品名中文或原文至少填一個' })
    ctx.addIssue({ code: 'custom', path: ['name_en'], message: '品名中文或原文至少填一個' })
  }
})

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

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  const { error, ...rest } = props
  return (
    <input
      {...rest}
      className={`w-full px-3 py-2.5 rounded-xl text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none transition-all ${
        error
          ? 'border-2 border-[var(--color-primary)] shadow-[0_0_0_3px_var(--color-focus-ring)]'
          : 'border border-[var(--color-border)]'
      }`}
    />
  )
}

function WishForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  defaultValues?: Partial<FormData>
  onSubmit: (data: FormData) => Promise<void>
  onCancel: () => void
  submitLabel: string
}) {
  const [submitting, setSubmitting] = useState(false)
  const [showCurrency, setShowCurrency] = useState(false)
  const [foreignAmt, setForeignAmt] = useState('')
  const [fxRate, setFxRate] = useState('')
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { price_type: 'normal', ...defaultValues },
    mode: 'onChange',
  })
  const priceType = watch('price_type')

  const onValid = async (data: FormData) => {
    setSubmitting(true)
    await onSubmit(data)
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4">
      <Field label="品牌">
        <Input {...register('brand')} placeholder="選填" />
      </Field>

      {/* 品名：中文或原文擇一必填 */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="品名中文" required error={errors.name_zh?.message}>
          <Input {...register('name_zh')} placeholder="中文品名" error={!!errors.name_zh} />
        </Field>
        <Field label="品名原文" required error={errors.name_en?.message}>
          <Input {...register('name_en')} placeholder="英 / 日 / 韓文" error={!!errors.name_en} />
        </Field>
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

      <Field label="參考網站" error={errors.url?.message}>
        <Input
          {...register('url')}
          placeholder="https://..."
          error={!!errors.url}
        />
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
  const [items, setItems] = useState<WishlistItem[]>([])
  const [favorites, setFavorites] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [tab, setTab] = useState<'all' | 'pending' | 'purchased' | 'favorites'>('pending')

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

  async function handleAdd(data: FormData) {
    const { error } = await createWishlistItem({
      brand:        data.brand || null,
      name_zh:      data.name_zh || null,
      name_en:      data.name_en || null,
      shade:        data.shade || null,
      price_type:   data.price_type ?? 'normal',
      price:        data.price_type === 'gift' ? 0 : (data.price === '' ? null : Number(data.price) || null),
      url:          data.url || null,
      note:         data.note || null,
      is_purchased: false,
    })
    if (error) { showToast('新增失敗', 'error'); return }
    showToast('已加入採購清單')
    setShowAddForm(false)
    await load()
  }

  async function handleEdit(id: number, data: FormData) {
    const { error } = await updateWishlistItem(id, {
      brand:      data.brand || null,
      name_zh:    data.name_zh || null,
      name_en:    data.name_en || null,
      shade:      data.shade || null,
      price_type: data.price_type ?? 'normal',
      price:      data.price_type === 'gift' ? 0 : (data.price === '' ? null : Number(data.price) || null),
      url:        data.url || null,
      note:       data.note || null,
    })
    if (error) { showToast('更新失敗', 'error'); return }
    showToast('已更新')
    setEditingId(null)
    await load()
  }

  async function togglePurchased(item: WishlistItem) {
    await updateWishlistItem(item.id, { is_purchased: !item.is_purchased })
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_purchased: !i.is_purchased } : i))
    showToast(item.is_purchased ? '已移回待購' : '已標記為已購')
  }

  async function handleDelete(id: number) {
    if (!confirm('確定要刪除此品項？')) return
    await deleteWishlistItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    showToast('已刪除')
  }

  const filtered = items.filter((i) => {
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
                        brand:   item.brand ?? '',
                        name_zh: item.name_zh ?? '',
                        name_en: item.name_en ?? '',
                        shade:   item.shade ?? '',
                        price:   item.price ?? '',
                        url:     item.url ?? '',
                        note:    item.note ?? '',
                      }}
                      onSubmit={(data) => handleEdit(item.id, data)}
                      onCancel={() => setEditingId(null)}
                      submitLabel="儲存"
                    />
                  </div>
                ) : (
                  <>
                    {/* 品項資訊 */}
                    <div className="px-4 pt-3 pb-2">
                      <div className="flex items-start justify-between gap-2">
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
