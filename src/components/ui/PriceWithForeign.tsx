import { formatTwdWithForeign, type ForeignPriceInfo } from '@/utils/currency'

interface Props extends ForeignPriceInfo {
  className?: string
  /** amount 為 null 時要顯示的內容，預設 '—' */
  fallback?: React.ReactNode
}

/**
 * 顯示「NT$ 1,450 (JPY 1,450 x 0.22)」格式的金額。
 * items / wishlist 的 list、detail 頁面共用，避免各自實作漂移。
 */
export function PriceWithForeign({ className, fallback = '—', amount, currency, foreignAmount, exchangeRate }: Props) {
  const label = formatTwdWithForeign({ amount, currency, foreignAmount, exchangeRate })
  return <span className={className}>{label ?? fallback}</span>
}
