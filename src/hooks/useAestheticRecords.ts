import { useState, useEffect, useCallback } from 'react'
import {
  getAestheticRecords,
  getAestheticRecordById,
  createAestheticRecord,
  updateAestheticRecord,
  deleteAestheticRecord,
  addSessionLog,
  deleteSessionLog,
} from '@/lib/supabase/aestheticRecords'
import { useRefreshKey } from '@/contexts/RefreshContext'
import type { AestheticRecord, AestheticSessionLog } from '@/types/database'

export type AestheticRecordWithSessions = AestheticRecord & {
  aesthetic_session_logs: AestheticSessionLog[]
}

export function useAestheticRecords() {
  const refreshKey = useRefreshKey()
  const [records, setRecords] = useState<AestheticRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await getAestheticRecords()
    setRecords((data as AestheticRecord[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch, refreshKey])

  return { records, loading, refetch: fetch }
}

export function useAestheticRecordDetail(id: number) {
  const refreshKey = useRefreshKey()
  const [record, setRecord] = useState<AestheticRecordWithSessions | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await getAestheticRecordById(id)
    setRecord(data as AestheticRecordWithSessions ?? null)
    setLoading(false)
  }, [id])

  useEffect(() => { fetch() }, [fetch, refreshKey])

  async function addSession(sessionDate: string, note: string) {
    await addSessionLog({ aesthetic_record_id: id, session_date: sessionDate, note: note || null })
    await fetch()
  }

  async function removeSession(sessionId: number) {
    await deleteSessionLog(sessionId)
    await fetch()
  }

  return { record, loading, addSession, removeSession, refetch: fetch }
}

export { createAestheticRecord, updateAestheticRecord, deleteAestheticRecord }
