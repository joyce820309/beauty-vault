import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getItemById, deleteItem, updateDisposalStatus, updateItemFlag, createItem } from '@/lib/supabase/items'
import { QuickClassify } from '@/components/ui/QuickClassify'
import { ExpiryBadge, SensitiveBadge, PriceBadge, DisposalBadge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Lightbox } from '@/components/ui/Lightbox'
import { getExpiryLevel } from '@/utils/expiry'
import { useToast } from '@/components/ui/Toast'
import { format, parseISO } from 'date-fns'
import { Eye, EyeOff, Trash2, RotateCcw, Heart, Zap, Copy } from 'lucide-react'
import type { Item, DisposalStatus } from '@/types/database'
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
  const [duplicating, setDuplicating] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [flagConfirm, setFlagConfirm] = useState<'is_favorite' | 'is_dud' | null>(null)
  const { showToast } = useToast()

  async function handleFlagToggle(flag: 'is_favorite' | 'is_dud') {
    if (!item) return
    const currentVal = flag === 'is_favorite' ? !!item.is_favorite : !!item.is_dud
    if (currentVal) {
      setFlagConfirm(flag)
      return
    }
    const { error } = await updateItemFlag(item.id, flag, true)
    if (error) { showToast('更新失敗', 'error'); return }
    setItem({
      ...item,
      is_favorite: flag === 'is_favorite' ? true : false,
      is_dud: flag === 'is_dud' ? true : false,
    })
    showToast(flag === 'is_favorite' ? '已加入最愛' : '已標記為雷品')
  }

  async function confirmFlagOff() {
    if (!item || !flagConfirm) return
    const { error } = await updateItemFlag(item.id, flagConfirm, false)
    if (error) { showToast('更新失敗', 'error'); return }
    setItem({ ...item, [flagConfirm]: false })
    showToast(flagConfirm === 'is_favorite' ? '已取消最愛' : '已取消雷品')
    setFlagConfirm(null)
  }

  useEffect(() => {
    getItemById(Number(id)).then(({ data }) => {
      setItem(data)
      setLoading(false)
    })
  }, [id])

  async function handleStatusChange(next: DisposalStatus) {
    if (!item) return
    setStatusUpdating(true)
    const { error } = await updateDisposalStatus(item.id, next)
    if (error) {
      showToast('更新失敗', 'error')
    } else {
      setItem({ ...item, disposal_status: next })
      const msg = next === 'watching' ? '已標記為觀察中'
        : next === 'disposed' ? '已標記為已丟棄'
        : '已恢復為待處理'
      showToast(msg)
    }
    setStatusUpdating(false)
  }

  async function handleDelete() {
    if (!confirm('確定要刪除這筆品項？')) return
    setDeleting(true)
    await deleteItem(Number(id))
    navigate('/items', { replace: true })
  }

  async function handleDuplicate() {
    if (!item) return
    setDuplicating(true)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, seq_no: _seq, created_at: _created, updated_at: _updated, ...rest } = item
    const { data: newItem, error } = await createItem({
      ...rest,
      disposal_status: 'kept',
      is_favorite: false,
      is_dud: false,
      rating: null,
      review: null,
    })
    setDuplicating(false)
    if (error || !newItem) { showToast('複製失敗', 'error'); return }
    showToast('已複製，請修改需要調整的欄位')
    navigate(`/items/${newItem.id}/edit`)
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
        <button onClick={() => navigate('/items')} className="text-[var(--color-text-muted)] min-h-0 min-w-0 p-1 text-lg">‹</button>
        <div className="flex items-center gap-2">
          {/* 最愛 / 雷品 toggle */}
          <button
            onClick={() => handleFlagToggle('is_favorite')}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-[var(--color-border)] min-h-0 min-w-0 transition-colors hover:border-[var(--color-primary)]"
            title={item.is_favorite ? '取消最愛' : '加入最愛'}
          >
            <Heart size={16} strokeWidth={item.is_favorite ? 0 : 1.5} fill={item.is_favorite ? 'var(--color-primary)' : 'none'} className={item.is_favorite ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'} />
          </button>
          <button
            onClick={() => handleFlagToggle('is_dud')}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-[var(--color-border)] min-h-0 min-w-0 transition-colors hover:border-[var(--color-accent)]"
            title={item.is_dud ? '取消雷品' : '標記雷品'}
          >
            <Zap size={16} strokeWidth={item.is_dud ? 0 : 1.5} fill={item.is_dud ? 'var(--color-accent)' : 'none'} className={item.is_dud ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'} />
          </button>
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] min-h-0 min-w-0 hover:border-[var(--color-text-muted)] transition-colors disabled:opacity-40"
            title="複製此品項"
          >
            <Copy size={15} strokeWidth={1.5} />
          </button>
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

      {/* 二次確認 modal */}
      {flagConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="bg-[var(--color-bg-card)] rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <p className="text-sm font-medium text-[var(--color-text)] text-center mb-4">
              確定取消「{flagConfirm === 'is_favorite' ? '最愛' : '雷品'}」標記？
            </p>
            <div className="flex gap-3">
              <button onClick={() => setFlagConfirm(null)} className="flex-1 py-2 rounded-xl border border-[var(--color-border)] text-sm min-h-0">
                保留
              </button>
              <button onClick={confirmFlagOff} className="flex-1 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium min-h-0">
                確定取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 圖片縮圖（點擊放大） */}
      {item.image_url && (
        <>
          {lightboxOpen && (
            <Lightbox
              images={[item.image_url]}
              index={0}
              onClose={() => setLightboxOpen(false)}
            />
          )}
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="block mb-5 rounded-2xl overflow-hidden bg-[var(--color-bg-muted)] min-h-0 min-w-0 hover:opacity-90 transition-opacity mx-auto"
          >
            <img
              src={item.image_url}
              alt={itemName}
              className="max-h-64 w-auto object-contain rounded-2xl"
            />
          </button>
        </>
      )}

      {/* 品名與標籤 */}
      <div className="mb-5">
        <div className="mb-2">
          <QuickClassify
            item={item}
            onUpdated={(patch) => setItem((prev) => prev ? { ...prev, ...patch } : prev)}
          />
        </div>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">{itemName || '（未命名）'}</h2>
        {brandName && <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{brandName}</p>}
        <div className="flex flex-wrap gap-2 mt-2">
          {item.disposal_status !== 'disposed' && <ExpiryBadge level={expiryLevel} />}
          <DisposalBadge status={item.disposal_status} />
          <PriceBadge priceType={item.price_type} currency={item.currency} />
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
          <Row
            label="色號"
            value={[
              item.shade_en ? `#${item.shade_en}` : null,
              item.shade_zh || null,
            ].filter(Boolean).join(' / ')}
          />
        )}
        <Row label="製造日期" value={fmt(item.mfg_date)} />
        <Row label="有效期限" value={fmt(item.exp_date)} />
        <Row label="購入日期" value={fmt(item.purchase_date)} />
        <Row label="購入金額" value={item.price != null ? `NT$ ${item.price.toLocaleString()}` : null} />
        {item.item_type === 'skincare' && item.volume_ml != null && (
          <Row label="容量" value={`${item.volume_ml} ml`} />
        )}
        {item.item_type === 'skincare' && item.fragrance && (
          <Row label="香味" value={
            item.fragrance === 'strong' ? '太香'
            : item.fragrance === 'mild' ? '微香'
            : '無香'
          } />
        )}
        {item.is_sample && <Row label="小樣" value="是" />}
        {item.is_dud && <Row label="雷品" value="是" />}
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

      {/* 處置狀態操作列 */}
      <div className="flex border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-bg-card)] mb-4">
        {item.disposal_status === 'disposed' ? (
          <button
            onClick={() => handleStatusChange('kept')}
            disabled={statusUpdating}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors min-h-0 disabled:opacity-50"
          >
            <RotateCcw size={14} strokeWidth={2} />
            恢復待處理
          </button>
        ) : (
          <>
            <button
              onClick={() => handleStatusChange(item.disposal_status === 'watching' ? 'kept' : 'watching')}
              disabled={statusUpdating}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors min-h-0 disabled:opacity-50 ${
                item.disposal_status === 'watching'
                  ? 'text-[var(--color-accent)] bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/20'
                  : 'text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10'
              }`}
            >
              {item.disposal_status === 'watching'
                ? <><EyeOff size={14} strokeWidth={1.5} />取消觀察</>
                : <><Eye size={14} strokeWidth={1.5} />標記觀察中</>
              }
            </button>
            <div className="w-px bg-[var(--color-border)]" />
            <button
              onClick={() => handleStatusChange('disposed')}
              disabled={statusUpdating}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors min-h-0 disabled:opacity-50"
            >
              <Trash2 size={14} strokeWidth={1.5} />
              標記已丟棄
            </button>
          </>
        )}
      </div>

      <div className="h-8" />
    </div>
  )
}
