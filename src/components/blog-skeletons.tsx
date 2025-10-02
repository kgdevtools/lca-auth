import { Card, CardContent } from "@/components/ui/card"

// Skeleton for blog preview card
export function BlogCardSkeleton() {
  return (
    <Card className="overflow-hidden animate-pulse">
      {/* Image skeleton */}
      <div className="relative aspect-video bg-muted" />
      
      {/* Content skeleton */}
      <CardContent className="p-4 sm:p-6">
        {/* Author and Date skeleton */}
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 bg-muted rounded w-20" />
          <div className="w-1 h-1 bg-muted rounded-full" />
          <div className="h-4 bg-muted rounded w-16" />
        </div>
        
        {/* Title skeleton */}
        <div className="space-y-2 mb-3">
          <div className="h-6 bg-muted rounded w-full" />
          <div className="h-6 bg-muted rounded w-3/4" />
        </div>
        
        {/* Preview text skeleton */}
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
        
        {/* Read more link skeleton */}
        <div className="h-4 bg-muted rounded w-24" />
      </CardContent>
    </Card>
  )
}

// Skeleton for blog listing grid
export function BlogGridSkeleton({ count = 6 }: { count?: number } = {}) {
  // Dynamic grid columns based on skeleton count
  const getGridCols = (skeletonCount: number) => {
    if (skeletonCount === 1) return 'grid-cols-1 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1 max-w-2xl mx-auto'
    if (skeletonCount === 2) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 max-w-4xl mx-auto'
    if (skeletonCount === 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 max-w-6xl mx-auto'
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  }

  return (
    <div className={`w-full grid gap-4 md:gap-5 lg:gap-6 ${getGridCols(count)}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={`skeleton-${i}`} className="w-full">
          <BlogCardSkeleton />
        </div>
      ))}
    </div>
  )
}

// Skeleton for individual blog post
export function BlogPostSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Featured image skeleton */}
      <div className="aspect-video bg-muted rounded-lg mb-8" />
      
      {/* Meta info skeleton */}
      <div className="flex items-center gap-4 mb-6">
        <div className="h-4 bg-muted rounded w-24" />
        <div className="w-1 h-1 bg-muted rounded-full" />
        <div className="h-4 bg-muted rounded w-20" />
      </div>
      
      {/* Title skeleton */}
      <div className="space-y-3 mb-8">
        <div className="h-8 bg-muted rounded w-full" />
        <div className="h-8 bg-muted rounded w-4/5" />
      </div>
      
      {/* Content skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Skeleton for home page blog preview
export function HomeBlogPreviewSkeleton() {
  return (
    <div className="max-w-2xl mx-auto">
      <BlogCardSkeleton />
    </div>
  )
}