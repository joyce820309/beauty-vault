import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Search, X } from 'lucide-react'
import { getItems } from '@/lib/supabase/items'
import { createMakeupTheme, updateMakeupTheme, getMakeupThemeById, upsertThemeSlots } from '@/lib/supabase/makeupThemes'
import type { Item, LookSlot, MakeupThemeSlot } from '@/types/database'

// ─── 槽位定義 ─────────────────────────────────────────────────────────────────
const SLOT_GROUPS = [
  {
    label: '眼妝',
    slots: [
      { key: 'eye_upper' as LookSlot, label: '上眼影', categories: ['eyeshadow'] },
      { key: 'eye_lower' as LookSlot, label: '下眼影', categories: ['eyeshadow', 'eyeliner'] },
    ],
  },
  {
    label: '頰妝',
    slots: [
      { key: 'cheek_expand'  as LookSlot, label: '膨脹色', categories: ['blush', 'highlighter'] },
      { key: 'cheek_vibe'    as LookSlot, label: '氛圍色', categories: ['blush'] },
      { key: 'cheek_contour' as LookSlot, label: '收縮色', categories: ['blush', 'highlighter'] },
    ],
  },
  {
    label: '唇妝',
    slots: [
      { key: 'lip_base'   as LookSlot, label: '打底',   categories: [], isBoolean: true },
      { key: 'lip_liner'  as LookSlot, label: '唇線筆', categories: ['lip'] },
      { key: 'lip_color'  as LookSlot, label: '唇彩',   categories: ['lip'] },
    ],
  },
] as const

// ─── 品項顯示名稱 ─────────────────────────────────────────────────────────────
function itemLabel(item: Item): string {
  const brand = item.brand_zh || item.brand_en || ''
  const name = item.name_zh || item.name_en || ''
  const shade = item.shade_zh || item.shade_en || ''
  return [brand, name, shade ? `＃${shade}` : ''].filter(Boolean).join(' ')
}

function itemShade(item: Item): string {
  return item.shade_zh || item.shade_en || ''
}

// ─── 槽位狀態型別 ─────────────────────────────────────────────────────────────
interface SlotState {
  item: Item | null
  customText: string
  shadeOverride: string
  lipBaseBool: boolean
}

function emptySlot(): SlotState {
  return { item: null, customText: '', shadeOverride: '', lipBaseBool: false }
}

// ─── 品項搜尋下拉 ─────────────────────────────────────────────────────────────
interface ItemPickerProps {
  items: Item[]
  categories: readonly string[]
  value: SlotState
  onChange: (v: SlotState) => void
  placeholder?: string
}

function ItemPicker({ items, categories, value, onChange, placeholder }: ItemPickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const filtered = items
    .filter(i => categories.length === 0 || categories.includes(i.category ?? ''))
    .filter(i => {
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return (
        (i.brand_zh ?? '').toLowerCase().includes(q) ||
        (i.brand_en ?? '').toLowerCase().includes(q) ||
        (i.name_zh ?? '').toLowerCase().includes(q) ||
        (i.name_en ?? '').toLowerCase().includes(q) ||
        (i.shade_zh ?? '').toLowerCase().includes(q) ||
        (i.shade_en ?? '').toLowerCase().includes(q)
      )
    })
    .slice(0, 30)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function selectItem(item: Item) {
    onChange({ ...value, item, customText: itemLabel(item), shadeOverride: itemShade(item) })
    setQuery('')
    setOpen(false)
  }

  function clearItem() {
    onChange({ ...value, item: null, customText: '', shadeOverride: '' })
    setQuery('')
  }

  return (
    <div ref={wrapRef} className="space-y-1.5">
      {/* 品項輸入 */}
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
        <input
          type="text"
          value={value.item ? itemLabel(value.item) : query}
          onChange={e => {
            if (value.item) clearItem()
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? '搜尋品項…'}
          className="w-full pl-7 pr-7 py-2 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none focus:border-[var(--color-primary)]"
        />
        {(value.item || query) && (
          <button
            type="button"
            onClick={clearItem}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] min-h-0 p-0"
          >
            <X size={13} />
          </button>
        )}
        {/* 下拉清單 */}
        {open && !value.item && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg">
            {filtered.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-[var(--color-text-muted)]">無符合品項</p>
            ) : (
              filtered.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={() => selectItem(item)}
                  className="w-full text-left px-3 py-2 text-xs text-[var(--color-text)] hover:bg-[var(--color-primary-light)] transition-colors min-h-0"
                >
                  {itemLabel(item)}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {/* 色號覆蓋欄位 */}
      {!value.item && (
        <input
          type="text"
          value={value.customText}
          onChange={e => onChange({ ...value, customText: e.target.value })}
          placeholder="或直接輸入品項名稱"
          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none focus:border-[var(--color-primary)]"
        />
      )}
      <input
        type="text"
        value={value.shadeOverride}
        onChange={e => onChange({ ...value, shadeOverride: e.target.value })}
        placeholder="色號（可修改）"
        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none focus:border-[var(--color-primary)]"
      />
    </div>
  )
}

// ─── 主頁面 ───────────────────────────────────────────────────────────────────
export default function LookFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const [allItems, setAllItems] = useState<Item[]>([])
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [slots, setSlots] = useState<Record<LookSlot, SlotState>>({
    eye_upper:      emptySlot(),
    eye_lower:      emptySlot(),
    cheek_expand:   emptySlot(),
    cheek_vibe:     emptySlot(),
    cheek_contour:  emptySlot(),
    lip_base:       emptySlot(),
    lip_liner:      emptySlot(),
    lip_color:      emptySlot(),
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  // 載入所有品項
  useEffect(() => {
    getItems().then(({ data }) => {
      setAllItems((data ?? []).filter(i => i.disposal_status !== 'disposed'))
    })
  }, [])

  // 編輯時載入現有資料
  useEffect(() => {
    if (!isEdit) return
    getMakeupThemeById(Number(id)).then(({ data }) => {
      if (!data) return
      setName(data.name)
      setNote(data.note ?? '')
      const next = { ...slots }
      for (const s of (data as any).makeup_theme_slots as MakeupThemeSlot[]) {
        next[s.slot] = {
          item: null,
          customText: s.custom_text ?? '',
          shadeOverride: s.shade_override ?? '',
          lipBaseBool: s.lip_base_bool ?? false,
        }
      }
      setSlots(next)
      setLoading(false)
    })
  }, [id, isEdit])

  function setSlot(key: LookSlot, val: SlotState) {
    setSlots(prev => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)

    let themeId: number
    if (isEdit) {
      const { data } = await updateMakeupTheme(Number(id), name.trim(), note.trim() || null)
      themeId = data!.id
    } else {
      const { data } = await createMakeupTheme(name.trim(), note.trim() || null)
      themeId = data!.id
    }

    // 組裝 slots（只包含有填內容的）
    const slotRows: Omit<MakeupThemeSlot, 'id' | 'created_at'>[] = []
    for (const [key, val] of Object.entries(slots) as [LookSlot, SlotState][]) {
      if (key === 'lip_base') {
        slotRows.push({
          theme_id: themeId,
          slot: key,
          item_id: null,
          custom_text: null,
          shade_override: null,
          lip_base_bool: val.lipBaseBool,
        })
        continue
      }
      if (!val.item && !val.customText.trim()) continue
      slotRows.push({
        theme_id: themeId,
        slot: key,
        item_id: val.item?.id ?? null,
        custom_text: val.item ? itemLabel(val.item) : val.customText.trim(),
        shade_override: val.shadeOverride.trim() || null,
        lip_base_bool: null,
      })
    }

    await upsertThemeSlots(themeId, slotRows)
    setSaving(false)
    navigate('/my/looks')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[var(--color-text-muted)] text-sm">
        載入中…
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate(-1)} className="min-h-0 min-w-0 p-1 text-[var(--color-text-muted)]">
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">
          {isEdit ? '編輯主題' : '新增妝容主題'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 主題名稱 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">主題名稱</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="例：日常玫瑰棕、節慶亮顏…"
            required
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        {/* 各分區 */}
        {SLOT_GROUPS.map(group => (
          <div key={group.label}>
            <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
              {group.label}
            </h3>
            <div className="space-y-4">
              {group.slots.map(slotDef => (
                <div key={slotDef.key}>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                    {slotDef.label}
                  </label>
                  {'isBoolean' in slotDef && slotDef.isBoolean ? (
                    /* 打底 toggle */
                    <button
                      type="button"
                      onClick={() => setSlot(slotDef.key, { ...slots[slotDef.key], lipBaseBool: !slots[slotDef.key].lipBaseBool })}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-colors min-h-0 ${
                        slots[slotDef.key].lipBaseBool
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                          : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border-[var(--color-border)]'
                      }`}
                    >
                      {slots[slotDef.key].lipBaseBool ? '有打底' : '不打底'}
                    </button>
                  ) : (
                    <ItemPicker
                      items={allItems}
                      categories={slotDef.categories as unknown as string[]}
                      value={slots[slotDef.key]}
                      onChange={val => setSlot(slotDef.key, val)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* 備註 */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">備註</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="適合場合、使用順序備忘…"
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium text-sm disabled:opacity-50"
        >
          {saving ? '儲存中…' : '儲存'}
        </button>
      </form>
      <div className="h-8" />
    </div>
  )
}
