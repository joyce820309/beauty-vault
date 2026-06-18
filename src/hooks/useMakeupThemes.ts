import { useState, useEffect, useCallback } from 'react'
import { getMakeupThemes, deleteMakeupTheme } from '@/lib/supabase/makeupThemes'
import type { MakeupThemeWithSlots } from '@/types/database'

export function useMakeupThemes() {
  const [themes, setThemes] = useState<MakeupThemeWithSlots[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await getMakeupThemes()
    setThemes((data as MakeupThemeWithSlots[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function removeTheme(id: number) {
    await deleteMakeupTheme(id)
    setThemes(prev => prev.filter(t => t.id !== id))
  }

  return { themes, loading, refetch: fetch, removeTheme }
}
