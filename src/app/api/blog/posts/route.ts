import { NextResponse } from 'next/server'
import { getBlogPosts } from '@/services/blogService'

export async function GET() {
  try {
    const posts = await getBlogPosts()
    // Set cache headers for 24 hours
    return NextResponse.json(posts, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400'
      }
    })
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    // Return empty array on error instead of failing
    return NextResponse.json([], {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400'
      }
    })
  }
}
