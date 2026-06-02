import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExternalLink, Pencil } from 'lucide-react'
import { getWishlistItem } from '@/lib/supabase/wishlist'
import { Skeleton } from '@/components/ui/Skeleton'
import type { WishlistItem } from '@/types/database'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-3 border-b border-[var(--color-border)] last:border-0">
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      <span className="text-sm text-[var(--color-text)] font-medium text-right max-w-[60%]">{value || '—'}</span>
    </div>
  )
}

function priceTypeLabel(type: WishlistItem['price_type']) {
  if (type === 'gift') return '贈品'
  if (type === 'split') return '組合價'
  return '一般'
}

function itemTypeLabel(type: WishlistItem['item_type']) {
  return type === 'skincare' ? '保養品' : '化妝品'
}

export default function WishlistDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState<WishlistItem | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getWishlistItem(Number(id)).then(({ data }) => {
      setItem(data)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="w-full h-52 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    )
  }

  if (!item) {
    return <p className="text-center text-[var(--color-text-muted)] py-16">找不到此採購品項</p>
  }

  const itemName = [item.name_zh, item.name_en].filter(Boolean).join(' / ') || '（未命名）'
  const price = item.price_type === 'gift'
    ? '贈品'
    : item.price != null && item.price > 0
      ? `NT$ ${item.price.toLocaleString()}`
      : null

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate('/my/wishlist')} className="text-[var(--color-text-muted)] min-h-0 min-w-0 p-1 text-lg">‹</button>
        <Link
          to="/my/wishlist"
          className="px-4 py-2 rounded-xl border border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-medium inline-flex items-center gap-1.5 min-h-0"
        >
          <Pencil size={14} strokeWidth={1.5} />
          回清單編輯
        </Link>
      </div>

      {item.image_url && (
        <div className="mb-5 rounded-2xl overflow-hidden bg-[var(--color-bg-muted)] flex justify-center">
          <img
            src={item.image_url}
            alt={itemName}
            className="max-h-80 w-auto object-contain"
          />
        </div>
      )}

      <div className="mb-5">
        {item.brand && <p className="text-sm text-[var(--color-text-muted)] mb-1">{item.brand}</p>}
        <h2 className="text-xl font-semibold text-[var(--color-text)]">{itemName}</h2>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]">
            {itemTypeLabel(item.item_type)}
          </span>
          {item.is_purchased && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]">
              已購
            </span>
          )}
          {item.price_type === 'split' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)]">
              組合價
            </span>
          )}
          {item.price_type === 'gift' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              贈品
            </span>
          )}
        </div>
      </div>

      <div className="bg-[var(--color-bg-muted)] rounded-2xl px-4 mb-4">
        <Row label="品牌" value={item.brand} />
        <Row label="中文品名" value={item.name_zh} />
        <Row label="原文品名" value={item.name_en} />
        <Row label="色號" value={item.shade ? `#${item.shade}` : null} />
        <Row label="品項類型" value={itemTypeLabel(item.item_type)} />
        <Row label="價格類型" value={priceTypeLabel(item.price_type)} />
        <Row label="預算" value={price} />
        <Row
          label="參考網站"
          value={item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-end gap-1 text-[var(--color-primary)] hover:underline"
            >
              開啟連結
              <ExternalLink size={12} strokeWidth={1.5} />
            </a>
          ) : null}
        />
      </div>

      {item.note && (
        <div className="bg-[var(--color-bg-muted)] rounded-2xl px-4 py-4 mb-4">
          <p className="text-xs text-[var(--color-text-muted)] mb-2">備註</p>
          <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap leading-relaxed">{item.note}</p>
        </div>
      )}

      <div className="h-8" />
    </div>
  )
}
