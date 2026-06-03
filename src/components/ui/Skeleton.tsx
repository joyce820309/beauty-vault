export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[var(--color-skeleton)] rounded ${className}`} />
}

export function ItemCardSkeleton() {
  return (
    <div className="border border-[var(--color-border)] rounded-xl p-4 space-y-2">
      <div className="flex gap-3">
        <Skeleton className="w-14 h-14 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  )
}
