import { differenceInDays, parseISO } from 'date-fns'

export type ExpiryLevel = 'urgent' | 'warning' | 'caution' | 'ok'

export function getExpiryLevel(expDate: string | null): ExpiryLevel {
  if (!expDate) return 'ok'
  const days = differenceInDays(parseISO(expDate), new Date())
  if (days <= 30) return 'urgent'
  if (days <= 90) return 'warning'
  if (days <= 180) return 'caution'
  return 'ok'
}

export const expiryColors: Record<ExpiryLevel, string> = {
  urgent: '#E53E3E',
  warning: '#DD6B20',
  caution: '#D69E2E',
  ok: '#38A169',
}

export const expiryLabels: Record<ExpiryLevel, string> = {
  urgent: '緊急',
  warning: '警告',
  caution: '注意',
  ok: '正常',
}
