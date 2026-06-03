import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ChevronLeft, Heart, CheckCircle2 } from 'lucide-react'
import { getToolById, deleteTool, updateToolStatus, markCleaned, updateTool } from '@/lib/supabase/tools'
import { NoteContent } from '@/components/ui/AutoTextarea'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { format, parseISO, differenceInDays } from 'date-fns'
import type { Tool, ToolStatus } from '@/types/database'

const CATEGORY_LABELS: Record<string, string> = {
  brush: '刷具', device: '美容儀', cleaner: '洗臉機',
  sponge: '海綿粉撲', mirror: '鏡子', storage: '收納', other: '其他',
}

const STATUS_LABELS: Record<ToolStatus, string> = {
  active: '使用中', stored: '收納中', retired: '已淘汰',
}

const STATUS_COLORS: Record<ToolStatus, string> = {
  active: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
  stored: 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]',
  retired: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-3 border-b border-[var(--color-border)] last:border-0">
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      <span className="text-sm text-[var(--color-text)] font-medium text-right max-w-[60%]">{value || '—'}</span>
    </div>
  )
}

function fmt(d: string | null) {
  if (!d) return null
  return format(parseISO(d), 'yyyy-MM-dd')
}

export default function ToolDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [tool, setTool] = useState<Tool | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [flagConfirm, setFlagConfirm] = useState<'is_favorite' | null>(null)

  useEffect(() => {
    getToolById(Number(id)).then(({ data }) => {
      setTool(data)
      setLoading(false)
    })
  }, [id])

  async function handleDelete() {
    if (!confirm('確定要刪除這筆工具？')) return
    setDeleting(true)
    await deleteTool(Number(id))
    navigate('/tools', { replace: true })
  }

  async function handleStatusChange(next: ToolStatus) {
    if (!tool) return
    const { error } = await updateToolStatus(tool.id, next)
    if (error) { showToast('更新失敗', 'error'); return }
    setTool({ ...tool, status: next })
    showToast(`已更新為「${STATUS_LABELS[next]}」`)
  }

  async function handleMarkCleaned() {
    if (!tool) return
    const { error } = await markCleaned(tool.id)
    if (error) { showToast('更新失敗', 'error'); return }
    const today = new Date().toISOString().slice(0, 10)
    setTool({ ...tool, last_cleaned_at: today })
    showToast('已記錄清洗日期')
  }

  async function handleFavoriteToggle() {
    if (!tool) return
    if (tool.is_favorite) { setFlagConfirm('is_favorite'); return }
    const { error } = await updateTool(tool.id, { is_favorite: true })
    if (error) { showToast('更新失敗', 'error'); return }
    setTool({ ...tool, is_favorite: true })
    showToast('已加入最愛')
  }

  async function confirmFavoriteOff() {
    if (!tool) return
    await updateTool(tool.id, { is_favorite: false })
    setTool({ ...tool, is_favorite: false })
    showToast('已取消最愛')
    setFlagConfirm(null)
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-32 rounded-2xl" /></div>
  if (!tool) return <p className="text-center text-[var(--color-text-muted)] py-16">找不到此工具</p>

  const name = [tool.name_en, tool.name_zh].filter(Boolean).join(' / ') || '（未命名）'
  const brand = [tool.brand_en, tool.brand_zh].filter(Boolean).join(' / ')

  // 清潔提醒
  const cleanAlert = (() => {
    if (!tool.clean_cycle_days || !tool.last_cleaned_at) return null
    const daysSince = differenceInDays(new Date(), parseISO(tool.last_cleaned_at))
    const overdue = daysSince - tool.clean_cycle_days
    if (overdue >= 0) return { overdue: true, days: overdue }
    return { overdue: false, days: Math.abs(overdue) }
  })()

  return (
    <div>
      {/* 頂部 */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate(-1)} className="text-[var(--color-text-muted)] min-h-0 min-w-0 p-1 text-lg">‹</button>
        <div className="flex items-center gap-2">
          <button onClick={handleFavoriteToggle}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-[var(--color-border)] min-h-0 min-w-0"
          >
            <Heart size={16} strokeWidth={tool.is_favorite ? 0 : 1.5}
              fill={tool.is_favorite ? 'var(--color-primary)' : 'none'}
              className={tool.is_favorite ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'} />
          </button>
          <Link to={`/tools/${id}/edit`}
            className="px-4 py-2 rounded-xl border border-[var(--color-primary)] text-[var(--color-primary)] text-sm font-medium flex items-center justify-center min-h-0"
          >編輯</Link>
          <button onClick={handleDelete} disabled={deleting}
            className="px-4 py-2 rounded-xl border border-[var(--color-danger)] text-[var(--color-danger)] text-sm font-medium min-h-0 disabled:opacity-50"
          >{deleting ? '刪除中…' : '刪除'}</button>
        </div>
      </div>

      {/* 二次確認 */}
      {flagConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="bg-[var(--color-bg-card)] rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <p className="text-sm font-medium text-[var(--color-text)] text-center mb-4">確定取消「最愛」標記？</p>
            <div className="flex gap-3">
              <button onClick={() => setFlagConfirm(null)} className="flex-1 py-2 rounded-xl border border-[var(--color-border)] text-sm min-h-0">保留</button>
              <button onClick={confirmFavoriteOff} className="flex-1 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium min-h-0">確定取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 圖片 */}
      {tool.image_url && (
        <div className="mb-5 rounded-2xl overflow-hidden bg-[var(--color-bg-muted)] flex justify-center">
          <img src={tool.image_url} alt={name} className="max-h-64 w-auto object-contain" />
        </div>
      )}

      {/* 標題 */}
      <div className="mb-5">
        <p className="text-xs text-[var(--color-text-muted)] mb-1">
          {CATEGORY_LABELS[tool.category ?? ''] ?? tool.category ?? '未分類'}
        </p>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">{name}</h2>
        {brand && <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{brand}</p>}
        <div className="flex flex-wrap gap-2 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[tool.status]}`}>
            {STATUS_LABELS[tool.status]}
          </span>
          {tool.is_favorite && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]">最愛</span>
          )}
          {tool.rating && (
            <span className="text-xs text-yellow-400">{'★'.repeat(tool.rating)}{'☆'.repeat(5 - tool.rating)}</span>
          )}
        </div>
      </div>

      {/* 清潔提醒 */}
      {cleanAlert && (
        <div className={`rounded-2xl px-4 py-3 mb-4 flex items-center justify-between ${
          cleanAlert.overdue ? 'bg-[var(--color-danger)]/10' : 'bg-[var(--color-accent)]/10'
        }`}>
          <div>
            <p className={`text-sm font-medium ${cleanAlert.overdue ? 'text-[var(--color-danger)]' : 'text-[var(--color-accent)]'}`}>
              {cleanAlert.overdue ? `清洗已逾期 ${cleanAlert.days} 天` : `距下次清洗還有 ${cleanAlert.days} 天`}
            </p>
            {tool.last_cleaned_at && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">上次清洗：{fmt(tool.last_cleaned_at)}</p>
            )}
          </div>
          <button onClick={handleMarkCleaned}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-bg-card)] text-xs font-medium text-[var(--color-text)] min-h-0"
          >
            <CheckCircle2 size={13} strokeWidth={1.5} />已清洗
          </button>
        </div>
      )}

      {/* 基本資訊 */}
      <div className="bg-[var(--color-bg-muted)] rounded-2xl px-4 mb-4">
        <Row label="購入日期" value={fmt(tool.purchase_date)} />
        <Row label="購入金額" value={tool.price != null ? `NT$ ${tool.price.toLocaleString()}` : null} />
        {tool.clean_cycle_days && <Row label="清潔週期" value={`每 ${tool.clean_cycle_days} 天`} />}
        {tool.last_cleaned_at && <Row label="上次清洗" value={fmt(tool.last_cleaned_at)} />}
        {tool.sensitive_skin_ok && tool.sensitive_skin_ok !== 'untested' && (
          <Row label="敏感肌適用" value={
            tool.sensitive_skin_ok === 'ok' ? '✓ 適用' : '✗ 不適用'
          } />
        )}
      </div>

      {/* 狀態操作列 */}
      <div className="flex border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-bg-card)] mb-4">
        {(['active', 'stored', 'retired'] as ToolStatus[]).map((s, i) => (
          <>
            {i > 0 && <div key={`sep-${s}`} className="w-px bg-[var(--color-border)]" />}
            <button key={s} onClick={() => handleStatusChange(s)}
              className={`flex-1 py-3 text-xs font-medium transition-colors min-h-0 ${
                tool.status === s
                  ? 'text-[var(--color-primary)] bg-[var(--color-primary-light)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]'
              }`}
            >{STATUS_LABELS[s]}</button>
          </>
        ))}
      </div>

      {/* 備註 */}
      {tool.note && (
        <div className="bg-[var(--color-bg-muted)] rounded-2xl px-4 py-4 mb-4">
          <p className="text-xs text-[var(--color-text-muted)] mb-2">使用心得 / 備註</p>
          <NoteContent text={tool.note} />
        </div>
      )}

      <div className="h-8" />
    </div>
  )
}
