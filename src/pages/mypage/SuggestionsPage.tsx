import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Trash2, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import {
  deleteSuggestionFromItems,
  getDistinctBrands,
  getDistinctNames,
  getDistinctNameZh,
  getSuggestionReferenceCount,
} from '@/lib/supabase/items'
import { deleteCustomOption, getOptionHistory } from '@/lib/customOptions'

const GROUPS = [
  { key: 'brand', label: '品牌', sources: ['brand_en', 'brand_zh'] },
  { key: 'name_en_full', label: '品名（原文）', sources: ['name_en_full'] },
  { key: 'name_zh', label: '品名（中文）', sources: ['name_zh'] },
] as const

type GroupKey = (typeof GROUPS)[number]['key']
type GroupsState = Record<GroupKey, string[]>
type PendingDelete = { key: GroupKey; value: string; references: number }

function emptyGroups(): GroupsState {
  return { brand: [], name_en_full: [], name_zh: [] }
}

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => !!value)))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

function optionGroup(key: GroupKey, dbValues: Array<string | null | undefined>): string[] {
  const group = GROUPS.find((optionGroup) => optionGroup.key === key)!
  const history = group.sources.flatMap((field) => getOptionHistory(field))
  return uniqueSorted([...dbValues, ...history])
}

export default function SuggestionsPage() {
  const [groups, setGroups] = useState<GroupsState>(emptyGroups)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const { showToast } = useToast()

  const loadGroups = useCallback(async () => {
    setLoading(true)
    try {
      const [brandsResult, namesResult, namesZhResult] = await Promise.all([
        getDistinctBrands(),
        getDistinctNames(),
        getDistinctNameZh(),
      ])
      const error = brandsResult.error || namesResult.error || namesZhResult.error
      if (error) throw error

      const brandValues = (brandsResult.data ?? []).flatMap((row) => [row.brand_en, row.brand_zh])
      const originalNames = (namesResult.data ?? [])
        .filter((row) => row.name_en)
        .map((row) => row.brand_en ? `${row.brand_en} — ${row.name_en}` : row.name_en)
      const chineseNames = (namesZhResult.data ?? []).map((row) => row.name_zh)

      setGroups({
        brand: optionGroup('brand', brandValues),
        name_en_full: optionGroup('name_en_full', originalNames),
        name_zh: optionGroup('name_zh', chineseNames),
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : undefined
      showToast('讀取建議詞失敗', 'error', detail)
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { void loadGroups() }, [loadGroups])

  const filteredQuery = query.trim().toLocaleLowerCase()
  const filteredGroups = useMemo(() => Object.fromEntries(
    GROUPS.map(({ key }) => [
      key,
      groups[key].filter((value) => value.toLocaleLowerCase().includes(filteredQuery)),
    ])
  ) as Record<GroupKey, string[]>, [groups, filteredQuery])

  async function requestDelete(key: GroupKey, value: string) {
    try {
      const references = await getSuggestionReferenceCount(key, value)
      setPendingDelete({ key, value, references })
    } catch (error) {
      const detail = error instanceof Error ? error.message : undefined
      showToast('無法確認資料影響範圍', 'error', detail)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    const { key, value, references } = pendingDelete
    try {
      const result = await deleteSuggestionFromItems(key, value)
      if (result.error) throw result.error

      deleteCustomOption(key, value)
      setGroups((current) => ({
        ...current,
        [key]: current[key].filter((option) => option !== value),
      }))
      setPendingDelete(null)
      showToast(`已刪除建議詞，清除了 ${result.count ?? references} 個欄位值`)
    } catch (error) {
      const detail = error instanceof Error ? error.message : undefined
      showToast('刪除失敗，資料未完整清除', 'error', detail)
      await loadGroups()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">建議詞管理</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          刪除輸入錯誤的品牌或品名建議。
        </p>
      </div>

      <div className="mb-4 rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-3.5 py-3">
        <p className="text-xs leading-relaxed text-[var(--color-text)]">
          刪除會清空資料庫中完全相符的品牌／品名欄位及本機輸入歷史，但不會刪除品項紀錄。若同一文字用於多筆品項，將一併清除這些欄位。
        </p>
      </div>

      <label className="relative mb-5 block">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜尋品牌或品名"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] py-2.5 pl-9 pr-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
        />
      </label>

      {loading ? (
        <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">載入建議中…</p>
      ) : (
        <div className="space-y-5">
          {GROUPS.map(({ key, label }) => (
            <section key={key}>
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-[var(--color-text)]">{label}</h3>
                <span className="text-xs text-[var(--color-text-muted)]">{filteredGroups[key].length} 個建議</span>
              </div>
              <div className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
                {filteredGroups[key].length ? filteredGroups[key].map((value) => (
                  <div key={value} className="flex min-w-0 items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1 break-words text-sm text-[var(--color-text)]">{value}</span>
                    <button
                      type="button"
                      onClick={() => void requestDelete(key, value)}
                      className="flex min-h-0 shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--color-danger)] transition-opacity hover:opacity-70 active:opacity-50"
                      style={{ background: 'color-mix(in srgb, var(--color-danger) 12%, transparent)' }}
                      aria-label={`刪除「${value}」`}
                    >
                      <Trash2 size={14} />
                      刪除
                    </button>
                  </div>
                )) : (
                  <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                    {query ? '沒有符合的建議' : '目前沒有建議詞'}
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5" role="presentation">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-suggestion-title"
            aria-describedby="delete-suggestion-description"
            className="w-full max-w-sm rounded-2xl bg-[var(--color-bg-card)] p-5 shadow-xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 id="delete-suggestion-title" className="text-base font-semibold text-[var(--color-text)]">確認永久刪除？</h3>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
                className="flex h-7 w-7 min-h-0 min-w-0 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]"
                aria-label="取消刪除"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mb-2 break-words text-sm font-medium text-[var(--color-text)]">「{pendingDelete.value}」</p>
            <p id="delete-suggestion-description" className="mb-5 text-sm leading-relaxed text-[var(--color-text-muted)]">
              將清除 {pendingDelete.references} 個完全相符的資料欄位及本機輸入歷史。品項紀錄會保留，清除的文字無法由此頁還原。
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-muted)] min-h-0 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="flex-1 rounded-xl bg-[var(--color-danger)] px-3 py-2.5 text-sm font-medium text-white min-h-0 disabled:opacity-50"
              >
                {deleting ? '刪除中…' : '永久刪除'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}