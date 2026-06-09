import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2, Pencil, X } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { useTreatmentDetail, calcTreatmentStats, calcPurchaseRemaining } from '@/hooks/useAestheticRecords'
import { deleteTreatment, createSession, updateSession, deleteSession, deletePurchase } from '@/lib/supabase/aestheticRecords'
import { Skeleton } from '@/components/ui/Skeleton'
import { DatePicker } from '@/components/ui/DatePicker'
import { useToast } from '@/components/ui/Toast'
import { format, parseISO } from 'date-fns'
import type { PurchaseType } from '@/types/database'

const PURCHASE_TYPE_LABELS: Record<PurchaseType, string> = {
  trial: '體驗課',
  single: '單堂',
  package: '課程包',
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-[var(--color-border)] last:border-0">
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      <span className="text-sm text-[var(--color-text)] font-medium text-right">{value || '—'}</span>
    </div>
  )
}

type SessionForm = { session_date: string; note: string }

export default function AestheticDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { treatment, loading, refetch } = useTreatmentDetail(Number(id))
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [addingSession, setAddingSession] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null)

  const { register, handleSubmit, reset, control } = useForm<SessionForm>({
    defaultValues: { session_date: format(new Date(), 'yyyy-MM-dd'), note: '' },
  })

  const editForm = useForm<SessionForm>({ defaultValues: { session_date: '', note: '' } })

  async function handleDelete() {
    if (!confirm('確定要刪除此療程？所有購入紀錄和施作紀錄也會一併刪除。')) return
    await deleteTreatment(Number(id))
    navigate('/my/aesthetic', { replace: true })
  }

  const onAddSession = async (data: SessionForm) => {
    setAddingSession(true)
    const { error } = await createSession({
      treatment_id: Number(id),
      session_date: data.session_date,
      note: data.note || null,
    })
    if (error) { showToast('新增失敗', 'error') }
    else { showToast('已新增施作紀錄'); reset({ session_date: format(new Date(), 'yyyy-MM-dd'), note: '' }); setShowSessionForm(false) }
    setAddingSession(false)
    await refetch()
  }

  async function handleDeleteSession(sessionId: number) {
    if (!confirm('確定刪除此施作紀錄？')) return
    await deleteSession(sessionId)
    showToast('已刪除')
    await refetch()
  }

  function startEditSession(s: { id: number; session_date: string; note: string | null }) {
    setEditingSessionId(s.id)
    editForm.reset({ session_date: s.session_date, note: s.note ?? '' })
    setShowSessionForm(false)
  }

  const onEditSession = editForm.handleSubmit(async (data) => {
    if (!editingSessionId) return
    const { error } = await updateSession(editingSessionId, {
      session_date: data.session_date,
      note: data.note || null,
    })
    if (error) { showToast('更新失敗', 'error'); return }
    showToast('已更新')
    setEditingSessionId(null)
    await refetch()
  })

  async function handleDeletePurchase(purchaseId: number) {
    if (!confirm('確定刪除此購入紀錄？')) return
    await deletePurchase(purchaseId)
    showToast('已刪除')
    await refetch()
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

  if (!treatment) {
    return <p className="text-center text-[var(--color-text-muted)] py-16">找不到此療程</p>
  }

  const { totalSessions, usedSessions, remaining, totalSpend, pct } = calcTreatmentStats(treatment)
  const purchaseRemaining = calcPurchaseRemaining(treatment.treatment_purchases, treatment.treatment_sessions)
  const sessions = [...treatment.treatment_sessions].sort((a, b) => b.session_date.localeCompare(a.session_date))
  const purchases = [...treatment.treatment_purchases].sort((a, b) => a.purchase_date.localeCompare(b.purchase_date))

  return (
    <div>
      {/* 頂部 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/my/aesthetic')} className="min-h-0 min-w-0 p-1 text-[var(--color-text-muted)]">
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>
          <h2 className="text-xl font-semibold text-[var(--color-text)]">{treatment.name}</h2>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/my/aesthetic/${id}/edit`}
            className="px-3 py-2 rounded-xl border border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-medium flex items-center min-h-0"
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

      {/* 總覽卡片 */}
      {totalSessions > 0 && (
        <div className="bg-[var(--color-bg-muted)] rounded-2xl p-4 mb-4">
          <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1.5">
            <span>已施作 {usedSessions} / {totalSessions} 堂</span>
            {remaining > 0
              ? <span className="text-[var(--color-primary)] font-medium">剩餘 {remaining} 堂</span>
              : <span className="text-green-500 font-medium">已完成</span>
            }
          </div>
          <div className="h-2 rounded-full bg-[var(--color-border)] overflow-hidden mb-3">
            <div className="h-full rounded-full bg-[var(--color-primary)] transition-all" style={{ width: `${pct}%` }} />
          </div>
          <Row label="總花費" value={`NT$ ${totalSpend.toLocaleString()}`} />
          {treatment.note && (
            <div className="pt-2.5 mt-0.5">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">備註</p>
              <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">{treatment.note}</p>
            </div>
          )}
        </div>
      )}

      {/* 購入紀錄 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-[var(--color-text)]">購入紀錄</p>
          <Link
            to={`/my/aesthetic/new?treatment_id=${id}`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-medium min-h-0"
          >
            <Plus size={13} strokeWidth={2} />
            加購
          </Link>
        </div>
        <div className="space-y-2">
          {purchases.map((p) => {
            const rem = purchaseRemaining.get(p.id) ?? 0
            const total = p.paid_sessions + p.bonus_sessions
            const used = total - rem
            const isDone = rem === 0
            return (
              <div key={p.id} className="border border-[var(--color-border)] rounded-xl bg-[var(--color-bg-card)] overflow-hidden">
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]">
                          {PURCHASE_TYPE_LABELS[p.purchase_type]}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {format(parseISO(p.purchase_date), 'yyyy/M/d')}
                        </span>
                        {isDone
                          ? <span className="text-xs text-green-600 font-medium">✓ 用完</span>
                          : <span className="text-xs text-[var(--color-primary)] font-medium">剩 {rem} 堂</span>
                        }
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-sm font-medium text-[var(--color-text)]">
                          {p.paid_sessions} 堂{p.bonus_sessions > 0 ? ` + 贈 ${p.bonus_sessions}` : ''}
                        </span>
                        {p.total_price != null && (
                          <span className="text-xs text-[var(--color-text-muted)]">
                            NT$ {p.total_price.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {/* 小進度條 */}
                      {total > 1 && (
                        <div className="mt-2 h-1 rounded-full bg-[var(--color-bg-muted)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--color-primary)]/60 transition-all"
                            style={{ width: `${total > 0 ? (used / total) * 100 : 0}%` }}
                          />
                        </div>
                      )}
                      {p.note && <p className="text-xs text-[var(--color-text-muted)] mt-1">{p.note}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Link
                        to={`/my/aesthetic/purchase/${p.id}/edit`}
                        className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] min-h-0 min-w-0 transition-colors"
                      >
                        <Pencil size={13} strokeWidth={1.5} />
                      </Link>
                      <button
                        onClick={() => handleDeletePurchase(p.id)}
                        className="p-1.5 rounded-lg text-[var(--color-danger)] hover:bg-red-50 min-h-0 min-w-0 transition-colors"
                      >
                        <Trash2 size={13} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {purchases.length === 0 && (
            <p className="text-xs text-[var(--color-text-muted)] text-center py-4">尚無購入紀錄</p>
          )}
        </div>
      </div>

      {/* 施作紀錄 */}
      <div className="bg-[var(--color-bg-muted)] rounded-2xl mb-4">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-sm font-semibold text-[var(--color-text)]">施作紀錄</p>
          {remaining > 0 && (
            <button
              onClick={() => setShowSessionForm(!showSessionForm)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-medium min-h-0"
            >
              {showSessionForm ? <X size={13} strokeWidth={2} /> : <Plus size={13} strokeWidth={2} />}
              {showSessionForm ? '取消' : '新增施作'}
            </button>
          )}
        </div>

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
                placeholder="施作部位、能量設定、感受…"
                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm bg-[var(--color-bg-card)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <button
              type="submit"
              disabled={addingSession}
              className="w-full py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-medium min-h-0 disabled:opacity-60"
            >
              {addingSession ? '儲存中…' : '確認'}
            </button>
          </form>
        )}

        {sessions.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)] text-center py-6 px-4">尚無施作紀錄</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-b-2xl">
            {sessions.map((s, idx) => (
              <li key={s.id}>
                {editingSessionId === s.id ? (
                  /* inline 編輯表單 */
                  <form onSubmit={onEditSession} className="px-4 py-3 space-y-3 bg-[var(--color-bg-card)]">
                    <Controller name="session_date" control={editForm.control} render={({ field }) => (
                      <DatePicker label="施作日期" value={field.value ?? ''} onChange={field.onChange} />
                    )} />
                    <div>
                      <label className="block text-xs text-[var(--color-text-muted)] mb-1">備註</label>
                      <input
                        type="text"
                        {...editForm.register('note')}
                        placeholder="施作部位、能量設定、感受…"
                        className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm bg-[var(--color-bg-card)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingSessionId(null)}
                        className="flex-1 py-2 rounded-xl border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] min-h-0"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-medium min-h-0"
                      >
                        儲存
                      </button>
                    </div>
                  </form>
                ) : (
                  /* 一般顯示列 */
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary-light)] px-2 py-0.5 rounded-full">
                          第 {sessions.length - idx} 次
                        </span>
                        <span className="text-sm text-[var(--color-text)]">
                          {format(parseISO(s.session_date), 'yyyy/M/d')}
                        </span>
                      </div>
                      {s.note && <p className="text-xs text-[var(--color-text-muted)] mt-1">{s.note}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEditSession(s)}
                        className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] transition-colors min-h-0 min-w-0"
                      >
                        <Pencil size={13} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => handleDeleteSession(s.id)}
                        className="p-1.5 rounded-lg text-[var(--color-danger)] hover:bg-red-50 transition-colors min-h-0 min-w-0"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="h-8" />
    </div>
  )
}
