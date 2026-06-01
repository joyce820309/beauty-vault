import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Package, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { getItems } from '@/lib/supabase/items'
import { getExpiryLevel, expiryColors } from '@/utils/expiry'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Item } from '@/types/database'
import { differenceInDays, parseISO, format } from 'date-fns'

type ExpiryGroup = { level: 'urgent' | 'warning' | 'caution'; label: string; emoji: string; items: Item[] }

function getDaysLeft(expDate: string) {
  return differenceInDays(parseISO(expDate), new Date())
}

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    getItems().then(({ data }) => {
      setItems(data ?? [])
      setLoading(false)
    })
  }, [])

  const expiryGroups = ([
    {
      level: 'urgent' as const,
      label: '緊急',
      emoji: '🔴',
      items: items.filter((i) => i.exp_date && i.disposal_status !== 'disposed' && getExpiryLevel(i.exp_date) === 'urgent'),
    },
    {
      level: 'warning' as const,
      label: '警告',
      emoji: '🟠',
      items: items.filter((i) => i.exp_date && i.disposal_status !== 'disposed' && getExpiryLevel(i.exp_date) === 'warning'),
    },
    {
      level: 'caution' as const,
      label: '注意',
      emoji: '🟡',
      items: items.filter((i) => i.exp_date && i.disposal_status !== 'disposed' && getExpiryLevel(i.exp_date) === 'caution'),
    },
  ] satisfies ExpiryGroup[]).filter((g) => g.items.length > 0)

  const totalExpiring = expiryGroups.reduce((s, g) => s + g.items.length, 0)

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[var(--color-primary)]">BeautyVault</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{format(new Date(), 'yyyy年M月d日')}</p>
      </div>

      {/* 即期預警 Banner */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[var(--color-text-muted)]">即期預警</h3>
          <Link to="/expiry" className="text-xs text-[var(--color-primary)] hover:underline min-h-0">
            管理 →
          </Link>
        </div>
        {loading ? (
          <Skeleton className="h-16 rounded-2xl" />
        ) : totalExpiring === 0 ? (
          <div className="bg-[var(--color-bg-muted)] rounded-2xl px-4 py-4 flex items-center gap-3">
            <CheckCircle size={22} strokeWidth={1.5} className="text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">目前沒有即期品項</p>
              <p className="text-xs text-[var(--color-text-muted)]">所有品項均在安全期內</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {expiryGroups.map((group) => (
              <div key={group.level} className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === group.level ? null : group.level)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left min-h-0"
                  style={{ backgroundColor: `${expiryColors[group.level]}18` }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: expiryColors[group.level] }} />
                  <div className="flex-1">
                    <span className="text-sm font-semibold" style={{ color: expiryColors[group.level] }}>
                      {group.label}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)] ml-2">{group.items.length} 筆</span>
                  </div>
                  {expanded === group.level
                    ? <ChevronUp size={16} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
                    : <ChevronDown size={16} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
                  }
                </button>

                {expanded === group.level && (
                  <ul className="divide-y divide-[var(--color-border)]">
                    {group.items.map((item) => {
                      const daysLeft = getDaysLeft(item.exp_date!)
                      const name = item.name_en || item.name_zh || '（未命名）'
                      const brand = item.brand_en || item.brand_zh || ''
                      return (
                        <li key={item.id}>
                          <Link
                            to={`/items/${item.id}`}
                            className="flex items-center justify-between px-4 py-3 hover:bg-[var(--color-bg-muted)] transition-colors"
                          >
                            <div className="min-w-0">
                              {brand && <p className="text-xs text-[var(--color-text-muted)] truncate">{brand}</p>}
                              <p className="text-sm text-[var(--color-text)] truncate">{name}</p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                              {daysLeft <= 0 ? (
                                <span className="text-xs font-bold text-[var(--color-danger)]">今日到期</span>
                              ) : (
                                <span className="text-xs text-[var(--color-text-muted)]">剩 {daysLeft} 天</span>
                              )}
                              <p className="text-xs text-[var(--color-text-muted)]">{format(parseISO(item.exp_date!), 'MM/dd')}</p>
                            </div>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 快速入口 */}
      <section>
        <h3 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2">快速操作</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/items/new"
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
          >
            <Plus size={28} strokeWidth={1.5} className="text-[var(--color-primary)]" />
            <span className="text-sm font-medium text-[var(--color-text)]">新增品項</span>
          </Link>
          <Link
            to="/items"
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
          >
            <Package size={28} strokeWidth={1.5} className="text-[var(--color-primary)]" />
            <span className="text-sm font-medium text-[var(--color-text)]">
              全部品項
              {!loading && items.length > 0 && (
                <span className="text-[var(--color-text-muted)] font-normal ml-1">({items.length})</span>
              )}
            </span>
          </Link>
        </div>
      </section>
    </div>
  )
}
