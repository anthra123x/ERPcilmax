import { Skeleton } from '@/components/ui/skeleton'

export default function WebMessagesLoading() {
  return (
    <div className="page-container py-6 space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
