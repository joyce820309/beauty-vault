import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Sparkle, Droplets, Pencil, Check, AlertTriangle } from 'lucide-react'
import { useCategories, type Category } from '@/contexts/CategoriesContext'
import { createCategory, deleteCategory, updateCategory } from '@/lib/supabase/categories'
import { getItemsByCategory } from '@/lib/supabase/items'
import { useToast } from '@/components/ui/Toast'

type ItemType = 'makeup' | 'skincare'

interface ItemPreview {
  id: number
  brand_en: string | null
  brand_zh: string | null
  name_en: string | null
  name_zh: string | null
}

interface SectionProps {
  type: ItemType
  list: Category[]
  Icon: React.ElementType
  onAdd: (type: ItemType, label: string) => Promise<boolean>
  onRename: (cat: Category, newLabel: string) => Promise<boolean>
  onDelete: (cat: Category) => Promise<void>
}

function CategorySection({ type, list, Icon, onAdd, onRename, onDelete }: SectionProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [addLabel, setAddLabel] = useState('')
  const [saving, setSaving] = useState(false)

  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameLabel, setRenameLabel] = useState('')
  const [renaming, setRenaming] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState<{ cat: Category; items: ItemPreview[] } | null>(null)
  const [checkingDelete, setCheckingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleAdd() {
    const trimmed = addLabel.trim()
    if (!trimmed) return
    setSaving(true)
    const ok = await onAdd(type, trimmed)
    setSaving(false)
    if (ok) { setIsAdding(false); setAddLabel('') }
  }

  function startRename(cat: Category) {
    setRenamingId(cat.id)
    setRenameLabel(cat.label)
    setDeleteConfirm(null)
  }

  async function handleRename(cat: Category) {
    const trimmed = renameLabel.trim()
    if (!trimmed || trimmed === cat.label) { setRenamingId(null); return }
    setRenaming(true)
    const ok = await onRename(cat, trimmed)
    setRenaming(false)
    if (ok) setRenamingId(null)
  }

  async function handleDeleteClick(cat: Category) {
    setRenamingId(null)
    setDeleteConfirm(null)
    setCheckingDelete(true)
    const { data } = await getItemsByCategory(cat.value)
    setCheckingDelete(false)
    setDeleteConfirm({ cat, items: (data ?? []) as ItemPreview[] })
  }

  async function confirmDelete() {
    if (!deleteConfirm) return
    setDeleting(true)
    await onDelete(deleteConfirm.cat)
    setDeleting(false)
    setDeleteConfirm(null)
  }

  return (
    <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
      {/* 標題 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-muted)]">
        <Icon size={15} strokeWidth={1.5} className="text-[var(--color-primary)]" />
        <span className="text-sm font-semibold text-[var(--color-text)]">
          {type === 'makeup' ? '化妝品' : '保養品'}
        </span>
        <span className="ml-auto text-xs text-[var(--color-text-muted)]">{list.length} 個類別</span>
      </div>

      {/* 類別列表 */}
      <div className="divide-y divide-[var(--color-border)]">
        {list.map((cat) => (
          <div key={cat.id}>
            {/* 主列 */}
            <div className="flex items-center px-4 py-2.5 gap-2">
              {renamingId === cat.id ? (
                /* 重新命名模式 */
                <>
                  <input
                    autoFocus
                    type="text"
                    value={renameLabel}
                    onChange={(e) => setRenameLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return
                      if (e.key === 'Enter') handleRename(cat)
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    className="flex-1 text-sm px-2 py-1 rounded-lg border border-[var(--color-primary)] bg-[var(--color-bg-card)] text-[var(--color-text)] focus:outline-none"
                  />
                  <button
                    onClick={() => handleRename(cat)}
                    disabled={!renameLabel.trim() || renaming}
                    className="w-6 h-6 flex items-center justify-center text-[var(--color-primary)] disabled:opacity-40 min-h-0 min-w-0"
                  >
                    <Check size={14} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => setRenamingId(null)}
                    className="w-6 h-6 flex items-center justify-center text-[var(--color-text-muted)] min-h-0 min-w-0"
                  >
                    <X size={13} strokeWidth={2} />
                  </button>
                </>
              ) : (
                /* 一般模式 */
                <>
                  <span className="flex-1 text-sm text-[var(--color-text)]">{cat.label}</span>
                  <button
                    onClick={() => startRename(cat)}
                    className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-primary)] transition-colors min-h-0 min-w-0"
                  >
                    <Pencil size={12} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(cat)}
                    disabled={checkingDelete}
                    className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-red-50 hover:text-red-400 transition-colors min-h-0 min-w-0 disabled:opacity-40"
                  >
                    <X size={13} strokeWidth={2} />
                  </button>
                </>
              )}
            </div>

            {/* 刪除確認面板 */}
            {deleteConfirm?.cat.id === cat.id && (
              <div className="mx-4 mb-3 rounded-xl border border-[var(--color-warning)]/40 bg-orange-50/60 dark:bg-orange-900/10 p-3 space-y-2.5">
                {deleteConfirm.items.length > 0 ? (
                  <>
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle size={14} className="text-[var(--color-warning)] mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-[var(--color-text)]">
                        <span className="font-medium">「{cat.label}」</span> 被以下 {deleteConfirm.items.length} 個品項使用，刪除後這些品項的類別將顯示為代碼：
                      </p>
                    </div>
                    <ul className="space-y-0.5 pl-5">
                      {deleteConfirm.items.map((item) => {
                        const brand = item.brand_en || item.brand_zh || ''
                        const name = item.name_en || item.name_zh || '（未命名）'
                        return (
                          <li key={item.id} className="text-xs text-[var(--color-text-muted)]">
                            {brand && <span className="text-[var(--color-primary-dark)]">{brand} </span>}
                            {name}
                          </li>
                        )
                      })}
                    </ul>
                  </>
                ) : (
                  <p className="text-xs text-[var(--color-text)]">
                    確定刪除「<span className="font-medium">{cat.label}</span>」？
                  </p>
                )}
                <div className="flex gap-2 pt-0.5">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] min-h-0"
                  >
                    取消
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="flex-1 py-1.5 rounded-lg bg-red-400 text-white text-xs font-medium min-h-0 disabled:opacity-50"
                  >
                    {deleting ? '刪除中…' : '確認刪除'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 新增類別 */}
      {isAdding ? (
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[var(--color-border)]">
          <input
            autoFocus
            type="text"
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') { setIsAdding(false); setAddLabel('') }
            }}
            placeholder="輸入類別名稱…"
            className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-[var(--color-primary)] bg-[var(--color-bg-card)] text-[var(--color-text)] focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!addLabel.trim() || saving}
            className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-medium min-h-0 disabled:opacity-40"
          >
            確認
          </button>
          <button
            onClick={() => { setIsAdding(false); setAddLabel('') }}
            className="text-[var(--color-text-muted)] min-h-0 min-w-0 px-1"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center gap-2 px-4 py-2.5 border-t border-[var(--color-border)] text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors min-h-0"
        >
          <Plus size={14} strokeWidth={2} />
          新增類別
        </button>
      )}
    </div>
  )
}

export default function CategoriesPage() {
  const navigate = useNavigate()
  const { makeupCategories, skincareCategories, reload } = useCategories()
  const { showToast } = useToast()

  async function handleAdd(type: ItemType, label: string): Promise<boolean> {
    const list = type === 'makeup' ? makeupCategories : skincareCategories
    const { error } = await createCategory({ item_type: type, value: label, label, sort_order: list.length })
    if (error) { showToast('新增失敗，類別名稱可能重複', 'error'); return false }
    showToast('已新增類別')
    reload()
    return true
  }

  async function handleRename(cat: Category, newLabel: string): Promise<boolean> {
    const { error } = await updateCategory(cat.id, newLabel)
    if (error) { showToast('更新失敗', 'error'); return false }
    showToast('已更新類別名稱')
    reload()
    return true
  }

  async function handleDelete(cat: Category) {
    const { error } = await deleteCategory(cat.id)
    if (error) showToast('刪除失敗', 'error')
    else { showToast('已刪除'); reload() }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-[var(--color-text-muted)] min-h-0 min-w-0 p-1">‹</button>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">類別管理</h2>
      </div>

      <div className="space-y-4">
        <CategorySection type="makeup" list={makeupCategories} Icon={Sparkle} onAdd={handleAdd} onRename={handleRename} onDelete={handleDelete} />
        <CategorySection type="skincare" list={skincareCategories} Icon={Droplets} onAdd={handleAdd} onRename={handleRename} onDelete={handleDelete} />
      </div>

      <p className="text-xs text-[var(--color-text-muted)] mt-4 px-1">
        重新命名不會影響已使用該類別的品項（顯示名稱會同步更新）。
      </p>
    </div>
  )
}
