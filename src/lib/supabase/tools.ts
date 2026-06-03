import { supabase } from './client'
import type { Tool } from '@/types/database'

export async function getTools() {
  return supabase.from('tools').select('*').order('created_at', { ascending: false })
}

export async function getToolById(id: number) {
  return supabase.from('tools').select('*').eq('id', id).single()
}

export async function createTool(data: Omit<Tool, 'id' | 'created_at' | 'updated_at'>) {
  return supabase.from('tools').insert(data).select().single()
}

export async function updateTool(id: number, data: Partial<Omit<Tool, 'id' | 'created_at' | 'updated_at'>>) {
  return supabase.from('tools').update(data).eq('id', id).select().single()
}

export async function deleteTool(id: number) {
  return supabase.from('tools').delete().eq('id', id)
}

export async function updateToolStatus(id: number, status: Tool['status']) {
  return supabase.from('tools').update({ status }).eq('id', id).select().single()
}

export async function markCleaned(id: number) {
  const today = new Date().toISOString().slice(0, 10)
  return supabase.from('tools').update({ last_cleaned_at: today }).eq('id', id).select().single()
}
