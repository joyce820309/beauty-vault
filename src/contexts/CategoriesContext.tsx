import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getCategories } from '@/lib/supabase/categories'
import { MAKEUP_CATEGORIES, SKINCARE_CATEGORIES } from '@/utils/categories'

export interface Category {
  id: number
  item_type: 'makeup' | 'skincare'
  value: string
  label: string
  sort_order: number
}

interface CategoriesContextValue {
  makeupCategories: Category[]
  skincareCategories: Category[]
  getCategoryLabel: (value: string | null) => string
  reload: () => void
}

// 以 hardcoded 資料作為初始值，避免 DB 載入前閃爍
const INITIAL: Category[] = [
  ...MAKEUP_CATEGORIES.map((c, i) => ({ id: 0, item_type: 'makeup' as const, value: c.value, label: c.label, sort_order: i })),
  ...SKINCARE_CATEGORIES.map((c, i) => ({ id: 0, item_type: 'skincare' as const, value: c.value, label: c.label, sort_order: i })),
]

const CategoriesContext = createContext<CategoriesContextValue>({
  makeupCategories: INITIAL.filter(c => c.item_type === 'makeup'),
  skincareCategories: INITIAL.filter(c => c.item_type === 'skincare'),
  getCategoryLabel: (v) => v ?? '—',
  reload: () => {},
})

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(INITIAL)

  const load = useCallback(async () => {
    const { data } = await getCategories()
    if (data && data.length > 0) setCategories(data as Category[])
  }, [])

  useEffect(() => { load() }, [load])

  const makeupCategories = categories.filter(c => c.item_type === 'makeup')
  const skincareCategories = categories.filter(c => c.item_type === 'skincare')

  function getCategoryLabel(value: string | null) {
    if (!value) return '—'
    return categories.find(c => c.value === value)?.label ?? value
  }

  return (
    <CategoriesContext.Provider value={{ makeupCategories, skincareCategories, getCategoryLabel, reload: load }}>
      {children}
    </CategoriesContext.Provider>
  )
}

export function useCategories() {
  return useContext(CategoriesContext)
}
