import { type BlogPreview } from '@/types/contentful'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BlogPreviewCard } from '@/components/blog-preview-card'
import { getBlogPosts } from '@/services/blogService'
import { cache } from '@/utils/cache'

export async function BlogCardServer() {
  try {
    // Check if blog posts are cached
    const blogCacheKey = 'blog-posts';
    let blogPosts: BlogPreview[] | null = cache.get(blogCacheKey);

    if (!blogPosts) {
      blogPosts = await getBlogPosts();
      // Cache blog posts for 24 hours
      cache.set(blogCacheKey, blogPosts, 86400);
    }

    const latestBlog = blogPosts[0] || null;

    if (!latestBlog) {
      return (
        <div className="aspect-square rounded-lg border border-border bg-card p-6 flex flex-col">
          <h2 className="text-xl font-bold mb-4 text-primary">Latest from our Blog</h2>
          <div className="flex-1 flex items-center justify-center text-center">
            <p className="text-muted-foreground">No blog posts yet</p>
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
  } catch (error) {
    console.error('Error in BlogCardServer:', error);
    return (
      <div className="aspect-square rounded-lg border border-border bg-card p-6 flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-primary">Latest from our Blog</h2>
        <div className="flex-1 flex items-center justify-center text-center">
          <p className="text-muted-foreground">Error loading blog posts</p>
          <Link href="/blog" className="mt-2 text-primary hover:underline">Try again</Link>
        </div>
      </div>
    );
  }
}