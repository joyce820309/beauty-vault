import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Read .env file manually (no dotenv dependency needed)
const envPath = join(__dirname, '..', '.env')
let envVars = {}
try {
  const envContent = readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=(.+)$/)
    if (match) envVars[match[1].trim()] = match[2].trim()
  }
} catch {
  // .env not found, fall back to process.env
}

const SUPABASE_URL = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = envVars.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── CSV Parser ────────────────────────────────────────────────────────────────
// Handles RFC-4180 quoted fields with embedded newlines / commas.
function parseCSV(content) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    const next = content[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++ }
      else if (ch === '"') { inQuotes = false }
      else { field += ch }
    } else {
      if (ch === '"') { inQuotes = true }
      else if (ch === ',') { row.push(field); field = '' }
      else if (ch === '\n') { row.push(field); field = ''; rows.push(row); row = [] }
      else if (ch !== '\r') { field += ch }
    }
  }
  if (row.length || field) { row.push(field); rows.push(row) }
  return rows
}

// ── Field helpers ─────────────────────────────────────────────────────────────
function parseDate(raw) {
  if (!raw || raw === '-' || raw === 'D') return null
  // Some cells have two dates separated by newline — take the first
  const first = raw.split('\n')[0].trim()
  const m = first.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/)
  if (!m) return null
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

function parsePrice(raw) {
  if (!raw || raw === '-') return null
  const n = parseInt(raw.replace(/[$,\s]/g, ''), 10)
  return isNaN(n) ? null : n
}

// Split a bilingual cell "中文名稱\nEnglish Name" into { zh, en }.
// A cell with only one language is assigned to the correct field by
// checking for CJK codepoints.
function splitBilingual(text) {
  if (!text || text === '-') return { zh: null, en: null }
  const lines = text.split('\n').map(s => s.trim()).filter(Boolean)
  if (lines.length === 0) return { zh: null, en: null }
  if (lines.length === 1) {
    const hasCJK = /[一-鿿㐀-䶿]/.test(lines[0])
    return hasCJK ? { zh: lines[0], en: null } : { zh: null, en: lines[0] }
  }
  // Multiple lines: separate CJK lines from Latin lines
  const zhParts = lines.filter(l => /[一-鿿㐀-䶿]/.test(l))
  const enParts = lines.filter(l => !/[一-鿿㐀-䶿]/.test(l))
  return {
    zh: zhParts.join(' ') || null,
    en: enParts.join(' ') || null,
  }
}

// Normalize brand: collapse internal newlines/spaces (e.g. "MAKE UP\n FOR EVER")
function normalizeBrand(raw) {
  if (!raw) return { zh: null, en: null }
  const cleaned = raw.replace(/\s*\n\s*/g, ' ').trim()
  const hasCJK = /[一-鿿㐀-䶿]/.test(cleaned)
  return hasCJK ? { zh: cleaned, en: null } : { zh: null, en: cleaned }
}

// Detect item_type from product names (Chinese + English combined).
// Skincare-specific keywords → 'skincare'; everything else → 'makeup'.
const SKINCARE_PATTERNS = [
  /serum/i, /lotion/i, /emulsion/i, /eye\s*cream/i, /eye\s*care/i,
  /sunscreen/i, /\bspf\b/i, /\buv\b/i, /cleanser/i, /cleansing\s*(oil|gel)/i,
  /\bscrub\b/i, /exfoliant/i, /\bpeel\b/i, /retinol/i, /squalane/i,
  /peptide/i, /ampoule/i, /\btoner\b/i, /essence\s*stick/i, /spot\s*gel/i,
  /hyaluron/i, /anti-acne/i, /\bface\s*oil\b/i, /moisture\s*lotion/i,
  /moisturi[sz]ing/i, /eye\s*(essence|serum)/i,
  // Chinese
  /乳液/, /眼霜/, /防曬/, /潔顏/, /潔面/, /去角質/, /精華油/, /循環液/,
  /角鯊烷/, /抗痘/, /淡斑精華/, /a醇/i, /精華液/, /精華棒/, /保濕精華/,
  /美肌乳/, /換膚/, /舒敏/, /海洋精華/, /保濕乳/, /保湿乳液/, /復原精華/,
  /雙萃精華/, /眼部/, /乳霜/, /極致賦活眼霜/,
]

function detectItemType(nameZh, nameEn, brandZh) {
  const combined = `${nameZh ?? ''} ${nameEn ?? ''} ${brandZh ?? ''}`
  if (SKINCARE_PATTERNS.some(p => p.test(combined))) return 'skincare'
  return 'makeup'
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const csvPath = join(__dirname, '..', 'Cosmetic', '工作表 1-表格 1.csv')
  const content = readFileSync(csvPath, 'utf8')
  const rows = parseCSV(content)

  // Row 0: title ("表格 1"), Row 1: headers — skip both
  const dataRows = rows.slice(2)

  const items = []

  for (const row of dataRows) {
    const [, brandRaw, nameRaw, shadeRaw, mfgRaw, expRaw, priceRaw, purchaseRaw] = row

    const brand = normalizeBrand(brandRaw?.trim())
    const name = splitBilingual(nameRaw?.trim())
    const shadeRawClean = shadeRaw?.trim()
    const shade = shadeRawClean === '-' ? { zh: null, en: null } : splitBilingual(shadeRawClean)

    // Skip fully empty rows
    if (!brand.zh && !brand.en && !name.zh && !name.en) continue

    const itemType = detectItemType(name.zh, name.en, brand.zh)

    items.push({
      brand_zh: brand.zh,
      brand_en: brand.en,
      name_zh: name.zh,
      name_en: name.en,
      shade_zh: shade.zh,
      shade_en: shade.en,
      item_type: itemType,
      mfg_date: parseDate(mfgRaw?.trim()),
      exp_date: parseDate(expRaw?.trim()),
      price: parsePrice(priceRaw?.trim()),
      purchase_date: parseDate(purchaseRaw?.trim()),
    })
  }

  console.log(`\n📦  Parsed ${items.length} items from CSV`)
  console.log(`    makeup:   ${items.filter(i => i.item_type === 'makeup').length}`)
  console.log(`    skincare: ${items.filter(i => i.item_type === 'skincare').length}\n`)

  // Insert in batches of 50
  const BATCH = 50
  let inserted = 0
  let failed = 0

  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH)
    const { data, error } = await supabase.from('items').insert(batch).select('id')
    if (error) {
      console.error(`❌  Batch ${i + 1}–${i + batch.length} failed:`, error.message)
      failed += batch.length
    } else {
      inserted += data.length
      process.stdout.write(`✅  ${inserted} / ${items.length} inserted\r`)
    }
  }

  console.log(`\n\n🎉  Done!  Inserted: ${inserted}  Failed: ${failed}`)
}

main().catch(err => { console.error(err); process.exit(1) })
