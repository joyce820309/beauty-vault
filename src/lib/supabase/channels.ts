import { supabase } from './client'

export interface Channel {
  id: number
  label: string
  sort_order: number
}

export async function getChannels() {
  return supabase.from('channels').select('*').order('sort_order')
}

export async function createChannel(label: string, sortOrder: number) {
  return supabase.from('channels').insert({ label, sort_order: sortOrder }).select().single()
}

export async function updateChannel(id: number, newLabel: string, oldLabel: string) {
  const { error } = await supabase.from('channels').update({ label: newLabel }).eq('id', id)
  if (error) return { error }
  // 同步更新已標記此通路的品項
  await supabase.from('items').update({ channel: newLabel }).eq('channel', oldLabel)
  return { error: null }
}

export async function deleteChannel(id: number) {
  return supabase.from('channels').delete().eq('id', id)
}

export async function getItemsByChannel(label: string) {
  return supabase
    .from('items')
    .select('id, brand_en, brand_zh, name_en, name_zh')
    .eq('channel', label)
    .limit(20)
}
