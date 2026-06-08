import { useState } from 'react'
import { Download, X } from 'lucide-react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

export function InstallPrompt() {
  const { prompt, install } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('bv-install-dismissed') === '1'
  )

  if (!prompt || dismissed) return null

  function dismiss() {
    setDismissed(true)
    localStorage.setItem('bv-install-dismissed', '1')
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 lg:left-auto lg:right-6 lg:bottom-6 lg:w-80 z-50">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 shadow-lg flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center">
          <Download size={18} strokeWidth={1.5} className="text-[var(--color-primary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text)]">安裝 Beauty Vault</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">加入桌面，隨時快速開啟</p>
          <button
            onClick={install}
            className="mt-2 px-3 py-1.5 bg-[var(--color-primary)] text-white text-xs rounded-lg font-medium min-h-0"
          >
            安裝
          </button>
        </div>
        <button
          onClick={dismiss}
          className="min-h-0 min-w-0 p-1 text-[var(--color-text-muted)] flex-shrink-0"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
