import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { DatePicker } from '@/components/ui/DatePicker'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useForm, Controller } from 'react-hook-form'
import { useSkinRecords } from '@/hooks/useSkinRecords'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Droplets } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const METRICS = [
  { key: 'moisture', label: '水分保持力' },
  { key: 'sebum', label: '皮脂分泌力' },
  { key: 'keratin', label: '角質' },
  { key: 'resilience', label: '環境抵抗力' },
  { key: 'accumulation', label: '累積程度' },
  { key: 'skin_engy', label: 'Skin ENGY' },
] as const

type MetricKey = typeof METRICS[number]['key']

type FormData = Record<MetricKey, number> & { recorded_at: string; note: string }

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--color-text-muted)]">{label}</span>
        <span className="font-medium text-[var(--color-primary)]">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--color-primary)]"
      />
    </div>
  )
}

export default function SkinTrackingPage() {
  const navigate = useNavigate()
  const { records, loading, addRecord, removeRecord } = useSkinRecords()
  const [showForm, setShowForm] = useState(false)
  const [trendMetric, setTrendMetric] = useState<MetricKey>('moisture')
  const [submitting, setSubmitting] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { register, handleSubmit, watch, setValue, reset, control } = useForm<FormData>({
    defaultValues: {
      recorded_at: format(new Date(), 'yyyy-MM-dd'),
      moisture: 50, sebum: 50, keratin: 50, resilience: 50, accumulation: 50, skin_engy: 50,
      note: '',
    },
  })

  const latest = records[0] ?? null
  const prev = records[1] ?? null

  const radarData = METRICS.map(({ key, label }) => ({
    metric: label,
    value: latest ? (latest[key] ?? 0) : 0,
  }))

  const trendData = [...records]
    .reverse()
    .slice(-12)
    .map((r) => ({
      date: format(parseISO(r.recorded_at), 'M/d'),
      value: r[trendMetric] ?? 0,
    }))

  function getDelta(key: MetricKey) {
    if (!latest || !prev) return null
    const d = (latest[key] ?? 0) - (prev[key] ?? 0)
    if (d === 0) return null
    return d
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    await addRecord({
      recorded_at: data.recorded_at,
      moisture: data.moisture,
      sebum: data.sebum,
      keratin: data.keratin,
      resilience: data.resilience,
      accumulation: data.accumulation,
      skin_engy: data.skin_engy,
      note: data.note || null,
    })
    reset()
    setShowForm(false)
    setSubmitting(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="min-h-0 min-w-0 p-1 text-[var(--color-text-muted)]">
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>
          <h2 className="text-xl font-semibold text-[var(--color-text)]">膚況追蹤</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium min-h-0"
        >
          <Plus size={16} strokeWidth={2} />
          新增紀錄
        </button>
      </div>

      {/* 新增表單 */}
      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-[var(--color-bg-muted)] rounded-2xl p-4 mb-5 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">新增膚況紀錄</h3>
          <Controller
            name="recorded_at"
            control={control}
            render={({ field }) => (
              <DatePicker label="紀錄日期" value={field.value ?? ''} onChange={field.onChange} />
            )}
          />
          <div className="space-y-4">
            {METRICS.map(({ key, label }) => (
              <Slider
                key={key}
                label={label}
                value={watch(key)}
                onChange={(v) => setValue(key, v)}
              />
            ))}
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">備註</label>
            <textarea
              {...register('note')}
              rows={2}
              placeholder="膚況說明、天氣、生理期…"
              className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm bg-[var(--color-bg-card)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] min-h-0"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium min-h-0 disabled:opacity-60"
            >
              {submitting ? '儲存中…' : '儲存'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : records.length === 0 ? (
        <EmptyState Icon={Droplets} title="尚無膚況紀錄" description="點右上角新增第一筆" />
      ) : (
        <>
          {/* 最新雷達圖 */}
          <div className="bg-[var(--color-bg-muted)] rounded-2xl p-4 mb-4">
            <p className="text-sm font-semibold text-[var(--color-text)] mb-1">最新膚況</p>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">
              {format(parseISO(latest!.recorded_at), 'yyyy年M月d日')}
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                />
                <Radar
                  dataKey="value"
                  stroke="var(--color-primary)"
                  fill="var(--color-primary)"
                  fillOpacity={0.2}
                  strokeWidth={1.5}
                />
              </RadarChart>
            </ResponsiveContainer>

            {/* 6 指標數值 + 與上筆比較 */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              {METRICS.map(({ key, label }) => {
                const delta = getDelta(key)
                return (
                  <div key={key} className="bg-[var(--color-bg-card)] rounded-xl px-3 py-2">
                    <p className="text-xs text-[var(--color-text-muted)] truncate">{label}</p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-lg font-semibold text-[var(--color-text)]">
                        {latest![key] ?? '—'}
                      </span>
                      {delta !== null && (
                        <span className={`text-xs font-medium ${delta > 0 ? 'text-green-500' : 'text-red-400'}`}>
                          {delta > 0 ? '↑' : '↓'}{Math.abs(delta)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 折線圖 */}
          {records.length >= 2 && (
            <div className="bg-[var(--color-bg-muted)] rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-[var(--color-text)]">歷史趨勢</p>
                <div className="w-36">
                  <Select
                    value={trendMetric}
                    onChange={(v) => setTrendMetric(v as MetricKey)}
                    options={METRICS.map(({ key, label }) => ({ value: key, label }))}
                  />
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border)', fontSize: 12, backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text)' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-primary)' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 歷史列表 */}
          <div className="bg-[var(--color-bg-muted)] rounded-2xl overflow-hidden">
            <p className="text-sm font-semibold text-[var(--color-text)] px-4 pt-4 pb-2">歷史紀錄</p>
            <ul className="divide-y divide-[var(--color-border)]">
              {records.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left min-h-0 hover:bg-[var(--color-bg-card)] transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {format(parseISO(r.recorded_at), 'yyyy年M月d日')}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        ENGY {r.skin_engy ?? '—'} · 水分 {r.moisture ?? '—'} · 皮脂 {r.sebum ?? '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm('確定刪除此紀錄？')) removeRecord(r.id) }}
                        className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-50 transition-colors min-h-0 min-w-0"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                      {expandedId === r.id
                        ? <ChevronUp size={16} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
                        : <ChevronDown size={16} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
                      }
                    </div>
                  </button>
                  {expandedId === r.id && (
                    <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                      {METRICS.map(({ key, label }) => (
                        <div key={key} className="bg-[var(--color-bg-card)] rounded-xl px-3 py-2">
                          <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
                          <p className="text-base font-semibold text-[var(--color-text)]">{r[key] ?? '—'}</p>
                        </div>
                      ))}
                      {r.note && (
                        <div className="col-span-3 bg-[var(--color-bg-card)] rounded-xl px-3 py-2">
                          <p className="text-xs text-[var(--color-text-muted)] mb-0.5">備註</p>
                          <p className="text-sm text-[var(--color-text)]">{r.note}</p>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      <div className="h-8" />
    </div>
  )
}
