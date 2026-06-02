import { supabase } from './client'
import type { MedicationRecord, MedicationItem } from '@/types/database'

export async function getMedicationRecords() {
  return supabase
    .from('medication_records')
    .select('*, medication_items(*)')
    .order('pickup_date', { ascending: false })
}

export async function getMedicationRecordById(id: number) {
  return supabase
    .from('medication_records')
    .select('*, medication_items(*)')
    .eq('id', id)
    .single()
}

export async function createMedicationRecord(
  data: Omit<MedicationRecord, 'id' | 'created_at' | 'updated_at'>
) {
  return supabase.from('medication_records').insert(data).select().single()
}

export async function updateMedicationRecord(
  id: number,
  data: Partial<MedicationRecord>
) {
  return supabase.from('medication_records').update(data).eq('id', id).select().single()
}

export async function deleteMedicationRecord(id: number) {
  return supabase.from('medication_records').delete().eq('id', id)
}

export async function createMedicationItem(
  data: Omit<MedicationItem, 'id' | 'created_at'>
) {
  return supabase.from('medication_items').insert(data).select().single()
}

export async function updateMedicationItem(
  id: number,
  data: Partial<MedicationItem>
) {
  return supabase.from('medication_items').update(data).eq('id', id).select().single()
}

export async function deleteMedicationItem(id: number) {
  return supabase.from('medication_items').delete().eq('id', id)
}

export async function uploadMedicationImage(file: File, slot: 'front' | 'back'): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `medications/${Date.now()}_${slot}.${ext}`

  // 壓縮
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
