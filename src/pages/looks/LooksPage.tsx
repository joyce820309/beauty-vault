import { Link, useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, Trash2, Palette } from 'lucide-react'
import { useMakeupThemes } from '@/hooks/useMakeupThemes'
import { Skeleton } from '@/components/ui/Skeleton'
import type { MakeupThemeWithSlots } from '@/types/database'

const SLOT_LABELS: Record<string, string> = {
  eye_upper:      '上眼影',
  eye_lower:      '下眼影',
  cheek_expand:   '膨脹色',
  cheek_vibe:     '氛圍色',
  cheek_contour:  '收縮色',
  lip_base:       '打底',
  lip_liner:      '唇線筆',
  lip_color:      '唇彩',
}

function slotSummary(theme: MakeupThemeWithSlots): string {
  const slots = theme.makeup_theme_slots
  const parts: string[] = []

  const eye = slots.filter(s => s.slot === 'eye_upper' || s.slot === 'eye_lower')
  const cheek = slots.filter(s => s.slot.startsWith('cheek_'))
  const lip = slots.filter(s => s.slot.startsWith('lip_'))

  if (eye.length) parts.push(`眼妝 ${eye.length} 件`)
  if (cheek.length) parts.push(`頰妝 ${cheek.length} 件`)
  if (lip.length) parts.push(`唇妝 ${lip.length} 件`)
  return parts.join('・') || '尚無品項'
}

function getSlotDisplay(s: { custom_text: string | null; shade_override: string | null; lip_base_bool: boolean | null; slot: string }): string {
  if (s.slot === 'lip_base') return s.lip_base_bool ? '有打底' : '不打底'
  const name = s.custom_text ?? ''
  const shade = s.shade_override ? ` ＃${s.shade_override}` : ''
  return name + shade || '—'
}

export default function LooksPage() {
  const navigate = useNavigate()
  const { themes, loading, removeTheme } = useMakeupThemes()

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.preventDefault()
    if (!confirm('確定刪除這個主題？')) return
    await removeTheme(id)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Palette size={18} strokeWidth={1.5} className="text-[var(--color-primary)]" />
          <h2 className="text-xl font-semibold text-[var(--color-text)]">妝容主題</h2>
        </div>
        <Link
          to="/my/looks/new"
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium min-h-0"
        >
          <Plus size={15} />
          新增
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : themes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--color-text-muted)]">
          <Palette size={36} strokeWidth={1} />
          <p className="text-sm">還沒有妝容主題</p>
          <Link
            to="/my/looks/new"
            className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium min-h-0"
          >
            建立第一個主題
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {themes.map(theme => (
            <Link
              key={theme.id}
              to={`/my/looks/${theme.id}`}
              className="block rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 hover:border-[var(--color-primary)] transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--color-text)] truncate">{theme.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{slotSummary(theme)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => handleDelete(e, theme.id)}
                    className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors min-h-0"
                  >
                    <Trash2 size={15} strokeWidth={1.5} />
                  </button>
                  <ChevronRight size={16} strokeWidth={1.5} className="text-[var(--color-text-muted)]" />
                </div>
              </div>

              {/* 槽位快覽 */}
              <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-1.5">
                {theme.makeup_theme_slots.map(s => (
                  <div key={s.id} className="min-w-0">
                    <p className="text-[10px] text-[var(--color-text-muted)] leading-none mb-0.5">{SLOT_LABELS[s.slot] ?? s.slot}</p>
                    <p className="text-xs text-[var(--color-text)] truncate">{getSlotDisplay(s)}</p>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
