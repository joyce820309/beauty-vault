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
import type { ItemType } from '@/types/database'

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
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  const { error, className, ...rest } = props
  return (
    <input
      {...rest}
      className={`w-full px-3 py-2.5 rounded-xl border text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none focus:border-[var(--color-primary)] ${
        error ? 'border-red-400' : 'border-[var(--color-border)]'
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

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { item_type: 'makeup', sensitive_skin_ok: 'untested' },
  })

  const itemType = watch('item_type') as ItemType
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
      price: data.price === '' ? null : Number(data.price),
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
              label="品牌"
              value={field.value ?? ''}
              onChange={field.onChange}
              options={brands}
              placeholder="輸入品牌名稱（英文）"
              error={errors.brand_en?.message}
            />
          )}
        />
        <Field label="品牌中文">
          <Input {...register('brand_zh')} placeholder="選填" />
        </Field>

        {/* 品名 combobox */}
        <Controller
          name="name_en"
          control={control}
          render={({ field }) => (
            <Combobox
              label="品名"
              value={field.value ?? ''}
              onChange={(v) => {
                const parts = v.split(' — ')
                field.onChange(parts[1] ?? v)
                if (parts.length === 2 && !watch('brand_en')) setValue('brand_en', parts[0])
              }}
              options={names}
              placeholder="輸入品名（英文）"
              error={errors.name_en?.message}
            />
          )}
        />
        <Field label="品名中文">
          <Input {...register('name_zh')} placeholder="選填" />
        </Field>

        {/* 色號 */}
        <Field label="色號">
          <Input {...register('shade_en')} placeholder="英文色號（選填）" />
        </Field>
        <Field label="色號中文">
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
        <Field label="購入金額（NTD）" error={errors.price?.message}>
          <Input type="number" {...register('price')} placeholder="0" error={errors.price?.message} />
        </Field>

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
