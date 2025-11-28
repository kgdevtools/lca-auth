import { NextResponse } from 'next/server'
import { getBlogPosts } from '@/services/blogService'

export async function GET() {
  try {
    const posts = await getBlogPosts()
    return NextResponse.json(posts)
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    // Return empty array on error instead of failing
    return NextResponse.json([])
  }
}
