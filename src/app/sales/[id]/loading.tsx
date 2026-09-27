import { Skeleton } from '@/components/ui/skeleton'

export default function SaleDetailLoading() {
  return (
    <div className="page-container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-none" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-none" />
    </div>
  )
}
