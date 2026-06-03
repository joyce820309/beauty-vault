import { supabase } from './client'
import type { Item } from '@/types/database'

export async function getItems() {
  return supabase
    .from('items')
    .select('*')
    .order('purchase_date', { ascending: false })
}

export async function getItemById(id: number) {
  return supabase.from('items').select('*').eq('id', id).single()
}

export async function createItem(data: Omit<Item, 'id' | 'seq_no' | 'created_at' | 'updated_at'>) {
  return supabase.from('items').insert(data).select().single()
}

export async function updateItem(id: number, data: Partial<Item>) {
  return supabase.from('items').update(data).eq('id', id).select().single()
}

export async function deleteItem(id: number) {
  return supabase.from('items').delete().eq('id', id)
}

export async function searchItems(query: string) {
  return supabase
    .from('items')
    .select('*')
    .or(
      `brand_zh.ilike.%${query}%,brand_en.ilike.%${query}%,name_zh.ilike.%${query}%,name_en.ilike.%${query}%,shade_zh.ilike.%${query}%,shade_en.ilike.%${query}%,note.ilike.%${query}%`
    )
    .order('purchase_date', { ascending: false })
}

export async function getDataHealthCounts(): Promise<{ noCategory: number; noExpiry: number; noPurchaseDate: number; noChannel: number }> {
  // 排除已丟棄 & 禮物（別人送的，通路/金額等欄位本來就不適用）
  const base = () => supabase.from('items').select('*', { count: 'exact', head: true })
    .neq('disposal_status', 'disposed')
    .or('price_type.is.null,price_type.neq.present')
  const [cat, exp, pur, chan] = await Promise.all([
    base().is('category', null),
    base().is('exp_date', null),
    base().is('purchase_date', null),
    base().is('channel', null),
  ])
  return {
    noCategory:    cat.count ?? 0,
    noExpiry:      exp.count ?? 0,
    noPurchaseDate: pur.count ?? 0,
    noChannel:     chan.count ?? 0,
  }
}

export async function getDistinctBrands() {
  return supabase
    .from('items')
    .select('brand_zh, brand_en')
    .not('brand_en', 'is', null)
}

export async function getDistinctNames() {
  return supabase
    .from('items')
    .select('brand_en, name_en')
    .not('name_en', 'is', null)
}

export async function getItemsByCategory(categoryValue: string) {
  return supabase
    .from('items')
    .select('id, brand_en, brand_zh, name_en, name_zh')
    .eq('category', categoryValue)
    .order('purchase_date', { ascending: false })
}

export async function getDistinctBrandZh() {
  return supabase.from('items').select('brand_zh').not('brand_zh', 'is', null).neq('brand_zh', '')
}

export async function getDistinctNameZh() {
  return supabase.from('items').select('name_zh').not('name_zh', 'is', null).neq('name_zh', '')
}

export async function getDistinctShadeEn() {
  return supabase.from('items').select('shade_en').not('shade_en', 'is', null).neq('shade_en', '')
}

export async function getExpiryItems() {
  return supabase
    .from('items')
    .select('*')
    .not('exp_date', 'is', null)
    .order('exp_date', { ascending: true })
}

export async function updateDisposalStatus(id: number, status: 'kept' | 'disposed' | 'watching') {
  return supabase
    .from('items')
    .update({ disposal_status: status })
    .eq('id', id)
    .select()
    .single()
}

export async function updateItemFlag(id: number, flag: 'is_favorite' | 'is_dud', value: boolean) {
  // 互斥：設 is_favorite=true 時清除 is_dud，反之亦然
  const update: Record<string, boolean> = { [flag]: value }
  if (value) {
    if (flag === 'is_favorite') update.is_dud = false
    if (flag === 'is_dud') update.is_favorite = false
  }
  return supabase.from('items').update(update).eq('id', id).select().single()
}

export async function getFavoriteItems() {
  return supabase
    .from('items')
    .select('*')
    .eq('is_favorite', true)
    .order('seq_no', { ascending: true })
}
