import { useState, useEffect } from 'react'
import { getDistinctBrands, getDistinctNames } from '@/lib/supabase/items'

export function useComboboxOptions() {
  const [brands, setBrands] = useState<string[]>([])
  const [names, setNames] = useState<string[]>([])

  useEffect(() => {
    getDistinctBrands().then(({ data }) => {
      if (!data) return
      const list = Array.from(new Set(
        data.flatMap((r) => [r.brand_en, r.brand_zh].filter(Boolean) as string[])
      ))
      setBrands(list)
    })

    getDistinctNames().then(({ data }) => {
      if (!data) return
      const list = Array.from(new Set(
        data.map((r) => `${r.brand_en} — ${r.name_en}`).filter((s) => s !== ' — ')
      ))
      setNames(list)
    })
  }, [])

  return { brands, names }
}
