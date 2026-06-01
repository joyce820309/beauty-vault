import { Link } from 'react-router-dom'
import { Sparkle, Droplets } from 'lucide-react'
import type { Item } from '@/types/database'
import { getExpiryLevel } from '@/utils/expiry'
import { useCategories } from '@/contexts/CategoriesContext'
import { ExpiryBadge, SensitiveBadge, PriceBadge } from './Badge'

export function ItemCard({ item }: { item: Item }) {
  const { getCategoryLabel } = useCategories()
  const expiryLevel = getExpiryLevel(item.exp_date)
  const brandName = item.brand_en || item.brand_zh || ''

  // 品名：英文 / 中文（只有其中一個時不顯示斜線）
  const namePrimary = item.name_en || item.name_zh || '（未命名）'
  const nameSecondary = item.name_en && item.name_zh ? item.name_zh : null

  // 色號：英文 / 中文
  const shadePrimary = item.shade_en || item.shade_zh || null
  const shadeSecondary = item.shade_en && item.shade_zh ? item.shade_zh : null

  return (
    <Link to={`/items/${item.id}`} className="block">
      <div className="flex items-start gap-3 border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-bg-card)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]/30 transition-colors">
        {/* 縮圖 */}
        <div className="w-14 h-14 rounded-lg bg-[var(--color-bg-muted)] flex-shrink-0 overflow-hidden">
          {item.image_url ? (
            <img src={item.image_url} alt={namePrimary} className="w-full h-full object-cover" />
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
          <p className="font-medium text-[var(--color-text)] truncate mt-0.5">
            {namePrimary}
            {nameSecondary && (
              <span className="font-normal text-[var(--color-text-muted)]"> / {nameSecondary}</span>
            )}
          </p>
          {shadePrimary && (
            <p className="text-xs text-[var(--color-text-muted)] truncate">
              #{shadePrimary}
              {shadeSecondary && ` / ${shadeSecondary}`}
            </p>
          )}
          <div className="flex flex-wrap gap-1 mt-1.5">
            <ExpiryBadge level={expiryLevel} />
            <PriceBadge priceType={item.price_type} currency={item.currency} />
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
