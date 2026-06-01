import { Link } from 'react-router-dom'
import { Sparkle, Droplets } from 'lucide-react'
import type { Item } from '@/types/database'
import { getExpiryLevel } from '@/utils/expiry'
import { MAKEUP_CATEGORIES, SKINCARE_CATEGORIES } from '@/utils/categories'
import { ExpiryBadge, SensitiveBadge } from './Badge'

const allCategories = [...MAKEUP_CATEGORIES, ...SKINCARE_CATEGORIES]

function getCategoryLabel(value: string | null) {
  if (!value) return ''
  return allCategories.find((c) => c.value === value)?.label ?? value
}

export function ItemCard({ item }: { item: Item }) {
  const expiryLevel = getExpiryLevel(item.exp_date)
  const brandName = item.brand_en || item.brand_zh || ''
  const itemName = item.name_en || item.name_zh || '（未命名）'
  const shade = item.shade_en || item.shade_zh

  return (
    <Link to={`/items/${item.id}`} className="block">
      <div className="flex gap-3 border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-bg-card)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]/30 transition-colors">
        {/* 縮圖 */}
        <div className="w-14 h-14 rounded-lg bg-[var(--color-bg-muted)] flex-shrink-0 overflow-hidden">
          {item.image_url ? (
            <img src={item.image_url} alt={itemName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]">
              {item.item_type === 'makeup'
                ? <Sparkle size={22} strokeWidth={1.5} />
                : <Droplets size={22} strokeWidth={1.5} />
              }
            </div>
          )}
        </div>

        {/* 內容 */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--color-text-muted)] truncate">
            {brandName} · {getCategoryLabel(item.category)}
          </p>
          <p className="font-medium text-[var(--color-text)] truncate mt-0.5">{itemName}</p>
          {shade && <p className="text-xs text-[var(--color-text-muted)] truncate">{shade}</p>}
          <div className="flex flex-wrap gap-1 mt-1.5">
            <ExpiryBadge level={expiryLevel} />
            {item.item_type === 'skincare' && item.sensitive_skin_ok && item.sensitive_skin_ok !== 'untested' && (
              <SensitiveBadge status={item.sensitive_skin_ok} />
            )}
          </div>
        </div>

        {/* 到期色點 */}
        <div className="flex-shrink-0 flex items-start pt-1">
          {expiryLevel !== 'ok' && (
            <span className={`w-2 h-2 rounded-full ${
              expiryLevel === 'urgent' ? 'bg-[var(--color-danger)]' :
              expiryLevel === 'warning' ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-caution)]'
            }`} />
          )}
        </div>
      </div>
    </Link>
  )
}
