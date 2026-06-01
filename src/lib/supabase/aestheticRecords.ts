import { supabase } from './client'
import type { AestheticRecord, AestheticSessionLog } from '@/types/database'

export async function getAestheticRecords() {
  return supabase
    .from('aesthetic_records')
    .select('*, aesthetic_session_logs(count)')
    .order('treatment_date', { ascending: false })
}

export async function getAestheticRecordById(id: number) {
  return supabase
    .from('aesthetic_records')
    .select('*, aesthetic_session_logs(*)')
    .eq('id', id)
    .single()
}

export async function createAestheticRecord(
  data: Omit<AestheticRecord, 'id' | 'used_sessions' | 'created_at'>
) {
  return supabase.from('aesthetic_records').insert(data).select().single()
}

export async function updateAestheticRecord(id: number, data: Partial<AestheticRecord>) {
  return supabase.from('aesthetic_records').update(data).eq('id', id).select().single()
}

export async function deleteAestheticRecord(id: number) {
  return supabase.from('aesthetic_records').delete().eq('id', id)
}

export async function addSessionLog(
  data: Omit<AestheticSessionLog, 'id' | 'created_at'>
) {
  return supabase.from('aesthetic_session_logs').insert(data).select().single()
}

export async function deleteSessionLog(id: number) {
  return supabase.from('aesthetic_session_logs').delete().eq('id', id)
}
