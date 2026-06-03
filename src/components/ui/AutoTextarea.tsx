import { useEffect, useRef, useCallback, forwardRef } from 'react'

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

/** 將備註文字渲染成帶有 bullet list 的 JSX */
export function NoteContent({ text }: { text: string | null | undefined }) {
  if (!text?.trim()) return null

  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: string[] = []

  function flushList() {
    if (listItems.length === 0) return
    elements.push(
      <ul key={elements.length} className="list-disc list-inside space-y-0.5 text-sm text-[var(--color-text)] leading-relaxed">
        {listItems.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    )
    listItems = []
  }

  for (const line of lines) {
    const bullet = line.match(/^[-*•]\s+(.+)/)
    if (bullet) {
      listItems.push(bullet[1])
    } else {
      flushList()
      if (line.trim()) {
        elements.push(
          <p key={elements.length} className="text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">
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
