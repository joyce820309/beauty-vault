import { useEffect, useRef, useState, useCallback, forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const AutoTextarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ error, className, onChange, value, defaultValue, ...rest }, forwardedRef) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null)

    // 合併 ref：同時更新 forwardedRef 和 innerRef
    function setRef(el: HTMLTextAreaElement | null) {
      innerRef.current = el
      if (typeof forwardedRef === 'function') forwardedRef(el)
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
    }

    const resize = useCallback(() => {
      const el = innerRef.current
      if (!el) return
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }, [])

    // 受控模式：value 變化時重算高度
    useEffect(() => { resize() }, [value, resize])

    // 初次掛載：defaultValue 或初始 value
    useEffect(() => { resize() }, [])

    return (
      <textarea
        {...rest}
        ref={setRef}
        value={value}
        defaultValue={defaultValue}
        rows={3}
        onChange={(e) => { onChange?.(e); resize() }}
        className={[
          'w-full px-3 py-2.5 rounded-xl border text-sm resize-none overflow-y-auto transition-all',
          'text-[var(--color-text)] bg-[var(--color-bg-card)]',
          'focus:outline-none focus:border-[var(--color-primary)]',
          error
            ? 'border-[var(--color-primary)] shadow-[0_0_0_3px_var(--color-focus-ring)]'
            : 'border-[var(--color-border)]',
          className ?? '',
        ].join(' ')}
        style={{ minHeight: '4.5rem', maxHeight: '16rem' }}
      />
    )
  }
)
AutoTextarea.displayName = 'AutoTextarea'

/** 將備註文字渲染成帶有 bullet / numbered list 的 JSX */
export function NoteContent({
  text,
  className = 'text-sm text-[var(--color-text)]',
}: {
  text: string | null | undefined
  /** 套用於每個文字/清單項目的 text 顏色與大小 class */
  className?: string
}) {
  if (!text?.trim()) return null

  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: string[] = []
  let listType: 'ul' | 'ol' | null = null

  function flushList() {
    if (listItems.length === 0) return
    if (listType === 'ol') {
      elements.push(
        <ol key={elements.length} className={`list-decimal list-inside space-y-0.5 leading-relaxed ${className}`}>
          {listItems.map((t, i) => <li key={i}>{t}</li>)}
        </ol>
      )
    } else {
      elements.push(
        <ul key={elements.length} className={`list-disc list-inside space-y-0.5 leading-relaxed ${className}`}>
          {listItems.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      )
    }
    listItems = []
    listType = null
  }

  for (const line of lines) {
    const bullet = line.match(/^[-*•]\s+(.+)/)
    const numbered = line.match(/^\d+[.)]\s+(.+)/)

    if (bullet) {
      if (listType === 'ol') flushList()
      listType = 'ul'
      listItems.push(bullet[1])
    } else if (numbered) {
      if (listType === 'ul') flushList()
      listType = 'ol'
      listItems.push(numbered[1])
    } else {
      flushList()
      if (line.trim()) {
        elements.push(
          <p key={elements.length} className={`leading-relaxed whitespace-pre-wrap ${className}`}>
            {line}
          </p>
        )
      } else {
        elements.push(<div key={elements.length} className="h-1" />)
      }
    }
  }
  flushList()

  return <div className="space-y-1">{elements}</div>
}

/** 超過此行數時，預設收合 */
const COLLAPSE_LINE_THRESHOLD = 3

/** 可收合的備註顯示：使用者可隨時收合/展開，收合時完全隱藏內容只留按鈕（方便截圖給 AI 評估） */
export function CollapsibleNote({
  text,
  className = 'text-sm text-[var(--color-text)]',
}: {
  text: string | null | undefined
  className?: string
}) {
  const lines = text?.split('\n') ?? []
  const [expanded, setExpanded] = useState(lines.length <= COLLAPSE_LINE_THRESHOLD)

  if (!text?.trim()) return null

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
        備註
        <ChevronDown size={12} strokeWidth={2} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="mt-1.5">
          <NoteContent text={text} className={className} />
        </div>
      )}
    </div>
  )
}
