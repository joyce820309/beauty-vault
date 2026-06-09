import { useState, useEffect, useCallback } from 'react'
import {
  getTreatments,
  getTreatmentById,
  createTreatment,
  updateTreatment,
  deleteTreatment,
  createPurchase,
  updatePurchase,
  deletePurchase,
  createSession,
  deleteSession,
} from '@/lib/supabase/aestheticRecords'
import { useRefreshKey } from '@/contexts/RefreshContext'
import type { TreatmentWithData, TreatmentPurchase, TreatmentSession } from '@/types/database'

export type { TreatmentWithData }

/** 計算某 treatment 的堂數統計 */
export function calcTreatmentStats(t: TreatmentWithData) {
  const totalSessions = t.treatment_purchases.reduce(
    (s, p) => s + p.paid_sessions + p.bonus_sessions, 0
  )
  const usedSessions = t.treatment_sessions.length
  const remaining = totalSessions - usedSessions
  const totalSpend = t.treatment_purchases.reduce((s, p) => s + (p.total_price ?? 0), 0)
  const unitPrice = totalSessions > 0 ? Math.round(totalSpend / totalSessions) : 0
  const remainingValue = remaining * unitPrice
  const pct = totalSessions > 0 ? Math.min((usedSessions / totalSessions) * 100, 100) : 0
  return { totalSessions, usedSessions, remaining, totalSpend, unitPrice, remainingValue, pct }
}

/** 前端計算各 purchase 剩餘堂數（先進先用）*/
export function calcPurchaseRemaining(
  purchases: TreatmentPurchase[],
  sessions: TreatmentSession[]
): Map<number, number> {
  const sorted = [...purchases].sort((a, b) => a.purchase_date.localeCompare(b.purchase_date))
  let toDeduct = sessions.length
  const result = new Map<number, number>()
  for (const p of sorted) {
    const cap = p.paid_sessions + p.bonus_sessions
    const used = Math.min(toDeduct, cap)
    result.set(p.id, cap - used)
    toDeduct -= used
  }
  return result
}

export function useTreatments() {
  const refreshKey = useRefreshKey()
  const [treatments, setTreatments] = useState<TreatmentWithData[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await getTreatments()
    setTreatments((data as TreatmentWithData[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch, refreshKey])

  return { treatments, loading, refetch: fetch }
}

export function useTreatmentDetail(id: number) {
  const refreshKey = useRefreshKey()
  const [treatment, setTreatment] = useState<TreatmentWithData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await getTreatmentById(id)
    setTreatment((data as TreatmentWithData) ?? null)
    setLoading(false)
  }, [id])

  useEffect(() => { fetch() }, [fetch, refreshKey])

  return {
    treatment, loading, refetch: fetch,
    createTreatment, updateTreatment, deleteTreatment,
    createPurchase, updatePurchase, deletePurchase,
    createSession, deleteSession,
  }
}
