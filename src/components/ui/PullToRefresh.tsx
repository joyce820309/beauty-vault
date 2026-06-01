import { useRef, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

const THRESHOLD = 72   // 拉到幾px才觸發
const MAX_PULL  = 100  // 最大拉伸距離

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullY, setPullY]       = useState(0)   // 目前拉了幾px
  const [phase, setPhase]       = useState<'idle' | 'pulling' | 'ready' | 'refreshing'>('idle')
  const startY                  = useRef(0)
  const containerRef            = useRef<HTMLDivElement>(null)

  const isAtTop = useCallback(() => {
    const el = containerRef.current
    return !el || el.scrollTop <= 0
  }, [])

  function onTouchStart(e: React.TouchEvent) {
    if (!isAtTop()) return
    startY.current = e.touches[0].clientY
    setPhase('pulling')
  }

  function onTouchMove(e: React.TouchEvent) {
    if (phase === 'refreshing') return
    const delta = e.touches[0].clientY - startY.current
    if (delta <= 0) { setPullY(0); setPhase('pulling'); return }
    // 阻力感：前半段 1:1，後半段 1:0.4
    const resistance = delta < THRESHOLD ? delta : THRESHOLD + (delta - THRESHOLD) * 0.4
    const capped = Math.min(resistance, MAX_PULL)
    setPullY(capped)
    setPhase(capped >= THRESHOLD ? 'ready' : 'pulling')
  }

  async function onTouchEnd() {
    if (phase === 'ready') {
      setPhase('refreshing')
      setPullY(52)
      await onRefresh()
    }
    // 彈回
    setPullY(0)
    setPhase('idle')
  }

  const progress = Math.min(pullY / THRESHOLD, 1)
  const isRefreshing = phase === 'refreshing'

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto overflow-x-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* 下拉指示器 */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all"
        style={{
          height: isRefreshing ? 52 : pullY,
          transition: phase === 'idle' ? 'height 0.3s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
        }}
      >
        <div
          className="flex items-center gap-2"
          style={{
            opacity: isRefreshing ? 1 : progress,
            transform: `scale(${0.6 + progress * 0.4})`,
            transition: isRefreshing ? 'none' : 'opacity 0.1s, transform 0.1s',
          }}
        >
          <RefreshCw
            size={18}
            strokeWidth={1.8}
            className="text-[var(--color-primary)]"
            style={{
              transform: isRefreshing
                ? undefined
                : `rotate(${progress * 260}deg)`,
              animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none',
            }}
          />
          <span className="text-xs text-[var(--color-text-muted)]">
            {isRefreshing ? '更新中…' : phase === 'ready' ? '放開以更新' : '下拉更新'}
          </span>
        </div>
      </div>

      {children}
    </div>
  )
}
