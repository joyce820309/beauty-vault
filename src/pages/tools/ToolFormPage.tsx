import { useEffect, useState, forwardRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, Camera } from 'lucide-react'
import { createTool, getToolById, updateTool } from '@/lib/supabase/tools'
import { supabase } from '@/lib/supabase/client'
import { DatePicker } from '@/components/ui/DatePicker'
import { AutoTextarea } from '@/components/ui/AutoTextarea'
import { useToast } from '@/components/ui/Toast'
import { SENSITIVE_SKIN_OPTIONS } from '@/utils/categories'
import type { ToolStatus } from '@/types/database'

const TOOL_CATEGORIES = [
  { value: 'brush', label: '刷具' },
  { value: 'device', label: '美容儀' },
  { value: 'cleaner', label: '洗臉機' },
  { value: 'sponge', label: '海綿粉撲' },
  { value: 'mirror', label: '鏡子' },
  { value: 'storage', label: '收納' },
  { value: 'other', label: '其他' },
]

const schema = z.object({
  brand_en: z.string().optional(),
  brand_zh: z.string().optional(),
  name_en: z.string().optional(),
  name_zh: z.string().optional(),
  category: z.string().optional(),
  purchase_date: z.string().optional(),
  price: z.coerce.number().int().nonnegative().optional().or(z.literal('')),
  currency: z.string().optional(),
  status: z.enum(['active', 'stored', 'retired']),
  clean_cycle_days: z.coerce.number().int().positive().optional().or(z.literal('')),
  last_cleaned_at: z.string().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional().or(z.literal('')),
  sensitive_skin_ok: z.enum(['all_ok', 'avoid_postop', 'sensitive_avoid', 'ng', 'untested', 'ok']).optional(),
  note: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input
      {...rest}
      ref={ref}
      className={`w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none focus:border-[var(--color-primary)] ${className ?? ''}`}
    />
  )
)

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text)] mb-1">{label}</label>
      {children}
    </div>
  )
}

const STATUS_OPTIONS: { value: ToolStatus; label: string }[] = [
  { value: 'active', label: '使用中' },
  { value: 'stored', label: '收納中' },
  { value: 'retired', label: '已淘汰' },
]

export default function ToolFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const isEdit = !!id
  const [submitting, setSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const { register, handleSubmit, watch, setValue, control } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'active' as const, sensitive_skin_ok: 'untested' },
  })

  const status = watch('status')

  useEffect(() => {
    if (!isEdit) return
    getToolById(Number(id)).then(({ data }) => {
      if (!data) return
      Object.entries(data).forEach(([k, v]) => {
        if (v !== null && v !== undefined) setValue(k as keyof FormData, v as never)
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
    const path = `tools/${Date.now()}.${ext}`
    const canvas = document.createElement('canvas')
    const img = new Image()
    await new Promise<void>(res => { img.onload = () => res(); img.src = URL.createObjectURL(file) })
    const ratio = Math.min(800 / img.width, 800 / img.height, 1)
    canvas.width = img.width * ratio; canvas.height = img.height * ratio
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.8))
    const { error } = await supabase.storage.from('product-images').upload(path, blob)
    if (error) return null
    return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    let image_url: string | undefined
    if (imageFile) {
      const url = await uploadImage(imageFile)
      if (url) image_url = url
      else showToast('圖片上傳失敗，工具仍會儲存', 'error')
    }

    const payload = {
      brand_en: data.brand_en || null,
      brand_zh: data.brand_zh || null,
      name_en: data.name_en || null,
      name_zh: data.name_zh || null,
      category: data.category || null,
      purchase_date: data.purchase_date || null,
      price: data.price === '' ? null : Number(data.price) || null,
      price_type: 'normal' as const,
      currency: data.currency || null,
      status: data.status,
      clean_cycle_days: data.clean_cycle_days === '' ? null : Number(data.clean_cycle_days) || null,
      last_cleaned_at: data.last_cleaned_at || null,
      rating: data.rating === '' ? null : Number(data.rating) || null,
      sensitive_skin_ok: data.sensitive_skin_ok ?? 'untested',
      is_favorite: false,
      note: data.note || null,
      image_url: image_url ?? null,
    }

    try {
      if (isEdit) {
        await updateTool(Number(id), payload)
        showToast('已更新')
        navigate(`/tools/${id}`, { replace: true })
      } else {
        const { data: created, error } = await createTool(payload)
        if (error) throw error
        showToast('已新增')
        navigate(`/tools/${created?.id ?? ''}`)
      }
    } catch {
      showToast('儲存失敗', 'error')
    }
    setSubmitting(false)
  }

  const activeBtn = 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
  const inactiveBtn = 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border-[var(--color-border)]'

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-[var(--color-text-muted)] min-h-0 min-w-0 p-1">
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">{isEdit ? '編輯工具' : '新增工具'}</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* 類別 */}
        <Field label="類別">
          <div className="flex gap-2 flex-wrap">
            {TOOL_CATEGORIES.map(c => (
              <button key={c.value} type="button"
                onClick={() => setValue('category', watch('category') === c.value ? '' : c.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors min-h-0 ${
                  watch('category') === c.value ? activeBtn : inactiveBtn
                }`}
              >{c.label}</button>
            ))}
          </div>
        </Field>

        {/* 品牌 + 品名 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="品牌（原文）">
            <Input {...register('brand_en')} placeholder="英文 / 日文品牌" />
          </Field>
          <Field label="品牌（中文）">
            <Input {...register('brand_zh')} placeholder="選填" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="品名（原文）">
            <Input {...register('name_en')} placeholder="英文 / 日文品名" />
          </Field>
          <Field label="品名（中文）">
            <Input {...register('name_zh')} placeholder="選填" />
          </Field>
        </div>

        {/* 狀態 */}
        <Field label="使用狀態">
          <div className="flex gap-2">
            {STATUS_OPTIONS.map(o => (
              <button key={o.value} type="button"
                onClick={() => setValue('status', o.value)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors min-h-0 ${
                  status === o.value ? activeBtn : inactiveBtn
                }`}
              >{o.label}</button>
            ))}
          </div>
        </Field>

        {/* 清潔週期 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="清潔週期（天）">
            <Input type="number" {...register('clean_cycle_days')} placeholder="例：7（每週清洗）" />
          </Field>
          <Controller name="last_cleaned_at" control={control}
            render={({ field }) => (
              <DatePicker label="上次清洗日期" value={field.value ?? ''} onChange={field.onChange} />
            )}
          />
        </div>

        {/* 購入日期 + 金額 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <Controller name="purchase_date" control={control}
            render={({ field }) => (
              <DatePicker label="購入日期" value={field.value ?? ''} onChange={field.onChange} />
            )}
          />
          <Field label="購入金額（NTD）">
            <Input type="number" {...register('price')} placeholder="0" />
          </Field>
        </div>

        {/* 評分 */}
        <Field label="評分">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button"
                onClick={() => setValue('rating', n)}
                className={`w-10 h-10 rounded-full text-lg transition-colors min-h-0 min-w-0 ${
                  Number(watch('rating')) >= n ? 'text-yellow-400' : 'text-[var(--color-border)]'
                }`}
              >★</button>
            ))}
          </div>
        </Field>

        {/* 敏感肌 */}
        <Field label="敏感肌適用">
          <div className="flex gap-2">
            {SENSITIVE_SKIN_OPTIONS.map(o => (
              <button key={o.value} type="button"
                onClick={() => setValue('sensitive_skin_ok', o.value)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors min-h-0 ${
                  watch('sensitive_skin_ok') === o.value ? activeBtn : inactiveBtn
                }`}
              >{o.label}</button>
            ))}
          </div>
        </Field>

        {/* 圖片 */}
        <Field label="產品圖片">
          <label className="block cursor-pointer">
            {imagePreview ? (
              <div className="relative w-32 h-32">
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover rounded-xl" />
                <button type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null) }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--color-danger)] text-white rounded-full text-xs flex items-center justify-center min-h-0 min-w-0"
                >✕</button>
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
        <Field label="使用心得 / 備註">
          <AutoTextarea {...register('note')} placeholder="使用感受、適合場合…" />
        </Field>

        <button type="submit" disabled={submitting}
          className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium text-sm disabled:opacity-60"
        >
          {submitting ? '儲存中…' : isEdit ? '儲存變更' : '新增工具'}
        </button>
      </form>
      <div className="h-8" />
    </div>
  )
}
