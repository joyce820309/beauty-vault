import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkle, Droplets, Zap, Heart } from 'lucide-react'
import type { Item } from '@/types/database'
import { getExpiryLevel, expiryColors } from '@/utils/expiry'
import { useCategories } from '@/contexts/CategoriesContext'
import { ExpiryBadge, SensitiveBadge, PriceBadge } from './Badge'
import { updateItemFlag } from '@/lib/supabase/items'
import { QuickClassify } from './QuickClassify'
import { differenceInDays, parseISO, format } from 'date-fns'

function fmtExpiry(expDate: string | null) {
  if (!expDate) return null
  const days = differenceInDays(parseISO(expDate), new Date())
  if (days < 0) return `過期 ${Math.abs(days)} 天`
  if (days === 0) return '今日到期'
  if (days <= 30) return `剩 ${days} 天`
  return format(parseISO(expDate), 'yyyy/MM/dd')
}

export function ItemCard({ item: initialItem, onFlagChange }: { item: Item; onFlagChange?: (id: number, flag: 'is_favorite' | 'is_dud', value: boolean) => void }) {
  const { getCategoryLabel } = useCategories()
  const navigate = useNavigate()
  const [item, setItem] = useState(initialItem)
  const isDisposed = item.disposal_status === 'disposed'
  const isWatching = item.disposal_status === 'watching'
  const expiryLevel = getExpiryLevel(item.exp_date)
  const showUrgent = !isDisposed && !isWatching && (expiryLevel === 'urgent' || expiryLevel === 'warning')
  const brandName = item.brand_en || item.brand_zh || ''
  const [confirm, setConfirm] = useState<'favorite' | 'dud' | null>(null)

  const namePrimary = item.name_en || item.name_zh || '（未命名）'
  const nameSecondary = item.name_en && item.name_zh ? item.name_zh : null

  const shadePrimary = item.shade_en || item.shade_zh || null
  const shadeSecondary = item.shade_en && item.shade_zh ? item.shade_zh : null

  async function handleFlagToggle(flag: 'is_favorite' | 'is_dud', currentVal: boolean) {
    if (currentVal) {
      // 取消時需要二次確認
      setConfirm(flag === 'is_favorite' ? 'favorite' : 'dud')
      return
    }
    await updateItemFlag(item.id, flag, true)
    onFlagChange?.(item.id, flag, true)
  }

  async function confirmToggleOff() {
    const flag = confirm === 'favorite' ? 'is_favorite' : 'is_dud'
    await updateItemFlag(item.id, flag, false)
    onFlagChange?.(item.id, flag, false)
    setConfirm(null)
  }

  return (
    <div className={`relative border rounded-xl bg-[var(--color-bg-card)] transition-colors ${
      isDisposed
        ? 'border-[var(--color-border)] opacity-50'
        : isWatching
        ? 'border-[var(--color-accent)]/40'
        : expiryLevel !== 'ok'
        ? 'border-[var(--color-border)]'
        : 'border-[var(--color-border)]'
    }`}
>
      <div className="flex items-start gap-3 p-4">

      {/* 二次確認覆蓋層 */}
      {confirm && (
        <div className="absolute inset-0 z-10 bg-[var(--color-bg-card)]/95 rounded-xl flex flex-col items-center justify-center gap-3 px-6">
          <p className="text-sm font-medium text-[var(--color-text)] text-center">
            確定取消「{confirm === 'favorite' ? '最愛' : '雷品'}」標記？
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmToggleOff}
              className="px-4 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium min-h-0"
            >
              確定取消
            </button>
            <button
              onClick={() => setConfirm(null)}
              className="px-4 py-1.5 rounded-lg border border-[var(--color-border)] text-sm min-h-0"
            >
              保留
            </button>
          </div>
        </div>
      )}

      {/* 序號 */}
      {item.seq_no != null && (
        <span className="absolute bottom-2 right-2 text-[10px] text-[var(--color-text-muted)] tabular-nums leading-none">
          #{item.seq_no}
        </span>
      )}

      {/* 右上角：⚡ / ♡ 無背景純 icon */}
      {(item.is_dud || item.is_favorite) && (
        <div className="absolute top-2 right-2 flex gap-1">
          {item.is_favorite && <Heart size={15} strokeWidth={0} fill="var(--color-primary)" />}
          {item.is_dud && <Zap size={15} strokeWidth={0} fill="var(--color-accent)" />}
        </div>
      )}

        {/* 縮圖（點擊導航） */}
        <button type="button" onClick={() => navigate(`/items/${item.id}`)} className="w-14 h-14 rounded-lg bg-[var(--color-bg-muted)] flex-shrink-0 overflow-hidden min-h-0 min-w-0">
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
        </button>

        {/* 內容（點擊導航） */}
        <button type="button" onClick={() => navigate(`/items/${item.id}`)} className="flex-1 min-w-0 text-left min-h-0">

          {/* 行1：品牌·類別  [觀察中/已丟棄/效期badge] */}
          <div className="flex items-center gap-1 min-w-0 pr-5">
            <p className="text-xs text-[var(--color-text-muted)] truncate min-w-0">
              {brandName}{getCategoryLabel(item.category) ? ` · ${getCategoryLabel(item.category)}` : ''}
            </p>
            {isDisposed && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] flex-shrink-0 ml-1.5">已丟棄</span>}
            {isWatching && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ml-1.5" style={{ color: 'var(--color-accent)', backgroundColor: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }}>觀察中</span>}
            {!isDisposed && !isWatching && <span className="ml-1.5 flex-shrink-0"><ExpiryBadge level={expiryLevel} /></span>}
            <PriceBadge priceType={item.price_type} currency={item.currency} />
          </div>

          {/* 行2：品名 */}
          <p className={`font-medium truncate mt-0.5 ${isDisposed ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text)]'}`}>
            {namePrimary}
            {nameSecondary && (
              <span className="font-normal text-[var(--color-text-muted)]"> / {nameSecondary}</span>
            )}
          </p>

          {/* 行3：色號 + 日期 chip（緊靠色號右側） */}
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
            {shadePrimary && (
              <p className="text-xs text-[var(--color-text-muted)] truncate flex-shrink-0">
                #{shadePrimary}{shadeSecondary ? ` / ${shadeSecondary}` : ''}
              </p>
            )}
            {item.exp_date && (
              <span
                className="flex-shrink-0 text-[11px] font-medium px-1.5 py-0.5"
                style={{
                  color: !isDisposed && expiryLevel !== 'ok' ? expiryColors[expiryLevel] : 'var(--color-text-muted)',
                  backgroundColor: !isDisposed && expiryLevel !== 'ok'
                    ? `${expiryColors[expiryLevel]}18`
                    : 'var(--color-bg-muted)',
                  borderRadius: 6,
                }}
              >
                {fmtExpiry(item.exp_date)}
              </span>
            )}
          </div>

          {/* 敏感肌（保養品） */}
          {item.item_type === 'skincare' && item.sensitive_skin_ok && item.sensitive_skin_ok !== 'untested' && (
            <div className="mt-1">
              <SensitiveBadge status={item.sensitive_skin_ok} />
            </div>
          )}
        </button>
      </div>{/* end flex+p-4 */}

      {/* 未分類時顯示快速分類列 */}
      {(!item.item_type || !item.category) && !isDisposed && (
        <div
          className="px-3 pb-2.5 pt-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-t border-[var(--color-border)] pt-2">
            <QuickClassify
              item={item}
              onUpdated={(patch) => setItem((prev) => ({ ...prev, ...patch }))}
            />
          </div>
        </div>
      )}
    </div>
  )
}
