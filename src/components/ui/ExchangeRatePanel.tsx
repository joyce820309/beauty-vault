import { useState } from 'react'
import { ChevronDown, Landmark, Plus, X } from 'lucide-react'

const CURRENCIES = ['USD', 'EUR', 'JPY', 'KRW'] as const

const CACHE_KEY = 'beauty-vault:exchange-rates-twd'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 小時內重複查詢直接用快取

interface RateCache {
  rates: Record<string, number>
  fetchedAt: number
}

function loadCache(): RateCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveCache(cache: RateCache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)) } catch {}
}

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type Status = 'idle' | 'loading' | 'success' | 'cached' | 'error'

/** 幣值歷史紀錄的最小共同形狀，由呼叫端（items / wishlist）各自對應到自己的資料表 */
export interface ExchangeRateEntry {
  id: number
  currency: string
  converted_amount: number
  fetched_at: string
}

interface Props {
  amount: number | null | undefined
  onAdd: (currency: string, rate: number, convertedAmount: number) => Promise<void>
}

/** 購入 / 預算金額（TWD）換算今日匯率的行內展開面板，可將選定幣別加入幣值歷史 */
export function ExchangeRatePanel({ amount, onAdd }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [rates, setRates] = useState<Record<string, number> | null>(null)
  const [fetchedAt, setFetchedAt] = useState<number | null>(null)
  const [adding, setAdding] = useState<string | null>(null)

  const hasAmount = amount != null && amount > 0

  async function loadRates() {
    const cache = loadCache()
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
      setRates(cache.rates)
      setFetchedAt(cache.fetchedAt)
      setStatus('cached')
      return
    }

    setStatus('loading')
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/TWD')
      if (!res.ok) throw new Error('network')
      const json = await res.json()
      if (json.result !== 'success' || !json.rates) throw new Error('bad response')
      const nextRates: Record<string, number> = {}
      for (const c of CURRENCIES) {
        if (typeof json.rates[c] === 'number') nextRates[c] = json.rates[c]
      }
      const now = Date.now()
      setRates(nextRates)
      setFetchedAt(now)
      setStatus('success')
      saveCache({ rates: nextRates, fetchedAt: now })
    } catch {
      setStatus('error')
    }
  }

  function toggle() {
    const next = !expanded
    setExpanded(next)
    if (next && status === 'idle') loadRates()
  }

  async function handleAdd(currency: string) {
    if (!rates || !hasAmount) return
    const rate = rates[currency]
    if (rate == null) return
    setAdding(currency)
    await onAdd(currency, rate, amount! * rate)
    setAdding(null)
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={!hasAmount}
        className="ml-auto flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] min-h-0 min-w-0 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Landmark size={12} strokeWidth={2} />
        今日匯率
        <ChevronDown size={12} strokeWidth={2} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && hasAmount && (
        <div className="mt-2 bg-[var(--color-bg-muted)] rounded-xl p-3 space-y-2">
          {status === 'loading' && (
            <p className="text-xs text-[var(--color-text-muted)]">正在查詢今日匯率…</p>
          )}

          {status === 'error' && (
            <div className="space-y-1.5">
              <p className="text-xs text-[var(--color-danger)]">目前無法取得匯率，請稍後再試。</p>
              <button
                type="button"
                onClick={loadRates}
                className="text-xs font-medium text-[var(--color-primary)]"
              >
                重試
              </button>
            </div>
          )}

          {(status === 'success' || status === 'cached') && rates && (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                {CURRENCIES.map((c) => (
                  rates[c] != null && (
                    <div
                      key={c}
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-[var(--color-bg-card)] text-xs"
                    >
                      <span className="text-[var(--color-text-muted)]">{c}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-[var(--color-text)]">
                          {(amount! * rates[c]).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdd(c)}
                          disabled={adding === c}
                          title="加入幣值歷史"
                          className="w-5 h-5 flex items-center justify-center rounded-full text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors min-h-0 min-w-0 disabled:opacity-40"
                        >
                          <Plus size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  )
                ))}
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)]">
                {status === 'cached' && fetchedAt
                  ? `顯示快取匯率（${new Date(fetchedAt).toLocaleString()}）`
                  : '僅供參考，實際以刷卡與店家匯率為準'}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface HistoryProps {
  history: ExchangeRateEntry[]
  onDelete: (id: number) => Promise<void>
}

/** 獨立的幣值歷史區塊，樣式與收合行為比照備註（CollapsibleNote），預設收合，非重要資訊 */
export function ExchangeRateHistory({ history, onDelete }: HistoryProps) {
  const [expanded, setExpanded] = useState(false)

  if (history.length === 0) return null

  async function handleDelete(id: number) {
    if (!confirm('確定要刪除這筆幣值歷史紀錄？')) return
    await onDelete(id)
  }

  return (
    <div className="bg-[var(--color-bg-muted)] rounded-xl px-3 py-2">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setExpanded((v) => !v)
        }}
        className="flex items-center gap-0.5 text-xs font-medium text-[var(--color-primary)] min-h-0 min-w-0"
      >
        幣值歷史
        <ChevronDown size={12} strokeWidth={2} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="mt-1.5 space-y-1.5">
          {history.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[var(--color-bg-card)] text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--color-text)]">{h.currency}</span>
                <span className="text-[var(--color-text)]">
                  {h.converted_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span className="text-[var(--color-text-muted)]">{fmtDateTime(h.fetched_at)}</span>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(h.id)}
                className="w-5 h-5 flex items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)] transition-colors min-h-0 min-w-0"
              >
                <X size={12} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
