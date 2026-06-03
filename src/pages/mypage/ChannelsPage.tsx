import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Check, X, Plus, AlertTriangle } from 'lucide-react'
import { useChannels } from '@/hooks/useChannels'
import {
  createChannel, updateChannel, deleteChannel,
  getItemsByChannel, type Channel,
} from '@/lib/supabase/channels'
import { useToast } from '@/components/ui/Toast'

interface ItemPreview { id: number; brand_en: string | null; brand_zh: string | null; name_en: string | null; name_zh: string | null }

function ChannelRow({ channel, onRename, onDelete }: {
  channel: Channel
  onRename: (ch: Channel, newLabel: string) => Promise<boolean>
  onDelete: (ch: Channel) => Promise<void>
}) {
  const [mode, setMode]     = useState<'idle' | 'rename' | 'delete'>('idle')
  const [label, setLabel]   = useState('')
  const [busy, setBusy]     = useState(false)
  const [items, setItems]   = useState<ItemPreview[] | null>(null)

  async function startDelete() {
    setBusy(true)
    const { data } = await getItemsByChannel(channel.label)
    setItems((data ?? []) as ItemPreview[])
    setBusy(false)
    setMode('delete')
  }

  async function confirmRename() {
    const t = label.trim()
    if (!t || t === channel.label) { setMode('idle'); return }
    setBusy(true)
    await onRename(channel, t)
    setBusy(false)
    setMode('idle')
  }

  async function confirmDelete() {
    setBusy(true)
    await onDelete(channel)
    setBusy(false)
  }

  return (
    <div className="border-b border-[var(--color-border)] last:border-0">
      <div className="flex items-center px-4 py-3 gap-2">
        {mode === 'rename' ? (
          <>
            <input
              autoFocus type="text" value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => {
                if (e.nativeEvent.isComposing) return
                if (e.key === 'Enter') confirmRename()
                if (e.key === 'Escape') setMode('idle')
              }}
              className="flex-1 text-sm px-2 py-1 rounded-lg border border-[var(--color-primary)] bg-[var(--color-bg-card)] text-[var(--color-text)] focus:outline-none"
            />
            <button onClick={confirmRename} disabled={!label.trim() || busy}
              className="w-7 h-7 flex items-center justify-center text-[var(--color-primary)] disabled:opacity-40 min-h-0 min-w-0">
              <Check size={14} strokeWidth={2.5} />
            </button>
            <button onClick={() => setMode('idle')}
              className="w-7 h-7 flex items-center justify-center text-[var(--color-text-muted)] min-h-0 min-w-0">
              <X size={13} strokeWidth={2} />
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm text-[var(--color-text)]">{channel.label}</span>
            <button onClick={() => { setMode('rename'); setLabel(channel.label) }}
              className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-primary)] transition-colors min-h-0 min-w-0">
              <Pencil size={12} strokeWidth={2} />
            </button>
            <button onClick={startDelete} disabled={busy}
              className="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-red-50 hover:text-red-400 transition-colors min-h-0 min-w-0 disabled:opacity-40">
              <X size={13} strokeWidth={2} />
            </button>
          </>
        )}
      </div>

      {mode === 'delete' && items !== null && (
        <div className="mx-4 mb-3 rounded-xl border border-[var(--color-warning)]/40 bg-orange-50/60 p-3 space-y-2">
          {items.length > 0 ? (
            <>
              <div className="flex items-start gap-1.5">
                <AlertTriangle size={13} className="text-[var(--color-warning)] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[var(--color-text)]">
                  <span className="font-medium">「{channel.label}」</span> 被 {items.length} 個品項使用，刪除後通路欄位將保留舊值：
                </p>
              </div>
              <ul className="pl-4 space-y-0.5">
                {items.map(item => (
                  <li key={item.id} className="text-xs text-[var(--color-text-muted)]">
                    {(item.brand_en || item.brand_zh) && (
                      <span className="text-[var(--color-primary-dark)]">{item.brand_en || item.brand_zh} </span>
                    )}
                    {item.name_en || item.name_zh || '（未命名）'}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-xs text-[var(--color-text)]">
              確定刪除「<span className="font-medium">{channel.label}</span>」？
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={() => setMode('idle')}
              className="flex-1 py-1.5 rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] min-h-0">
              取消
            </button>
            <button onClick={confirmDelete} disabled={busy}
              className="flex-1 py-1.5 rounded-lg bg-red-400 text-white text-xs font-medium min-h-0 disabled:opacity-50">
              {busy ? '刪除中…' : '確認刪除'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ChannelsPage() {
  const navigate = useNavigate()
  const { channels, reload } = useChannels()
  const { showToast } = useToast()
  const [adding, setAdding]     = useState(false)
  const [addLabel, setAddLabel] = useState('')
  const [saving, setSaving]     = useState(false)

  async function handleRename(ch: Channel, newLabel: string): Promise<boolean> {
    const { error } = await updateChannel(ch.id, newLabel, ch.label)
    if (error) { showToast('更新失敗', 'error'); return false }
    showToast('已更新'); reload(); return true
  }

  async function handleDelete(ch: Channel): Promise<void> {
    const { error } = await deleteChannel(ch.id)
    if (error) showToast('刪除失敗', 'error'); else { showToast('已刪除'); reload() }
  }

  async function handleAdd() {
    const label = addLabel.trim()
    if (!label) return
    setSaving(true)
    const nextOrder = channels.length > 0 ? Math.max(...channels.map(c => c.sort_order)) + 1 : 0
    const { error } = await createChannel(label, nextOrder)
    setSaving(false)
    if (error) { showToast('新增失敗', 'error'); return }
    showToast('已新增'); reload()
    setAdding(false); setAddLabel('')
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-[var(--color-text-muted)] min-h-0 min-w-0 p-1">‹</button>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">通路管理</h2>
      </div>

      <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-muted)]">
          <span className="text-sm font-semibold text-[var(--color-text)]">購買通路</span>
          <span className="ml-auto text-xs text-[var(--color-text-muted)]">{channels.length} 個</span>
        </div>

        {channels.map(ch => (
          <ChannelRow key={ch.id} channel={ch} onRename={handleRename} onDelete={handleDelete} />
        ))}

        {adding ? (
          <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--color-border)]">
            <input
              autoFocus type="text" value={addLabel}
              onChange={e => setAddLabel(e.target.value)}
              onKeyDown={e => {
                if (e.nativeEvent.isComposing) return
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') { setAdding(false); setAddLabel('') }
              }}
              placeholder="通路名稱…"
              className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-[var(--color-primary)] bg-[var(--color-bg-card)] text-[var(--color-text)] focus:outline-none"
            />
            <button onClick={handleAdd} disabled={!addLabel.trim() || saving}
              className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-medium min-h-0 disabled:opacity-40">
              {saving ? '…' : '確認'}
            </button>
            <button onClick={() => { setAdding(false); setAddLabel('') }}
              className="text-[var(--color-text-muted)] min-h-0 min-w-0 px-1">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)}
            className="w-full flex items-center gap-2 px-4 py-3 border-t border-[var(--color-border)] text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors min-h-0">
            <Plus size={14} strokeWidth={2} />新增通路
          </button>
        )}
      </div>

      <p className="text-xs text-[var(--color-text-muted)] mt-4 px-1">
        重新命名通路時，已標記該通路的品項也會同步更新。
      </p>
    </div>
  )
}
