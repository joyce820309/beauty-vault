// Auto-generate with: supabase gen types typescript --project-id <id> > src/types/database.ts

export type ItemType = 'makeup' | 'skincare'
export type SensitiveSkinStatus = 'all_ok' | 'avoid_postop' | 'sensitive_avoid' | 'ng' | 'untested' | 'ok'
export type SeasonalColor = 'spring' | 'summer' | 'autumn' | 'winter'
export type DisposalStatus = 'kept' | 'disposed' | 'watching'
export type DisposalReason = 'finished' | 'discarded'
export type PriceType = 'normal' | 'split' | 'gift' | 'present'
export type ToolStatus = 'active' | 'stored' | 'retired'

export interface Tool {
  id: number
  brand_en: string | null
  brand_zh: string | null
  name_en: string | null
  name_zh: string | null
  category: string | null
  purchase_date: string | null
  price: number | null
  price_type: string | null
  currency: string | null
  image_url: string | null
  status: ToolStatus
  mfg_date: string | null
  exp_date: string | null
  clean_cycle_days: number | null
  last_cleaned_at: string | null
  rating: number | null
  sensitive_skin_ok: SensitiveSkinStatus | null
  is_favorite: boolean | null
  note: string | null
  created_at: string
  updated_at: string
}

export interface Item {
  id: number
  seq_no: number
  brand_zh: string | null
  brand_en: string | null
  name_zh: string | null
  name_en: string | null
  shade_zh: string | null
  shade_en: string | null
  category: string | null
  subcategory: string | null
  item_type: ItemType
  mfg_date: string | null
  exp_date: string | null
  price: number | null
  purchase_date: string | null
  image_url: string | null
  note: string | null
  rating: number | null
  review: string | null
  sensitive_skin_ok: SensitiveSkinStatus | null
  disposal_status: DisposalStatus | null
  disposal_reason: DisposalReason | null
  price_type: PriceType | null
  original_price: number | null
  currency: string | null
  fragrance: 'strong' | 'mild' | 'none' | null
  is_dud: boolean | null
  is_sample: boolean | null
  is_favorite: boolean | null
  volume_ml: number | null
  channel: string | null
  ignore_health: boolean
  created_at: string
  updated_at: string
}

export interface SkinRecord {
  id: number
  recorded_at: string
  moisture: number | null
  sebum: number | null
  keratin: number | null
  resilience: number | null
  accumulation: number | null
  skin_engy: number | null
  note: string | null
  created_at: string
}

export interface Profile {
  id: number
  seasonal_color: SeasonalColor | null
  face_shape: string | null
  skin_type: string | null
  note: string | null
  updated_at: string
}

export interface AestheticRecord {
  id: number
  treatment_date: string
  treatment_name: string
  description: string | null
  total_price: number | null
  total_sessions: number
  used_sessions: number
  note: string | null
  created_at: string
}

export interface WishlistItem {
  id: number
  item_type: 'makeup' | 'skincare' | null
  brand: string | null
  name_zh: string | null
  name_en: string | null
  shade: string | null
  price_type: 'normal' | 'split' | 'gift' | null
  price: number | null
  url: string | null
  image_url?: string | null
  note: string | null
  is_purchased: boolean
  created_at: string
}

export interface MedicationRecord {
  id: number
  pickup_date: string
  reason: string
  note: string | null
  created_at: string
  updated_at: string
}

export interface MedicationItem {
  id: number
  medication_record_id: number
  name: string
  ingredients: string | null
  mfg_date: string | null
  exp_date: string | null
  image_front_url: string | null
  image_back_url: string | null
  image_urls: string[] | null
  note: string | null
  created_at: string
}

export type MedicationRecordWithItems = MedicationRecord & {
  medication_items: MedicationItem[]
}

export interface AestheticSessionLog {
  id: number
  aesthetic_record_id: number
  session_date: string
  note: string | null
  created_at: string
}

export type PurchaseType = 'trial' | 'single' | 'package'

export interface Treatment {
  id: number
  name: string
  note: string | null
  created_at: string
  updated_at: string
}

export interface TreatmentPurchase {
  id: number
  treatment_id: number
  purchase_type: PurchaseType
  paid_sessions: number
  bonus_sessions: number
  total_price: number | null
  purchase_date: string
  note: string | null
  created_at: string
}

export interface TreatmentSession {
  id: number
  treatment_id: number
  session_date: string
  note: string | null
  created_at: string
}

export type TreatmentWithData = Treatment & {
  treatment_purchases: TreatmentPurchase[]
  treatment_sessions: TreatmentSession[]
}

