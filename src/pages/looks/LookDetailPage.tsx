import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ChevronLeft, Pencil, Trash2, Camera, X, Sparkles, Lightbulb } from 'lucide-react'
import { getItems } from '@/lib/supabase/items'
import {
  getMakeupThemeById,
  deleteMakeupTheme,
  updateMakeupThemeImages,
  uploadMakeupThemeImage,
} from '@/lib/supabase/makeupThemes'
import { Skeleton } from '@/components/ui/Skeleton'
import { Lightbox } from '@/components/ui/Lightbox'
import { useToast } from '@/components/ui/Toast'
import type { Item, MakeupThemeWithSlots, MakeupThemeSlot, LookSlot } from '@/types/database'

const EYE_SLOTS: { key: LookSlot; label: string }[] = [
  { key: 'eye_upper', label: '上眼影' },
  { key: 'eye_lower', label: '下眼影' },
]
const CHEEK_SLOTS: { key: LookSlot; label: string }[] = [
  { key: 'cheek_expand',  label: '膨脹色' },
  { key: 'cheek_vibe',    label: '氛圍色' },
  { key: 'cheek_contour', label: '收縮色' },
]

function slotDisplayName(s: MakeupThemeSlot): string {
  const name = s.custom_text ?? ''
  const shade = s.shade_override ? ` ＃${s.shade_override}` : ''
  return (name + shade) || '—'
}

// ─── 槽位圓形縮圖：商品照片優先，若同時有色號則疊加在照片右下角（多色時小幅堆疊）；
//     沒有照片但有多個色號（例如眼影盤多色）則以調色盤樣式些微重疊排列；
//     單一色號則為純色圓塊；都沒有則用預設圖示 ──────────────────────────────────
function SlotSwatch({ item, size = 48 }: { item: Item | null; size?: number }) {
  const style = { width: size, height: size }
  const thumbImage = item?.image_urls?.[0] || item?.image_url || null
  const colors = item?.swatch_colors?.length ? item.swatch_colors : item?.swatch_color ? [item.swatch_color] : []

  if (thumbImage) {
    const dotSize = Math.max(14, Math.round(size * 0.4))
    return (
      <div className="slot-swatch slot-swatch--photo relative flex-shrink-0" style={style}>
        <div className="slot-swatch__photo-frame w-full h-full rounded-full overflow-hidden shadow-[0_0_0_1px_var(--color-border)]">
          <img src={thumbImage} alt="" className="slot-swatch__photo-img w-full h-full object-cover" />
        </div>
        {colors.length > 0 && (
          <div className="slot-swatch__color-dots absolute flex items-center" style={{ bottom: -2, right: -2 }}>
            {colors.slice(0, 3).map((color, i) => (
              <div
                key={i}
                style={{
                  width: dotSize,
                  height: dotSize,
                  background: color,
                  marginLeft: i === 0 ? 0 : -dotSize * 0.35,
                  zIndex: colors.length - i,
                }}
                className="slot-swatch__color-dot rounded-full shadow-[0_0_0_2px_var(--color-bg-card)]"
              />
            ))}
          </div>
        )}
      </div>
    )
  }
  if (colors.length > 1) {
    // 調色盤樣式：多色些微重疊排列（例如眼影盤）
    const overlap = size * 0.28
    const totalWidth = size + (colors.length - 1) * (size - overlap)
    return (
      <div className="slot-swatch slot-swatch--palette flex items-center flex-shrink-0" style={{ width: totalWidth, height: size }}>
        {colors.slice(0, 4).map((color, i) => (
          <div
            key={i}
            style={{
              width: size,
              height: size,
              background: color,
              marginLeft: i === 0 ? 0 : -overlap,
              zIndex: colors.length - i,
            }}
            className="slot-swatch__palette-dot rounded-full shadow-[0_0_0_1.5px_var(--color-bg-card),0_0_0_2.5px_var(--color-border)]"
          />
        ))}
      </div>
    )
  }
  if (colors.length === 1) {
    return (
      <div
        style={{ ...style, background: colors[0] }}
        className="slot-swatch slot-swatch--single-color rounded-full flex-shrink-0 shadow-[0_0_0_1.5px_var(--color-bg-card),0_0_0_2.5px_var(--color-border)]"
      />
    )
  }
  return (
    <div
      style={style}
      className="slot-swatch slot-swatch--placeholder rounded-full flex-shrink-0 bg-[var(--color-bg-muted)] flex items-center justify-center shadow-[0_0_0_1px_var(--color-border)]"
    >
      <Sparkles size={size * 0.45} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
    </div>
  )
}

function SlotRow({ label, slot, item }: { label: string; slot: MakeupThemeSlot; item: Item | null }) {
  // 色號疊加在縮圖照片右下角（見 SlotSwatch），文字區塊往右多留一點空間對齊
  return (
    <div className="slot-row flex items-start gap-2">
      <SlotSwatch item={item} />
      <div className="slot-row__text min-w-0 flex-1 pt-px pl-0.5">
        <p className="slot-row__label text-[9.5px] text-[var(--color-text-muted)] mb-0.5">{label}</p>
        <p className="slot-row__name text-[12.5px] text-[var(--color-text)] font-semibold leading-snug line-clamp-2">
          {slotDisplayName(slot)}
        </p>
      </div>
    </div>
  )
}

// ─── 俏皮小訣竅便利貼：手寫感微旋轉 + 虛線框，貼在各分區卡片下方 ──────────────────
function TipNote({ text, rotate }: { text: string; rotate: number }) {
  return (
    <div
      className="tip-note mt-2 flex items-start gap-1.5 rounded-xl border border-dashed border-[var(--color-primary-light)] bg-[color-mix(in_srgb,var(--color-primary-light)_35%,var(--color-bg-card))] px-3 py-2"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <Lightbulb size={13} strokeWidth={2} className="tip-note__icon text-[var(--color-primary)] shrink-0 mt-0.5" />
      <p className="tip-note__text text-[12px] text-[var(--color-primary-dark)] font-medium leading-snug whitespace-pre-wrap">
        {text}
      </p>
    </div>
  )
}

export default function LookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [theme, setTheme] = useState<MakeupThemeWithSlots | null>(null)
  const [itemsById, setItemsById] = useState<Map<number, Item>>(new Map())
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([getMakeupThemeById(Number(id)), getItems()]).then(([themeRes, itemsRes]) => {
      setTheme(themeRes.data as MakeupThemeWithSlots)
      const map = new Map<number, Item>()
      for (const it of itemsRes.data ?? []) map.set(it.id, it)
      setItemsById(map)
      setLoading(false)
    })
  }, [id])

  async function handleDelete() {
    if (!theme) return
    if (!confirm('確定刪除這個妝容主題？')) return
    setDeleting(true)
    await deleteMakeupTheme(theme.id)
    navigate('/my/looks', { replace: true })
  }

  async function handlePhotosSelected(files: FileList | null) {
    if (!files || !theme) return
    setUploading(true)
    const newUrls: string[] = []
    for (const file of Array.from(files)) {
      const url = await uploadMakeupThemeImage(file)
      if (url) newUrls.push(url)
      else showToast('部分照片上傳失敗', 'error')
    }
    if (newUrls.length) {
      const merged = [...(theme.image_urls ?? []), ...newUrls]
      const { data, error } = await updateMakeupThemeImages(theme.id, merged)
      if (!error && data) {
        setTheme({ ...theme, image_urls: data.image_urls })
        showToast('已新增照片')
      } else {
        showToast('照片儲存失敗', 'error')
      }
    }
    setUploading(false)
  }

  async function removePhoto(url: string) {
    if (!theme) return
    const merged = (theme.image_urls ?? []).filter(u => u !== url)
    const { data, error } = await updateMakeupThemeImages(theme.id, merged)
    if (!error && data) {
      setTheme({ ...theme, image_urls: data.image_urls })
      showToast('已刪除照片')
    } else {
      showToast('刪除失敗', 'error')
    }
  }

  if (loading) {
    return (
      <div className="look-detail-page look-detail-page--loading space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="w-full h-48 rounded-2xl" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  if (!theme) {
    return <p className="look-detail-page look-detail-page--not-found text-center text-[var(--color-text-muted)] py-16">找不到此妝容主題</p>
  }

  const photos = theme.image_urls ?? []
  const slotsByKey = (key: LookSlot) =>
    theme.makeup_theme_slots.filter(s => s.slot === key).sort((a, b) => a.sort_order - b.sort_order)

  const eyeRows = EYE_SLOTS.map(d => ({ ...d, slot: slotsByKey(d.key)[0] })).filter(r => r.slot)
  const cheekRows = CHEEK_SLOTS.map(d => ({ ...d, slot: slotsByKey(d.key)[0] })).filter(r => r.slot)
  const lipBase = slotsByKey('lip_base')[0]
  const lipLiner = slotsByKey('lip_liner')[0]
  const lipColors = slotsByKey('lip_color')

  const hasEyeOrCheek = eyeRows.length > 0 || cheekRows.length > 0
  const hasLips = !!lipBase || !!lipLiner || lipColors.length > 0
  const slotItems = theme.makeup_theme_slots.map(s => (s.item_id ? itemsById.get(s.item_id) : null))
  const hasAnyColors = (item: Item) => (item.swatch_colors?.length ?? 0) > 0 || !!item.swatch_color
  const usesSwatchOnly = slotItems.some(item => item && !item.image_urls?.[0] && !item.image_url && hasAnyColors(item))
  const usesSwatchDot = slotItems.some(item => item && (item.image_urls?.[0] || item.image_url) && hasAnyColors(item))

  return (
    <div className="look-detail-page">
      {/* 頂部操作列 */}
      <div className="look-detail-page__toolbar flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="look-detail-page__back-btn min-h-0 min-w-0 p-1 text-[var(--color-text-muted)]">
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <div className="look-detail-page__toolbar-actions flex items-center gap-2">
          <Link
            to={`/my/looks/${id}/edit`}
            className="look-detail-page__edit-btn px-3 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-70 active:opacity-50 flex items-center gap-1.5 min-h-0"
            style={{ color: '#7A8FA8', background: '#c2cad880' }}
          >
            <Pencil size={13} strokeWidth={1.5} />
            編輯
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="look-detail-page__delete-btn px-3 py-2 rounded-xl text-sm font-medium text-[var(--color-danger)] transition-opacity hover:opacity-70 active:opacity-50 flex items-center gap-1.5 min-h-0 disabled:opacity-40"
            style={{ background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)' }}
          >
            <Trash2 size={13} strokeWidth={1.5} />
            {deleting ? '刪除中…' : '刪除'}
          </button>
        </div>
      </div>

      {/* Hero：主照片 + 標題疊加（妝容重點，大尺寸呈現） */}
      <button
        type="button"
        onClick={() => photos.length > 0 && setLightboxIndex(0)}
        className="look-hero relative w-full rounded-3xl overflow-hidden h-72 sm:h-[26rem] bg-[var(--color-bg-muted)] min-h-0 min-w-0 block"
        style={photos[0] ? { backgroundImage: `url(${photos[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        <div className="look-hero__gradient absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/55" />
        <div className="look-hero__badge absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/85 text-[var(--color-primary-dark)] text-[11px] font-bold">
          <Sparkles size={11} strokeWidth={2} />
          妝容主題
        </div>
        <h1 className="look-hero__title absolute bottom-4 left-4 right-4 m-0 text-3xl sm:text-4xl font-extrabold text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.25)] text-left truncate">
          {theme.name}
        </h1>
        {photos.length > 1 && (
          <div className="look-hero__stack absolute bottom-4 right-4 flex">
            {photos.slice(1, 3).map((url, i) => (
              <div
                key={url}
                style={{ marginLeft: i === 0 ? 0 : -16 }}
                className="look-hero__stack-thumb w-11 h-11 rounded-xl border-2 border-white overflow-hidden shadow-[0_2px_6px_rgba(0,0,0,0.2)]"
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {photos.length > 3 && (
              <div
                style={{ marginLeft: -16 }}
                className="look-hero__stack-more w-11 h-11 rounded-xl border-2 border-white bg-white/90 shadow-[0_2px_6px_rgba(0,0,0,0.2)] flex items-center justify-center text-[12px] font-bold text-[var(--color-primary-dark)]"
              >
                +{photos.length - 3}
              </div>
            )}
          </div>
        )}
      </button>

      {/* 完成照橫向拼貼條 */}
      <div className="photo-strip mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {photos.map((url, idx) => (
          <div
            key={url}
            style={{ transform: `rotate(${(idx % 3) - 1}deg)` }}
            className="photo-strip__item relative w-16 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-[0_3px_8px_rgba(58,46,50,0.12)]"
          >
            <button
              type="button"
              onClick={() => setLightboxIndex(idx)}
              className="photo-strip__item-view w-full h-full min-h-0 min-w-0"
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
            <button
              type="button"
              onClick={() => removePhoto(url)}
              className="photo-strip__item-remove absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center min-h-0 min-w-0"
            >
              <X size={10} strokeWidth={2} />
            </button>
          </div>
        ))}
        <label className="photo-strip__add cursor-pointer flex-shrink-0">
          <div className="photo-strip__add-tile w-16 h-20 rounded-xl border-2 border-dashed border-[var(--color-primary-light)] flex flex-col items-center justify-center gap-1 text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]/40 transition-colors bg-[var(--color-bg-muted)]">
            <Camera size={16} strokeWidth={1.5} />
            <span className="text-[10px] font-medium">{uploading ? '上傳中' : '新增'}</span>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              handlePhotosSelected(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex(i => (i! > 0 ? i! - 1 : photos.length - 1))}
          onNext={() => setLightboxIndex(i => (i! < photos.length - 1 ? i! + 1 : 0))}
        />
      )}

      {/* 眼妝 / 頰妝：980px 以下單欄堆疊，980px 以上並排 */}
      {hasEyeOrCheek && (
        <div className="eye-cheek-grid mt-6 grid grid-cols-1 min-[980px]:grid-cols-2 gap-2.5">
          {eyeRows.length > 0 && (
            <div className="section-card section-card--eyes bg-[var(--color-bg-card)] rounded-2xl p-3.5 shadow-sm border border-[var(--color-border)]">
              <p className="section-card__title text-[10px] font-bold tracking-wide uppercase text-[var(--color-primary)] mb-2.5">
                EYES・眼妝
              </p>
              <div className="section-card__rows flex flex-col gap-3">
                {eyeRows.map(row => (
                  <SlotRow
                    key={row.key}
                    label={row.label}
                    slot={row.slot}
                    item={row.slot.item_id ? itemsById.get(row.slot.item_id) ?? null : null}
                  />
                ))}
              </div>
              {theme.eye_tip && <TipNote text={theme.eye_tip} rotate={-0.6} />}
            </div>
          )}
          {cheekRows.length > 0 && (
            <div className="section-card section-card--cheek bg-[var(--color-bg-card)] rounded-2xl p-3.5 shadow-sm border border-[var(--color-border)]">
              <p className="section-card__title text-[10px] font-bold tracking-wide uppercase text-[var(--color-primary)] mb-2.5">
                CHEEK・頰妝
              </p>
              <div className="section-card__rows flex flex-col gap-3">
                {cheekRows.map(row => (
                  <SlotRow
                    key={row.key}
                    label={row.label}
                    slot={row.slot}
                    item={row.slot.item_id ? itemsById.get(row.slot.item_id) ?? null : null}
                  />
                ))}
              </div>
              {theme.cheek_tip && <TipNote text={theme.cheek_tip} rotate={0.6} />}
            </div>
          )}
        </div>
      )}

      {/* 連接虛線 */}
      {hasEyeOrCheek && hasLips && (
        <div className="flow-divider flex items-center gap-2 my-4">
          <div className="flow-divider__line flow-divider__line--left flex-1 h-0.5" style={{ background: 'repeating-linear-gradient(90deg, var(--color-primary-light) 0 6px, transparent 6px 11px)' }} />
          <span className="flow-divider__label text-[10px] font-bold text-[var(--color-primary)] tracking-wider">THEN ↓</span>
          <div className="flow-divider__line flow-divider__line--right flex-1 h-0.5" style={{ background: 'repeating-linear-gradient(90deg, var(--color-primary-light) 0 6px, transparent 6px 11px)' }} />
        </div>
      )}

      {/* 唇妝大卡 */}
      {hasLips && (
        <div className={`section-card section-card--lips bg-[var(--color-bg-card)] rounded-2xl p-3.5 shadow-sm border border-[var(--color-border)] ${!hasEyeOrCheek ? 'mt-6' : ''}`}>
          <p className="section-card__title text-[10px] font-bold tracking-wide uppercase text-[var(--color-primary)] mb-2.5">
            LIPS・唇妝
          </p>

          <div className="section-card__rows flex flex-col gap-3">
            {lipBase && (
              <SlotRow
                label="打底"
                slot={lipBase}
                item={lipBase.item_id ? itemsById.get(lipBase.item_id) ?? null : null}
              />
            )}

            {lipLiner && (
              <SlotRow
                label="唇線筆"
                slot={lipLiner}
                item={lipLiner.item_id ? itemsById.get(lipLiner.item_id) ?? null : null}
              />
            )}

            {lipColors.length > 0 && (
              <div className="lip-colors">
                <p className="lip-colors__title text-[10.5px] text-[var(--color-text-muted)] mb-2.5">
                  唇彩{lipColors.length > 1 && <span className="lip-colors__layer-count text-[var(--color-primary)] font-semibold">（疊擦 {lipColors.length} 層）</span>}
                </p>
                <div className="lip-colors__list flex flex-col gap-2.5">
                  {lipColors.map((slot, i) => {
                    const lipItem = slot.item_id ? itemsById.get(slot.item_id) ?? null : null
                    return (
                      <div key={slot.id} className="lip-colors__item flex items-start gap-2.5">
                        {lipColors.length > 1 && (
                          <div className="lip-colors__item-index w-4 h-4 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary-dark)] text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                        )}
                        <SlotSwatch item={lipItem} size={48} />
                        <p className="lip-colors__item-name flex-1 pt-0.5 pl-0.5 text-[13px] text-[var(--color-text)] font-semibold leading-snug line-clamp-2">
                          {slotDisplayName(slot)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {theme.lip_tip && <TipNote text={theme.lip_tip} rotate={-0.4} />}
          </div>
        </div>
      )}

      {/* 色票圖例說明 */}
      {(usesSwatchOnly || usesSwatchDot) && (
        <div className="swatch-legend mt-3.5 flex items-center gap-3.5 flex-wrap text-[10.5px] text-[var(--color-text-muted)]">
          <div className="swatch-legend__item swatch-legend__item--photo flex items-center gap-1.5">
            <div className="swatch-legend__dot swatch-legend__dot--photo w-3.5 h-3.5 rounded-full bg-[var(--color-bg-muted)] shadow-[0_0_0_1px_var(--color-border)]" />
            商品照片
          </div>
          {usesSwatchDot && (
            <div className="swatch-legend__item swatch-legend__item--photo-dot flex items-center gap-1.5">
              <div className="swatch-legend__dot-combo relative w-3.5 h-3.5">
                <div className="swatch-legend__dot-combo-base w-full h-full rounded-full bg-[var(--color-bg-muted)] shadow-[0_0_0_1px_var(--color-border)]" />
                <div className="swatch-legend__dot-combo-badge absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--color-primary)] shadow-[0_0_0_1.5px_var(--color-bg-card)]" />
              </div>
              商品照片 ＋ 設定色號
            </div>
          )}
          {usesSwatchOnly && (
            <div className="swatch-legend__item swatch-legend__item--color-only flex items-center gap-1.5">
              <div className="swatch-legend__dot swatch-legend__dot--color-only w-3.5 h-3.5 rounded-full bg-[var(--color-primary)] shadow-[0_0_0_1.5px_var(--color-bg-card),0_0_0_2px_var(--color-border)]" />
              手動設定色票（無照片時）
            </div>
          )}
        </div>
      )}

      {/* 備註 */}
      {theme.note && (
        <div className="look-note mt-4 bg-[var(--color-bg-muted)] rounded-2xl px-4 py-4">
          <p className="look-note__label text-xs text-[var(--color-text-muted)] mb-2">備註</p>
          <p className="look-note__text text-sm text-[var(--color-text)] whitespace-pre-wrap leading-relaxed">{theme.note}</p>
        </div>
      )}

      <div className="h-8" />
    </div>
  )
}
