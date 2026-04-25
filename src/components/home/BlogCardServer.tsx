import { type BlogPreview } from "@/types/contentful";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getBlogPosts } from "@/services/blogService";
import { cache } from "@/utils/cache";

export async function BlogCardServer() {
  try {
    const blogCacheKey = "blog-posts";
    let blogPosts: BlogPreview[] | null = cache.get(blogCacheKey);

    if (!blogPosts) {
      blogPosts = await getBlogPosts();
      cache.set(blogCacheKey, blogPosts, 86400);
    }

    const latestBlog = blogPosts[0] || null;

    if (!latestBlog) {
      return (
        <div className="rounded-lg border border-border bg-card/80 dark:bg-card/60 backdrop-blur-sm p-6 flex flex-col min-h-[300px]">
          <h2 className="text-lg font-bold mb-4 text-primary">Latest from our Blog</h2>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No blog posts yet</p>
          </div>
        </div>
      );
    }

    const formattedDate = new Date(latestBlog.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    return (
      <Link
        href={`/blog/${latestBlog.slug}`}
        className="group rounded-lg border border-border bg-card/80 dark:bg-card/60 backdrop-blur-sm overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg flex flex-col"
      >
        {/* Hero image */}
        <div className="relative aspect-video overflow-hidden flex-shrink-0">
          <Image
            src={latestBlog.thumbnailUrl}
            alt={latestBlog.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
          {/* Gradient for legibility if text overlaid in future */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 px-5 py-4 gap-2">
          {/* Section label */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wide">
            Latest from the Blog
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>

          {/* Title */}
          <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
            {latestBlog.title}
          </h3>

          {/* Author + date */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium">{latestBlog.author}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40 flex-shrink-0" />
            <time dateTime={latestBlog.date}>{formattedDate}</time>
          </div>

          {/* Excerpt */}
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
            {latestBlog.excerpt}
          </p>

          {/* Read more CTA */}
          <div className="flex items-center gap-1.5 text-sm font-semibold text-primary mt-1 group-hover:gap-2.5 transition-all duration-200">
            Read article
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </Link>
    );
  } catch (error) {
    console.error("Error in BlogCardServer:", error);
    return (
      <div className="rounded-lg border border-border bg-card/80 dark:bg-card/60 backdrop-blur-sm p-6 flex flex-col min-h-[300px]">
        <h2 className="text-lg font-bold mb-4 text-primary">Latest from our Blog</h2>
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <p className="text-muted-foreground text-sm">Error loading blog posts</p>
            <Link href="/blog" className="mt-2 text-primary hover:underline text-sm block">
              Try again
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
