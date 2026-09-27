import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="page-container py-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 rounded-none" />
        ))}
      </div>
    </div>
  )
}
