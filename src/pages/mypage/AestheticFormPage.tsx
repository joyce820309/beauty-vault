import { useEffect, useState, forwardRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  createAestheticRecord,
  updateAestheticRecord,
} from '@/hooks/useAestheticRecords'
import { getAestheticRecordById } from '@/lib/supabase/aestheticRecords'
import { DatePicker } from '@/components/ui/DatePicker'

const schema = z.object({
  treatment_name: z.string().min(1, '請輸入施作項目'),
  treatment_date: z.string().min(1, '請選擇日期'),
  description: z.string().optional(),
  total_price: z.coerce.number().int().nonnegative().optional().or(z.literal('')),
  total_sessions: z.coerce
    .number({ invalid_type_error: '請輸入數字' })
    .int()
    .min(1, '至少 1 堂'),
  note: z.string().optional(),
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

const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { error?: string }
>(({ error, ...rest }, ref) => (
  <input
    {...rest}
    ref={ref}
    className={`w-full px-3 py-2.5 rounded-xl text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none transition-all ${
      error
        ? 'border-2 border-[var(--color-primary)] shadow-[0_0_0_3px_var(--color-focus-ring)]'
        : 'border border-[var(--color-border)]'
    }`}
  />
))

export default function AestheticFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { total_sessions: 1 },
  })

  useEffect(() => {
    if (!isEdit) return
    getAestheticRecordById(Number(id)).then(({ data }) => {
      if (!data) return
      setValue('treatment_name', data.treatment_name)
      setValue('treatment_date', data.treatment_date)
      setValue('description', data.description ?? '')
      setValue('total_price', data.total_price ?? '')
      setValue('total_sessions', data.total_sessions)
      setValue('note', data.note ?? '')
    })
  }, [id, isEdit, setValue])

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    const payload = {
      treatment_name: data.treatment_name,
      treatment_date: data.treatment_date,
      description: data.description || null,
      total_price: data.total_price === '' ? null : Number(data.total_price),
      total_sessions: Number(data.total_sessions),
      note: data.note || null,
    }
    if (isEdit) {
      await updateAestheticRecord(Number(id), payload)
      navigate(`/my/aesthetic/${id}`)
    } else {
      const { data: created } = await createAestheticRecord(payload)
      navigate(`/my/aesthetic/${created?.id ?? ''}`)
    }
    setSubmitting(false)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate(-1)} className="min-h-0 min-w-0 p-1 text-[var(--color-text-muted)]">
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">{isEdit ? '編輯療程' : '新增療程'}</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Field label="施作項目" error={errors.treatment_name?.message}>
          <Input
            {...register('treatment_name')}
            placeholder="例：皮秒雷射、音波拉皮"
            error={errors.treatment_name?.message}
          />
        </Field>

        <Controller name="treatment_date" control={control} render={({ field }) => (
          <DatePicker
            label="施作日期"
            value={field.value ?? ''}
            onChange={field.onChange}
            error={errors.treatment_date?.message}
          />
        )} />

        <Field label="施作內容">
          <textarea
            {...register('description')}
            rows={3}
            placeholder="記錄施打部位、能量設定等細節…"
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none resize-none"
          />
        </Field>

        <Field label="總金額（NTD）">
          <Input type="number" {...register('total_price')} placeholder="0" />
        </Field>

        <Field label="購入堂數" error={errors.total_sessions?.message}>
          <Input
            type="number"
            min={1}
            {...register('total_sessions')}
            error={errors.total_sessions?.message}
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

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium text-sm disabled:opacity-60"
        >
          {submitting ? '儲存中…' : isEdit ? '儲存變更' : '新增療程'}
        </button>
      </form>
      <div className="h-8" />
    </div>
  )
}
