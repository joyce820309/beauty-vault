import { useState, createContext, useContext, useCallback } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error'
interface Toast { id: number; message: string; detail?: string; type: ToastType }

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, detail?: string) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  let nextId = 0

  const showToast = useCallback((message: string, type: ToastType = 'success', detail?: string) => {
    const id = ++nextId
    setToasts((prev) => [...prev, { id, message, detail, type }])
    // error 停留 6 秒，success 停留 3.5 秒
    const duration = type === 'error' ? 6000 : 3500
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[min(360px,90vw)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm animate-[fadeIn_0.2s_ease] ${
              t.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200'
                : 'bg-[var(--color-bg-card)] border-[var(--color-border)] text-[var(--color-text)]'
            }`}
          >
            {t.type === 'success'
              ? <CheckCircle size={16} strokeWidth={1.5} className="text-green-500 flex-shrink-0 mt-0.5" />
              : <AlertCircle size={16} strokeWidth={1.5} className="text-red-500 flex-shrink-0 mt-0.5" />
            }
            <div className="flex-1 min-w-0">
              <p className="font-medium leading-snug">{t.message}</p>
              {t.detail && (
                <p className="text-xs mt-0.5 opacity-75 break-all">{t.detail}</p>
              )}
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="min-h-0 min-w-0 opacity-60 hover:opacity-100 flex-shrink-0 mt-0.5"
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
