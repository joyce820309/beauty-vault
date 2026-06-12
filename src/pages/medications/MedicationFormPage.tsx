import { useEffect, useState, forwardRef } from 'react'
import { AutoTextarea } from '@/components/ui/AutoTextarea'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { DatePicker } from '@/components/ui/DatePicker'
import {
  createMedicationRecord,
  updateMedicationRecord,
  getMedicationRecordById,
} from '@/lib/supabase/medications'
import { useToast } from '@/components/ui/Toast'

const schema = z.object({
  pickup_date: z.string().min(1, '請選擇拿藥日期'),
  reason: z.string().min(1, '請輸入原因'),
  note: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
        {label}
        {required && <span className="ml-0.5 text-[var(--color-primary)]">*</span>}
      </label>
      {children}
      {error && <p className="text-xs font-medium mt-1.5" style={{ color: 'var(--color-primary-dark)' }}>{error}</p>}
    </div>
  )
}

const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: string }>(
  ({ error, ...rest }, ref) => (
    <input {...rest} ref={ref} className={`w-full px-3 py-2.5 rounded-xl text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none transition-all ${
      error ? 'border-2 border-[var(--color-primary)] shadow-[0_0_0_3px_var(--color-focus-ring)]' : 'border border-[var(--color-border)]'
    }`} />
  )
)

export default function MedicationFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const isEdit = !!id
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!isEdit) return
    getMedicationRecordById(Number(id)).then(({ data }) => {
      if (!data) return
      setValue('pickup_date', data.pickup_date)
      setValue('reason', data.reason)
      setValue('note', data.note ?? '')
    })
  }, [id, isEdit, setValue])

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    if (isEdit) {
      const { error } = await updateMedicationRecord(Number(id), {
        pickup_date: data.pickup_date,
        reason: data.reason,
        note: data.note || null,
      })
      if (error) { showToast('更新失敗', 'error', error.message); setSubmitting(false); return }
      showToast('已更新')
      navigate(`/my/medications/${id}`)
    } else {
      const { data: created, error } = await createMedicationRecord({
        pickup_date: data.pickup_date,
        reason: data.reason,
        note: data.note || null,
      })
      if (error) { showToast('新增失敗', 'error', error.message); setSubmitting(false); return }
      showToast('已建立用藥紀錄')
      navigate(`/my/medications/${created?.id}`)
    }
    setSubmitting(false)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate(-1)} className="min-h-0 min-w-0 p-1 text-[var(--color-text-muted)]">
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">{isEdit ? '編輯紀錄' : '新增用藥紀錄'}</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Controller name="pickup_date" control={control} render={({ field }) => (
          <DatePicker
            label="拿藥日期"
            required
            value={field.value ?? ''}
            onChange={field.onChange}
            error={errors.pickup_date?.message}
          />
        )} />

        <Field label="原因（症狀 / 就診科別）" required error={errors.reason?.message}>
          <Input
            {...register('reason')}
            placeholder="例：過敏、皮膚科回診"
            error={errors.reason?.message}
          />
        </Field>

        <Field label="備註">
          <AutoTextarea {...register('note')} placeholder="診所名稱、醫師、其他說明…" />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium text-sm disabled:opacity-60"
        >
          {submitting ? '儲存中…' : isEdit ? '儲存變更' : '建立紀錄'}
        </button>
      </form>
      <div className="h-8" />
    </div>
  )
}
