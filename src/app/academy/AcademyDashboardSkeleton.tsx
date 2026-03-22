import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function AcademyDashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Welcome Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
          <div className="w-8 h-8 bg-white/20 rounded animate-pulse" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* User Profile Card */}
      <Card className="mb-8 border-0 bg-white dark:bg-slate-900/50 shadow-sm">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Welcome Message Card */}
      <Card className="border-0 bg-white dark:bg-slate-900/50 shadow-sm">
        <div className="p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </Card>
    </div>
  )
}
