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

// Import the GameViewer component and its data type directly
import GameViewer, { type GameData } from '@/components/game-viewer'


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
        [MARKS.CODE]: (text: any) => <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{text}</code>,
    },
    renderNode: {
        [BLOCKS.PARAGRAPH]: (node: any, children: any) => <p className="mb-6 leading-relaxed text-foreground">{children}</p>,
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

const lcaOpenImages: CarouselImage[] = [
  { src: '/IMG-20250927-WA0000.jpg', alt: 'LCA Open 2025 - Chess tournament action', title: 'Tournament Play', caption: 'Intense chess battles during LCA Open 2025' },
  { src: '/IMG-20250927-WA0001.jpg', alt: 'LCA Open 2025 - Award ceremony', title: 'Award Ceremony', caption: 'Celebrating achievements at LCA Open 2025' },
  { src: '/IMG-20250927-WA0002.jpg', alt: 'LCA Open 2025 - Outdoor academy setup', title: 'Academy Outreach', caption: 'LCA promoting chess excellence in the community' },
  { src: '/IMG-20250927-WA0004.jpg', alt: 'LCA Open 2025 - Tournament hall', title: 'Tournament Hall', caption: 'Focused players competing in the tournament hall' },
  { src: '/IMG-20250927-WA0005.jpg', alt: 'LCA Open 2025 - Group celebration', title: 'Winners Circle', caption: 'Proud participants celebrating their achievements' },
  { src: '/IMG-20250927-WA0006.jpg', alt: 'LCA Open 2025 - Individual award presentation', title: 'Individual Recognition', caption: 'Honoring individual excellence in chess' },
  { src: '/IMG-20250927-WA0007.jpg', alt: 'LCA Open 2025 - Chess competition', title: 'Competitive Spirit', caption: 'Players demonstrating skill and concentration' },
  { src: '/IMG-20250927-WA0008.jpg', alt: 'LCA Open 2025 - Academy promotion', title: 'Community Engagement', caption: 'LCA connecting with the local chess community' },
  { src: '/IMG-20250927-WA0010.jpg', alt: 'LCA Open 2025 - Chess match', title: 'Strategic Battles', caption: 'Tactical chess gameplay at its finest' },
  { src: '/IMG-20250927-WA0011.jpg', alt: 'LCA Open 2025 - Tournament atmosphere', title: 'Tournament Atmosphere', caption: 'The vibrant energy of competitive chess' },
  { src: '/IMG-20250927-WA0012.jpg', alt: 'LCA Open 2025 - Final moments', title: 'Tournament Finale', caption: 'Concluding another successful LCA Open tournament' }
]

const tournamentGames: GameData[] = [
  {
    title: "Side lines in the Birds Opening",
    pgn: `[Event "Limpopo Open 2025"]\n[Site "Northern Academy, Flora Park, Polokwane"]\n[Date "2025.03.10"]\n[Round "2"]\n[Result "0-1"]\n[White "Emmanuel Maphoto"]\n[Black "Mahomole Sekgwari Kgaogelo"]\n[ECO "C43"]\n\n1. e4 e5 2. Bc4 Nf6 3. d4 exd4 4. Nf3 Bb4+ 5. c3 dxc3 6. bxc3 Ba5 7. e5 d5 8. exf6 dxc4 9. Qe2+ Be6 10. fxg7 Rg8 11. O-O Qf6 12. Be3 Qxg7 13. g3 Nc6 14. Nd4 Nxd4 15. Bxd4 Qg4 16. f3 Qh5 17. Nd2 Qd5 18. Ne4 O-O-O 19. Nf6 Qg5 20. Nxg8 Rxg8 21. Qe5 c5 22. f4 Qxe5 23. Bxe5 Bf5 24. Rad1 Bd3 25. Rfe1 Rg6 26. Kf2 f6 27. Bd6 Bxc3 28. Re7 Bd4+ 29. Kf3 f5 30. Rc7+ Kd8 31. Bxc5 Kxc7 32. Bxd4 Ra6 33. Rd2 h5 34. h3 Ra3 35. Be5+ Kc6 36. Kf2 Be4 37. Rd6+ Kc5 38. Rg6 Rxa2+ 39. Ke3 c3 40. Bxc3 Kc4 41. Be5 b5 42. Rg5 b4 43. Rxh5 Ra3+ 44. Ke2 Bf3+`
  },
  {
    title: "An exchange sac in the London System",
    pgn: `[Event "Limpopo Open 2025"]\n[Site "Northern Academy, Flora Park, Polokwane"]\n[Date "2025.03.10"]\n[Round "3"]\n[Result "1-0"]\n[White "Mankga Thabang"]\n[Black "Mahomole Sekgwari Kgaogelo"]\n[ECO "D02"]\n\n1. d4 d5 2. Nf3 Nf6 3. Bf4 e6 4. e3 c5 5. c3 Nc6 6. Nbd2 Be7 7. Bd3 a6 8. Ne5 Bd6 9. Bg3 Qe7 10. f4 Bd7 11. Bh4 Rc8 12. Ng4 cxd4 13. exd4 Bxf4 14. O-O g5 15. Rxf4 Nxg4 16. Rxg4 gxh4 17. Qf3 f5 18. Rf4 Qg5 19. Re1 Kd8 20. Qe3 Rg8 21. Bf1 h3 22. g3 Ne7 23. Nf3 Qf6 24. Ne5 Ng6 25. Bxh3 Nxf4 26. Qxf4 Rc7 27. Bf1 Bc8 28. c4 h5 29. c5 h4 30. b4 hxg3 31. hxg3 Rcg7 32. Re3 Rh7 33. Bg2 Bd7 34. Kf2 Bb5 35. Rc3 Qg5 36. Nd3 1-0`
  },
  {
    title: "An adventure in the Ruy Lopez",
    pgn: `[Event "Limpopo Open 2025"]\n[Site "Northern Academy, Flora Park, Polokwane"]\n[Date "2025.03.10"]\n[Round "4"]\n[Result "1-0"]\n[White "Mahomole Tebogo"]\n[Black "Mahomole Mahlodi Johannes"]\n[ECO "C96"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O b5 6. Bb3 Be7 7. Re1 d6 8. c3 Na5 9. Bc2 c5 10. h3 O-O 11. d4 Qc7 12. Nbd2 cxd4 13. cxd4 Be6 14. d5 Rac8 15. Bd3 Bd7 16. Qe2 Be8 17. b4 Nc4 18. Bxc4 bxc4 19. Nb1 Nd7 20. Nc3 f5 21. Bg5 fxe4 22. Qxe4 Nf6 1-0`
  },
];


async function BlogPostContent({ slug }: { slug: string }) {
  const blog = await getBlogPostBySlug(slug)

  if (!blog) {
    notFound()
  }

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

      {/* Content */}
      <div className="prose prose-lg max-w-none">
        {documentToReactComponents(blog.content, richTextRenderOptions)}
      </div>

      {/* Tournament Rankings - Juniors */}
      <div className="mt-12 pt-8 border-t border-border">
        <p className="text-sm text-muted-foreground mb-4 text-center">Top 10 LCA Launch Open Chess Championships 2025 Juniors.{' '}<Link href="/tournaments/9602fa88-8c4f-4c4b-a430-63720ed54595" className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors">View full results</Link></p>
        <div className="relative w-full aspect-[16/5] sm:aspect-[16/4] md:aspect-[21/9] lg:aspect-[21/7] mb-8">
          <Image src="/juniors-rankings-light.png" alt="Top 10 Juniors Rankings - LCA Launch Open 2025" fill sizes="(min-width: 1024px) 1024px, 100vw" className="object-contain block dark:hidden" />
          <Image src="/juniors-rankings-dark.png" alt="Top 10 Juniors Rankings - LCA Launch Open 2025" fill sizes="(min-width: 1024px) 1024px, 100vw" className="object-contain hidden dark:block" />
        </div>
      </div>

      {/* Tournament Rankings - Section A & B */}
      <div className="mt-8">
        <p className="text-sm text-muted-foreground mb-4 text-center">Top 10 LCA Launch Open Chess Championships 2025 Section A & B Combined.{' '}<Link href="/tournaments/7c2bb272-7324-4b65-9262-22b474c7a155" className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors">View results</Link></p>
        <div className="relative w-full aspect-[16/5] sm:aspect-[16/4] md:aspect-[21/9] lg:aspect-[21/7] mb-8">
          <Image src="/section-ab-rankings-light.png" alt="Top 10 Section A & B Rankings - LCA Launch Open 2025" fill sizes="(min-width: 1024px) 1024px, 100vw" className="object-contain block dark:hidden" />
          <Image src="/section-ab-rankings-dark.png" alt="Top 10 Section A & B Rankings - LCA Launch Open 2025" fill sizes="(min-width: 1024px) 1024px, 100vw" className="object-contain hidden dark:block" />
        </div>
      </div>

      {/* LCA Open 2025 Carousel */}
      <div className="mt-8 pt-8 border-t border-border">
        <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">LCA Open 2025 Tournament Photos</h2>
        <LCACarousel images={lcaOpenImages} autoSlide={true} autoSlideInterval={3000} showControls={true} showDots={true} aspectRatio="video" objectFit="cover" priority={false} className="mb-4" />
      </div>

      {/* --- SECTION: Tournament Games Viewer --- */}
      <div className="mt-12 pt-8 border-t border-border">
        <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">
          Notable Tournament Games
        </h2>

        {/* --- NEW WARNING BANNER --- */}
        <div className="mb-6 p-4 rounded-lg bg-amber-100 border-l-4 border-amber-500 dark:bg-amber-900/30 dark:border-amber-600">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-500 dark:text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">Demonstration and Testing Only</p>
              <p className="mt-1">
                Please note: The games displayed in this viewer are for demonstration purposes(used for testing features and not actual tournament data) and are not from the actual tournament mentioned in the article.
              </p>
            </div>
          </div>
        </div>

        <GameViewer games={tournamentGames} />
      </div>

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