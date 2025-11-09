import { Button } from '@/components/ui/button'
import { Plus, RefreshCw } from 'lucide-react'
import { getAllEnhancedBlogPreviews } from '@/services/blogEnhancementService'
import BlogPostsTable from '@/components/admin/BlogPostsTable'

export default async function BlogPostsPage() {
  const posts = await getAllEnhancedBlogPreviews()

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Blog Posts</h2>
          <p className="text-sm text-muted-foreground">
            Manage and enhance blog posts from Contentful
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync from Contentful
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Enhance Post
          </Button>
        </div>
      </div>

      {/* Blog Posts Table */}
      <BlogPostsTable posts={posts} />
    </div>
  )
}
