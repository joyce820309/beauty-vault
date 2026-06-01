import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Combobox } from '@/components/ui/Combobox'
import { Select } from '@/components/ui/Select'
import { DatePicker } from '@/components/ui/DatePicker'
import { useComboboxOptions } from '@/hooks/useComboboxOptions'
import { createItem, getItemById, updateItem } from '@/lib/supabase/items'
import { supabase } from '@/lib/supabase/client'
import { MAKEUP_CATEGORIES, SKINCARE_CATEGORIES, SENSITIVE_SKIN_OPTIONS } from '@/utils/categories'
import { Camera } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import type { ItemType, PriceType } from '@/types/database'

const schema = z.object({
  item_type: z.enum(['makeup', 'skincare']),
  category: z.string().min(1, '請選擇類別'),
  subcategory: z.string().optional(),
  brand_zh: z.string().optional(),
  brand_en: z.string().optional(),
  name_zh: z.string().optional(),
  name_en: z.string().optional(),
  shade_zh: z.string().optional(),
  shade_en: z.string().optional(),
  mfg_date: z.string().optional(),
  exp_date: z.string().optional(),
  price: z.coerce.number().int().nonnegative().optional().or(z.literal('')),
  price_type: z.enum(['normal', 'split', 'gift']).optional(),
  original_price: z.coerce.number().int().nonnegative().optional().or(z.literal('')),
  purchase_date: z.string().optional(),
  note: z.string().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional().or(z.literal('')),
  review: z.string().optional(),
  sensitive_skin_ok: z.enum(['ok', 'ng', 'untested']).optional(),
})

type FormData = z.infer<typeof schema>

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text)] mb-1">{label}</label>
      {children}
      {error && (
        <p className="text-xs font-medium mt-1.5" style={{ color: 'var(--color-primary-dark)' }}>
          {error}
        </p>
      )}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  const { error, className, ...rest } = props
  return (
    <input
      {...rest}
      className={`w-full px-3 py-2.5 rounded-xl text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none transition-all ${
        error
          ? 'border-2 border-[var(--color-primary)] shadow-[0_0_0_3px_var(--color-focus-ring)]'
          : 'border border-[var(--color-border)]'
      } ${className ?? ''}`}
    />
  )
}

export default function ItemFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const isEdit = !!id
  const { brands, names } = useComboboxOptions()
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [showCurrencyPanel, setShowCurrencyPanel] = useState(false)
  const [foreignAmount, setForeignAmount] = useState('')
  const [rate, setRate] = useState('')

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { item_type: 'makeup', sensitive_skin_ok: 'untested', price_type: 'normal' },
  })

  const itemType = watch('item_type') as ItemType
  const priceType = watch('price_type') as PriceType
  const categories = itemType === 'makeup' ? MAKEUP_CATEGORIES : SKINCARE_CATEGORIES

  useEffect(() => {
    if (!isEdit) return
    getItemById(Number(id)).then(({ data }) => {
      if (!data) return
      Object.entries(data).forEach(([k, v]) => {
        if (v !== null) setValue(k as keyof FormData, v as never)
      })
      if (data.image_url) setImagePreview(data.image_url)
    })
  }, [id, isEdit, setValue])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function uploadImage(file: File): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const path = `items/${Date.now()}.${ext}`
    const compressed = await compressImage(file)
    const { error } = await supabase.storage.from('product-images').upload(path, compressed)
    if (error) return null
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxSize = 800
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    let image_url: string | undefined

    if (imageFile) {
      const url = await uploadImage(imageFile)
      if (url) {
        image_url = url
      } else {
        showToast('圖片上傳失敗，品項仍會儲存（不含圖片）', 'error')
      }
    }

    const payload = {
      ...data,
      price: data.price_type === 'gift' ? 0 : (data.price === '' ? null : Number(data.price)),
      price_type: data.price_type ?? 'normal',
      original_price: data.price_type === 'split' && data.original_price !== ''
        ? Number(data.original_price) : null,
      rating: itemType === 'skincare' && data.rating !== '' ? Number(data.rating) : null,
      brand_zh: data.brand_zh || null,
      brand_en: data.brand_en || null,
      name_zh: data.name_zh || null,
      name_en: data.name_en || null,
      shade_zh: data.shade_zh || null,
      shade_en: data.shade_en || null,
      mfg_date: data.mfg_date || null,
      exp_date: data.exp_date || null,
      purchase_date: data.purchase_date || null,
      note: data.note || null,
      review: data.review || null,
      subcategory: data.subcategory || null,
      sensitive_skin_ok: itemType === 'skincare' ? (data.sensitive_skin_ok ?? 'untested') : null,
      ...(image_url ? { image_url } : {}),
    }

    try {
      if (isEdit) {
        await updateItem(Number(id), payload)
        showToast('品項已更新')
        navigate(`/items/${id}`)
      } else {
        const { data: created, error } = await createItem(payload as never)
        if (error) throw error
        showToast('品項已新增')
        navigate(`/items/${created?.id ?? ''}`)
      }
    } catch {
      showToast('儲存失敗，請稍後再試', 'error')
    }
    setSubmitting(false)
  }

  const activeType = 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
  const inactiveType = 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border-[var(--color-border)]'

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-[var(--color-text-muted)] min-h-0 min-w-0 p-1">‹</button>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">{isEdit ? '編輯品項' : '新增品項'}</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* 品項類型 */}
        <Field label="品項類型" error={errors.item_type?.message}>
          <div className="flex gap-2">
            {(['makeup', 'skincare'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setValue('item_type', t); setValue('category', '') }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors min-h-0 ${
                  itemType === t ? activeType : inactiveType
                }`}
              >
                {t === 'makeup' ? '化妝品' : '保養品'}
              </button>
            ))}
          </div>
        </Field>

        {/* 類別 */}
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <Select
              label="類別"
              value={field.value ?? ''}
              onChange={field.onChange}
              options={categories as unknown as { value: string; label: string }[]}
              placeholder="請選擇類別"
              error={errors.category?.message}
            />
          )}
        />

        {/* 品牌 combobox */}
        <Controller
          name="brand_en"
          control={control}
          render={({ field }) => (
            <Combobox
              label="品牌（原文）"
              value={field.value ?? ''}
              onChange={field.onChange}
              options={brands}
              placeholder="英文 / 日文 / 韓文品牌名"
              error={errors.brand_en?.message}
            />
          )}
        />
        <Field label="品牌中文備註">
          <Input {...register('brand_zh')} placeholder="中文名稱（選填）" />
        </Field>

        {/* 品名 combobox */}
        <Controller
          name="name_en"
          control={control}
          render={({ field }) => (
            <Combobox
              label="品名（原文）"
              value={field.value ?? ''}
              onChange={(v) => {
                const parts = v.split(' — ')
                field.onChange(parts[1] ?? v)
                if (parts.length === 2 && !watch('brand_en')) setValue('brand_en', parts[0])
              }}
              options={names}
              placeholder="英文 / 日文 / 韓文品名"
              error={errors.name_en?.message}
            />
          )}
        />
        <Field label="品名中文備註">
          <Input {...register('name_zh')} placeholder="中文名稱（選填）" />
        </Field>

        {/* 色號 */}
        <Field label="色號（原文）">
          <Input {...register('shade_en')} placeholder="色號名稱（選填）" />
        </Field>
        <Field label="色號中文備註">
          <Input {...register('shade_zh')} placeholder="中文色號（選填）" />
        </Field>

        {/* 日期 */}
        <Controller name="mfg_date" control={control} render={({ field }) => (
          <DatePicker label="製造日期" value={field.value ?? ''} onChange={field.onChange} />
        )} />
        <Controller name="exp_date" control={control} render={({ field }) => (
          <DatePicker label="有效期限" value={field.value ?? ''} onChange={field.onChange} />
        )} />
        <Controller name="purchase_date" control={control} render={({ field }) => (
          <DatePicker label="購入日期" value={field.value ?? ''} onChange={field.onChange} />
        )} />

        {/* 金額 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--color-text)]">購入金額（NTD）</label>

          {/* 價格類型標籤 */}
          <div className="flex gap-2">
            {([
              { value: 'normal', label: '一般' },
              { value: 'split', label: '組合價' },
              { value: 'gift', label: '贈品' },
            ] as const).map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setValue('price_type', t.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors min-h-0 ${
                  priceType === t.value
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border-[var(--color-border)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 贈品不需要金額 */}
          {priceType !== 'gift' && (
            <div className="space-y-2">
              {/* 組合價：顯示組合總價欄位 */}
              {priceType === 'split' && (
                <div>
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">組合總價（NT$）</p>
                  <Input
                    type="number"
                    {...register('original_price')}
                    placeholder="例：1500（整組售價）"
                    error={errors.original_price?.message}
                  />
                </div>
              )}
              <div>
                {priceType === 'split' && (
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">此品項分攤金額（NT$）</p>
                )}
                <div className="relative">
                  <Input
                    type="number"
                    {...register('price')}
                    placeholder={priceType === 'split' ? '此色號分攤金額' : '0'}
                    error={errors.price?.message}
                  />
                  {/* 貨幣換算按鈕 */}
                  <button
                    type="button"
                    onClick={() => setShowCurrencyPanel((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-primary)] font-medium min-h-0 min-w-0 hover:underline"
                  >
                    外幣換算
                  </button>
                </div>
              </div>
            </div>
          )}
          {priceType === 'gift' && (
            <p className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-muted)] px-3 py-2 rounded-xl">
              贈品金額記為 $0，不計入統計花費
            </p>
          )}

          {/* 外幣換算面板 */}
          {showCurrencyPanel && priceType !== 'gift' && (
            <div className="bg-[var(--color-bg-muted)] rounded-xl p-3 space-y-3">
              <p className="text-xs font-medium text-[var(--color-text)]">外幣換算</p>
              {/* 常用貨幣快選 */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '🇯🇵 JPY', rate: '0.22' },
                  { label: '🇰🇷 KRW', rate: '0.024' },
                  { label: '🇺🇸 USD', rate: '32' },
                  { label: '🇪🇺 EUR', rate: '35' },
                  { label: '🇬🇧 GBP', rate: '41' },
                  { label: '🇭🇰 HKD', rate: '4.1' },
                ].map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setRate(c.rate)}
                    className={`px-2.5 py-1 rounded-lg text-xs border transition-colors min-h-0 ${
                      rate === c.rate
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-[var(--color-bg-card)] text-[var(--color-text)] border-[var(--color-border)]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={foreignAmount}
                  onChange={(e) => setForeignAmount(e.target.value)}
                  placeholder="外幣金額"
                  className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm bg-[var(--color-bg-card)] text-[var(--color-text)] focus:outline-none"
                />
                <span className="text-xs text-[var(--color-text-muted)]">×</span>
                <input
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="匯率"
                  className="w-20 px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm bg-[var(--color-bg-card)] text-[var(--color-text)] focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!foreignAmount || !rate}
                  onClick={() => {
                    const ntd = Math.round(Number(foreignAmount) * Number(rate))
                    setValue('price', ntd)
                    setShowCurrencyPanel(false)
                    setForeignAmount('')
                  }}
                  className="px-3 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-medium min-h-0 disabled:opacity-40"
                >
                  填入
                </button>
              </div>
              {foreignAmount && rate && (
                <p className="text-xs text-[var(--color-primary)] font-medium">
                  ≈ NT$ {Math.round(Number(foreignAmount) * Number(rate)).toLocaleString()}
                </p>
              )}
            </div>
          )}
          {errors.price && (
            <p className="text-xs font-medium" style={{ color: 'var(--color-primary-dark)' }}>
              {errors.price.message}
            </p>
          )}
        </div>

        {/* 圖片 */}
        <Field label="產品圖片">
          <label className="block cursor-pointer">
            {imagePreview ? (
              <div className="relative w-32 h-32">
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null) }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center min-h-0 min-w-0"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="w-32 h-32 border-2 border-dashed border-[var(--color-border)] rounded-xl flex flex-col items-center justify-center text-[var(--color-text-muted)] text-sm hover:border-[var(--color-primary)] transition-colors gap-1.5">
                <Camera size={24} strokeWidth={1.5} />
                <span>上傳圖片</span>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
        </Field>

        {/* 備註 */}
        <Field label="備註">
          <textarea
            {...register('note')}
            rows={3}
            placeholder="選填"
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
          />
        </Field>

        {/* 保養品專屬 */}
        {itemType === 'skincare' && (
          <>
            <Field label="評分">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setValue('rating', n)}
                    className={`w-10 h-10 rounded-full text-lg transition-colors min-h-0 min-w-0 ${
                      Number(watch('rating')) >= n ? 'text-yellow-400' : 'text-[var(--color-border)]'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </Field>

            <Field label="試用心得">
              <textarea
                {...register('review')}
                rows={4}
                placeholder="記錄使用感受、膚況變化…"
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
              />
            </Field>

            <Field label="敏感肌適用">
              <div className="flex gap-2">
                {SENSITIVE_SKIN_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setValue('sensitive_skin_ok', o.value)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors min-h-0 ${
                      watch('sensitive_skin_ok') === o.value ? activeType : inactiveType
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </Field>
          </>
        )}

        {/* 送出 */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium text-sm disabled:opacity-60 transition-opacity"
        >
          {submitting ? '儲存中…' : isEdit ? '儲存變更' : '新增品項'}
        </button>
      </form>

      <div className="h-8" />
    </div>
  )
}
