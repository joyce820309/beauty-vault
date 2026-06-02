import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Sparkle, Droplets, Pencil, Check, AlertTriangle, ChevronDown } from 'lucide-react'
import { useCategories, type Category } from '@/contexts/CategoriesContext'
import { createCategory, deleteCategory, updateCategory } from '@/lib/supabase/categories'
import { getItemsByCategory } from '@/lib/supabase/items'
import { useToast } from '@/components/ui/Toast'

type ItemType = 'makeup' | 'skincare'
interface ItemPreview { id: number; brand_en: string | null; brand_zh: string | null; name_en: string | null; name_zh: string | null }

// ─── 子類行 ────────────────────────────────────────────────────────────────────
function ChildRow({ cat, onRename, onDelete }: {
  cat: Category
  onRename: (cat: Category, label: string) => Promise<boolean>
  onDelete: (cat: Category) => Promise<void>
}) {
  const [mode, setMode] = useState<'idle' | 'rename' | 'delete'>('idle')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [items, setItems] = useState<ItemPreview[] | null>(null)

  async function startDelete() {
    setBusy(true)
    const { data } = await getItemsByCategory(cat.value)
    setItems((data ?? []) as ItemPreview[])
    setBusy(false)
    setMode('delete')
  }

  async function confirmRename() {
    const t = label.trim()
    if (!t || t === cat.label) { setMode('idle'); return }
    setBusy(true)
    await onRename(cat, t)
    setBusy(false)
    setMode('idle')
  }

  async function confirmDelete() {
    setBusy(true)
    await onDelete(cat)
    setBusy(false)
  }

  return (
    <div className="border-t border-[var(--color-border)]">
      <div className="flex items-center pl-8 pr-4 py-2 gap-2">
        {mode === 'rename' ? (
          <>
            <input autoFocus type="text" value={label} onChange={e => setLabel(e.target.value)}
              onKeyDown={e => { if (e.nativeEvent.isComposing) return; if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setMode('idle') }}
              className="flex-1 text-sm px-2 py-1 rounded-lg border border-[var(--color-primary)] bg-[var(--color-bg-card)] text-[var(--color-text)] focus:outline-none" />
            <button onClick={confirmRename} disabled={!label.trim() || busy} className="w-6 h-6 flex items-center justify-center text-[var(--color-primary)] disabled:opacity-40 min-h-0 min-w-0">
              <Check size={13} strokeWidth={2.5} />
            </button>
            <button onClick={() => setMode('idle')} className="w-6 h-6 flex items-center justify-center text-[var(--color-text-muted)] min-h-0 min-w-0">
              <X size={12} strokeWidth={2} />
            </button>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-border)] flex-shrink-0" />
            <span className="flex-1 text-sm text-[var(--color-text)]">{cat.label}</span>
            <button onClick={() => { setMode('rename'); setLabel(cat.label) }}
              className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-primary)] transition-colors min-h-0 min-w-0">
              <Pencil size={11} strokeWidth={2} />
            </button>
            <button onClick={startDelete} disabled={busy}
              className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-red-50 hover:text-red-400 transition-colors min-h-0 min-w-0 disabled:opacity-40">
              <X size={12} strokeWidth={2} />
            </button>
          </>
        )}
      </div>

      {/* 刪除確認 */}
      {mode === 'delete' && items !== null && (
        <div className="mx-4 mb-3 rounded-xl border border-[var(--color-warning)]/40 bg-orange-50/60 p-3 space-y-2">
          {items.length > 0 ? (
            <>
              <div className="flex items-start gap-1.5">
                <AlertTriangle size={13} className="text-[var(--color-warning)] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[var(--color-text)]">
                  <span className="font-medium">「{cat.label}」</span> 被 {items.length} 個品項使用，刪除後類別欄位將顯示代碼：
                </p>
              </div>
              <ul className="pl-4 space-y-0.5">
                {items.map(item => (
                  <li key={item.id} className="text-xs text-[var(--color-text-muted)]">
                    {(item.brand_en || item.brand_zh) && <span className="text-[var(--color-primary-dark)]">{item.brand_en || item.brand_zh} </span>}
                    {item.name_en || item.name_zh || '（未命名）'}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-xs text-[var(--color-text)]">確定刪除「<span className="font-medium">{cat.label}</span>」？</p>
          )}
          <div className="flex gap-2">
            <button onClick={() => setMode('idle')} className="flex-1 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] min-h-0">取消</button>
            <button onClick={confirmDelete} disabled={busy} className="flex-1 py-1.5 rounded-lg bg-red-400 text-white text-xs font-medium min-h-0 disabled:opacity-50">{busy ? '刪除中…' : '確認刪除'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 大類行（含子類） ──────────────────────────────────────────────────────────
function ParentSection({ parent, children, onRenameChild, onDeleteChild, onAddChild, onRenameParent, onDeleteParent }: {
  parent: Category
  children: Category[]
  onRenameChild: (cat: Category, label: string) => Promise<boolean>
  onDeleteChild: (cat: Category) => Promise<void>
  onAddChild: (parentId: number, label: string) => Promise<boolean>
  onRenameParent: (cat: Category, label: string) => Promise<boolean>
  onDeleteParent: (cat: Category) => Promise<void>
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameLabel, setRenameLabel] = useState('')
  const [addingChild, setAddingChild] = useState(false)
  const [addLabel, setAddLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleRenameParent() {
    const t = renameLabel.trim()
    if (!t || t === parent.label) { setRenaming(false); return }
    setBusy(true)
    await onRenameParent(parent, t)
    setBusy(false)
    setRenaming(false)
  }

  async function handleAddChild() {
    const t = addLabel.trim()
    if (!t) return
    setBusy(true)
    const ok = await onAddChild(parent.id, t)
    setBusy(false)
    if (ok) { setAddingChild(false); setAddLabel('') }
  }

  async function handleDeleteParent() {
    setBusy(true)
    await onDeleteParent(parent)
    setBusy(false)
  }

  return (
    <div className="border-b border-[var(--color-border)] last:border-0">
      {/* 大類行 */}
      <div className="flex items-center px-4 py-2.5 gap-2 bg-[var(--color-bg-muted)]/50">
        <button onClick={() => setCollapsed(v => !v)} className="min-h-0 min-w-0 text-[var(--color-text-muted)]">
          <ChevronDown size={14} strokeWidth={2} className={`transition-transform ${collapsed ? '-rotate-90' : ''}`} />
        </button>

        {renaming ? (
          <>
            <input autoFocus type="text" value={renameLabel} onChange={e => setRenameLabel(e.target.value)}
              onKeyDown={e => { if (e.nativeEvent.isComposing) return; if (e.key === 'Enter') handleRenameParent(); if (e.key === 'Escape') setRenaming(false) }}
              className="flex-1 text-sm font-semibold px-2 py-0.5 rounded-lg border border-[var(--color-primary)] bg-[var(--color-bg-card)] text-[var(--color-text)] focus:outline-none" />
            <button onClick={handleRenameParent} disabled={!renameLabel.trim() || busy} className="w-6 h-6 flex items-center justify-center text-[var(--color-primary)] disabled:opacity-40 min-h-0 min-w-0">
              <Check size={13} strokeWidth={2.5} />
            </button>
            <button onClick={() => setRenaming(false)} className="w-6 h-6 flex items-center justify-center text-[var(--color-text-muted)] min-h-0 min-w-0">
              <X size={12} strokeWidth={2} />
            </button>
          </>
        ) : (
          <>
            {/* 左側：大類名稱 + 數量 + 新增子類 */}
            <span className="text-sm font-semibold text-[var(--color-text)]">{parent.label}</span>
            <span className="text-xs text-[var(--color-text-muted)] tabular-nums">{children.length}</span>
            <button onClick={() => setAddingChild(v => !v)} title="新增子類"
              className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-primary)] transition-colors min-h-0 min-w-0">
              <Plus size={13} strokeWidth={2} />
            </button>
            {/* 彈性空白將編輯/刪除推到右側 */}
            <span className="flex-1" />
            <button onClick={() => { setRenaming(true); setRenameLabel(parent.label) }}
              className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-primary)] transition-colors min-h-0 min-w-0">
              <Pencil size={11} strokeWidth={2} />
            </button>
            <button onClick={() => setConfirmDelete(true)} disabled={busy}
              className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-red-50 hover:text-red-400 transition-colors min-h-0 min-w-0 disabled:opacity-40">
              <X size={12} strokeWidth={2} />
            </button>
          </>
        )}
      </div>

      {/* 大類刪除確認 */}
      {confirmDelete && (
        <div className="mx-4 my-2 rounded-xl border border-[var(--color-warning)]/40 bg-orange-50/60 p-3 space-y-2">
          {children.length > 0 ? (
            <div className="flex items-start gap-1.5">
              <AlertTriangle size={13} className="text-[var(--color-warning)] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[var(--color-text)]">
                「{parent.label}」下有 {children.length} 個子類，刪除大類後子類將成為未分組狀態。
              </p>
            </div>
          ) : (
            <p className="text-xs text-[var(--color-text)]">確定刪除大類「<span className="font-medium">{parent.label}</span>」？</p>
          )}
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="flex-1 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] min-h-0">取消</button>
            <button onClick={handleDeleteParent} disabled={busy} className="flex-1 py-1.5 rounded-lg bg-red-400 text-white text-xs font-medium min-h-0 disabled:opacity-50">{busy ? '刪除中…' : '確認刪除'}</button>
          </div>
        </div>
      )}

      {/* 子類列表 */}
      {!collapsed && (
        <>
          {children.map(child => (
            <ChildRow key={child.id} cat={child} onRename={onRenameChild} onDelete={onDeleteChild} />
          ))}

          {/* 新增子類行內輸入 */}
          {addingChild && (
            <div className="flex items-center pl-8 pr-4 py-2 gap-2 border-t border-[var(--color-border)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]/40 flex-shrink-0" />
              <input autoFocus type="text" value={addLabel} onChange={e => setAddLabel(e.target.value)}
                onKeyDown={e => { if (e.nativeEvent.isComposing) return; if (e.key === 'Enter') handleAddChild(); if (e.key === 'Escape') { setAddingChild(false); setAddLabel('') } }}
                placeholder="子類名稱…"
                className="flex-1 text-sm px-2 py-1 rounded-lg border border-[var(--color-primary)] bg-[var(--color-bg-card)] text-[var(--color-text)] focus:outline-none" />
              <button onClick={handleAddChild} disabled={!addLabel.trim() || busy}
                className="px-2.5 py-1 rounded-lg bg-[var(--color-primary)] text-white text-xs font-medium min-h-0 disabled:opacity-40">
                {busy ? '…' : '確認'}
              </button>
              <button onClick={() => { setAddingChild(false); setAddLabel('') }} className="text-[var(--color-text-muted)] min-h-0 min-w-0">
                <X size={13} strokeWidth={2} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── 品項類型區塊（模組層級，reference 穩定，避免 IME 中斷）────────────────────
interface TypeSectionProps {
  type: ItemType
  parents: Category[]
  leafCategories: Category[]
  Icon: React.ElementType
  getChildren: (parentId: number) => Category[]
  onRenameAny: (cat: Category, label: string) => Promise<boolean>
  onDeleteAny: (cat: Category) => Promise<void>
  onAddChild: (parentId: number, label: string) => Promise<boolean>
  onAddParent: (type: ItemType, label: string) => Promise<boolean>
}

function TypeSection({ type, parents, leafCategories, Icon, getChildren, onRenameAny, onDeleteAny, onAddChild, onAddParent }: TypeSectionProps) {
  const [addingParent, setAddingParent] = useState(false)
  const [addParentLabel, setAddParentLabel] = useState('')
  const [savingParent, setSavingParent] = useState(false)

  async function handleAddParent() {
    const label = addParentLabel.trim()
    if (!label) return
    setSavingParent(true)
    const ok = await onAddParent(type, label)
    setSavingParent(false)
    if (ok) { setAddingParent(false); setAddParentLabel('') }
  }

  const orphaned = leafCategories.filter(c => !parents.some(p => p.id === c.parent_id))

  return (
    <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-muted)]">
        <Icon size={15} strokeWidth={1.5} className="text-[var(--color-primary)]" />
        <span className="text-sm font-semibold text-[var(--color-text)]">{type === 'makeup' ? '化妝品' : '保養品'}</span>
        <span className="ml-auto text-xs text-[var(--color-text-muted)]">
          {parents.length} 個大類 · {leafCategories.length} 個子類
        </span>
      </div>

      {parents.map(parent => (
        <ParentSection
          key={parent.id}
          parent={parent}
          children={getChildren(parent.id)}
          onRenameChild={onRenameAny}
          onDeleteChild={onDeleteAny}
          onAddChild={onAddChild}
          onRenameParent={onRenameAny}
          onDeleteParent={onDeleteAny}
        />
      ))}

      {orphaned.length > 0 && (
        <div className="border-t border-[var(--color-border)]">
          <p className="px-4 pt-2 pb-0.5 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">未分組</p>
          {orphaned.map(cat => (
            <ChildRow key={cat.id} cat={cat} onRename={onRenameAny} onDelete={onDeleteAny} />
          ))}
        </div>
      )}

      {addingParent ? (
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[var(--color-border)]">
          <input autoFocus type="text" value={addParentLabel} onChange={e => setAddParentLabel(e.target.value)}
            onKeyDown={e => { if (e.nativeEvent.isComposing) return; if (e.key === 'Enter') handleAddParent(); if (e.key === 'Escape') { setAddingParent(false); setAddParentLabel('') } }}
            placeholder="大類名稱…"
            className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-[var(--color-primary)] bg-[var(--color-bg-card)] text-[var(--color-text)] focus:outline-none" />
          <button onClick={handleAddParent} disabled={!addParentLabel.trim() || savingParent}
            className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-medium min-h-0 disabled:opacity-40">
            {savingParent ? '…' : '確認'}
          </button>
          <button onClick={() => { setAddingParent(false); setAddParentLabel('') }} className="text-[var(--color-text-muted)] min-h-0 min-w-0 px-1">
            <X size={14} />
          </button>
        </div>
      ) : (
        <button onClick={() => setAddingParent(true)}
          className="w-full flex items-center gap-2 px-4 py-2.5 border-t border-[var(--color-border)] text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors min-h-0">
          <Plus size={14} strokeWidth={2} />新增大類
        </button>
      )}
    </div>
  )
}

// ─── 主頁 ──────────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const navigate = useNavigate()
  const { makeupParents, skincareParents, makeupCategories, skincareCategories, getChildren, reload } = useCategories()
  const { showToast } = useToast()

  async function handleRenameAny(cat: Category, label: string): Promise<boolean> {
    const { error } = await updateCategory(cat.id, label)
    if (error) { showToast('更新失敗', 'error'); return false }
    showToast('已更新'); reload(); return true
  }

  async function handleDeleteAny(cat: Category): Promise<void> {
    const { error } = await deleteCategory(cat.id)
    if (error) showToast('刪除失敗', 'error'); else { showToast('已刪除'); reload() }
  }

  async function handleAddChild(parentId: number, label: string): Promise<boolean> {
    const parent = [...makeupParents, ...skincareParents].find(p => p.id === parentId)
    if (!parent) return false
    const siblings = getChildren(parentId)
    const nextOrder = siblings.length > 0 ? Math.max(...siblings.map(c => c.sort_order)) + 1 : 0
    const { error } = await createCategory({
      item_type: parent.item_type, value: `custom_${Date.now()}`,
      label, sort_order: nextOrder, parent_id: parentId,
    })
    if (error) { showToast('新增失敗', 'error'); return false }
    showToast('已新增'); reload(); return true
  }

  async function handleAddParent(type: ItemType, label: string): Promise<boolean> {
    const parents = type === 'makeup' ? makeupParents : skincareParents
    const nextOrder = parents.length > 0 ? Math.max(...parents.map(p => p.sort_order)) + 1 : 0
    const { error } = await createCategory({
      item_type: type, value: `parent_${Date.now()}`,
      label, sort_order: nextOrder, parent_id: null,
    })
    if (error) { showToast('新增失敗', 'error'); return false }
    showToast('已新增大類'); reload(); return true
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-[var(--color-text-muted)] min-h-0 min-w-0 p-1">‹</button>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">類別管理</h2>
      </div>

      <div className="space-y-4">
        <TypeSection type="makeup"   parents={makeupParents}   leafCategories={makeupCategories}
          Icon={Sparkle} getChildren={getChildren}
          onRenameAny={handleRenameAny} onDeleteAny={handleDeleteAny}
          onAddChild={handleAddChild} onAddParent={handleAddParent} />
        <TypeSection type="skincare" parents={skincareParents} leafCategories={skincareCategories}
          Icon={Droplets} getChildren={getChildren}
          onRenameAny={handleRenameAny} onDeleteAny={handleDeleteAny}
          onAddChild={handleAddChild} onAddParent={handleAddParent} />
      </div>

      <p className="text-xs text-[var(--color-text-muted)] mt-4 px-1">
        大類用於分組，子類儲存在品項中。重新命名後品項顯示名稱同步更新。
      </p>
    </div>
  )
}
