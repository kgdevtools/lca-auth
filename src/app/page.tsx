import Link from "next/link"
import { WarningBanner } from "@/components/warning-banner"
import { BlogPreviewCard } from "@/components/blog-preview-card"
import { HomeBlogPreviewSkeleton } from "@/components/blog-skeletons"
import { getFeaturedBlogPost } from "@/services/blogService"
import { Suspense } from "react"
import type { Metadata } from "next"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Home",
  description: "Limpopo Chess Academy — welcome page",
}

async function FeaturedBlogSection() {
  const featuredBlog = await getFeaturedBlogPost()

  if (!featuredBlog) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center py-8 text-muted-foreground">
          <p>No blog posts available yet. Check back soon!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <BlogPreviewCard 
        blog={featuredBlog}
        imageAlt={`Featured blog post: ${featuredBlog.title}`}
      />
    </div>
  )
}

export default function Home() {
  return (
    <section className="min-h-dvh px-2 sm:px-4 lg:px-6 xl:px-8 py-10 mx-auto max-w-7xl bg-background text-foreground">
    <WarningBanner message="Still under development: Some services may not work." />    
    
    {/* Top hero: left logos, right copy */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 lg:gap-10 items-center">
        {/* Logos - responsive, swap for theme */}
        <div className="w-full md:col-span-2 bg-white dark:bg-black">
          <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-[5/3] lg:aspect-[3/1] md:min-h-[220px] lg:min-h-[260px] xl:min-h-[300px]">
            <Image
              src="/Picture1.png"
              alt="Limpopo Chess Academy logo (light)"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 100vw"
              className="object-contain block dark:hidden"
            />
            <Image
              src="/LCA_Logo_Dark.png"
              alt="Limpopo Chess Academy logo (dark)"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 100vw"
              className="object-contain hidden dark:block"
            />
          </div>
        </div>

        {/* Copy */}
        <div className="space-y-6 text-left md:col-span-3">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
            Welcome to{" "}
            <span className="text-primary font-extrabold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Limpopo
            </span>{" "}
            <span className="text-muted-foreground">Chess Academy's</span> home on the web
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
            Join our community of chess enthusiasts and take your game to the next level
          </p>
        </div>
      </div>

      {/* CTA links */}
      <div className="mt-12 sm:mt-16 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-8 text-center">
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-base sm:text-lg md:text-xl underline decoration-primary/30 underline-offset-4 hover:decoration-primary/60 transition-all duration-200"
        >
          View past tournaments
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <Link
          href="/rankings"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-base sm:text-lg md:text-xl underline decoration-primary/30 underline-offset-4 hover:decoration-primary/60 transition-all duration-200"
        >
          View current rankings
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Blog Preview Section */}
      <div className="mt-20 sm:mt-24 lg:mt-28">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Latest from our{" "}
            <span className="text-primary bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Blog
            </span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Stay updated with news, announcements, tournaments, and academy updates from Limpopo Chess Academy
          </p>
        </div>

        {/* Blog Preview Card */}
        <Suspense fallback={<HomeBlogPreviewSkeleton />}>
          <FeaturedBlogSection />
        </Suspense>

        {/* View All Posts Link */}
        <div className="text-center mt-10 sm:mt-12">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-base sm:text-lg underline decoration-primary/30 underline-offset-4 hover:decoration-primary/60 transition-all duration-200"
          >
            View all posts
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
