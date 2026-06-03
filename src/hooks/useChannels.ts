import { useState, useEffect, useCallback } from 'react'
import { getChannels, type Channel } from '@/lib/supabase/channels'

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const { data } = await getChannels()
    setChannels((data as Channel[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  return { channels, loading, reload }
}
