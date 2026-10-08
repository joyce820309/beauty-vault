import { supabase } from './client'
import type { Item, ItemExchangeRate } from '@/types/database'

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

export async function uploadItemImage(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `items/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
  const compressed = await compressImage(file)
  const { error } = await supabase.storage.from('product-images').upload(path, compressed)
  if (error) return null
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data.publicUrl
}

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxSize = 800
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8)
    }
    img.src = URL.createObjectURL(file)
  })
}

export async function getItemExchangeRates(itemId: number) {
  return supabase
    .from('item_exchange_rates')
    .select('*')
    .eq('item_id', itemId)
    .order('fetched_at', { ascending: false })
}

export async function addItemExchangeRates(
  rows: Omit<ItemExchangeRate, 'id' | 'created_at'>[]
) {
  return supabase.from('item_exchange_rates').insert(rows).select()
}

export async function deleteItemExchangeRate(id: number) {
  return supabase.from('item_exchange_rates').delete().eq('id', id)
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
    .or('ignore_health.is.null,ignore_health.eq.false')
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

type SuggestionKind = 'brand' | 'name_en_full' | 'name_zh'

function splitOriginalNameSuggestion(value: string) {
  const separator = ' — '
  const separatorIndex = value.indexOf(separator)
  if (separatorIndex < 0) return { brand: null, name: value }
  return {
    brand: value.slice(0, separatorIndex),
    name: value.slice(separatorIndex + separator.length),
  }
}

export async function getSuggestionReferenceCount(kind: SuggestionKind, value: string): Promise<number> {
  if (kind === 'brand') {
    const [brandEn, brandZh] = await Promise.all([
      supabase.from('items').select('id', { count: 'exact', head: true }).eq('brand_en', value),
      supabase.from('items').select('id', { count: 'exact', head: true }).eq('brand_zh', value),
    ])
    if (brandEn.error) throw brandEn.error
    if (brandZh.error) throw brandZh.error
    return (brandEn.count ?? 0) + (brandZh.count ?? 0)
  }

  if (kind === 'name_zh') {
    const result = await supabase.from('items').select('id', { count: 'exact', head: true }).eq('name_zh', value)
    if (result.error) throw result.error
    return result.count ?? 0
  }

  const { brand, name } = splitOriginalNameSuggestion(value)
  let query = supabase.from('items').select('id', { count: 'exact', head: true }).eq('name_en', name)
  if (brand) query = query.eq('brand_en', brand)
  const result = await query
  if (result.error) throw result.error
  return result.count ?? 0
}

export async function deleteSuggestionFromItems(kind: SuggestionKind, value: string) {
  if (kind === 'brand') {
    const brandEn = await supabase.from('items').update({ brand_en: null }).eq('brand_en', value).select('id')
    if (brandEn.error) return { count: 0, error: brandEn.error }
    const brandZh = await supabase.from('items').update({ brand_zh: null }).eq('brand_zh', value).select('id')
    return { count: (brandEn.data?.length ?? 0) + (brandZh.data?.length ?? 0), error: brandZh.error }
  }

  if (kind === 'name_zh') {
    const result = await supabase.from('items').update({ name_zh: null }).eq('name_zh', value).select('id')
    return { count: result.data?.length ?? 0, error: result.error }
  }

  const { brand, name } = splitOriginalNameSuggestion(value)
  let query = supabase.from('items').update({ name_en: null }).eq('name_en', name)
  if (brand) query = query.eq('brand_en', brand)
  const result = await query.select('id')
  return { count: result.data?.length ?? 0, error: result.error }
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

export async function updateDisposalWithReason(
  id: number,
  reason: 'finished' | 'discarded'
) {
  return supabase
    .from('items')
    .update({ disposal_status: 'disposed', disposal_reason: reason })
    .eq('id', id)
    .select()
    .single()
}

export async function updateDisposalReason(
  id: number,
  reason: 'finished' | 'discarded' | null
) {
  return supabase
    .from('items')
    .update({ disposal_reason: reason })
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

export async function updateIgnoreHealth(id: number, ignore: boolean) {
  return supabase.from('items').update({ ignore_health: ignore }).eq('id', id).select().single()
}

export async function getFavoriteItems() {
  return supabase
    .from('items')
    .select('*')
    .eq('is_favorite', true)
    .order('seq_no', { ascending: true })
}
