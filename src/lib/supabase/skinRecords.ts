import { supabase } from './client'
import type { SkinRecord } from '@/types/database'

export async function getSkinRecords() {
  return supabase
    .from('skin_records')
    .select('*')
    .order('recorded_at', { ascending: false })
}

export async function createSkinRecord(data: Omit<SkinRecord, 'id' | 'created_at'>) {
  return supabase.from('skin_records').insert(data).select().single()
}

export async function updateSkinRecord(id: number, data: Omit<SkinRecord, 'id' | 'created_at'>) {
  return supabase.from('skin_records').update(data).eq('id', id).select().single()
}

export async function deleteSkinRecord(id: number) {
  return supabase.from('skin_records').delete().eq('id', id)
}
