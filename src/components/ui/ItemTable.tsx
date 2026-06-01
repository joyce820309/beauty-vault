import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Item } from '@/types/database'
import { getExpiryLevel } from '@/utils/expiry'
import { useCategories } from '@/contexts/CategoriesContext'

function fmtDate(d: string | null) {
  if (!d) return '—'
  return format(parseISO(d), 'yy/MM/dd')
}

type SortKey = 'brand' | 'name' | 'category' | 'exp_date' | 'price'
type SortDir = 'asc' | 'desc'

const expiryTextClass: Record<string, string> = {
  urgent: 'text-[var(--color-danger)] font-medium',
  warning: 'text-[var(--color-warning)]',
  caution: 'text-[var(--color-caution)]',
  ok: 'text-[var(--color-text-muted)]',
}

const priceBadge: Record<string, string> = {
  gift: 'text-[var(--color-primary)]',
  split: 'text-[var(--color-accent)]',
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown size={11} className="ml-0.5 opacity-30" />
  return dir === 'asc'
    ? <ChevronUp size={11} className="ml-0.5 text-[var(--color-primary)]" />
    : <ChevronDown size={11} className="ml-0.5 text-[var(--color-primary)]" />
}

export function ItemTable({ items }: { items: Item[] }) {
  const navigate = useNavigate()
  const { getCategoryLabel } = useCategories()
  const [sortKey, setSortKey] = useState<SortKey>('exp_date')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...items].sort((a, b) => {
    let va: string | number = ''
    let vb: string | number = ''
    switch (sortKey) {
      case 'brand':
        va = (a.brand_en || a.brand_zh || '').toLowerCase()
        vb = (b.brand_en || b.brand_zh || '').toLowerCase()
        break
      case 'name':
        va = (a.name_en || a.name_zh || '').toLowerCase()
        vb = (b.name_en || b.name_zh || '').toLowerCase()
        break
      case 'category':
        va = getCategoryLabel(a.category).toLowerCase()
        vb = getCategoryLabel(b.category).toLowerCase()
        break
      case 'exp_date':
        va = a.exp_date ?? '9999-12-31'
        vb = b.exp_date ?? '9999-12-31'
        break
      case 'price':
        va = a.price ?? -1
        vb = b.price ?? -1
        break
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  function TH({ col, children }: { col?: SortKey; children: React.ReactNode }) {
    return (
      <th
        onClick={col ? () => handleSort(col) : undefined}
        className={`px-3 py-2.5 text-left text-xs font-semibold text-[var(--color-text-muted)] whitespace-nowrap bg-[var(--color-bg-muted)] ${
          col ? 'cursor-pointer hover:text-[var(--color-text)] select-none' : ''
        }`}
      >
        <span className="inline-flex items-center">
          {children}
          {col && <SortIcon active={sortKey === col} dir={sortDir} />}
        </span>
      </th>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
      <table className="w-full text-sm border-collapse" style={{ minWidth: 580 }}>
        <thead>
          <tr>
            <TH col="brand">品牌</TH>
            <TH col="name">品名</TH>
            <TH>色號</TH>
            <TH col="category">類別</TH>
            <TH col="exp_date">效期</TH>
            <TH col="price">金額</TH>
          </tr>
          {/* 底線分隔，讓 sticky header 有明確邊界 */}
          <tr>
            <td colSpan={6} className="h-px bg-[var(--color-border)] p-0" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, idx) => {
            const expiryLevel = getExpiryLevel(item.exp_date)
            const brand = item.brand_en || item.brand_zh || '—'
            const name = item.name_en || item.name_zh || '（未命名）'
            const nameZh = item.name_en && item.name_zh ? item.name_zh : null
            const shade = item.shade_en || item.shade_zh

            return (
              <tr
                key={item.id}
                onClick={() => navigate(`/items/${item.id}`)}
                className={`cursor-pointer border-t border-[var(--color-border)] hover:bg-[var(--color-primary-light)]/30 transition-colors active:opacity-70 ${
                  idx % 2 === 1 ? 'bg-[var(--color-bg-muted)]/50' : 'bg-[var(--color-bg-card)]'
                }`}
              >
                {/* 品牌 */}
                <td className="px-3 py-2.5 max-w-[90px]">
                  <span className="block truncate font-medium text-[var(--color-primary-dark)]">{brand}</span>
                </td>

                {/* 品名 */}
                <td className="px-3 py-2.5 max-w-[180px]">
                  <span className="block truncate text-[var(--color-text)]">{name}</span>
                  {nameZh && (
                    <span className="block truncate text-xs text-[var(--color-text-muted)]">{nameZh}</span>
                  )}
                </td>

                {/* 色號 */}
                <td className="px-3 py-2.5 max-w-[100px] text-[var(--color-text-muted)]">
                  <span className="block truncate">{shade || '—'}</span>
                </td>

                {/* 類別 */}
                <td className="px-3 py-2.5 whitespace-nowrap text-[var(--color-text-muted)]">
                  {getCategoryLabel(item.category)}
                </td>

                {/* 效期 */}
                <td className={`px-3 py-2.5 whitespace-nowrap ${expiryTextClass[expiryLevel]}`}>
                  {fmtDate(item.exp_date)}
                </td>

                {/* 金額 */}
                <td className="px-3 py-2.5 whitespace-nowrap text-[var(--color-text-muted)]">
                  {item.price_type === 'gift' ? (
                    <span className={priceBadge.gift}>贈品</span>
                  ) : item.price != null ? (
                    <span>
                      ${item.price.toLocaleString()}
                      {item.price_type === 'split' && (
                        <span className={`ml-1 text-xs ${priceBadge.split}`}>分</span>
                      )}
                      {item.currency && (
                        <span className="ml-1 text-xs text-amber-500">{item.currency}</span>
                      )}
                    </span>
                  ) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
