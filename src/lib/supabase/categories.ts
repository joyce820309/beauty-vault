import { supabase } from './client'

export async function getCategories() {
  return supabase
    .from('categories')
    .select('*')
    .order('item_type')
    .order('sort_order')
}

export async function createCategory(data: {
  item_type: 'makeup' | 'skincare'
  value: string
  label: string
  sort_order: number
}) {
  return supabase.from('categories').insert(data).select().single()
}

export async function updateCategory(id: number, label: string) {
  return supabase.from('categories').update({ label }).eq('id', id).select().single()
}

export async function deleteCategory(id: number) {
  return supabase.from('categories').delete().eq('id', id)
}
