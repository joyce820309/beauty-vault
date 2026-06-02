import { useState, useEffect, useCallback } from 'react'
import { getSkinRecords, createSkinRecord, updateSkinRecord, deleteSkinRecord } from '@/lib/supabase/skinRecords'
import { getProfile, upsertProfile } from '@/lib/supabase/profile'
import { useRefreshKey } from '@/contexts/RefreshContext'
import type { SkinRecord, Profile } from '@/types/database'

export function useSkinRecords() {
  const refreshKey = useRefreshKey()
  const [records, setRecords] = useState<SkinRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await getSkinRecords()
    setRecords(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch, refreshKey])

  async function addRecord(data: Omit<SkinRecord, 'id' | 'created_at'>) {
    await createSkinRecord(data)
    await fetch()
  }

  async function editRecord(id: number, data: Omit<SkinRecord, 'id' | 'created_at'>) {
    const { data: updated } = await updateSkinRecord(id, data)
    if (updated) setRecords((prev) => prev.map((r) => r.id === id ? updated as SkinRecord : r))
  }

  async function removeRecord(id: number) {
    await deleteSkinRecord(id)
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  return { records, loading, addRecord, editRecord, removeRecord, refetch: fetch }
}

export function useProfile() {
  const refreshKey = useRefreshKey()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProfile().then(({ data }) => {
      setProfile(data)
      setLoading(false)
    })
  }, [refreshKey])

  async function saveProfile(data: Omit<Profile, 'id' | 'updated_at'>) {
    const { data: saved } = await upsertProfile(data)
    if (saved) setProfile(saved)
  }

  return { profile, loading, saveProfile }
}
