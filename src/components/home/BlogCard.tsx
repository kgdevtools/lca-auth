"use client"

import { useEffect, useState } from 'react'
import { BlogPreviewCard } from '@/components/blog-preview-card'
import { type BlogPreview } from '@/types/contentful'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function BlogCard() {
  const [latestBlog, setLatestBlog] = useState<BlogPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function loadBlog() {
      try {
        const response = await fetch('/api/blog/posts')
        if (!response.ok) {
          throw new Error('Failed to fetch blog posts')
        }
        const blogs: BlogPreview[] = await response.json()
        setLatestBlog(blogs[0] || null)
      } catch (err) {
        console.error('Error loading blog posts:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadBlog()
  }, [])

  if (loading) {
    return (
      <div className="aspect-square rounded-lg border border-border bg-card overflow-hidden flex flex-col">
        <div className="p-6 pb-4 border-b border-border">
          <div className="h-7 w-48 bg-muted/50 rounded animate-pulse" />
        </div>
        <div className="flex-1 p-4 space-y-3">
          <div className="aspect-video w-full bg-muted/50 rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-3/4 bg-muted/50 rounded animate-pulse" />
            <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-muted/50 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !latestBlog) {
    return (
      <div className="aspect-square rounded-lg border border-border bg-card p-6 flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-primary">Latest from our Blog</h2>
        <div className="flex-1 flex items-center justify-center text-center">
          <p className="text-muted-foreground">
            {error ? 'Unable to load blog posts' : 'No blog posts yet'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="aspect-square rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg flex flex-col">
      <div className="p-6 pb-4">
        <Link href="/blog" className="group">
          <h2 className="text-xl font-bold mb-2 text-primary group-hover:text-primary/80 flex items-center gap-2">
            Latest from our Blog
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </h2>
        </Link>
      </div>
      <div className="flex-1">
        <BlogPreviewCard blog={latestBlog} imageAlt={`Thumbnail for ${latestBlog.title}`} />
      </div>
    </div>
  )
}
