import { useState, useEffect, useCallback } from 'react'
import { getItems, searchItems } from '@/lib/supabase/items'
import { useRefreshKey } from '@/contexts/RefreshContext'
import type { Item, ItemType, SensitiveSkinStatus } from '@/types/database'

export interface ItemFilters {
  itemType: ItemType | 'all'
  category: string
  sensitiveSkin: SensitiveSkinStatus | 'all'
}

export function useItems() {
  const refreshKey = useRefreshKey()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await getItems()
    if (err) setError(err.message)
    else setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems, refreshKey])

  return { items, loading, error, refetch: fetchItems }
}

export function useItemSearch(query: string) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query.trim()) { setItems([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      const { data } = await searchItems(query)
      setItems(data ?? [])
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return { items, loading }
}
