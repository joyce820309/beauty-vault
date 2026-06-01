import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getItemById, deleteItem } from '@/lib/supabase/items'
import { ExpiryBadge, SensitiveBadge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { getExpiryLevel } from '@/utils/expiry'
import { MAKEUP_CATEGORIES, SKINCARE_CATEGORIES } from '@/utils/categories'
import { format, parseISO } from 'date-fns'
import { Sparkle, Droplets } from 'lucide-react'
import type { Item } from '@/types/database'

const allCategories = [...MAKEUP_CATEGORIES, ...SKINCARE_CATEGORIES]
function getCategoryLabel(v: string | null) {
  return allCategories.find((c) => c.value === v)?.label ?? v ?? '—'
}
function fmt(d: string | null) {
  if (!d) return '—'
  return format(parseISO(d), 'yyyy-MM-dd')
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-3 border-b border-[var(--color-border)] last:border-0">
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      <span className="text-sm text-[var(--color-text)] font-medium text-right max-w-[60%]">{value || '—'}</span>
    </div>
  )
}

export default function ItemDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getItemById(Number(id)).then(({ data }) => {
      setItem(data)
      setLoading(false)
    })
  }, [id])

  async function handleDelete() {
    if (!confirm('確定要刪除這筆品項？')) return
    setDeleting(true)
    await deleteItem(Number(id))
    navigate('/items', { replace: true })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="w-full h-48 rounded-xl" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (!item) {
    return <p className="text-center text-[var(--color-text-muted)] py-16">找不到此品項</p>
  }

  const expiryLevel = getExpiryLevel(item.exp_date)
  const brandName = [item.brand_en, item.brand_zh].filter(Boolean).join(' / ')
  const itemName = [item.name_en, item.name_zh].filter(Boolean).join(' / ')

  return (
    <div>
      {/* 頂部操作列 */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate(-1)} className="text-[var(--color-text-muted)] min-h-0 min-w-0 p-1 text-lg">‹</button>
        <div className="flex gap-2">
          <Link
            to={`/items/${id}/edit`}
            className="px-4 py-2 rounded-xl border border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-medium flex items-center justify-center min-h-0"
          >
            編輯
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 rounded-xl border border-red-300 text-red-500 text-sm font-medium min-h-0 disabled:opacity-50"
          >
            {deleting ? '刪除中…' : '刪除'}
          </button>
        </div>
      </div>

      {/* 圖片 */}
      {item.image_url && (
        <div className="w-full h-56 rounded-2xl overflow-hidden mb-5 bg-[var(--color-bg-muted)]">
          <img src={item.image_url} alt={itemName} className="w-full h-full object-cover" />
        </div>
      )}

      {/* 品名與標籤 */}
      <div className="mb-5">
        <p className="text-xs text-[var(--color-text-muted)] mb-1 flex items-center gap-1">
          {item.item_type === 'makeup'
            ? <Sparkle size={12} strokeWidth={1.5} />
            : <Droplets size={12} strokeWidth={1.5} />
          }
          {item.item_type === 'makeup' ? '化妝品' : '保養品'} · {getCategoryLabel(item.category)}
        </p>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">{itemName || '（未命名）'}</h2>
        {brandName && <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{brandName}</p>}
        <div className="flex flex-wrap gap-2 mt-2">
          <ExpiryBadge level={expiryLevel} />
          {item.item_type === 'skincare' && item.sensitive_skin_ok && (
            <SensitiveBadge status={item.sensitive_skin_ok} />
          )}
          {item.rating && (
            <span className="text-xs text-yellow-500">
              {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
            </span>
          )}
        </div>
      </div>

      {/* 基本資訊 */}
      <div className="bg-[var(--color-bg-muted)] rounded-2xl px-4 mb-4">
        {[item.shade_en, item.shade_zh].filter(Boolean).length > 0 && (
          <Row label="色號" value={[item.shade_en, item.shade_zh].filter(Boolean).join(' / ')} />
        )}
        <Row label="製造日期" value={fmt(item.mfg_date)} />
        <Row label="有效期限" value={fmt(item.exp_date)} />
        <Row label="購入日期" value={fmt(item.purchase_date)} />
        <Row label="購入金額" value={item.price != null ? `NT$ ${item.price.toLocaleString()}` : null} />
      </div>

      {/* 保養品心得 */}
      {item.item_type === 'skincare' && item.review && (
        <div className="bg-[var(--color-bg-muted)] rounded-2xl px-4 py-4 mb-4">
          <p className="text-xs text-[var(--color-text-muted)] mb-2">試用心得</p>
          <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap leading-relaxed">{item.review}</p>
        </div>
      )}

      {/* 備註 */}
      {item.note && (
        <div className="bg-[var(--color-bg-muted)] rounded-2xl px-4 py-4 mb-4">
          <p className="text-xs text-[var(--color-text-muted)] mb-2">備註</p>
          <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">{item.note}</p>
        </div>
      )}

      <div className="h-8" />
    </div>
  )
}
