import { useState, useEffect } from 'react'
import { getDistinctBrands, getDistinctNames, getDistinctBrandZh, getDistinctNameZh, getDistinctShadeEn } from '@/lib/supabase/items'

export function useComboboxOptions() {
  const [brands, setBrands] = useState<string[]>([])
  const [names, setNames] = useState<string[]>([])
  const [brandZhOptions, setBrandZhOptions] = useState<string[]>([])
  const [nameZhOptions, setNameZhOptions] = useState<string[]>([])
  const [shadeEnOptions, setShadeEnOptions] = useState<string[]>([])

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

    getDistinctBrandZh().then(({ data }) => {
      if (!data) return
      setBrandZhOptions(Array.from(new Set(data.map((r) => r.brand_zh).filter(Boolean) as string[])))
    })

    getDistinctNameZh().then(({ data }) => {
      if (!data) return
      setNameZhOptions(Array.from(new Set(data.map((r) => r.name_zh).filter(Boolean) as string[])))
    })

    getDistinctShadeEn().then(({ data }) => {
      if (!data) return
      setShadeEnOptions(Array.from(new Set(data.map((r) => r.shade_en).filter(Boolean) as string[])))
    })
  }, [])

  return { brands, names, brandZhOptions, nameZhOptions, shadeEnOptions }
}
