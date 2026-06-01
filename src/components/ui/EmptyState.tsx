import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  Icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={48} strokeWidth={1} className="text-[var(--color-border)] mb-4" />
      <p className="font-medium text-[var(--color-text)] mb-1">{title}</p>
      {description && <p className="text-sm text-[var(--color-text-muted)] mb-4">{description}</p>}
      {action}
    </div>
  )
}
