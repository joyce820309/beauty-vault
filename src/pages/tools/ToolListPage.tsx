import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, X, Wrench, Heart, CheckCircle2 } from 'lucide-react'
import { getTools, markCleaned } from '@/lib/supabase/tools'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { differenceInDays, parseISO } from 'date-fns'
import type { Tool, ToolStatus } from '@/types/database'

const CATEGORY_LABELS: Record<string, string> = {
  brush: '刷具', device: '美容儀', cleaner: '洗臉機',
  sponge: '海綿粉撲', mirror: '鏡子', storage: '收納', other: '其他',
}

const STATUS_LABELS: Record<ToolStatus, string> = {
  active: '使用中', stored: '收納中', retired: '已淘汰',
}

const STATUS_COLORS: Record<ToolStatus, string> = {
  active: 'text-[var(--color-accent)] bg-[var(--color-accent)]/10',
  stored: 'text-[var(--color-text-muted)] bg-[var(--color-bg-muted)]',
  retired: 'text-[var(--color-danger)] bg-[var(--color-danger)]/10',
}

type StatusTab = 'all' | ToolStatus

export default function ToolListPage() {
  const { showToast } = useToast()
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<StatusTab>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await getTools()
    setTools(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = tools.filter(t => {
    if (tab !== 'all' && t.status !== tab) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return [t.brand_en, t.brand_zh, t.name_en, t.name_zh].some(f => f?.toLowerCase().includes(q))
    }
    return true
  })

  const counts: Record<StatusTab, number> = {
    all: tools.length,
    active: tools.filter(t => t.status === 'active').length,
    stored: tools.filter(t => t.status === 'stored').length,
    retired: tools.filter(t => t.status === 'retired').length,
  }

  // 需要清洗的數量
  const needCleanCount = tools.filter(t => {
    if (!t.clean_cycle_days || !t.last_cleaned_at) return false
    return differenceInDays(new Date(), parseISO(t.last_cleaned_at)) >= t.clean_cycle_days
  }).length

  async function handleMarkCleaned(e: React.MouseEvent, tool: Tool) {
    e.preventDefault(); e.stopPropagation()
    await markCleaned(tool.id)
    const today = new Date().toISOString().slice(0, 10)
    setTools(prev => prev.map(t => t.id === tool.id ? { ...t, last_cleaned_at: today } : t))
    showToast('已記錄清洗日期')
  }

  const tabs: { key: StatusTab; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'active', label: '使用中' },
    { key: 'stored', label: '收納中' },
    { key: 'retired', label: '已淘汰' },
  ]

  return (
    <div>
      {/* 標題 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-text)]">工具管理</h2>
          {needCleanCount > 0 && !loading && (
            <p className="text-xs text-[var(--color-danger)] mt-0.5">{needCleanCount} 件需要清洗</p>
          )}
        </div>
        <Link to="/tools/new"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--color-primary)] text-white shadow-sm"
        >
          <Plus size={18} strokeWidth={2} />
        </Link>
      </div>

      {/* 搜尋 */}
      <div className="relative mb-3">
        <Search size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="搜尋品牌、品名…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-bg-muted)] focus:outline-none focus:border-[var(--color-primary)]"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] min-h-0 min-w-0 w-5 h-5 flex items-center justify-center">
            <X size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-0 ${
              tab === key ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]'
            }`}
          >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-white/25' : 'bg-[var(--color-border)]'}`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState Icon={Wrench} title="沒有工具" description={tools.length === 0 ? '點右上角 + 新增第一件工具' : '試試調整篩選條件'} />
      ) : (
        <div className="space-y-3">
          {filtered.map(tool => {
            const name = [tool.name_en, tool.name_zh].filter(Boolean).join(' / ') || '（未命名）'
            const brand = tool.brand_en || tool.brand_zh || ''

            const cleanStatus = (() => {
              if (!tool.clean_cycle_days || !tool.last_cleaned_at) return null
              const daysSince = differenceInDays(new Date(), parseISO(tool.last_cleaned_at))
              const overdue = daysSince - tool.clean_cycle_days
              return { overdue: overdue >= 0, days: Math.abs(overdue) }
            })()

            return (
              <Link key={tool.id} to={`/tools/${tool.id}`}
                className="block border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-bg-card)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]/20 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* 圖片 */}
                  <div className="w-14 h-14 rounded-lg bg-[var(--color-bg-muted)] flex-shrink-0 overflow-hidden">
                    {tool.image_url
                      ? <img src={tool.image_url} alt={name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]"><Wrench size={20} strokeWidth={1.5} /></div>
                    }
                  </div>

                  {/* 內容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-xs text-[var(--color-text-muted)] truncate">
                        {brand}{brand && tool.category ? ' · ' : ''}{CATEGORY_LABELS[tool.category ?? ''] ?? tool.category ?? ''}
                      </p>
                      <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[tool.status]}`}>
                        {STATUS_LABELS[tool.status]}
                      </span>
                      {tool.is_favorite && <Heart size={11} strokeWidth={0} fill="var(--color-primary)" className="flex-shrink-0" />}
                    </div>
                    <p className="font-medium text-[var(--color-text)] truncate mt-0.5">{name}</p>
                    {tool.rating && (
                      <p className="text-xs text-yellow-400 mt-0.5">{'★'.repeat(tool.rating)}{'☆'.repeat(5 - tool.rating)}</p>
                    )}
                  </div>

                  {/* 清洗狀態 */}
                  {cleanStatus && (
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        cleanStatus.overdue
                          ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
                          : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]'
                      }`}>
                        {cleanStatus.overdue ? `逾期 ${cleanStatus.days}天` : `剩 ${cleanStatus.days}天`}
                      </span>
                      {cleanStatus.overdue && (
                        <button onClick={e => handleMarkCleaned(e, tool)}
                          className="flex items-center gap-1 text-[10px] text-[var(--color-accent)] min-h-0 hover:underline"
                        >
                          <CheckCircle2 size={11} strokeWidth={1.5} />已清洗
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
      <div className="h-8" />
    </div>
  )
}
