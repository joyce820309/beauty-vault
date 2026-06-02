import { differenceInDays, parseISO } from 'date-fns'

export type ExpiryLevel = 'expired' | 'urgent' | 'warning' | 'caution' | 'notice' | 'ok'

export function getExpiryLevel(expDate: string | null): ExpiryLevel {
  if (!expDate) return 'ok'
  const days = differenceInDays(parseISO(expDate), new Date())
  if (days < 0)   return 'expired'  // 已過期
  if (days <= 7)  return 'urgent'   // 1天~1星期
  if (days <= 30) return 'warning'  // 1星期~1個月
  if (days <= 90) return 'caution'  // 1個月~3個月
  if (days <= 180) return 'notice'  // 3個月~6個月
  return 'ok'
}

export const expiryColors: Record<ExpiryLevel, string> = {
  expired: '#8A7880',  // 灰玫瑰，與專案色系一致
  urgent:  '#C53030',
  warning: '#DD6B20',
  caution: '#D69E2E',
  notice:  '#4A90A4',
  ok:      '#38A169',
}

export const expiryLabels: Record<ExpiryLevel, string> = {
  expired: '已過期',
  urgent:  '緊急',
  warning: '警告',
  caution: '注意',
  notice:  '通知',
  ok:      '正常',
}
