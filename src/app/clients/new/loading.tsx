import { Skeleton } from '@/components/ui/skeleton'

export default function NewClientLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-32" />
      <div className="space-y-4">
        <Skeleton className="h-96 w-full rounded-none" />
      </div>
    </div>
  )
}
