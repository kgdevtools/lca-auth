import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function ProfileOverviewSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Welcome Header */}
      <div className="mb-8">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Hero */}
        <div className="lg:col-span-1 space-y-4">
          {/* Profile Hero Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
            <div className="relative flex flex-col items-center text-center">
              <Skeleton className="w-24 h-24 rounded-full mb-4" />
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-48 mb-4" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-full mt-5 rounded-md" />
            </div>
          </div>

          {/* Quick Update Card */}
          <Card className="border-0 bg-white dark:bg-slate-900/50 shadow-sm">
            <div className="p-4 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-full" />
            </div>
          </Card>
        </div>

        {/* Right Column - Stats & Games */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl p-4 bg-white dark:bg-slate-900/50 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-2 w-16" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>

          {/* Recent Tournaments */}
          <Card className="border-0 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-5 w-12 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Games */}
          <Card className="border-0 bg-white dark:bg-slate-900/50 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
