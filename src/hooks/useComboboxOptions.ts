import { useState, useEffect } from 'react'
import { getDistinctBrands, getDistinctNames, getDistinctBrandZh, getDistinctNameZh, getDistinctShadeEn } from '@/lib/supabase/items'
import { getCustomOptions } from '@/lib/customOptions'

function merge(...arrays: string[][]): string[] {
  return Array.from(new Set(arrays.flat().filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  )
}

export function useComboboxOptions() {
  const [brands, setBrands] = useState<string[]>([])
  const [names, setNames] = useState<string[]>([])
  const [brandZhOptions, setBrandZhOptions] = useState<string[]>([])
  const [nameZhOptions, setNameZhOptions] = useState<string[]>([])
  const [shadeEnOptions, setShadeEnOptions] = useState<string[]>([])

  useEffect(() => {
    // 品牌（原文）：DB + localStorage
    getDistinctBrands().then(({ data }) => {
      const fromDb = data
        ? Array.from(new Set(data.flatMap((r) => [r.brand_en, r.brand_zh].filter(Boolean) as string[])))
        : []
      setBrands(merge(fromDb, getCustomOptions('brand_en'), getCustomOptions('brand_zh')))
    })

    // 品名（原文）：DB + localStorage，修正 "null — name" 問題
    getDistinctNames().then(({ data }) => {
      const fromDb = data
        ? Array.from(new Set(
            data
              .filter(r => r.name_en)
              .map(r => r.brand_en ? `${r.brand_en} — ${r.name_en}` : r.name_en!)
          ))
        : []
      setNames(merge(fromDb, getCustomOptions('name_en_full')))
    })

    // 品牌（中文）
    getDistinctBrandZh().then(({ data }) => {
      const fromDb = data ? (data.map(r => r.brand_zh).filter(Boolean) as string[]) : []
      setBrandZhOptions(merge(fromDb, getCustomOptions('brand_zh')))
    })

    // 品名（中文）
    getDistinctNameZh().then(({ data }) => {
      const fromDb = data ? (data.map(r => r.name_zh).filter(Boolean) as string[]) : []
      setNameZhOptions(merge(fromDb, getCustomOptions('name_zh')))
    })

    // 色號（原文）
    getDistinctShadeEn().then(({ data }) => {
      const fromDb = data ? (data.map(r => r.shade_en).filter(Boolean) as string[]) : []
      setShadeEnOptions(merge(fromDb, getCustomOptions('shade_en')))
    })
  }, [])

  return { brands, names, brandZhOptions, nameZhOptions, shadeEnOptions }
}
