import { supabase } from './client'
import type { WishlistItem } from '@/types/database'

export async function uploadWishlistImage(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `wishlist/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
  const compressed = await compressImage(file)
  const { error } = await supabase.storage.from('product-images').upload(path, compressed)
  if (error) return null
  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data.publicUrl
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxSize = 1200
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85)
    }
    img.src = URL.createObjectURL(file)
  })
}

export async function getWishlist() {
  return supabase
    .from('wishlist')
    .select('*')
    .order('created_at', { ascending: false })
}

export async function getWishlistItem(id: number) {
  return supabase.from('wishlist').select('*').eq('id', id).single()
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
