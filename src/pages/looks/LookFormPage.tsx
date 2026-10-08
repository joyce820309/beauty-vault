import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Search, X, Plus, Sparkles, Camera, Palette } from 'lucide-react'
import { getItems, updateItem, uploadItemImage } from '@/lib/supabase/items'
import { createMakeupTheme, updateMakeupTheme, getMakeupThemeById, upsertThemeSlots } from '@/lib/supabase/makeupThemes'
import { useToast } from '@/components/ui/Toast'
import type { Item, LookSlot, MakeupThemeSlot } from '@/types/database'

// ─── 槽位定義 ─────────────────────────────────────────────────────────────────
const SLOT_GROUPS = [
  {
    label: '眼妝',
    tipKey: 'eye_tip' as const,
    tipPlaceholder: '小訣竅：例如先點塗再暈開才不會卡粉…',
    slots: [
      { key: 'eye_upper' as LookSlot, label: '上眼影', categories: ['eyeshadow'] },
      { key: 'eye_lower' as LookSlot, label: '下眼影', categories: ['eyeshadow', 'eyeliner'] },
    ],
  },
  {
    label: '頰妝',
    tipKey: 'cheek_tip' as const,
    tipPlaceholder: '小訣竅：例如用打圈方式暈染更自然…',
    slots: [
      { key: 'cheek_expand'  as LookSlot, label: '膨脹色', categories: ['blush', 'highlighter'] },
      { key: 'cheek_vibe'    as LookSlot, label: '氛圍色', categories: ['blush'] },
      { key: 'cheek_contour' as LookSlot, label: '收縮色', categories: ['blush', 'highlighter'] },
    ],
  },
  {
    label: '唇妝',
    tipKey: 'lip_tip' as const,
    tipPlaceholder: '小訣竅：例如按壓上色比直接塗抹更持久…',
    slots: [
      { key: 'lip_base'   as LookSlot, label: '打底',   categories: ['lip'] },
      { key: 'lip_liner'  as LookSlot, label: '唇線筆', categories: ['lip'] },
      { key: 'lip_color'  as LookSlot, label: '唇彩',   categories: ['lip'], repeatable: true },
    ],
  },
] as const

// ─── 品項顯示名稱 ─────────────────────────────────────────────────────────────
// itemLabel：含色號，用於下拉清單與輸入框顯示
function itemLabel(item: Item): string {
  const brand = item.brand_zh || item.brand_en || ''
  const name = item.name_zh || item.name_en || ''
  const shade = item.shade_zh || item.shade_en || ''
  return [brand, name, shade ? `＃${shade}` : ''].filter(Boolean).join(' ')
}

// itemNameOnly：不含色號，用於儲存 custom_text（色號另存於 shade_override，避免顯示時重複）
function itemNameOnly(item: Item): string {
  const brand = item.brand_zh || item.brand_en || ''
  const name = item.name_zh || item.name_en || ''
  return [brand, name].filter(Boolean).join(' ')
}

function itemShade(item: Item): string {
  return item.shade_zh || item.shade_en || ''
}

// ─── 槽位狀態型別 ─────────────────────────────────────────────────────────────
interface SlotState {
  item: Item | null
  customText: string
  shadeOverride: string
}

function emptySlot(): SlotState {
  return { item: null, customText: '', shadeOverride: '' }
}

// ─── 補上傳照片／選色票 小選單 ─────────────────────────────────────────────────
function SwatchEditPopover({
  item,
  onClose,
  onItemUpdated,
}: {
  item: Item
  onClose: () => void
  onItemUpdated: (updated: Item) => void
}) {
  const { showToast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [hexInput, setHexInput] = useState('')
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [onClose])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    const url = await uploadItemImage(file)
    setUploading(false)
    if (!url) { showToast('圖片上傳失敗', 'error'); return }
    const nextUrls = [...(item.image_urls ?? []), url]
    const { data, error } = await updateItem(item.id, { image_url: nextUrls[0], image_urls: nextUrls })
    if (error || !data) { showToast('更新品項失敗', 'error'); return }
    onItemUpdated(data)
    showToast('已新增品項照片')
    onClose()
  }

  async function saveColor(color: string) {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) { showToast('請輸入正確的 HEX 色碼', 'error'); return }
    const nextColors = [...(item.swatch_colors ?? []), color]
    const { data, error } = await updateItem(item.id, { swatch_color: nextColors[0] ?? null, swatch_colors: nextColors })
    if (error || !data) { showToast('更新色票失敗', 'error'); return }
    onItemUpdated(data)
    showToast('已新增色票')
  }

  async function submitHexInput() {
    const raw = hexInput.trim()
    if (!raw) return
    const hex = raw.startsWith('#') ? raw : `#${raw}`
    await saveColor(hex)
    setHexInput('')
  }

  async function removeColor(index: number) {
    const current = item.swatch_colors?.length ? item.swatch_colors : item.swatch_color ? [item.swatch_color] : []
    const nextColors = current.filter((_, i) => i !== index)
    const { data, error } = await updateItem(item.id, { swatch_color: nextColors[0] ?? null, swatch_colors: nextColors })
    if (error || !data) { showToast('刪除色票失敗', 'error'); return }
    onItemUpdated(data)
    showToast('已刪除色票')
  }

  const existingColors = item.swatch_colors?.length ? item.swatch_colors : item.swatch_color ? [item.swatch_color] : []

  return (
    <div
      ref={popRef}
      className="absolute z-50 top-full left-0 mt-1 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg overflow-hidden"
    >
      <label className="flex items-center gap-2 px-3 py-2.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] transition-colors cursor-pointer border-b border-[var(--color-border)]">
        <Camera size={14} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
        {uploading ? '上傳中…' : '新增照片'}
        <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleFile} />
      </label>

      <div className="px-3 py-2.5 space-y-2">
        {/* 既有色票：此品項已設定過的色票，hover 可刪除 */}
        {existingColors.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {existingColors.map((c, i) => (
              <button
                key={i}
                type="button"
                title={`${c}（點擊刪除）`}
                onClick={() => removeColor(i)}
                className="group relative w-5 h-5 rounded-full shrink-0 shadow-[0_0_0_1px_var(--color-border)] min-h-0 min-w-0"
                style={{ background: c }}
              >
                <span className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <X size={10} strokeWidth={2.5} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              </button>
            ))}
          </div>
        )}
        {/* 新增色票：HEX 文字輸入 + 明確的新增按鈕，或點色盤圖示用選色器輔助選色 */}
        <div className="flex items-center gap-1.5">
          <label className="relative shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors cursor-pointer">
            <Palette size={13} strokeWidth={1.5} />
            <input
              type="color"
              defaultValue="#C4768A"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={async (e) => {
                await saveColor(e.target.value)
              }}
            />
          </label>
          <input
            type="text"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            placeholder="新增 HEX，例如 C4768A"
            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none focus:border-[var(--color-primary)]"
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              submitHexInput()
            }}
          />
          <button
            type="button"
            onClick={submitHexInput}
            disabled={!hexInput.trim()}
            className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-[var(--color-primary)] disabled:opacity-40 min-h-0"
          >
            新增
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 品項搜尋下拉 ─────────────────────────────────────────────────────────────
interface ItemPickerProps {
  label: string
  items: Item[]
  categories: readonly string[]
  value: SlotState
  onChange: (v: SlotState) => void
  placeholder?: string
  onItemUpdated?: (updated: Item) => void
}

function ItemPicker({ label, items, categories, value, onChange, placeholder, onItemUpdated }: ItemPickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [showSwatchMenu, setShowSwatchMenu] = useState(false)
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
    onChange({ ...value, item, customText: itemNameOnly(item), shadeOverride: itemShade(item) })
    setQuery('')
    setOpen(false)
  }

  function clearItem() {
    onChange({ ...value, item: null, customText: '', shadeOverride: '' })
    setQuery('')
  }

  const thumbImage = value.item?.image_urls?.[0] || value.item?.image_url || null
  const thumbColors = value.item?.swatch_colors?.length
    ? value.item.swatch_colors
    : value.item?.swatch_color ? [value.item.swatch_color] : []

  return (
    <div ref={wrapRef}>
      {/* 槽位標題 + 色票（色票顯示在標題右側空白處，點擊可管理） */}
      <div className="relative flex items-center justify-between gap-2 mb-1.5">
        {label ? <label className="text-sm font-medium text-[var(--color-text)]">{label}</label> : <span />}
        {value.item && (
          <button
            type="button"
            onClick={() => setShowSwatchMenu(v => !v)}
            className="flex items-center min-h-0 min-w-0 ml-auto"
          >
            {thumbColors.length > 0 ? (
              <div className="flex items-center">
                {thumbColors.slice(0, 5).map((color, i) => (
                  <div
                    key={i}
                    style={{
                      background: color,
                      marginLeft: i === 0 ? 0 : -6,
                      zIndex: thumbColors.length - i,
                    }}
                    className="w-5 h-5 rounded-full shrink-0 shadow-[0_0_0_1.5px_var(--color-bg-card)]"
                  />
                ))}
              </div>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
                <Palette size={12} strokeWidth={1.5} />
                新增色票
              </span>
            )}
          </button>
        )}
        {showSwatchMenu && value.item && (
          <SwatchEditPopover
            item={value.item}
            onClose={() => setShowSwatchMenu(false)}
            onItemUpdated={(updated) => {
              onItemUpdated?.(updated)
              onChange({ ...value, item: updated })
            }}
          />
        )}
      </div>
      {/* 已選品項：商品照片縮圖（位置固定，不受色票影響） */}
      {value.item && (
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-[var(--color-bg-muted)] flex items-center justify-center shadow-[0_0_0_1px_var(--color-border)]">
            {thumbImage ? (
              <img src={thumbImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <Sparkles size={20} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
            )}
          </div>
          <p className="flex-1 min-w-0 text-xs text-[var(--color-text)] font-medium leading-snug">
            {itemLabel(value.item)}
          </p>
        </div>
      )}
      <div className="space-y-1.5">
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
  const [tips, setTips] = useState<{ eye_tip: string; cheek_tip: string; lip_tip: string }>({
    eye_tip: '', cheek_tip: '', lip_tip: '',
  })
  const [slots, setSlots] = useState<Record<Exclude<LookSlot, 'lip_color'>, SlotState>>({
    eye_upper:      emptySlot(),
    eye_lower:      emptySlot(),
    cheek_expand:   emptySlot(),
    cheek_vibe:     emptySlot(),
    cheek_contour:  emptySlot(),
    lip_base:       emptySlot(),
    lip_liner:      emptySlot(),
  })
  // 唇彩支援疊擦，可有多筆
  const [lipColors, setLipColors] = useState<SlotState[]>([emptySlot()])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  // 載入所有品項；編輯時一併載入現有主題資料，並用 item_id 還原回實際品項物件
  useEffect(() => {
    Promise.all([
      getItems(),
      isEdit ? getMakeupThemeById(Number(id)) : Promise.resolve(null),
    ]).then(([itemsRes, themeRes]) => {
      const items = (itemsRes.data ?? []).filter(i => i.disposal_status !== 'disposed')
      setAllItems(items)
      const itemsById = new Map(items.map(i => [i.id, i]))

      if (!isEdit || !themeRes) {
        setLoading(false)
        return
      }
      const data = themeRes.data
      if (!data) { setLoading(false); return }

      setName(data.name)
      setNote(data.note ?? '')
      setTips({
        eye_tip: data.eye_tip ?? '',
        cheek_tip: data.cheek_tip ?? '',
        lip_tip: data.lip_tip ?? '',
      })
      const next = { ...slots }
      const loadedLipColors: SlotState[] = []
      const allSlots = (data as any).makeup_theme_slots as MakeupThemeSlot[]
      for (const s of [...allSlots].sort((a, b) => a.sort_order - b.sort_order)) {
        const linkedItem = s.item_id ? itemsById.get(s.item_id) ?? null : null
        const val: SlotState = {
          item: linkedItem,
          customText: linkedItem ? itemNameOnly(linkedItem) : (s.custom_text ?? ''),
          shadeOverride: s.shade_override ?? '',
        }
        if (s.slot === 'lip_color') {
          loadedLipColors.push(val)
        } else {
          next[s.slot as Exclude<LookSlot, 'lip_color'>] = val
        }
      }
      setSlots(next)
      setLipColors(loadedLipColors.length ? loadedLipColors : [emptySlot()])
      setLoading(false)
    })
  }, [id, isEdit])

  function setSlot(key: Exclude<LookSlot, 'lip_color'>, val: SlotState) {
    setSlots(prev => ({ ...prev, [key]: val }))
  }

  // 品項照片／色票在此頁補上傳後，同步更新品項快取，讓其他槽位的縮圖也一起更新
  function handleItemUpdated(updated: Item) {
    setAllItems(prev => prev.map(i => i.id === updated.id ? updated : i))
  }

  function setLipColor(index: number, val: SlotState) {
    setLipColors(prev => prev.map((s, i) => (i === index ? val : s)))
  }

  function addLipColor() {
    setLipColors(prev => [...prev, emptySlot()])
  }

  function removeLipColor(index: number) {
    setLipColors(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)

    const tipsPayload = {
      eye_tip: tips.eye_tip.trim() || null,
      cheek_tip: tips.cheek_tip.trim() || null,
      lip_tip: tips.lip_tip.trim() || null,
    }

    let themeId: number
    if (isEdit) {
      const { data } = await updateMakeupTheme(Number(id), name.trim(), note.trim() || null, tipsPayload)
      themeId = data!.id
    } else {
      const { data } = await createMakeupTheme(name.trim(), note.trim() || null, tipsPayload)
      themeId = data!.id
    }

    // 組裝 slots（只包含有填內容的）
    const slotRows: Omit<MakeupThemeSlot, 'id' | 'created_at'>[] = []
    for (const [key, val] of Object.entries(slots) as [Exclude<LookSlot, 'lip_color'>, SlotState][]) {
      if (!val.item && !val.customText.trim()) continue
      slotRows.push({
        theme_id: themeId,
        slot: key,
        item_id: val.item?.id ?? null,
        custom_text: val.item ? itemNameOnly(val.item) : val.customText.trim(),
        shade_override: val.shadeOverride.trim() || null,
        lip_base_bool: null,
        sort_order: 0,
      })
    }
    lipColors.forEach((val, index) => {
      if (!val.item && !val.customText.trim()) return
      slotRows.push({
        theme_id: themeId,
        slot: 'lip_color',
        item_id: val.item?.id ?? null,
        custom_text: val.item ? itemNameOnly(val.item) : val.customText.trim(),
        shade_override: val.shadeOverride.trim() || null,
        lip_base_bool: null,
        sort_order: index,
      })
    })

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
              {group.slots.map(slotDef =>
                'repeatable' in slotDef && slotDef.repeatable ? (
                  <div key={slotDef.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-[var(--color-text)]">
                        {slotDef.label}
                      </label>
                      <button
                        type="button"
                        onClick={addLipColor}
                        className="flex items-center gap-0.5 text-xs font-medium text-[var(--color-primary)] min-h-0 p-0"
                      >
                        <Plus size={13} />
                        疊擦
                      </button>
                    </div>
                    <div className="space-y-3">
                      {lipColors.map((val, index) => (
                        <div key={index} className="flex items-start gap-2">
                          {lipColors.length > 1 && (
                            <span className="mt-2 text-[10px] font-medium text-[var(--color-text-muted)] shrink-0 w-3 text-center">
                              {index + 1}
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <ItemPicker
                              label={lipColors.length > 1 ? `${slotDef.label} ${index + 1}` : ''}
                              items={allItems}
                              categories={slotDef.categories as unknown as string[]}
                              value={val}
                              onChange={v => setLipColor(index, v)}
                              onItemUpdated={handleItemUpdated}
                            />
                          </div>
                          {lipColors.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLipColor(index)}
                              className="mt-2 text-[var(--color-text-muted)] min-h-0 min-w-0 p-0 shrink-0"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div key={slotDef.key}>
                    <ItemPicker
                      label={slotDef.label}
                      items={allItems}
                      categories={slotDef.categories as unknown as string[]}
                      value={slots[slotDef.key as Exclude<LookSlot, 'lip_color'>]}
                      onChange={val => setSlot(slotDef.key as Exclude<LookSlot, 'lip_color'>, val)}
                      onItemUpdated={handleItemUpdated}
                    />
                  </div>
                )
              )}
              {/* 分區小訣竅 */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                  {group.label}小訣竅
                </label>
                <textarea
                  value={tips[group.tipKey]}
                  onChange={e => setTips(prev => ({ ...prev, [group.tipKey]: e.target.value }))}
                  rows={2}
                  placeholder={group.tipPlaceholder}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-bg-card)] focus:outline-none focus:border-[var(--color-primary)] resize-none"
                />
              </div>
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
