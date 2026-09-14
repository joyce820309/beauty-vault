/** 台幣金額 + 外幣換算明細的共用格式化邏輯，避免 items / wishlist 各自維護一份而顧此失彼 */

export interface ForeignPriceInfo {
  /** 台幣金額 */
  amount: number | null | undefined
  /** 外幣幣別代碼，例如 'JPY' */
  currency?: string | null
  /** 外幣金額 */
  foreignAmount?: number | null
  /** 換算當下使用的匯率 */
  exchangeRate?: number | null
}

/**
 * 組出「NT$ 1,450 (JPY 1,450 x 0.22)」格式的字串。
 * 若外幣資訊不完整（沒有 currency / foreignAmount / exchangeRate 三者之一），
 * 只回傳台幣金額；amount 為 null 時回傳 null。
 */
export function formatTwdWithForeign({ amount, currency, foreignAmount, exchangeRate }: ForeignPriceInfo): string | null {
  if (amount == null) return null
  const twd = `NT$ ${amount.toLocaleString()}`
  if (!currency || foreignAmount == null || exchangeRate == null) return twd
  return `${twd} (${currency} ${foreignAmount.toLocaleString()} x ${exchangeRate})`
}
