import { Skeleton } from '@/components/ui/skeleton'

export default function WebProductLoading() {
  return (
    <div className="page-container py-6 space-y-6">
      <Skeleton className="h-8 w-72" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    </div>
  )
}
