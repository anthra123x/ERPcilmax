import { Skeleton } from '@/components/ui/skeleton'

export default function SalesHistoryLoading() {
  return (
    <div className="page-container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-10 w-64" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-none" />
        ))}
      </div>
    </div>
  )
}
