import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, Sparkles } from 'lucide-react'
import { useAestheticRecords } from '@/hooks/useAestheticRecords'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { format, parseISO } from 'date-fns'

export default function AestheticPage() {
  const navigate = useNavigate()
  const { records, loading } = useAestheticRecords()

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="min-h-0 min-w-0 p-1 text-[var(--color-text-muted)]">
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>
          <h2 className="text-xl font-semibold text-[var(--color-text)]">醫美紀錄</h2>
        </div>
        <Link
          to="/my/aesthetic/new"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium min-h-0"
        >
          <Plus size={16} strokeWidth={2} />
          新增療程
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : records.length === 0 ? (
        <EmptyState Icon={Sparkles} title="尚無醫美紀錄" description="點右上角新增第一筆療程" />
      ) : (
        <div className="space-y-3">
          {records.map((r) => {
            const used = r.used_sessions
            const total = r.total_sessions
            const remaining = total - used
            const unitPrice = total > 0 ? Math.round((r.total_price ?? 0) / total) : 0
            const remainingPrice = remaining * unitPrice
            const pct = total > 0 ? (used / total) * 100 : 0

            return (
              <Link key={r.id} to={`/my/aesthetic/${r.id}`} className="block">
                <div className="border border-[var(--color-border)] rounded-2xl p-4 bg-[var(--color-bg-card)] hover:border-[var(--color-primary)] transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-medium text-[var(--color-text)]">{r.treatment_name}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {format(parseISO(r.treatment_date), 'yyyy年M月d日')}
                      </p>
                    </div>
                    {r.total_price != null && (
                      <p className="text-sm font-semibold text-[var(--color-text)] flex-shrink-0">
                        NT$ {r.total_price.toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* 堂數進度條 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                      <span>已使用 {used} / {total} 堂</span>
                      {remaining > 0 && (
                        <span className="text-[var(--color-primary)]">
                          剩 {remaining} 堂 · NT$ {remainingPrice.toLocaleString()}
                        </span>
                      )}
                      {remaining === 0 && <span className="text-green-500">已完成</span>}
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--color-bg-muted)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
      <div className="h-8" />
    </div>
  )
}
