import { useState, useEffect, useCallback } from 'react'
import { getSkinRecords, createSkinRecord, deleteSkinRecord } from '@/lib/supabase/skinRecords'
import { getProfile, upsertProfile } from '@/lib/supabase/profile'
import type { SkinRecord, Profile } from '@/types/database'

export function useSkinRecords() {
  const [records, setRecords] = useState<SkinRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await getSkinRecords()
    setRecords(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function addRecord(data: Omit<SkinRecord, 'id' | 'created_at'>) {
    await createSkinRecord(data)
    await fetch()
  }

  async function removeRecord(id: number) {
    await deleteSkinRecord(id)
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  return { records, loading, addRecord, removeRecord, refetch: fetch }
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProfile().then(({ data }) => {
      setProfile(data)
      setLoading(false)
    })
  }, [])

  async function saveProfile(data: Omit<Profile, 'id' | 'updated_at'>) {
    const { data: saved } = await upsertProfile(data)
    if (saved) setProfile(saved)
  }

  return { profile, loading, saveProfile }
}
