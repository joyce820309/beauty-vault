import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2 } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { useAestheticRecordDetail, deleteAestheticRecord } from '@/hooks/useAestheticRecords'
import { Skeleton } from '@/components/ui/Skeleton'
import { DatePicker } from '@/components/ui/DatePicker'
import { format, parseISO } from 'date-fns'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-3 border-b border-[var(--color-border)] last:border-0">
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      <span className="text-sm text-[var(--color-text)] font-medium text-right max-w-[60%]">{value || '—'}</span>
    </div>
  )
}

type SessionFormData = { session_date: string; note: string }

export default function AestheticDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { record, loading, addSession, removeSession } = useAestheticRecordDetail(Number(id))
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [addingSession, setAddingSession] = useState(false)
  const { register, handleSubmit, reset, control } = useForm<SessionFormData>({
    defaultValues: { session_date: format(new Date(), 'yyyy-MM-dd'), note: '' },
  })

  async function handleDelete() {
    if (!confirm('確定要刪除此療程？所有施作紀錄也會一併刪除。')) return
    await deleteAestheticRecord(Number(id))
    navigate('/my/aesthetic', { replace: true })
  }

  const onAddSession = async (data: SessionFormData) => {
    setAddingSession(true)
    await addSession(data.session_date, data.note)
    reset({ session_date: format(new Date(), 'yyyy-MM-dd'), note: '' })
    setShowSessionForm(false)
    setAddingSession(false)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    )
  }

  if (!record) {
    return <p className="text-center text-[var(--color-text-muted)] py-16">找不到此療程</p>
  }

  const used = record.used_sessions
  const total = record.total_sessions
  const remaining = total - used
  const unitPrice = total > 0 ? Math.round((record.total_price ?? 0) / total) : 0
  const remainingPrice = remaining * unitPrice
  const pct = total > 0 ? (used / total) * 100 : 0
  const sessions = [...(record.aesthetic_session_logs ?? [])].sort(
    (a, b) => b.session_date.localeCompare(a.session_date)
  )

  return (
    <div>
      {/* 頂部操作列 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="min-h-0 min-w-0 p-1 text-[var(--color-text-muted)]">
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>
          <h2 className="text-xl font-semibold text-[var(--color-text)]">{record.treatment_name}</h2>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/my/aesthetic/${id}/edit`}
            className="px-3 py-2 rounded-xl border border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-medium flex items-center justify-center min-h-0"
          >
            編輯
          </Link>
          <button
            onClick={handleDelete}
            className="px-3 py-2 rounded-xl border border-red-200 text-red-400 text-sm font-medium min-h-0"
          >
            刪除
          </button>
        </div>
      </div>

      {/* 療程摘要 */}
      <div className="bg-[var(--color-bg-muted)] rounded-2xl p-4 mb-4">
        {/* 進度條 */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1.5">
            <span>已使用 {used} / {total} 堂</span>
            {remaining > 0
              ? <span className="text-[var(--color-primary)]">剩餘 {remaining} 堂 · NT$ {remainingPrice.toLocaleString()}</span>
              : <span className="text-green-500 font-medium">已完成</span>
            }
          </div>
          <div className="h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--color-primary)] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <Row label="施作日期" value={format(parseISO(record.treatment_date), 'yyyy年M月d日')} />
        <Row label="總金額" value={record.total_price != null ? `NT$ ${record.total_price.toLocaleString()}` : null} />
        <Row label="單堂費用" value={unitPrice > 0 ? `NT$ ${unitPrice.toLocaleString()}` : null} />
        {record.description && (
          <div className="py-3 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-muted)] mb-1">施作內容</p>
            <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap leading-relaxed">{record.description}</p>
          </div>
        )}
        {record.note && (
          <div className="py-3 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-muted)] mb-1">備註</p>
            <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">{record.note}</p>
          </div>
        )}
      </div>

      {/* 施作紀錄 */}
      <div className="bg-[var(--color-bg-muted)] rounded-2xl overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-sm font-semibold text-[var(--color-text)]">施作紀錄</p>
          <button
            onClick={() => setShowSessionForm(!showSessionForm)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-medium min-h-0"
          >
            <Plus size={13} strokeWidth={2} />
            新增施作
          </button>
        </div>

        {/* 新增施作表單 */}
        {showSessionForm && (
          <form onSubmit={handleSubmit(onAddSession)} className="mx-4 mb-3 bg-[var(--color-bg-card)] rounded-xl p-3 space-y-3">
            <Controller name="session_date" control={control} render={({ field }) => (
              <DatePicker label="施作日期" value={field.value ?? ''} onChange={field.onChange} />
            )} />
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">備註</label>
              <input
                type="text"
                {...register('note')}
                placeholder="施作部位、感受…"
                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm bg-[var(--color-bg-card)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSessionForm(false)}
                className="flex-1 py-2 rounded-xl border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] min-h-0"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={addingSession}
                className="flex-1 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-medium min-h-0 disabled:opacity-60"
              >
                {addingSession ? '儲存中…' : '確認'}
              </button>
            </div>
          </form>
        )}

        {sessions.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)] text-center py-6 px-4">尚無施作紀錄，點「新增施作」開始記錄</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {sessions.map((s, idx) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary-light)] px-2 py-0.5 rounded-full">
                      第 {used - idx} 次
                    </span>
                    <span className="text-sm text-[var(--color-text)]">
                      {format(parseISO(s.session_date), 'yyyy/M/d')}
                    </span>
                  </div>
                  {s.note && <p className="text-xs text-[var(--color-text-muted)] mt-1">{s.note}</p>}
                </div>
                <button
                  onClick={() => { if (confirm('確定刪除此施作紀錄？')) removeSession(s.id) }}
                  className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-50 transition-colors min-h-0 min-w-0"
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="h-8" />
    </div>
  )
}
