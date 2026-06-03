import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Package, CheckCircle, Eye, PawPrint } from 'lucide-react'
import { getItems } from '@/lib/supabase/items'
import { getExpiryLevel, expiryColors, type ExpiryLevel } from '@/utils/expiry'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Item } from '@/types/database'
import { format } from 'date-fns'

// 切換方案：'A' = 2×2 卡片格, 'C' = 橫向滑動卡片
const EXPIRY_STYLE: 'A' | 'C' = 'C'

type ExpiryCardInfo = {
  level: ExpiryLevel
  label: string
  sublabel: string
  count: number
  filter: string
}

const EXPIRY_CARD_DEFS: Omit<ExpiryCardInfo, 'count'>[] = [
  { level: 'expired', label: '已過期',       sublabel: '未處理',   filter: 'expired' },
  { level: 'urgent',  label: '緊急',          sublabel: '7 天內',   filter: 'urgent'  },
  { level: 'warning', label: '警告',          sublabel: '8–30 天',  filter: 'warning' },
  { level: 'caution', label: '注意',          sublabel: '1–3 個月', filter: 'caution' },
  { level: 'notice',  label: '通知',          sublabel: '3–6 個月', filter: 'notice'  },
]


// ── 方案 A：2×N 卡片格 ────────────────────────────────────────────
function ExpiryGridCards({ cards }: { cards: ExpiryCardInfo[] }) {
  const active = cards.filter(c => c.count > 0)
  if (active.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-2">
      {active.map((card) => (
        <Link
          key={card.level}
          to={`/expiry?filter=${card.filter}`}
          className="rounded-2xl p-3.5 border flex flex-col gap-1 transition-opacity active:opacity-70"
          style={{
            backgroundColor: `${expiryColors[card.level]}14`,
            borderColor: `${expiryColors[card.level]}30`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: expiryColors[card.level] }}>
              {card.label}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: `${expiryColors[card.level]}22`, color: expiryColors[card.level] }}
            >
              {card.count}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">{card.sublabel}</p>
        </Link>
      ))}
    </div>
  )
}

// ── 方案 C：自適應 grid，不滑動 ──────────────────────────────────
function ExpiryScrollCards({ cards }: { cards: ExpiryCardInfo[] }) {
  const active = cards.filter(c => c.count > 0)
  if (active.length === 0) return null

  const cols = active.length <= 3 ? active.length : active.length === 4 ? 4 : 5

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {active.map((card) => (
        <Link
          key={card.level}
          to={`/expiry?filter=${card.filter}`}
          className="rounded-2xl p-3 border flex flex-col gap-1.5 transition-opacity active:opacity-70 min-w-0"
          style={{
            backgroundColor: `${expiryColors[card.level]}14`,
            borderColor: `${expiryColors[card.level]}30`,
          }}
        >
          <span
            className="text-2xl font-bold leading-none"
            style={{ color: expiryColors[card.level] }}
          >
            {card.count}
          </span>
          <div>
            <p className="text-xs font-medium truncate" style={{ color: expiryColors[card.level] }}>
              {card.label}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{card.sublabel}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getItems().then(({ data }) => {
      setItems(data ?? [])
      setLoading(false)
    })
  }, [])

  const notWatching = (i: Item) => i.disposal_status !== 'disposed' && i.disposal_status !== 'watching'

  const expiryCards: ExpiryCardInfo[] = EXPIRY_CARD_DEFS.map(def => ({
    ...def,
    count: items.filter(i => i.exp_date && notWatching(i) && getExpiryLevel(i.exp_date) === def.level).length,
  }))

  const totalExpiring = expiryCards.reduce((s, c) => s + c.count, 0)
  const watchingItems = items.filter((i) => i.disposal_status === 'watching')

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[var(--color-primary)] flex items-center gap-2">
          <PawPrint size={22} strokeWidth={1.5} fill="var(--color-primary)" className="text-[var(--color-primary)] flex-shrink-0" />
          Beauty Vault
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{format(new Date(), 'yyyy年M月d日')}</p>
      </div>

      {/* 即期預警 */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[var(--color-text-muted)]">即期預警</h3>
          <Link to="/expiry" className="text-xs text-[var(--color-primary)] hover:underline min-h-0">管理 →</Link>
        </div>
        {loading ? (
          <Skeleton className="h-24 rounded-2xl" />
        ) : totalExpiring === 0 ? (
          <div className="bg-[var(--color-bg-muted)] rounded-2xl px-4 py-4 flex items-center gap-3">
            <CheckCircle size={22} strokeWidth={1.5} className="text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">目前沒有即期品項</p>
              <p className="text-xs text-[var(--color-text-muted)]">所有品項均在安全期內</p>
            </div>
          </div>
        ) : EXPIRY_STYLE === 'A' ? (
          <ExpiryGridCards cards={expiryCards} />
        ) : (
          <ExpiryScrollCards cards={expiryCards} />
        )}
      </section>

      {/* 觀察中 */}
      {!loading && watchingItems.length > 0 && (
        <section className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[var(--color-text-muted)]">觀察中</h3>
            <Link to="/expiry?tab=watching" className="text-xs text-[var(--color-primary)] hover:underline min-h-0">管理 →</Link>
          </div>
          <Link
            to="/expiry?tab=watching"
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 flex items-center gap-3 transition-opacity active:opacity-70"
          >
            <Eye size={16} strokeWidth={1.5} style={{ color: expiryColors['notice'] }} />
            <span className="text-sm text-[var(--color-text)] flex-1">觀察中</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${expiryColors['notice']}18`, color: expiryColors['notice'] }}>
              {watchingItems.length} 筆
            </span>
          </Link>
        </section>
      )}

      {/* 快速操作 */}
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
