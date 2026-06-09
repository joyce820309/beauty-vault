import { useEffect, useState, forwardRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft } from 'lucide-react'
import {
  getTreatmentNames,
  createTreatment,
  createPurchase,
  updatePurchase,
} from '@/lib/supabase/aestheticRecords'
import { supabase } from '@/lib/supabase/client'
import { DatePicker } from '@/components/ui/DatePicker'
import { useToast } from '@/components/ui/Toast'
import type { PurchaseType } from '@/types/database'

const schema = z.object({
  treatment_name: z.string().min(1, '請輸入或選擇療程名稱'),
  purchase_type: z.enum(['trial', 'single', 'package']),
  paid_sessions: z.coerce.number().int().min(1, '至少 1 堂').or(z.literal(1)),
  bonus_sessions: z.coerce.number().int().min(0).or(z.literal(0)).default(0),
  total_price: z.coerce.number().int().nonnegative().optional().or(z.literal('')),
  purchase_date: z.string().min(1, '請選擇購入日期'),
  note: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const TYPES: { value: PurchaseType; label: string; desc: string }[] = [
  { value: 'trial',   label: '體驗課', desc: '首次體驗，1 堂' },
  { value: 'single',  label: '單堂',   desc: '單次施作' },
  { value: 'package', label: '課程包', desc: '多堂購入，可有贈堂' },
]

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text)] mb-1">{label}</label>
      {children}
      {error && <p className="text-xs font-medium mt-1.5" style={{ color: 'var(--color-primary-dark)' }}>{error}</p>}
    </div>
  )
}

const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: string }>(
  ({ error, ...rest }, ref) => (
    <input {...rest} ref={ref} className={`w-full px-3 py-2.5 rounded-xl text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none transition-all ${
      error ? 'border-2 border-[var(--color-primary)]' : 'border border-[var(--color-border)]'
    }`} />
  )
)

export default function PurchaseFormPage() {
  const { purchaseId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const isEdit = !!purchaseId
  const prefillTreatmentId = searchParams.get('treatment_id')

  const [treatmentNames, setTreatmentNames] = useState<{ id: number; name: string }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [treatmentIdForEdit, setTreatmentIdForEdit] = useState<number | null>(null)

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      purchase_type: 'package',
      paid_sessions: 1,
      bonus_sessions: 0,
      purchase_date: new Date().toISOString().slice(0, 10),
    },
  })

  const purchaseType = watch('purchase_type')
  const treatmentNameInput = watch('treatment_name') ?? ''

  useEffect(() => {
    getTreatmentNames().then(({ data }) => {
      setTreatmentNames(data ?? [])
    })
  }, [])

  // 預填既有療程名稱（加購情境）
  useEffect(() => {
    if (prefillTreatmentId && treatmentNames.length > 0) {
      const found = treatmentNames.find(t => t.id === Number(prefillTreatmentId))
      if (found) {
        setValue('treatment_name', found.name)
        setTreatmentIdForEdit(found.id)
      }
    }
  }, [prefillTreatmentId, treatmentNames, setValue])

  // 編輯模式：載入既有資料
  useEffect(() => {
    if (!isEdit || !purchaseId) return
    const load = async () => {
      const { data } = await supabase
        .from('treatment_purchases')
        .select('*, treatments(name)')
        .eq('id', Number(purchaseId))
        .single()
      if (!data) return
      const tName = (data.treatments as { name: string } | null)?.name ?? ''
      setValue('treatment_name', tName)
      setValue('purchase_type', data.purchase_type)
      setValue('paid_sessions', data.paid_sessions)
      setValue('bonus_sessions', data.bonus_sessions)
      setValue('total_price', data.total_price ?? '')
      setValue('purchase_date', data.purchase_date)
      setValue('note', data.note ?? '')
      setTreatmentIdForEdit(data.treatment_id)
    }
    load()
  }, [isEdit, purchaseId, setValue])

  // 體驗 / 單堂：固定 1 堂
  useEffect(() => {
    if (purchaseType !== 'package') {
      setValue('paid_sessions', 1)
      setValue('bonus_sessions', 0)
    }
  }, [purchaseType, setValue])

  const filtered = treatmentNames.filter(t =>
    t.name.toLowerCase().includes(treatmentNameInput.toLowerCase())
  )

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)

    // 找或建立 treatment
    let treatmentId = treatmentIdForEdit
    if (!treatmentId) {
      const existing = treatmentNames.find(t => t.name === data.treatment_name)
      if (existing) {
        treatmentId = existing.id
      } else {
        const { data: created, error } = await createTreatment({ name: data.treatment_name, note: null })
        if (error || !created) { showToast('建立療程失敗', 'error'); setSubmitting(false); return }
        treatmentId = created.id
      }
    }

    if (!treatmentId) { showToast('找不到療程', 'error'); setSubmitting(false); return }

    const payload = {
      treatment_id: treatmentId,
      purchase_type: data.purchase_type,
      paid_sessions: data.purchase_type === 'package' ? Number(data.paid_sessions) : 1,
      bonus_sessions: data.purchase_type === 'package' ? Number(data.bonus_sessions ?? 0) : 0,
      total_price: data.total_price === '' || data.total_price == null ? null : Number(data.total_price),
      purchase_date: data.purchase_date,
      note: data.note || null,
    }

    if (isEdit) {
      const { error } = await updatePurchase(Number(purchaseId), payload)
      if (error) { showToast('更新失敗', 'error'); setSubmitting(false); return }
      showToast('已更新')
      navigate(`/my/aesthetic/${treatmentId}`)
    } else {
      const { error } = await createPurchase(payload)
      if (error) { showToast('新增失敗', 'error'); setSubmitting(false); return }
      showToast('已新增購入紀錄')
      navigate(`/my/aesthetic/${treatmentId}`)
    }
    setSubmitting(false)
  }

  const activeBtn = 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
  const inactiveBtn = 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border-[var(--color-border)]'

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => {
            if (prefillTreatmentId) navigate(`/my/aesthetic/${prefillTreatmentId}`)
            else if (treatmentIdForEdit) navigate(`/my/aesthetic/${treatmentIdForEdit}`)
            else navigate('/my/aesthetic')
          }}
          className="min-h-0 min-w-0 p-1 text-[var(--color-text-muted)]">
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">
          {isEdit ? '編輯購入紀錄' : '新增購入紀錄'}
        </h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* 療程名稱（combobox） */}
        <Field label="療程名稱" error={errors.treatment_name?.message}>
          <div className="relative">
            <input
              {...register('treatment_name')}
              placeholder="例：皮秒雷射、音波拉皮"
              autoComplete="off"
              disabled={isEdit || !!prefillTreatmentId}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              className={`w-full px-3 py-2.5 rounded-xl text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none transition-all border border-[var(--color-border)] ${
                (isEdit || !!prefillTreatmentId) ? 'opacity-60' : ''
              }`}
            />
            {showSuggestions && !isEdit && !prefillTreatmentId && filtered.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden">
                {filtered.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onMouseDown={() => {
                      setValue('treatment_name', t.name)
                      setTreatmentIdForEdit(t.id)
                      setShowSuggestions(false)
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] transition-colors min-h-0"
                  >
                    {t.name}
                  </button>
                ))}
                {!treatmentNames.some(t => t.name === treatmentNameInput) && treatmentNameInput && (
                  <div className="px-4 py-2 text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
                    建立新療程「{treatmentNameInput}」
                  </div>
                )}
              </div>
            )}
          </div>
        </Field>

        {/* 課程類型 */}
        <Field label="課程類型">
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setValue('purchase_type', t.value)}
                className={`py-2.5 px-2 rounded-xl text-sm font-medium border transition-colors min-h-0 flex flex-col items-center gap-0.5 ${
                  purchaseType === t.value ? activeBtn : inactiveBtn
                }`}
              >
                <span>{t.label}</span>
                <span className={`text-xs font-normal ${purchaseType === t.value ? 'text-white/70' : 'text-[var(--color-text-muted)]'}`}>
                  {t.desc}
                </span>
              </button>
            ))}
          </div>
        </Field>

        {/* 堂數（課程包才顯示） */}
        {purchaseType === 'package' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="付費堂數" error={errors.paid_sessions?.message}>
              <Input type="number" min={1} {...register('paid_sessions')} error={errors.paid_sessions?.message} />
            </Field>
            <Field label="贈送堂數（選填）">
              <Input type="number" min={0} {...register('bonus_sessions')} placeholder="0" />
            </Field>
          </div>
        )}

        {/* 購入日期 */}
        <Controller name="purchase_date" control={control} render={({ field }) => (
          <DatePicker
            label="購入日期"
            value={field.value ?? ''}
            onChange={field.onChange}
            error={errors.purchase_date?.message}
          />
        )} />

        {/* 總金額 */}
        <Field label="總金額（NTD）">
          <Input type="number" {...register('total_price')} placeholder="0" />
        </Field>

        {/* 備註 */}
        <Field label="備註">
          <input
            {...register('note')}
            placeholder="診所、醫師、其他說明…（選填）"
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none"
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium text-sm disabled:opacity-60"
        >
          {submitting ? '儲存中…' : isEdit ? '儲存變更' : '新增購入'}
        </button>
      </form>
      <div className="h-8" />
    </div>
  )
}
