import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Pill } from 'lucide-react'
import { getMedicationRecords } from '@/lib/supabase/medications'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import type { MedicationRecordWithItems } from '@/types/database'
import { format, parseISO } from 'date-fns'

export default function MedicationListPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<MedicationRecordWithItems[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await getMedicationRecords()
    setRecords((data as MedicationRecordWithItems[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">用藥紀錄</h2>
        <Link
          to="/my/medications/new"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium min-h-0"
        >
          <Plus size={15} strokeWidth={2} />
          新增
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : records.length === 0 ? (
        <EmptyState Icon={Pill} title="尚無用藥紀錄" description="點右上角新增第一筆" />
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/my/medications/${r.id}`)}
              className="w-full text-left border border-[var(--color-border)] rounded-2xl bg-[var(--color-bg-card)] p-4 hover:border-[var(--color-primary)] transition-colors"
            >
              {/* 日期 + 原因 */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {format(parseISO(r.pickup_date), 'yyyy年M月d日')}
                  </p>
                  <p className="font-semibold text-[var(--color-text)] mt-0.5">{r.reason}</p>
                </div>
                <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-dark)] font-medium">
                  {r.medication_items.length} 項藥品
                </span>
              </div>

              {/* 藥品名稱列表（最多顯示 3 個） */}
              {r.medication_items.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {r.medication_items.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]"
                    >
                      {item.name}
                    </span>
                  ))}
                  {r.medication_items.length > 3 && (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      +{r.medication_items.length - 3} 項
                    </span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
      <div className="h-8" />
    </div>
  )
}
