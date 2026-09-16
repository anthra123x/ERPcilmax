import { Skeleton } from '@/components/ui/skeleton'

export default function WebOrderLoading() {
  return (
    <div className="page-container py-6 space-y-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  )
}
