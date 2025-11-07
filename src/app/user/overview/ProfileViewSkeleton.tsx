import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { WarningBanner } from '@/components/warning-banner'

export default function ProfileViewSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <WarningBanner message="Still under development: Some services may not work." />

      <div className="mb-6">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
      </div>

      {/* Two-column layout for desktop, single column for mobile */}
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Avatar & Role Card Skeleton */}
          <Card className="bg-gradient-to-br from-gray-400 to-gray-600 border-0">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="w-20 h-20 rounded-full bg-white/20 animate-pulse" />
                <div className="flex-1 text-center sm:text-left space-y-3">
                  <div className="h-7 w-48 bg-white/20 animate-pulse rounded mx-auto sm:mx-0" />
                  <div className="h-4 w-40 bg-white/20 animate-pulse rounded mx-auto sm:mx-0" />
                  <div className="h-6 w-24 bg-white/20 animate-pulse rounded mx-auto sm:mx-0" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Details Card Skeleton */}
          <Card>
            <CardHeader className="pb-3">
              <div className="h-5 w-40 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-full bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Match Results Skeleton */}
          <Card>
            <CardHeader className="pb-3">
              <div className="h-5 w-48 bg-muted animate-pulse rounded" />
              <div className="h-3 w-56 bg-muted animate-pulse rounded mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                <div className="h-8 w-40 bg-muted animate-pulse rounded" />
              </div>
            </CardContent>
          </Card>

          {/* Player Statistics Skeleton */}
          <Card>
            <CardHeader className="pb-3">
              <div className="h-5 w-40 bg-muted animate-pulse rounded" />
              <div className="h-3 w-48 bg-muted animate-pulse rounded mt-2" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Tournaments Skeleton */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <div className="h-5 w-40 bg-muted animate-pulse rounded" />
          <div className="h-3 w-56 bg-muted animate-pulse rounded mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <div className="h-5 w-full bg-muted animate-pulse rounded" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
