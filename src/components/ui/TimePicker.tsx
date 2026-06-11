import { useEffect, useRef, useCallback } from 'react'
import { Select } from './Select'

interface TimePickerProps {
  value: string       // "HH:mm"
  onChange: (value: string) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

const HOUR_OPTIONS = HOURS.map(h => ({ value: h, label: h }))
const MINUTE_OPTIONS = MINUTES.map(m => ({ value: m, label: m }))

const ITEM_H = 36  // px per row — 每一格的高度
const VISIBLE = 3  // 顯示幾格（奇數，中間那格是選中）
const DRUM_H = ITEM_H * VISIBLE  // 108px

// ── 滾輪欄位（手機用）──────────────────────────────────────────────────────

function DrumColumn({
  items,
  selected,
  onSelect,
}: {
  items: string[]
  selected: string
  onSelect: (val: string) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const isSettlingRef = useRef(false)

  // 捲到指定 index（不觸發 onSelect）
  const scrollToIndex = useCallback((idx: number, smooth = false) => {
    const el = listRef.current
    if (!el) return
    isSettlingRef.current = true
    el.scrollTo({ top: idx * ITEM_H, behavior: smooth ? 'smooth' : 'instant' })
    setTimeout(() => { isSettlingRef.current = false }, 200)
  }, [])

  // mount / value 外部變更時對齊
  useEffect(() => {
    const idx = items.indexOf(selected)
    if (idx >= 0) scrollToIndex(idx)
  }, [selected, items, scrollToIndex])

  // 滾動停止後 snap 到最近的格子
  const handleScroll = useCallback(() => {
    if (isSettlingRef.current) return
    const el = listRef.current
    if (!el) return
    const raw = el.scrollTop / ITEM_H
    const idx = Math.round(raw)
    const clamped = Math.max(0, Math.min(items.length - 1, idx))
    if (items[clamped] !== selected) {
      onSelect(items[clamped])
    }
  }, [items, selected, onSelect])

  // touchend → snap 對齊（iOS momentum scroll 結束後呼叫）
  const handleTouchEnd = useCallback(() => {
    const el = listRef.current
    if (!el) return
    // 稍等 momentum 結束再 snap
    setTimeout(() => {
      const idx = Math.round(el.scrollTop / ITEM_H)
      const clamped = Math.max(0, Math.min(items.length - 1, idx))
      scrollToIndex(clamped, true)
      if (items[clamped] !== selected) onSelect(items[clamped])
    }, 80)
  }, [items, selected, onSelect, scrollToIndex])

  return (
    <div className="relative select-none" style={{ width: 44, height: DRUM_H }}>
      {/* 選中高亮框：z-0，純背景層 */}
      <div
        className="absolute inset-x-0 pointer-events-none rounded-lg"
        style={{
          top: ITEM_H,
          height: ITEM_H,
          zIndex: 0,
          background: 'var(--color-primary-light)',
          border: '1px solid color-mix(in srgb, var(--color-primary) 35%, transparent)',
        }}
      />

      {/* 上方淡出遮罩：z-30，蓋在 scroll container（z-20）之上，半透明讓上下格數字隱約可見 */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: ITEM_H,
          zIndex: 30,
          background: 'linear-gradient(to bottom, color-mix(in srgb, var(--color-bg-card) 90%, transparent) 20%, transparent)',
        }}
      />
      {/* 下方淡出遮罩 */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: ITEM_H,
          zIndex: 30,
          background: 'linear-gradient(to top, color-mix(in srgb, var(--color-bg-card) 90%, transparent) 20%, transparent)',
        }}
      />

      <div
        ref={listRef}
        onScroll={handleScroll}
        onTouchEnd={handleTouchEnd}
        style={{
          height: DRUM_H,
          overflowY: 'scroll',
          scrollbarWidth: 'none',
          scrollPaddingTop: ITEM_H,
          scrollSnapType: 'y mandatory',
          paddingTop: ITEM_H,
          paddingBottom: ITEM_H,
          position: 'relative',
          zIndex: 20,  // 文字在高亮框（z-0）上面，在淡出遮罩（z-30）下面
        }}
      >
        {items.map((item) => (
          <div
            key={item}
            style={{ scrollSnapAlign: 'start', height: ITEM_H }}
            className="flex items-center justify-center text-sm font-medium text-[var(--color-text)] cursor-pointer"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 主元件 ──────────────────────────────────────────────────────────────────

export function TimePicker({ value, onChange }: TimePickerProps) {
  const [hh, mm] = value.split(':')
  const hour   = HOURS.includes(hh) ? hh : '09'
  const minute = MINUTES.includes(mm) ? mm : '00'

  return (
    <>
      {/* 桌機：兩個下拉選單 */}
      <div className="hidden lg:flex items-center gap-1">
        <div className="w-16">
          <Select size="sm" value={hour} onChange={h => onChange(`${h}:${minute}`)} options={HOUR_OPTIONS} placeholder="時" />
        </div>
        <span className="text-xs text-[var(--color-text-muted)] font-medium">:</span>
        <div className="w-16">
          <Select size="sm" value={minute} onChange={m => onChange(`${hour}:${m}`)} options={MINUTE_OPTIONS} placeholder="分" />
        </div>
      </div>

      {/* 手機：滾輪選單 */}
      <div
        className="lg:hidden inline-flex items-center gap-0.5 px-2 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]"
      >
        <DrumColumn items={HOURS}   selected={hour}   onSelect={h => onChange(`${h}:${minute}`)} />
        <span className="text-sm font-semibold text-[var(--color-text-muted)] mb-0.5 px-0.5">:</span>
        <DrumColumn items={MINUTES} selected={minute} onSelect={m => onChange(`${hour}:${m}`)} />
      </div>
    </>
  )
}
