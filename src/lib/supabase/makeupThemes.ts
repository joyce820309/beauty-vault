import { supabase } from './client'
import type { MakeupTheme, MakeupThemeSlot, MakeupThemeWithSlots, LookSlot } from '@/types/database'

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

export async function createMakeupTheme(name: string, note: string | null) {
  return supabase
    .from('makeup_themes')
    .insert({ name, note })
    .select()
    .single()
}

export async function updateMakeupTheme(id: number, name: string, note: string | null) {
  return supabase
    .from('makeup_themes')
    .update({ name, note, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
}

export async function deleteMakeupTheme(id: number) {
  return supabase.from('makeup_themes').delete().eq('id', id)
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
