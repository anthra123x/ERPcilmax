import { Skeleton } from '@/components/ui/skeleton'

export default function NewProductLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-none" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-32 rounded-none" />
    </div>
  )
}
