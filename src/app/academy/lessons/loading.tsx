import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'

export default function LessonsLoadingSkeleton() {
  return (
    <div className="w-full min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-2">
              <div className="h-9 w-64 bg-muted animate-pulse rounded" />
              <div className="h-5 w-80 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>

        {/* Progress Overview Skeleton */}
        <Card className="mb-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800 w-full">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <div className="w-5 h-5 bg-muted animate-pulse rounded" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-8 w-12 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-12 bg-muted animate-pulse rounded" />
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div className="bg-muted h-2.5 rounded-full w-1/3 animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lessons Grid Skeleton */}
        <div className="space-y-8">
          {Array.from({ length: 2 }).map((_, categoryIndex) => (
            <div key={categoryIndex} className="w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                <div className="h-6 w-8 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-4 w-full max-w-2xl bg-muted animate-pulse rounded mb-4" />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                {Array.from({ length: 6 }).map((_, lessonIndex) => (
                  <Card key={lessonIndex} className="h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                        <div className="h-5 w-20 bg-muted animate-pulse rounded" />
                      </div>
                      <div className="h-6 w-full bg-muted animate-pulse rounded mb-2" />
                      <div className="space-y-1">
                        <div className="h-3 w-full bg-muted animate-pulse rounded" />
                        <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                        </div>
                        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
