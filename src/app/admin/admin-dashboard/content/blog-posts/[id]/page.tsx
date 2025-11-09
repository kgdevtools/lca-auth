import { notFound } from 'next/navigation'
import { getBlogPostBySlug } from '@/services/blogService'
import {
  getBlogEnhancementByContentfulId,
  getComponentsByBlogPostId
} from '@/services/blogEnhancementService'
import BlogEnhancementEditor from '@/components/admin/BlogEnhancementEditor'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ contentful_id?: string }>
}

export default async function BlogPostEnhancementPage(props: PageProps) {
  const params = await props.params
  const searchParams = await props.searchParams

  // Handle "new" case - creating enhancement for existing Contentful post
  if (params.id === 'new') {
    if (!searchParams.contentful_id) {
      notFound()
    }

    // We'll need to fetch the Contentful post by ID
    // For now, we'll handle this in the client component
    return (
      <BlogEnhancementEditor
        mode="create"
        contentfulId={searchParams.contentful_id}
      />
    )
  }

  // Handle existing enhancement - editing
  const enhancement = await getBlogEnhancementByContentfulId(searchParams.contentful_id || '')

  if (!enhancement) {
    notFound()
  }

  const components = await getComponentsByBlogPostId(enhancement.id)

  return (
    <BlogEnhancementEditor
      mode="edit"
      contentfulId={enhancement.contentful_id}
      enhancement={enhancement}
      existingComponents={components}
    />
  )
}
