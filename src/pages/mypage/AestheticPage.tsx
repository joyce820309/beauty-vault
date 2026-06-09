import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react'
import { useTreatments, calcTreatmentStats } from '@/hooks/useAestheticRecords'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, getMonth, getYear } from 'date-fns'
import type { TreatmentWithData, TreatmentSession } from '@/types/database'

// 療程色票（對應 THEME_COLORS light）
const TREATMENT_COLORS = [
  '#C4768A', '#C8906A', '#C8C070', '#88B880', '#70B0A8',
  '#7098C8', '#8888C8', '#A878C0', '#C078A0', '#B09870',
]

type Tab = 'overview' | 'records'

// ── 概覽 Tab ─────────────────────────────────────────────────────

function OverviewTab({ treatments }: { treatments: TreatmentWithData[] }) {
  const [viewMonth, setViewMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // 所有施作紀錄，附上 treatment 資訊
  const allSessions: (TreatmentSession & { treatmentName: string; color: string })[] = useMemo(() => {
    return treatments.flatMap((t, ti) =>
      t.treatment_sessions.map(s => ({
        ...s,
        treatmentName: t.name,
        color: TREATMENT_COLORS[ti % TREATMENT_COLORS.length],
      }))
    ).sort((a, b) => b.session_date.localeCompare(a.session_date))
  }, [treatments])

  // 月曆格
  const calDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [viewMonth])

  // 點選日期顯示的施作
  const selectedSessions = selectedDay
    ? allSessions.filter(s => isSameDay(parseISO(s.session_date), selectedDay))
    : []

  // 近 6 個月每月次數（折線圖資料）
  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i)
      const key = format(d, 'yyyy-MM')
      const count = allSessions.filter(s => s.session_date.startsWith(key)).length
      return { label: `${getMonth(d) + 1}月`, count, key }
    })
  }, [allSessions])

  const maxCount = Math.max(...trendData.map(d => d.count), 1)
  const totalThisYear = allSessions.filter(s => s.session_date.startsWith(String(getYear(new Date())))).length
  const totalSpend = treatments.reduce((s, t) => s + calcTreatmentStats(t).totalSpend, 0)
  const totalRemaining = treatments.reduce((s, t) => s + calcTreatmentStats(t).remaining, 0)

  const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

  return (
    <div className="space-y-4">
      {/* 數字摘要 */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '總花費', value: `NT$ ${(totalSpend / 1000).toFixed(0)}k` },
          { label: '剩餘堂數', value: `${totalRemaining} 堂` },
          { label: `${getYear(new Date())} 年施作`, value: `${totalThisYear} 次` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[var(--color-bg-muted)] rounded-2xl p-3 text-center">
            <p className="text-xs text-[var(--color-text-muted)] mb-1">{label}</p>
            <p className="text-base font-semibold text-[var(--color-text)]">{value}</p>
          </div>
        ))}
      </div>

      {/* 月曆熱力圖 */}
      <div className="bg-[var(--color-bg-muted)] rounded-2xl p-4">
        {/* 月份切換 */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => { setViewMonth(v => subMonths(v, 1)); setSelectedDay(null) }}
            className="p-1.5 rounded-lg hover:bg-[var(--color-border)] transition-colors min-h-0 min-w-0"
          >
            <ChevronLeft size={16} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
          </button>
          <p className="text-sm font-semibold text-[var(--color-text)]">
            {format(viewMonth, 'yyyy年M月')}
          </p>
          <button
            onClick={() => { setViewMonth(v => addMonths(v, 1)); setSelectedDay(null) }}
            className="p-1.5 rounded-lg hover:bg-[var(--color-border)] transition-colors min-h-0 min-w-0"
          >
            <ChevronRight size={16} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* 星期 header */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(w => (
            <div key={w} className="text-center text-xs text-[var(--color-text-muted)] py-1">{w}</div>
          ))}
        </div>

        {/* 日期格 */}
        <div className="grid grid-cols-7 gap-y-1">
          {calDays.map(day => {
            const daySessions = allSessions.filter(s => isSameDay(parseISO(s.session_date), day))
            const inMonth = isSameMonth(day, viewMonth)
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
            const hasMultiple = daySessions.length > 1
            const firstColor = daySessions[0]?.color

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => {
                  if (daySessions.length > 0) setSelectedDay(isSelected ? null : day)
                }}
                className={`relative aspect-square flex items-center justify-center rounded-full text-xs transition-colors min-h-0 min-w-0 mx-auto w-8 h-8 ${
                  !inMonth ? 'opacity-20' : ''
                } ${isSelected ? 'ring-2 ring-[var(--color-primary)] ring-offset-1' : ''} ${
                  daySessions.length > 0 ? 'cursor-pointer' : 'cursor-default'
                }`}
                style={daySessions.length > 0 ? {
                  backgroundColor: `${firstColor}25`,
                } : undefined}
              >
                {/* 多療程：外圈 + 內圈 */}
                {hasMultiple && (
                  <span
                    className="absolute inset-0.5 rounded-full border-2"
                    style={{ borderColor: daySessions[1]?.color }}
                  />
                )}
                {/* 色點 */}
                {daySessions.length > 0 && (
                  <span
                    className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: firstColor }}
                  />
                )}
                <span className={inMonth ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}>
                  {format(day, 'd')}
                </span>
              </button>
            )
          })}
        </div>

        {/* 圖例 */}
        <div className="flex gap-3 mt-3 flex-wrap">
          {treatments.map((t, ti) => (
            <div key={t.id} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: TREATMENT_COLORS[ti % TREATMENT_COLORS.length] }} />
              <span className="text-xs text-[var(--color-text-muted)] truncate max-w-[80px]">{t.name}</span>
            </div>
          ))}
        </div>

        {/* 點選日期展開 */}
        {selectedDay && selectedSessions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--color-border)] space-y-1.5">
            <p className="text-xs font-medium text-[var(--color-text-muted)]">
              {format(selectedDay, 'M/d')} 的施作紀錄
            </p>
            {selectedSessions.map(s => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-sm text-[var(--color-text)]">{s.treatmentName}</span>
                {s.note && <span className="text-xs text-[var(--color-text-muted)] truncate">· {s.note}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 每月施作次數折線圖 */}
      <div className="bg-[var(--color-bg-muted)] rounded-2xl p-4">
        <p className="text-sm font-semibold text-[var(--color-text)] mb-4">每月施作次數（近 6 個月）</p>
        <div className="flex items-end gap-1 h-24">
          {trendData.map((d, i) => {
            const barPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0
            const isCurrentMonth = d.key === format(new Date(), 'yyyy-MM')
            return (
              <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-[var(--color-text-muted)]">{d.count > 0 ? d.count : ''}</span>
                <div className="w-full flex items-end" style={{ height: '64px' }}>
                  <div
                    className="w-full rounded-t-lg transition-all"
                    style={{
                      height: d.count === 0 ? '4px' : `${barPct}%`,
                      backgroundColor: isCurrentMonth ? 'var(--color-primary)' : `var(--color-primary)`,
                      opacity: isCurrentMonth ? 1 : 0.4 + (i / 5) * 0.4,
                    }}
                  />
                </div>
                <span className={`text-xs ${isCurrentMonth ? 'text-[var(--color-primary)] font-medium' : 'text-[var(--color-text-muted)]'}`}>
                  {d.label}
                </span>
              </div>
            )
          })}
        </div>
        {trendData.every(d => d.count === 0) && (
          <p className="text-xs text-[var(--color-text-muted)] text-center py-4">近 6 個月尚無施作紀錄</p>
        )}
      </div>
    </div>
  )
}

// ── 紀錄 Tab ─────────────────────────────────────────────────────

function RecordsTab({ treatments }: { treatments: TreatmentWithData[] }) {
  if (treatments.length === 0) {
    return <EmptyState Icon={Sparkles} title="尚無醫美紀錄" description="點右上角新增第一筆購入紀錄" />
  }

  return (
    <div className="space-y-3">
      {treatments.map((t) => {
        const { totalSessions, usedSessions, remaining, totalSpend, remainingValue, pct } = calcTreatmentStats(t)
        const purchaseCount = t.treatment_purchases.length

        return (
          <Link key={t.id} to={`/my/aesthetic/${t.id}`} className="block">
            <div className="border border-[var(--color-border)] rounded-2xl p-4 bg-[var(--color-bg-card)] hover:border-[var(--color-primary)] transition-colors">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="font-medium text-[var(--color-text)]">{t.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {purchaseCount} 次購入 · 共 NT$ {totalSpend.toLocaleString()}
                  </p>
                </div>
                {remaining > 0 ? (
                  <span className="text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary-light)] px-2 py-0.5 rounded-full flex-shrink-0">
                    剩 {remaining} 堂
                  </span>
                ) : totalSessions > 0 ? (
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0">
                    已完成
                  </span>
                ) : null}
              </div>

              {totalSessions > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                    <span>已施作 {usedSessions} / {totalSessions} 堂</span>
                    {remaining > 0 && (
                      <span className="text-[var(--color-primary)]">
                        剩餘價值 NT$ {remainingValue.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--color-bg-muted)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ── 主頁面 ───────────────────────────────────────────────────────

export default function AestheticPage() {
  const navigate = useNavigate()
  const { treatments, loading } = useTreatments()
  const [tab, setTab] = useState<Tab>('records')

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
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
          新增購入
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex mb-4 border-b border-[var(--color-border)]">
        {([['overview', '概覽'], ['records', '紀錄']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors min-h-0 relative ${
              tab === key
                ? 'text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {label}
            {tab === key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : tab === 'overview' ? (
        <OverviewTab treatments={treatments} />
      ) : (
        <RecordsTab treatments={treatments} />
      )}

      <div className="h-8" />
    </div>
  )
}
