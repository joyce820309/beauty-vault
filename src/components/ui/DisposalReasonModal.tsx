import { Trash2, CircleCheckBig } from 'lucide-react'
import type { DisposalReason } from '@/types/database'

interface Props {
  current?: DisposalReason | null
  onSelect: (reason: DisposalReason) => void
  onCancel: () => void
  loading?: boolean
}

const OPTIONS: { value: DisposalReason; Icon: typeof Trash2; label: string; desc: string }[] = [
  { value: 'finished',  Icon: CircleCheckBig, label: '已用完',    desc: '整罐 / 整條用完了' },
  { value: 'discarded', Icon: Trash2,         label: '未用完丟棄', desc: '還有剩但決定丟掉' },
]

export function DisposalReasonModal({ current, onSelect, onCancel, loading }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-6 sm:pb-0">
      <div className="bg-[var(--color-bg-card)] rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <p className="text-sm font-semibold text-[var(--color-text)]">丟棄原因</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">請選擇丟棄這個品項的原因</p>
        </div>

        <div className="px-4 pb-3 space-y-2">
          {OPTIONS.map(({ value, Icon, label, desc }) => {
            const isActive = current === value
            return (
              <button
                key={value}
                type="button"
                disabled={loading}
                onClick={() => onSelect(value)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-colors min-h-0 ${
                  isActive
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-muted)] hover:border-[var(--color-primary)]/50'
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={1.5}
                  className={isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}
                />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                    {label}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{desc}</p>
                </div>
                {isActive && (
                  <span className="w-4 h-4 rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs leading-none">✓</span>
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] transition-colors min-h-0"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
