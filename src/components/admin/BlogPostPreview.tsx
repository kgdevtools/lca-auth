'use client'

import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type {
  BlogComponentPlacement,
  ChessboardConfig,
  GalleryConfig,
  VideoConfig,
} from '@/types/blog-enhancement'
import { documentToReactComponents } from '@contentful/rich-text-react-renderer'
import { BLOCKS, INLINES } from '@contentful/rich-text-types'
import dynamic from 'next/dynamic'
import { Crown, Images, Video } from 'lucide-react'

const BlogChessboard = dynamic(() => import('@/components/blog/BlogChessboard'), {
  ssr: false,
  loading: () => <Card className="p-4 my-4 h-48 flex items-center justify-center">Loading chessboard...</Card>,
})

const BlogGallery = dynamic(() => import('@/components/blog/BlogGallery'), {
  ssr: false,
  loading: () => <Card className="p-4 my-4 h-48 flex items-center justify-center">Loading gallery...</Card>,
})

const BlogVideo = dynamic(() => import('@/components/blog/BlogVideo'), {
  ssr: false,
  loading: () => <Card className="p-4 my-4 h-48 flex items-center justify-center">Loading video...</Card>,
})

interface BlogPostPreviewProps {
  post: any // Contentful post
  components: BlogComponentPlacement[]
  category: string
  tags: string[]
  isFeatured: boolean
}

export default function BlogPostPreview({
  post,
  components,
  category,
  tags,
  isFeatured,
}: BlogPostPreviewProps) {
  const renderOptions = {
    renderNode: {
      [BLOCKS.HEADING_1]: (node: any, children: any) => (
        <h1 className="text-4xl font-extrabold tracking-tight mt-8 mb-4">{children}</h1>
      ),
      [BLOCKS.HEADING_2]: (node: any, children: any) => (
        <h2 className="text-3xl font-bold tracking-tight mt-6 mb-3">{children}</h2>
      ),
      [BLOCKS.HEADING_3]: (node: any, children: any) => (
        <h3 className="text-2xl font-bold tracking-tight mt-5 mb-2">{children}</h3>
      ),
      [BLOCKS.PARAGRAPH]: (node: any, children: any) => (
        <p className="text-base leading-7 mb-4">{children}</p>
      ),
      [BLOCKS.UL_LIST]: (node: any, children: any) => (
        <ul className="list-disc list-inside space-y-2 mb-4">{children}</ul>
      ),
      [BLOCKS.OL_LIST]: (node: any, children: any) => (
        <ol className="list-decimal list-inside space-y-2 mb-4">{children}</ol>
      ),
      [BLOCKS.LIST_ITEM]: (node: any, children: any) => <li>{children}</li>,
      [INLINES.HYPERLINK]: (node: any, children: any) => (
        <a
          href={node.data.uri}
          className="text-blue-600 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      ),
    },
  }

  const getComponentsForZone = (zone: string) => {
    return components
      .filter((c) => c.zone === zone)
      .sort((a, b) => a.position - b.position)
  }

  const renderComponent = (component: BlogComponentPlacement) => {
    // Show component marker for easy reference
    const marker = (
      <div className="text-xs font-mono bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded mb-2 inline-block">
        [COMPONENT:{component.zone}:{component.position}]
      </div>
    )

    switch (component.component_type) {
      case 'chessboard':
        return (
          <div key={component.id}>
            {marker}
            <BlogChessboard config={component.config as ChessboardConfig} />
          </div>
        )
      case 'gallery':
        return (
          <div key={component.id}>
            {marker}
            <BlogGallery config={component.config as GalleryConfig} />
          </div>
        )
      case 'video':
        return (
          <div key={component.id}>
            {marker}
            <BlogVideo config={component.config as VideoConfig} />
          </div>
        )
    }
  }

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
      {/* Header Metadata */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {isFeatured && (
            <Badge className="bg-yellow-500">Featured</Badge>
          )}
          {category && <Badge variant="outline">{category}</Badge>}
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          By {post.author} • {new Date(post.date).toLocaleDateString()}
        </p>
      </div>

      {/* Components: After Title */}
      {getComponentsForZone('after_title').map(renderComponent)}

      {/* Featured Image */}
      {post.featuredImageUrl && (
        <div className="relative w-full h-[400px] mb-8 rounded-lg overflow-hidden">
          <Image
            src={post.featuredImageUrl}
            alt={post.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Title */}
      <h1 className="text-5xl font-extrabold tracking-tighter mb-6">{post.title}</h1>

      {/* Components: After Intro */}
      {getComponentsForZone('after_intro').map(renderComponent)}

      {/* Content */}
      {post.content && (
        <div className="prose prose-lg dark:prose-invert max-w-none">
          {documentToReactComponents(post.content, renderOptions)}
        </div>
      )}

      {/* Components: Mid Article */}
      <div className="my-8">
        {getComponentsForZone('mid_article').map(renderComponent)}
      </div>

      {/* Components: Before Conclusion */}
      {getComponentsForZone('before_conclusion').map(renderComponent)}

      {/* Components: After Content */}
      <div className="mt-8">
        {getComponentsForZone('after_content').map(renderComponent)}
      </div>
    </div>
  )
}
