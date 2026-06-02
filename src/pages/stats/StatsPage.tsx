import { useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { useItems } from '@/hooks/useItems'
import { useStats, filterTrend, type TrendRange } from '@/hooks/useStats'
import { Skeleton } from '@/components/ui/Skeleton'
import { useTheme } from '@/contexts/ThemeContext'

const THEME_COLORS = {
  //        玫瑰       藍紫       茶金       鼠尾草     矢車菊藍   薰衣草     暖杏       霧藍
  light: ['#C4768A', '#8B7BAB', '#B89A6A', '#7A9E8E', '#8FA3C8', '#9B8DC4', '#C4A96A', '#7A96B8'],
  dark:  ['#D4899C', '#A090C0', '#C8AA80', '#8AB4A4', '#7B98BC', '#B0A0D8', '#D4BC80', '#8AAAC8'],
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[var(--color-bg-muted)] rounded-2xl p-4">
      <p className="text-xs text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className="text-xl font-semibold text-[var(--color-text)]">{value}</p>
      {sub && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{sub}</p>}
    </div>
  )
}

type PieMode = 'count' | 'price'

function PieSection({
  title, countData, priceData, colors,
}: {
  title: string
  countData: { name: string; value: number }[]
  priceData: { name: string; value: number }[]
  colors: string[]
}) {
  const [mode, setMode] = useState<PieMode>('count')
  const data = mode === 'count' ? countData : priceData
  const total = data.reduce((s, d) => s + d.value, 0)

  if (total === 0) {
    return (
      <div className="bg-[var(--color-bg-muted)] rounded-2xl p-4">
        <p className="text-sm font-semibold text-[var(--color-text)] mb-2">{title}</p>
        <p className="text-xs text-[var(--color-text-muted)] text-center py-8">尚無資料</p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-bg-muted)] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
        <div className="flex gap-1">
          {(['count', 'price'] as PieMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2 py-1 rounded-lg text-xs font-medium min-h-0 transition-colors ${
                mode === m
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)]'
              }`}
            >
              {m === 'count' ? '品項數' : '金額'}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={colors[idx % colors.length]} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) =>
              mode === 'count' ? [`${value} 筆`, ''] : [`NT$ ${value.toLocaleString()}`, '']
            }
            contentStyle={{
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              fontSize: 12,
              backgroundColor: 'var(--color-bg-card)',
              color: 'var(--color-text)',
            }}
            labelStyle={{ color: 'var(--color-text)', fontSize: 12 }}
            itemStyle={{ color: 'var(--color-text)' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

const RANGE_OPTIONS: { value: TrendRange; label: string }[] = [
  { value: '3m', label: '3 個月' },
  { value: '6m', label: '6 個月' },
  { value: '1y', label: '1 年' },
  { value: 'all', label: '全部' },
]

export default function StatsPage() {
  const { items, loading } = useItems()
  const { theme } = useTheme()
  const stats = useStats(items)
  const [trendRange, setTrendRange] = useState<TrendRange>('1y')
  const trendData = filterTrend(stats.trendLine, trendRange)
  const hasAnySpend = items.some((i) => i.price)
  const colors = THEME_COLORS[theme]

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">統計圖表</h2>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--color-text)]">統計圖表</h2>

      {/* 總覽卡片 */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="總品項數" value={`${stats.totalCount} 筆`} />
        <SummaryCard label="即期品項" value={`${stats.expiringCount} 筆`} sub="30–90 天內到期" />
        <SummaryCard label="總花費" value={`NT$ ${stats.totalSpend.toLocaleString()}`} />
        <SummaryCard label="今年花費" value={`NT$ ${stats.thisYearSpend.toLocaleString()}`} />
      </div>

      {/* 化妝品圓餅 */}
      <PieSection
        title="化妝品分布"
        countData={stats.makeupPieCount}
        priceData={stats.makeupPiePrice}
        colors={colors}
      />

      {/* 保養品圓餅 */}
      <PieSection
        title="保養品分布"
        countData={stats.skincarePieCount}
        priceData={stats.skincarePiePrice}
        colors={colors}
      />

      {/* 消費趨勢折線圖 */}
      <div className="bg-[var(--color-bg-muted)] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-[var(--color-text)]">消費趨勢</p>
          <div className="flex gap-1">
            {RANGE_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setTrendRange(o.value)}
                className={`px-2 py-1 rounded-lg text-xs font-medium min-h-0 transition-colors ${
                  trendRange === o.value
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)]'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        {!hasAnySpend ? (
          <p className="text-xs text-[var(--color-text-muted)] text-center py-8">尚無消費記錄</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`}
                width={30}
              />
              <Tooltip
                formatter={(value: number) => [`NT$ ${value.toLocaleString()}`, '']}
                labelStyle={{ fontSize: 12, color: 'var(--color-text)' }}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid var(--color-border)',
                  fontSize: 12,
                  backgroundColor: 'var(--color-bg-card)',
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="化妝品"
                stroke={colors[0]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="保養品"
                stroke={colors[4]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="h-4" />
    </div>
  )
}
