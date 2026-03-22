import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

export default function LessonsLoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
          <div className="w-6 h-6 bg-white/20 rounded animate-pulse" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Progress Card */}
      <Card className="mb-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200/50 dark:border-blue-800/50">
            <div className="flex justify-between mb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
      </Card>

      {/* Lessons Grid */}
      <div className="space-y-8">
        {Array.from({ length: 2 }).map((_, categoryIndex) => (
          <div key={categoryIndex}>
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-6 w-8 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full max-w-2xl mb-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, lessonIndex) => (
                <Card key={lessonIndex} className="overflow-hidden">
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex items-center justify-between pt-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
