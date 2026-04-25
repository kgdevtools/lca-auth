import { Skeleton } from '@/components/ui/skeleton'

export default function AcademyDashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-8">

      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-48" />
      </div>

      {/* Profile row */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-48" />
          <div className="flex gap-2 mt-1">
            <Skeleton className="h-4 w-14 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Progress section */}
      <div className="space-y-4">
        <Skeleton className="h-3 w-28" />
        <div className="flex items-baseline gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-3 w-12 ml-auto" />
        </div>
        <Skeleton className="h-[3px] w-full rounded-full" />
        <Skeleton className="h-3 w-40" />
        <div className="grid grid-cols-3 gap-4 pt-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-6 w-8" />
            </div>
          ))}
        </div>
      </div>

      {/* Nav links */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-16" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>

    </div>
  )
}
