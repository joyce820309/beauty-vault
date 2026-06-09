import { useEffect, useState, forwardRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getTreatmentById, updateTreatment } from '@/lib/supabase/aestheticRecords'
import { useToast } from '@/components/ui/Toast'

const schema = z.object({
  name: z.string().min(1, '請輸入療程名稱'),
  note: z.string().optional(),
})

type FormData = z.infer<typeof schema>

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

export default function AestheticFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!id) return
    getTreatmentById(Number(id)).then(({ data }) => {
      if (!data) return
      setValue('name', data.name)
      setValue('note', data.note ?? '')
    })
  }, [id, setValue])

  const onSubmit = async (data: FormData) => {
    if (!id) return
    setSubmitting(true)
    const { error } = await updateTreatment(Number(id), { name: data.name, note: data.note || null })
    if (error) { showToast('更新失敗', 'error'); setSubmitting(false); return }
    showToast('已更新')
    navigate(`/my/aesthetic/${id}`)
    setSubmitting(false)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate(id ? `/my/aesthetic/${id}` : '/my/aesthetic')} className="min-h-0 min-w-0 p-1 text-[var(--color-text-muted)]">
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">編輯療程</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Field label="療程名稱" error={errors.name?.message}>
          <Input {...register('name')} placeholder="例：皮秒雷射" error={errors.name?.message} />
        </Field>

        <Field label="備註">
          <Input {...register('note')} placeholder="選填" />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium text-sm disabled:opacity-60"
        >
          {submitting ? '儲存中…' : '儲存變更'}
        </button>
      </form>
      <div className="h-8" />
    </div>
  )
}
