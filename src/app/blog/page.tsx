import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getBlogPosts } from '@/services/blogService'
import { BlogPreviewCard } from '@/components/blog-preview-card'
import { BlogGridSkeleton } from '@/components/blog-skeletons'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Latest news, strategies, and insights from Limpopo Chess Academy',
}

async function BlogGrid() {
  const blogs = await getBlogPosts()

  if (blogs.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          No blog posts yet
        </h3>
        <p className="text-sm text-muted-foreground">
          Check back soon for updates and insights from our chess academy!
        </p>
      </div>
    )
  }

  // Dynamic grid columns based on number of blogs
  const getGridCols = (blogCount: number) => {
    if (blogCount === 1) return 'grid-cols-1 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1 max-w-2xl mx-auto'
    if (blogCount === 2) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 max-w-4xl mx-auto'
    if (blogCount === 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 max-w-6xl mx-auto'
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  }

  return (
    <div className={`w-full grid gap-4 md:gap-5 lg:gap-6 ${getGridCols(blogs.length)}`}>
      {blogs.map((blog) => (
        <div key={blog.id} className="w-full">
          <BlogPreviewCard 
            blog={blog}
            imageAlt={`Thumbnail for ${blog.title}`}
          />
        </div>
      ))}
    </div>
  )
}

export default function BlogPage() {
  return (
    <section className="min-h-screen px-4 sm:px-6 lg:px-8 py-10 bg-background text-foreground">
      {/* Header */}
      <div className="text-center mb-12 sm:mb-16">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
          Our{' '}
          <span className="text-primary bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Blog
          </span>
        </h1>
        <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Stay updated with the latest chess strategies, tournament highlights, academy news, 
          and insights from our coaches and players.
        </p>
      </div>

      {/* Blog Grid */}
      <Suspense fallback={<BlogGridSkeleton />}>
        <BlogGrid />
      </Suspense>
    </section>
  )
}