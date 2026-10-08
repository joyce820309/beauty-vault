import { supabase } from './client'
import type { MakeupThemeSlot } from '@/types/database'

export async function getMakeupThemes() {
  return supabase
    .from('makeup_themes')
    .select('*, makeup_theme_slots(*)')
    .order('created_at', { ascending: false })
}

export async function getMakeupThemeById(id: number) {
  return supabase
    .from('makeup_themes')
    .select('*, makeup_theme_slots(*)')
    .eq('id', id)
    .single()
}

interface MakeupThemeTips {
  eye_tip: string | null
  cheek_tip: string | null
  lip_tip: string | null
}

export async function createMakeupTheme(name: string, note: string | null, tips: MakeupThemeTips) {
  return supabase
    .from('makeup_themes')
    .insert({ name, note, ...tips })
    .select()
    .single()
}

export async function updateMakeupTheme(id: number, name: string, note: string | null, tips: MakeupThemeTips) {
  return supabase
    .from('makeup_themes')
    .update({ name, note, ...tips, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
}

export async function deleteMakeupTheme(id: number) {
  return supabase.from('makeup_themes').delete().eq('id', id)
}

export async function updateMakeupThemeImages(id: number, imageUrls: string[]) {
  return supabase
    .from('makeup_themes')
    .update({ image_urls: imageUrls, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
}

export async function uploadMakeupThemeImage(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `looks/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
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
      const maxSize = 1000
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85)
    }
    img.src = URL.createObjectURL(file)
  })
}

export async function upsertThemeSlots(
  themeId: number,
  slots: Omit<MakeupThemeSlot, 'id' | 'created_at'>[]
) {
  // 先刪除舊的，再批次插入
  await supabase.from('makeup_theme_slots').delete().eq('theme_id', themeId)
  if (slots.length === 0) return { error: null }
  return supabase.from('makeup_theme_slots').insert(slots)
}
