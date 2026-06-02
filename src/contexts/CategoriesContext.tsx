import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getCategories } from '@/lib/supabase/categories'
import { MAKEUP_CATEGORIES, SKINCARE_CATEGORIES } from '@/utils/categories'

export interface Category {
  id: number
  item_type: 'makeup' | 'skincare'
  value: string
  label: string
  sort_order: number
  parent_id?: number | null   // undefined = INITIAL fallback (treat as leaf)
                              // null     = DB parent category (大類)
                              // number   = DB child category (子類)
}

interface CategoriesContextValue {
  // 子類（葉節點）—— 用於品項表單選擇、ItemCard 標籤顯示
  makeupCategories: Category[]
  skincareCategories: Category[]
  // 大類（根節點）—— 用於分組顯示、篩選
  makeupParents: Category[]
  skincareParents: Category[]
  // 查詢函式
  getChildren: (parentId: number) => Category[]
  getCategoryLabel: (value: string | null) => string
  getParentOf: (categoryValue: string | null) => Category | null
  reload: () => void
}

// 以 hardcoded 資料作初始值，避免 DB 載入前閃爍（parent_id 為 undefined = 視為子類）
const INITIAL: Category[] = [
  ...MAKEUP_CATEGORIES.map((c, i) => ({ id: 0, item_type: 'makeup' as const, value: c.value, label: c.label, sort_order: i })),
  ...SKINCARE_CATEGORIES.map((c, i) => ({ id: 0, item_type: 'skincare' as const, value: c.value, label: c.label, sort_order: i })),
]

const CategoriesContext = createContext<CategoriesContextValue>({
  makeupCategories: INITIAL.filter(c => c.item_type === 'makeup'),
  skincareCategories: INITIAL.filter(c => c.item_type === 'skincare'),
  makeupParents: [],
  skincareParents: [],
  getChildren: () => [],
  getCategoryLabel: (v) => v ?? '—',
  getParentOf: () => null,
  reload: () => {},
})

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(INITIAL)

  const load = useCallback(async () => {
    const { data } = await getCategories()
    if (data && data.length > 0) setCategories(data as Category[])
  }, [])

  useEffect(() => { load() }, [load])

  // parent_id === null → 大類（DB 根節點）
  // parent_id === undefined → INITIAL 資料，視為子類
  // parent_id === number → DB 子類
  const makeupParents    = categories.filter(c => c.item_type === 'makeup'   && c.parent_id === null)
  const skincareParents  = categories.filter(c => c.item_type === 'skincare' && c.parent_id === null)
  const makeupCategories = categories.filter(c => c.item_type === 'makeup'   && c.parent_id !== null)
  const skincareCategories = categories.filter(c => c.item_type === 'skincare' && c.parent_id !== null)

  function getChildren(parentId: number): Category[] {
    return categories.filter(c => c.parent_id === parentId)
  }

  function getCategoryLabel(value: string | null): string {
    if (!value) return '—'
    return categories.find(c => c.value === value)?.label ?? value
  }

  function getParentOf(categoryValue: string | null): Category | null {
    if (!categoryValue) return null
    const leaf = categories.find(c => c.value === categoryValue)
    if (!leaf?.parent_id) return null
    return categories.find(c => c.id === leaf.parent_id) ?? null
  }

  return (
    <CategoriesContext.Provider value={{
      makeupCategories, skincareCategories,
      makeupParents, skincareParents,
      getChildren, getCategoryLabel, getParentOf,
      reload: load,
    }}>
      {children}
    </CategoriesContext.Provider>
  )
}

export function useCategories() {
  return useContext(CategoriesContext)
}
