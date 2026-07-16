import { useState, forwardRef } from 'react'
import { AutoTextarea } from '@/components/ui/AutoTextarea'
import { Combobox } from '@/components/ui/Combobox'
import { useComboboxOptions } from '@/hooks/useComboboxOptions'
import { addCustomOption } from '@/lib/customOptions'
import { Camera, X } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

// 中文或原文擇一必填
export const wishSchema = z.object({
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

export type WishFormData = z.infer<typeof wishSchema>

export function Field({ label, error, required, children }: {
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

export const Input = forwardRef<
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

export function WishForm({
  defaultValues,
  defaultImageUrl,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  defaultValues?: Partial<WishFormData>
  defaultImageUrl?: string | null
  onSubmit: (data: WishFormData, imageFile: File | null, imageUrl: string | null) => Promise<void>
  onCancel: () => void
  submitLabel: string
}) {
  const [submitting, setSubmitting] = useState(false)
  const [showCurrency, setShowCurrency] = useState(false)
  const [foreignAmt, setForeignAmt] = useState('')
  const [fxRate, setFxRate] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(defaultImageUrl ?? null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<WishFormData>({
    resolver: zodResolver(wishSchema),
    defaultValues: { item_type: 'makeup', price_type: 'normal', ...defaultValues },
    mode: 'onChange',
    reValidateMode: 'onChange',
  })
  const priceType = watch('price_type')
  const itemType = watch('item_type') ?? 'makeup'
  const { brands } = useComboboxOptions()

  function handleImageFile(file: File) {
    setImageFile(file)
    setImageUrl(URL.createObjectURL(file))
  }

  const onValid = async (data: WishFormData) => {
    setSubmitting(true)
    addCustomOption('brand_en', data.brand ?? '')
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
        <Controller
          name="brand"
          control={control}
          render={({ field }) => (
            <Combobox
              value={field.value ?? ''}
              onChange={field.onChange}
              options={brands}
              placeholder="選填"
            />
          )}
        />
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
        <AutoTextarea {...register('note')} placeholder={"選填\n支援 - 開頭條列、數字開頭編號清單"} />
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
