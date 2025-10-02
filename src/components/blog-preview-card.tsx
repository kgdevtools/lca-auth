import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import type { BlogPreview } from "@/types/contentful"

interface BlogPreviewCardProps {
  blog: BlogPreview
  imageAlt?: string
}

export function BlogPreviewCard({
  blog,
  imageAlt = "Blog post image"
}: BlogPreviewCardProps) {
  const { slug, title, excerpt, author, date, thumbnailUrl } = blog
  return (
    <Card className="w-full overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-border">
      <Link href={`/blog/${slug}`} className="block w-full">
        {/* Image */}
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={thumbnailUrl}
            alt={imageAlt}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          />
        </div>
        
        {/* Content */}
        <CardContent className="p-4 sm:p-6">
          {/* Author and Date */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-3">
            <span className="font-medium">{author}</span>
            <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
            <time dateTime={date}>{new Date(date).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}</time>
          </div>
          
          {/* Title - clickable */}
          <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors duration-200 line-clamp-2">
            {title}
          </h3>
          
          {/* Preview Text with ellipsis */}
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed line-clamp-3">
            {excerpt}
          </p>
          
          {/* Read More Link */}
          <div className="mt-4 flex items-center gap-1 text-primary hover:text-primary/80 font-medium text-sm group-hover:gap-2 transition-all duration-200">
            <span>Read more</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}