import { client } from '@/lib/contentful'
import { BlogPost, BlogPreview } from '@/types/contentful'
import { documentToPlainTextString } from '@contentful/rich-text-plain-text-renderer'

const CONTENT_TYPE_BLOG = 'blog'

// Helper function to extract text content for excerpt
function extractExcerpt(content: any, maxLength: number = 200): string {
  try {
    const plainText = documentToPlainTextString(content)
    return plainText.length > maxLength 
      ? plainText.substring(0, maxLength) + '...'
      : plainText
  } catch {
    return 'Read more about this blog post...'
  }
}

// Helper function to process Contentful entry into BlogPost
function processBlogEntry(entry: any): BlogPost {
  const excerpt = extractExcerpt(entry.fields.text)
  
  return {
    id: entry.sys.id,
    title: entry.fields.title || 'Untitled',
    slug: entry.fields.slug || 'untitled',
    excerpt,
    author: 'Coach Kgaogelo',
    date: entry.sys.createdAt,
    thumbnailUrl: entry.fields.thumbnail?.fields?.file?.url 
      ? `https:${entry.fields.thumbnail.fields.file.url}`
      : '/Picture1.png', // fallback to existing logo
    featuredImageUrl: entry.fields.featuredImage?.fields?.file?.url
      ? `https:${entry.fields.featuredImage.fields.file.url}`
      : '/Picture1.png', // fallback to existing logo
    content: entry.fields.text,
    createdAt: entry.sys.createdAt,
    updatedAt: entry.sys.updatedAt,
  }
}

// Helper function to process Contentful entry into BlogPreview
function processBlogPreview(entry: any): BlogPreview {
  const excerpt = extractExcerpt(entry.fields.text)
  
  return {
    id: entry.sys.id,
    title: entry.fields.title || 'Untitled',
    slug: entry.fields.slug || 'untitled',
    excerpt,
    author: 'Coach Kgaogelo',
    date: entry.sys.createdAt,
    thumbnailUrl: entry.fields.thumbnail?.fields?.file?.url 
      ? `https:${entry.fields.thumbnail.fields.file.url}`
      : '/Picture1.png',
  }
}

// Server action to get all blog posts
export async function getBlogPosts(): Promise<BlogPreview[]> {
  try {
    const entries = await client.getEntries({
      content_type: CONTENT_TYPE_BLOG,
      order: ['-sys.createdAt'],
      include: 2, // Include linked assets for thumbnails
    })

    return entries.items.map(processBlogPreview)
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    return []
  }
}

// Server action to get a single blog post by slug
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const entries = await client.getEntries({
      content_type: CONTENT_TYPE_BLOG,
      'fields.slug': slug,
      limit: 1,
      include: 10, // Include linked assets and entries up to 10 levels deep
    })

    if (entries.items.length === 0) {
      return null
    }

    return processBlogEntry(entries.items[0])
  } catch (error) {
    console.error('Error fetching blog post by slug:', error)
    return null
  }
}

// Server action to get featured blog post (latest one for homepage)
export async function getFeaturedBlogPost(): Promise<BlogPreview | null> {
  try {
    const entries = await client.getEntries({
      content_type: CONTENT_TYPE_BLOG,
      order: ['-sys.createdAt'],
      limit: 1,
      include: 2, // Include linked assets for thumbnail
    })

    if (entries.items.length === 0) {
      return null
    }

    return processBlogPreview(entries.items[0])
  } catch (error) {
    console.error('Error fetching featured blog post:', error)
    return null
  }
}