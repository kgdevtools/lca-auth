import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getBlogPostBySlug } from '@/services/blogService'
import { BlogPostSkeleton } from '@/components/blog-skeletons'
import { documentToReactComponents } from '@contentful/rich-text-react-renderer'
import { BLOCKS, MARKS, INLINES } from '@contentful/rich-text-types'
import { LCACarousel, type CarouselImage } from '@/components/lca-carousel'

interface BlogPostPageProps {
  params: Promise<{
    slug: string
  }>
}

// Rich text rendering options
const richTextRenderOptions = {
  renderMark: {
    [MARKS.BOLD]: (text: any) => <strong className="font-semibold">{text}</strong>,
    [MARKS.ITALIC]: (text: any) => <em className="italic">{text}</em>,
    [MARKS.UNDERLINE]: (text: any) => <u className="underline">{text}</u>,
    [MARKS.CODE]: (text: any) => (
      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{text}</code>
    ),
  },
  renderNode: {
    [BLOCKS.PARAGRAPH]: (node: any, children: any) => (
      <p className="mb-6 leading-relaxed text-foreground">{children}</p>
    ),
    [BLOCKS.HEADING_1]: (node: any, children: any) => (
      <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-6 mt-8">{children}</h1>
    ),
    [BLOCKS.HEADING_2]: (node: any, children: any) => (
      <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-5 mt-7">{children}</h2>
    ),
    [BLOCKS.HEADING_3]: (node: any, children: any) => (
      <h3 className="text-xl sm:text-2xl font-medium text-foreground mb-4 mt-6">{children}</h3>
    ),
    [BLOCKS.HEADING_4]: (node: any, children: any) => (
      <h4 className="text-lg sm:text-xl font-medium text-foreground mb-3 mt-5">{children}</h4>
    ),
    [BLOCKS.HEADING_5]: (node: any, children: any) => (
      <h5 className="text-base sm:text-lg font-medium text-foreground mb-3 mt-4">{children}</h5>
    ),
    [BLOCKS.HEADING_6]: (node: any, children: any) => (
      <h6 className="text-sm sm:text-base font-medium text-foreground mb-2 mt-3">{children}</h6>
    ),
    [BLOCKS.UL_LIST]: (node: any, children: any) => (
      <ul className="mb-6 space-y-2 list-disc list-inside text-foreground">{children}</ul>
    ),
    [BLOCKS.OL_LIST]: (node: any, children: any) => (
      <ol className="mb-6 space-y-2 list-decimal list-inside text-foreground">{children}</ol>
    ),
    [BLOCKS.LIST_ITEM]: (node: any, children: any) => (
      <li className="leading-relaxed">{children}</li>
    ),
    [BLOCKS.QUOTE]: (node: any, children: any) => (
      <blockquote className="border-l-4 border-primary bg-muted/30 pl-4 py-2 mb-6 italic text-muted-foreground">
        {children}
      </blockquote>
    ),
    [BLOCKS.HR]: () => (
      <hr className="border-border my-8" />
    ),
    [INLINES.HYPERLINK]: (node: any, children: any) => (
      <a 
        href={node.data.uri} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-primary hover:text-primary/80 underline decoration-primary/30 underline-offset-2 hover:decoration-primary/60 transition-colors"
      >
        {children}
      </a>
    ),
    [BLOCKS.EMBEDDED_ASSET]: (node: any) => {
      const { file, title, description } = node.data.target.fields
      const imageUrl = file?.url ? `https:${file.url}` : null
      
      if (!imageUrl) return null
      
      return (
        <div className="my-8 rounded-lg overflow-hidden">
          <Image
            src={imageUrl}
            alt={description || title || 'Embedded image'}
            width={file.details?.image?.width || 800}
            height={file.details?.image?.height || 600}
            className="w-full h-auto object-cover"
            sizes="(min-width: 1024px) 1024px, 100vw"
          />
          {(title || description) && (
            <div className="bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
              {title && <div className="font-medium">{title}</div>}
              {description && <div>{description}</div>}
            </div>
          )}
        </div>
      )
    },
    [BLOCKS.EMBEDDED_ENTRY]: (node: any) => {
      // Handle embedded entries if needed in the future
      console.log('Embedded entry found:', node)
      return (
        <div className="my-4 p-4 bg-muted/20 rounded-lg border-l-4 border-primary">
          <p className="text-sm text-muted-foreground">Embedded content</p>
        </div>
      )
    },
    [INLINES.EMBEDDED_ENTRY]: (node: any) => {
      // Handle inline embedded entries if needed
      console.log('Inline embedded entry found:', node)
      return (
        <span className="text-muted-foreground bg-muted/20 px-2 py-1 rounded">
          [Embedded content]
        </span>
      )
    },
  },
}

// LCA Open 2025 images for carousel demonstration
const lcaOpenImages: CarouselImage[] = [
  {
    src: '/IMG-20250927-WA0000.jpg',
    alt: 'LCA Open 2025 - Chess tournament action',
    title: 'Tournament Play',
    caption: 'Intense chess battles during LCA Open 2025'
  },
  {
    src: '/IMG-20250927-WA0001.jpg',
    alt: 'LCA Open 2025 - Award ceremony',
    title: 'Award Ceremony',
    caption: 'Celebrating achievements at LCA Open 2025'
  },
  {
    src: '/IMG-20250927-WA0002.jpg',
    alt: 'LCA Open 2025 - Outdoor academy setup',
    title: 'Academy Outreach',
    caption: 'LCA promoting chess excellence in the community'
  },
  {
    src: '/IMG-20250927-WA0004.jpg',
    alt: 'LCA Open 2025 - Tournament hall',
    title: 'Tournament Hall',
    caption: 'Focused players competing in the tournament hall'
  },
  {
    src: '/IMG-20250927-WA0005.jpg',
    alt: 'LCA Open 2025 - Group celebration',
    title: 'Winners Circle',
    caption: 'Proud participants celebrating their achievements'
  },
  {
    src: '/IMG-20250927-WA0006.jpg',
    alt: 'LCA Open 2025 - Individual award presentation',
    title: 'Individual Recognition',
    caption: 'Honoring individual excellence in chess'
  },
  {
    src: '/IMG-20250927-WA0007.jpg',
    alt: 'LCA Open 2025 - Chess competition',
    title: 'Competitive Spirit',
    caption: 'Players demonstrating skill and concentration'
  },
  {
    src: '/IMG-20250927-WA0008.jpg',
    alt: 'LCA Open 2025 - Academy promotion',
    title: 'Community Engagement',
    caption: 'LCA connecting with the local chess community'
  },
  {
    src: '/IMG-20250927-WA0010.jpg',
    alt: 'LCA Open 2025 - Chess match',
    title: 'Strategic Battles',
    caption: 'Tactical chess gameplay at its finest'
  },
  {
    src: '/IMG-20250927-WA0011.jpg',
    alt: 'LCA Open 2025 - Tournament atmosphere',
    title: 'Tournament Atmosphere',
    caption: 'The vibrant energy of competitive chess'
  },
  {
    src: '/IMG-20250927-WA0012.jpg',
    alt: 'LCA Open 2025 - Final moments',
    title: 'Tournament Finale',
    caption: 'Concluding another successful LCA Open tournament'
  }
]


async function BlogPostContent({ slug }: { slug: string }) {
  const blog = await getBlogPostBySlug(slug)

  if (!blog) {
    notFound()
  }

  return (
    <article>
      {/* Featured Image */}
      <div className="relative aspect-video overflow-hidden rounded-lg mb-8">
        <Image
          src={blog.featuredImageUrl}
          alt={blog.title}
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 1024px, 100vw"
          priority
        />
      </div>

      {/* Meta Information */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
        <span className="font-medium">{blog.author}</span>
        <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
        <time dateTime={blog.date}>
          {new Date(blog.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </time>
      </div>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-8 leading-tight">
        {blog.title}
      </h1>

      {/* Content */}
      <div className="prose prose-lg max-w-none">
        {documentToReactComponents(blog.content, richTextRenderOptions)}
      </div>

      {/* Tournament Rankings - Juniors */}
      <div className="mt-12 pt-8 border-t border-border">
        <p className="text-sm text-muted-foreground mb-4 text-center">
          Top 10 LCA Launch Open Chess Championships 2025 Juniors.{' '}
          <Link 
            href="/tournaments/9602fa88-8c4f-4c4b-a430-63720ed54595"
            className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
          >
            View full results
          </Link>
        </p>
        <div className="relative w-full aspect-[16/5] sm:aspect-[16/4] md:aspect-[21/9] lg:aspect-[21/7] mb-8">
          <Image
            src="/juniors-rankings-light.png"
            alt="Top 10 Juniors Rankings - LCA Launch Open 2025"
            fill
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-contain block dark:hidden"
          />
          <Image
            src="/juniors-rankings-dark.png"
            alt="Top 10 Juniors Rankings - LCA Launch Open 2025"
            fill
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-contain hidden dark:block"
          />
        </div>
      </div>

      {/* Tournament Rankings - Section A & B */}
      <div className="mt-8">
        <p className="text-sm text-muted-foreground mb-4 text-center">
          Top 10 LCA Launch Open Chess Championships 2025 Section A & B Combined.{' '}
          <Link 
            href="/tournaments/7c2bb272-7324-4b65-9262-22b474c7a155"
            className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
          >
            View results
          </Link>
        </p>
        <div className="relative w-full aspect-[16/5] sm:aspect-[16/4] md:aspect-[21/9] lg:aspect-[21/7] mb-8">
          <Image
            src="/section-ab-rankings-light.png"
            alt="Top 10 Section A & B Rankings - LCA Launch Open 2025"
            fill
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-contain block dark:hidden"
          />
          <Image
            src="/section-ab-rankings-dark.png"
            alt="Top 10 Section A & B Rankings - LCA Launch Open 2025"
            fill
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-contain hidden dark:block"
          />
        </div>
      </div>

      {/* LCA Open 2025 Carousel */}
      <div className="mt-8 pt-8 border-t border-border">
        <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">LCA Open 2025 Tournament Photos</h2>
        <LCACarousel 
          images={lcaOpenImages}
          autoSlide={true}
          autoSlideInterval={3000}
          showControls={true}
          showDots={true}
          aspectRatio="video"
          objectFit="cover"
          priority={false}
          className="mb-4"
        />
      </div>

    </article>
  )
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const blog = await getBlogPostBySlug(slug)
  
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
  const { slug } = await params
  
  return (
    <section className="min-h-screen px-2 sm:px-4 lg:px-6 xl:px-8 py-10 mx-auto max-w-4xl bg-background text-foreground">
      {/* Back to Blog Link */}
      <div className="mb-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm sm:text-base transition-colors group"
        >
          <svg 
            className="w-4 h-4 group-hover:-translate-x-1 transition-transform" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
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
