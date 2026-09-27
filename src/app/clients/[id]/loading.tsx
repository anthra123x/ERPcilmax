import { Skeleton } from '@/components/ui/skeleton'

export default function ClientDetailLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-none" />
        <Skeleton className="h-64 rounded-none" />
      </div>
    </div>
  )
}
