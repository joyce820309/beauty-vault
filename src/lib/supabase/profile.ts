import { supabase } from './client'
import type { Profile } from '@/types/database'

export async function getProfile() {
  return supabase.from('profile').select('*').single()
}

export async function upsertProfile(data: Omit<Profile, 'id' | 'updated_at'>) {
  return supabase.from('profile').upsert(data).select().single()
}
