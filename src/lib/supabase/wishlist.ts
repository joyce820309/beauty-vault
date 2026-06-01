import { supabase } from './client'
import type { WishlistItem } from '@/types/database'

export async function getWishlist() {
  return supabase
    .from('wishlist')
    .select('*')
    .order('created_at', { ascending: false })
}

export async function createWishlistItem(data: Omit<WishlistItem, 'id' | 'created_at'>) {
  return supabase.from('wishlist').insert(data).select().single()
}

export async function updateWishlistItem(id: number, data: Partial<WishlistItem>) {
  return supabase.from('wishlist').update(data).eq('id', id).select().single()
}

export async function deleteWishlistItem(id: number) {
  return supabase.from('wishlist').delete().eq('id', id)
}
