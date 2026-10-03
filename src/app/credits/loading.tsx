import { Skeleton } from '@/components/ui/skeleton'

export default function CreditsLoading() {
  return (
    <div className="page-container py-6 space-y-6">
      <Skeleton className="h-9 w-56" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  )
}
