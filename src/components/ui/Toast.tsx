import { useState, createContext, useContext, useCallback } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error'
interface Toast { id: number; message: string; type: ToastType }

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  let nextId = 0

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++nextId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[min(360px,90vw)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-sm text-[var(--color-text)] animate-[fadeIn_0.2s_ease]"
          >
            {t.type === 'success'
              ? <CheckCircle size={16} strokeWidth={1.5} className="text-green-500 flex-shrink-0" />
              : <AlertCircle size={16} strokeWidth={1.5} className="text-red-400 flex-shrink-0" />
            }
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="min-h-0 min-w-0 text-[var(--color-text-muted)]"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
