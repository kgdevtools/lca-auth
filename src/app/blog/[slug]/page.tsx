import React, { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getBlogPostBySlug } from '@/services/blogService'
import { getBlogEnhancementBySlug, getComponentsByBlogPostId } from '@/services/blogEnhancementService'
import { BlogPostSkeleton } from '@/components/blog-skeletons'
import { documentToReactComponents } from '@contentful/rich-text-react-renderer'
import { BLOCKS, MARKS, INLINES } from '@contentful/rich-text-types'
import BlogChessboard from '@/components/blog/BlogChessboard'
import BlogGallery from '@/components/blog/BlogGallery'
import BlogVideo from '@/components/blog/BlogVideo'
import type { BlogComponentPlacement, ChessboardConfig, GalleryConfig, VideoConfig } from '@/types/blog-enhancement'


interface BlogPostPageProps {
  params: Promise<{
    slug: string
  }>
}

// Helper to check if text contains a component marker
function hasComponentMarker(text: string): boolean {
  return /\[COMPONENT:([^:]+):(\d+)\]/i.test(text)
}

// Helper to extract component info from marker
function parseComponentMarker(text: string): { zone: string; position: number; marker: string } | null {
  const match = text.match(/\[COMPONENT:([^:]+):(\d+)\]/i)
  if (!match) return null
  return {
    zone: match[1],
    position: parseInt(match[2], 10),
    marker: match[0]
  }
}

// Helper to render component from marker - will be set per blog post
let getComponentForMarker: ((zone: string, position: number) => React.JSX.Element | null) | null = null

// Rich text rendering options with component marker support
const createRichTextRenderOptions = (componentRenderer: (zone: string, position: number) => React.JSX.Element | null) => {
  getComponentForMarker = componentRenderer

  return {
    renderMark: {
        [MARKS.BOLD]: (text: any) => <strong className="font-semibold">{text}</strong>,
        [MARKS.ITALIC]: (text: any) => <em className="italic">{text}</em>,
        [MARKS.UNDERLINE]: (text: any) => <u className="underline">{text}</u>,
        [MARKS.CODE]: (text: any) => <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{text}</code>,
    },
    renderNode: {
        [BLOCKS.PARAGRAPH]: (node: any, children: any) => {
          // Check if this paragraph contains a component marker
          const textContent = node.content?.[0]?.value || ''

          if (hasComponentMarker(textContent)) {
            const markerInfo = parseComponentMarker(textContent)
            if (markerInfo && getComponentForMarker) {
              const component = getComponentForMarker(markerInfo.zone, markerInfo.position)
              if (component) {
                // Replace the marker text with the component
                const textBeforeMarker = textContent.substring(0, textContent.indexOf(markerInfo.marker))
                const textAfterMarker = textContent.substring(textContent.indexOf(markerInfo.marker) + markerInfo.marker.length)

                return (
                  <>
                    {textBeforeMarker && <p className="mb-6 leading-relaxed text-foreground">{textBeforeMarker}</p>}
                    {component}
                    {textAfterMarker && <p className="mb-6 leading-relaxed text-foreground">{textAfterMarker}</p>}
                  </>
                )
              }
            }
          }

          return <p className="mb-6 leading-relaxed text-foreground">{children}</p>
        },
        [BLOCKS.HEADING_1]: (node: any, children: any) => <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-6 mt-8">{children}</h1>,
        [BLOCKS.HEADING_2]: (node: any, children: any) => <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-5 mt-7">{children}</h2>,
        [BLOCKS.HEADING_3]: (node: any, children: any) => <h3 className="text-xl sm:text-2xl font-medium text-foreground mb-4 mt-6">{children}</h3>,
        [BLOCKS.HEADING_4]: (node: any, children: any) => <h4 className="text-lg sm:text-xl font-medium text-foreground mb-3 mt-5">{children}</h4>,
        [BLOCKS.HEADING_5]: (node: any, children: any) => <h5 className="text-base sm:text-lg font-medium text-foreground mb-3 mt-4">{children}</h5>,
        [BLOCKS.HEADING_6]: (node: any, children: any) => <h6 className="text-sm sm:text-base font-medium text-foreground mb-2 mt-3">{children}</h6>,
        [BLOCKS.UL_LIST]: (node: any, children: any) => <ul className="mb-6 space-y-2 list-disc list-inside text-foreground">{children}</ul>,
        [BLOCKS.OL_LIST]: (node: any, children: any) => <ol className="mb-6 space-y-2 list-decimal list-inside text-foreground">{children}</ol>,
        [BLOCKS.LIST_ITEM]: (node: any, children: any) => <li className="leading-relaxed">{children}</li>,
        [BLOCKS.QUOTE]: (node: any, children: any) => <blockquote className="border-l-4 border-primary bg-muted/30 pl-4 py-2 mb-6 italic text-muted-foreground">{children}</blockquote>,
        [BLOCKS.HR]: () => <hr className="border-border my-8" />,
        [INLINES.HYPERLINK]: (node: any, children: any) => <a href={node.data.uri} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline decoration-primary/30 underline-offset-2 hover:decoration-primary/60 transition-colors">{children}</a>,
        [BLOCKS.EMBEDDED_ASSET]: (node: any) => {
            const { file, title, description } = node.data.target.fields;
            const imageUrl = file?.url ? `https:${file.url}` : null;
            if (!imageUrl) return null;
            return (
                <div className="my-8 rounded-lg overflow-hidden">
                    <Image src={imageUrl} alt={description || title || 'Embedded image'} width={file.details?.image?.width || 800} height={file.details?.image?.height || 600} className="w-full h-auto object-cover" sizes="(min-width: 1024px) 1024px, 100vw" />
                    {(title || description) && <div className="bg-muted/30 px-4 py-2 text-sm text-muted-foreground">{title && <div className="font-medium">{title}</div>}{description && <div>{description}</div>}</div>}
                </div>
            )
        },
        [BLOCKS.EMBEDDED_ENTRY]: (node: any) => <div className="my-4 p-4 bg-muted/20 rounded-lg border-l-4 border-primary"><p className="text-sm text-muted-foreground">Embedded content</p></div>,
        [INLINES.EMBEDDED_ENTRY]: (node: any) => <span className="text-muted-foreground bg-muted/20 px-2 py-1 rounded">[Embedded content]</span>,
    },
  }
}

async function BlogPostContent({ slug }: { slug: string }) {
  const blog = await getBlogPostBySlug(slug)

  if (!blog) {
    notFound()
  }

  // Fetch blog enhancement and components
  const enhancement = await getBlogEnhancementBySlug(slug)
  console.log('🔍 Enhancement found:', enhancement ? `ID: ${enhancement.id}` : 'No enhancement')

  const components = enhancement ? await getComponentsByBlogPostId(enhancement.id) : []
  console.log('🎯 Components found:', components.length, components)

  // Group components by zone
  const componentsByZone: Record<string, BlogComponentPlacement[]> = {}
  components.forEach((comp) => {
    if (!componentsByZone[comp.zone]) {
      componentsByZone[comp.zone] = []
    }
    componentsByZone[comp.zone].push(comp)
  })

  // Sort by position within each zone
  Object.keys(componentsByZone).forEach((zone) => {
    componentsByZone[zone].sort((a, b) => a.position - b.position)
  })

  console.log('📦 Components by zone:', Object.keys(componentsByZone).map(zone => `${zone}: ${componentsByZone[zone].length}`))

  // Track which components have been rendered inline
  const renderedComponentKeys = new Set<string>()

  // Helper function to render a single component
  const renderComponent = (component: BlogComponentPlacement) => {
    switch (component.component_type) {
      case 'chessboard':
        return <BlogChessboard key={component.id} config={component.config as ChessboardConfig} />
      case 'gallery':
        return <BlogGallery key={component.id} config={component.config as GalleryConfig} />
      case 'video':
        return <BlogVideo key={component.id} config={component.config as VideoConfig} />
      default:
        console.log(`  ⚠️ Unknown component type: ${component.component_type}`)
        return null
    }
  }

  // Helper to get component by zone and position for inline rendering
  const getComponentForInlineRender = (zone: string, position: number): React.JSX.Element | null => {
    const component = componentsByZone[zone]?.find(c => c.position === position)
    if (!component) {
      console.log(`⚠️ Component not found for marker [COMPONENT:${zone}:${position}]`)
      return null
    }

    // Mark as rendered inline
    const key = `${zone}:${position}`
    renderedComponentKeys.add(key)
    console.log(`✅ Rendering component inline: ${zone}:${position}`)

    return renderComponent(component)
  }

  // Helper function to render components for a zone (excluding those rendered inline)
  const renderComponentsForZone = (zone: string) => {
    const zoneComponents = componentsByZone[zone] || []
    console.log(`🎨 Rendering ${zoneComponents.length} components for zone: ${zone}`)

    return zoneComponents.map((component) => {
      const key = `${zone}:${component.position}`

      // Skip if already rendered inline
      if (renderedComponentKeys.has(key)) {
        console.log(`  ⏭️ Skipping ${component.component_type} (already rendered inline): ${key}`)
        return null
      }

      console.log(`  → Component type: ${component.component_type}, ID: ${component.id}`)
      return renderComponent(component)
    })
  }

  // Create rich text options with component renderer
  const richTextOptions = createRichTextRenderOptions(getComponentForInlineRender)

  return (
    <article>
      {/* Featured Image */}
      <div className="relative aspect-video overflow-hidden rounded-lg mb-8">
        <Image src={blog.featuredImageUrl} alt={blog.title} fill className="object-cover" sizes="(min-width: 1024px) 1024px, 100vw" priority />
      </div>

      {/* Meta Information */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
        <span className="font-medium">{blog.author}</span>
        <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
        <time dateTime={blog.date}>{new Date(blog.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
      </div>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-8 leading-tight">{blog.title}</h1>

      {/* Components - after_title zone */}
      {renderComponentsForZone('after_title')}

      {/* Components - after_intro zone */}
      {renderComponentsForZone('after_intro')}

      {/* Content */}
      <div className="prose prose-lg max-w-none">
        {documentToReactComponents(blog.content, richTextOptions)}
      </div>

      {/* Components - mid_article zone */}
      {renderComponentsForZone('mid_article')}

      {/* Components - before_conclusion zone */}
      {renderComponentsForZone('before_conclusion')}

      {/* Components - after_content zone */}
      {renderComponentsForZone('after_content')}
    </article>
  )
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogPostBySlug(slug);
  
  if (!blog) {
    return {
      title: 'Blog Post Not Found',
    }
  }

  return {
    title: blog.title,
    description: blog.excerpt,
    openGraph: {
      title: blog.title,
      description: blog.excerpt,
      images: [blog.featuredImageUrl],
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  
  return (
    <section className="min-h-screen px-2 sm:px-4 lg:px-6 xl:px-8 py-10 mx-auto max-w-4xl bg-background text-foreground">
      {/* Back to Blog Link */}
      <div className="mb-8">
        <Link href="/blog" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm sm:text-base transition-colors group">
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Blog
        </Link>
      </div>

      {/* Blog Content */}
      <Suspense fallback={<BlogPostSkeleton />}>
        <BlogPostContent slug={slug} />
      </Suspense>
    </section>
  )
}