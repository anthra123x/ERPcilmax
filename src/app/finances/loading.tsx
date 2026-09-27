import { Skeleton } from '@/components/ui/skeleton'

export default function FinancesLoading() {
  return (
    <div className="page-container py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-none" />
        <div>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-48 mt-1" />
        </div>
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-none" />
        ))}
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-none" />
        <Skeleton className="h-72 rounded-none" />
      </div>
    </div>
  )
}
