import { supabase } from './client'
import type { Treatment, TreatmentPurchase, TreatmentSession } from '@/types/database'

// ── Treatments ────────────────────────────────────────────────────

export async function getTreatments() {
  return supabase
    .from('treatments')
    .select('*, treatment_purchases(*), treatment_sessions(*)')
    .order('created_at', { ascending: false })
}

export async function getTreatmentById(id: number) {
  return supabase
    .from('treatments')
    .select('*, treatment_purchases(*), treatment_sessions(*)')
    .eq('id', id)
    .single()
}

export async function getTreatmentNames() {
  return supabase
    .from('treatments')
    .select('id, name')
    .order('name')
}

export async function createTreatment(data: Pick<Treatment, 'name' | 'note'>) {
  return supabase.from('treatments').insert(data).select().single()
}

export async function updateTreatment(id: number, data: Pick<Treatment, 'name' | 'note'>) {
  return supabase.from('treatments').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single()
}

export async function deleteTreatment(id: number) {
  return supabase.from('treatments').delete().eq('id', id)
}

// ── Purchases ─────────────────────────────────────────────────────

export async function createPurchase(
  data: Omit<TreatmentPurchase, 'id' | 'created_at'>
) {
  return supabase.from('treatment_purchases').insert(data).select().single()
}

export async function updatePurchase(id: number, data: Partial<Omit<TreatmentPurchase, 'id' | 'created_at'>>) {
  return supabase.from('treatment_purchases').update(data).eq('id', id).select().single()
}

export async function deletePurchase(id: number) {
  return supabase.from('treatment_purchases').delete().eq('id', id)
}

// ── Sessions ──────────────────────────────────────────────────────

export async function createSession(
  data: Omit<TreatmentSession, 'id' | 'created_at'>
) {
  return supabase.from('treatment_sessions').insert(data).select().single()
}

export async function updateSession(id: number, data: { session_date: string; note: string | null }) {
  return supabase.from('treatment_sessions').update(data).eq('id', id).select().single()
}

export async function deleteSession(id: number) {
  return supabase.from('treatment_sessions').delete().eq('id', id)
}
