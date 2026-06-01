import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useProfile } from '@/hooks/useSkinRecords'
import { Skeleton } from '@/components/ui/Skeleton'
import type { SeasonalColor } from '@/types/database'

const SEASONAL_COLORS: { value: SeasonalColor; label: string; desc: string }[] = [
  { value: 'spring', label: '春', desc: '暖調・明亮・黃底' },
  { value: 'summer', label: '夏', desc: '冷調・柔和・粉底' },
  { value: 'autumn', label: '秋', desc: '暖調・深濃・黃底' },
  { value: 'winter', label: '冬', desc: '冷調・鮮明・藍底' },
]

const FACE_SHAPES = [
  { value: 'oval', label: '橢圓形' },
  { value: 'round', label: '圓形' },
  { value: 'square', label: '方形' },
  { value: 'heart', label: '心形' },
  { value: 'oblong', label: '長形' },
]

const SKIN_TYPES = [
  { value: 'dry', label: '乾性' },
  { value: 'oily', label: '油性' },
  { value: 'combination', label: '混合性' },
  { value: 'sensitive', label: '敏感性' },
  { value: 'normal', label: '中性' },
]

type FormData = {
  seasonal_color: SeasonalColor | ''
  face_shape: string
  skin_type: string
  note: string
}

function OptionGroup<T extends string>({
  label, options, value, onChange,
}: {
  label: string
  options: { value: T; label: string; desc?: string }[]
  value: T | ''
  onChange: (v: T) => void
}) {
  return (
    <div>
      <p className="text-sm font-medium text-[var(--color-text)] mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-3 py-2 rounded-xl border text-sm transition-colors min-h-0 ${
              value === o.value
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
            }`}
          >
            <span>{o.label}</span>
            {o.desc && <span className={`block text-xs mt-0.5 ${value === o.value ? 'text-white/80' : 'text-[var(--color-text-muted)]'}`}>{o.desc}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { profile, loading, saveProfile } = useProfile()
  const { register, handleSubmit, watch, setValue, reset } = useForm<FormData>({
    defaultValues: { seasonal_color: '', face_shape: '', skin_type: '', note: '' },
  })

  useEffect(() => {
    if (profile) {
      reset({
        seasonal_color: profile.seasonal_color ?? '',
        face_shape: profile.face_shape ?? '',
        skin_type: profile.skin_type ?? '',
        note: profile.note ?? '',
      })
    }
  }, [profile, reset])

  const onSubmit = async (data: FormData) => {
    await saveProfile({
      seasonal_color: data.seasonal_color || null,
      face_shape: data.face_shape || null,
      skin_type: data.skin_type || null,
      note: data.note || null,
    })
    navigate(-1)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="min-h-0 min-w-0 p-1 text-[var(--color-text-muted)]">
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">個人檔案</h2>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <OptionGroup
            label="四季色彩"
            options={SEASONAL_COLORS}
            value={watch('seasonal_color')}
            onChange={(v) => setValue('seasonal_color', v)}
          />
          <OptionGroup
            label="臉型"
            options={FACE_SHAPES}
            value={watch('face_shape')}
            onChange={(v) => setValue('face_shape', v)}
          />
          <OptionGroup
            label="膚質"
            options={SKIN_TYPES}
            value={watch('skin_type')}
            onChange={(v) => setValue('skin_type', v)}
          />
          <div>
            <p className="text-sm font-medium text-[var(--color-text)] mb-2">備註</p>
            <textarea
              {...register('note')}
              rows={3}
              placeholder="其他個人資訊…"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium text-sm"
          >
            儲存
          </button>
        </form>
      )}
      <div className="h-8" />
    </div>
  )
}
