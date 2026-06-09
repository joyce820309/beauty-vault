import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { useItems } from '@/hooks/useItems'
import { useStats, filterTrend, type TrendRange } from '@/hooks/useStats'
import { Skeleton } from '@/components/ui/Skeleton'
import { useTheme } from '@/contexts/ThemeContext'
import { useCategories } from '@/contexts/CategoriesContext'
import type { Item } from '@/types/database'

const THEME_COLORS = {
  //   玫瑰紅      橘茶        暖黃        草綠        薄荷青      天藍        靛藍        薰衣草紫    蘭花粉      卡其        鼠尾草      藍紫
  light: [
    '#C4768A', '#C8906A', '#C8C070', '#88B880', '#70B0A8',
    '#7098C8', '#8888C8', '#A878C0', '#C078A0', '#B09870',
    '#78B890', '#9890C0',
  ],
  dark: [
    '#D48A9C', '#D8A480', '#D8D888', '#9CCC98', '#84C8C0',
    '#84ACD8', '#9898D8', '#BC90D4', '#D490B8', '#C4AC84',
    '#8CCCA4', '#ACAAD4',
  ],
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[var(--color-bg-muted)] rounded-2xl p-4">
      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
        <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
        {sub && <p className="text-xs text-[var(--color-text-muted)] opacity-70">{sub}</p>}
      </div>
      <p className="text-xl font-medium text-[var(--color-text-muted)]">{value}</p>
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
  const { theme } = useTheme()
  const data = mode === 'count' ? countData : priceData
  const total = data.reduce((s, d) => s + d.value, 0)
  const tooltipStyle = theme === 'light'
    ? {
        backgroundColor: 'rgba(255,250,250,0.95)',
        border: '1px solid rgba(196,118,138,0.2)',
        boxShadow: '0 4px 24px rgba(196,118,138,0.12)',
      }
    : {
        backgroundColor: 'rgba(40,32,36,0.95)',
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.30)',
      }

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

      {/* 實心圓餅圖，固定高度不含 legend */}
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={88}
            paddingAngle={1}
            dataKey="value"
            stroke="none"
            minAngle={3}
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={colors[idx % colors.length]} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) =>
              mode === 'count'
                ? [`${value} 筆`, name]
                : [`NT$ ${value.toLocaleString()}`, name]
            }
            contentStyle={{
              borderRadius: 12,
              fontSize: 12,
              color: 'var(--color-text)',
              ...tooltipStyle,
            }}
            labelStyle={{ color: 'var(--color-text)', fontSize: 12 }}
            itemStyle={{ color: 'var(--color-text)' }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* 自訂 legend：2 欄 grid，不會超出寬度 */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3">
        {data.map((entry, idx) => (
          <div key={entry.name} className="flex items-center gap-1.5 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: colors[idx % colors.length] }}
            />
            <span className="text-xs text-[var(--color-text-muted)] truncate">{entry.name}</span>
            <span className="text-xs text-[var(--color-text-muted)] ml-auto flex-shrink-0 opacity-70">
              {mode === 'count' ? entry.value : `${Math.round(entry.value / 1000)}k`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const HEALTH_CHECKS = [
  { filter: 'no-category',      label: '類別',    get: (i: Item) => i.category },
  { filter: 'no-expiry',        label: '效期',    get: (i: Item) => i.exp_date },
  { filter: 'no-purchase-date', label: '購入日期', get: (i: Item) => i.purchase_date },
  { filter: 'no-channel',       label: '通路',    get: (i: Item) => i.channel },
]

// 低飽和色階，對應專案玫瑰 × 矢車菊藍色系
function getHealthColor(pct: number): { bar: string; status: string } {
  if (pct === 100) return { bar: '#4CAF82', status: '完美' }    // 飽和綠
  if (pct >= 81)   return { bar: '#7BC8A4', status: '幾乎滿分' } // 淺綠
  if (pct >= 61)   return { bar: '#C8C060', status: '快完成了' } // 黃
  if (pct >= 41)   return { bar: '#D4A050', status: '進度不錯' } // 橘黃
  if (pct >= 21)   return { bar: '#D47840', status: '持續努力' } // 橘
  return                   { bar: '#C85050', status: '需要加油' } // 紅
}

function HealthSection({ items }: { items: Item[] }) {
  const active = items.filter((i) => i.disposal_status !== 'disposed' && i.price_type !== 'present' && !i.ignore_health)
  const total = active.length
  if (total === 0) return null

  const rows = HEALTH_CHECKS.map(({ filter, label, get }) => {
    const ok = active.filter(get).length
    const pct = total > 0 ? Math.round((ok / total) * 100) : 0
    return { filter, label, ok, missing: total - ok, pct }
  })

  const overallPct = Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length)
  const { bar: scoreColor, status: scoreStatus } = getHealthColor(overallPct)

  return (
    <div className="bg-[var(--color-bg-muted)] rounded-2xl p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">資料完整度</p>
          <span
            className="inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1.5"
            style={{ backgroundColor: `${scoreColor}28`, color: scoreColor }}
          >
            {scoreStatus}
          </span>
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-3xl font-bold leading-none text-[var(--color-text-muted)]">{overallPct}</span>
          <span className="text-sm text-[var(--color-text-muted)]">分</span>
        </div>
      </div>
      <div className="space-y-3">
        {rows.map(({ filter, label, ok, missing, pct }) => {
          const { bar } = getHealthColor(pct)
          return (
            <div key={filter}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--color-text)]">{label}</span>
                {missing === 0
                  ? <span className="text-xs font-medium" style={{ color: bar }}>✓ 完整</span>
                  : <Link
                      to={`/items?filter=${filter}`}
                      className="text-xs font-medium hover:underline"
                      style={{ color: bar }}
                    >
                      {missing} 筆缺漏 →
                    </Link>
                }
              </div>
              <div className="h-2 rounded-full bg-[var(--color-border)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: bar }}
                />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5 text-right">{ok} / {total}</p>
            </div>
          )
        })}
      </div>
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
  const { getCategoryLabel } = useCategories()
  const stats = useStats(items, getCategoryLabel)
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

      {/* 資料完整度 */}
      <HealthSection items={items} />

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

      {/* 品牌圓餅 */}
      <PieSection
        title="品牌分布（前 8 名）"
        countData={stats.brandPieCount}
        priceData={stats.brandPiePrice}
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
                formatter={(value: number, name: string) => [`NT$ ${value.toLocaleString()}`, name]}
                labelStyle={{ fontSize: 12, color: 'var(--color-text)' }}
                contentStyle={{
                  borderRadius: 14,
                  fontSize: 12,
                  ...(theme === 'light'
                    ? {
                        backgroundColor: 'rgba(255,250,250,0.18)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.45)',
                        boxShadow: '0 4px 24px rgba(196,118,138,0.12)',
                      }
                    : {
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.14)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.30)',
                      }),
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
