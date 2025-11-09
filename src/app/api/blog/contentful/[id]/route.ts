import { NextResponse } from 'next/server'
import { getContentfulClient } from '@/lib/contentful'

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const client = getContentfulClient()
    const entry = await client.getEntry(params.id)

    if (!entry) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const fields = entry.fields as any

    // Process the entry similar to blogService
    const post = {
      id: entry.sys.id,
      title: fields.title || '',
      slug: fields.slug || '',
      author: 'Coach Kgaogelo', // Default author
      date: entry.sys.createdAt,
      thumbnailUrl: fields.thumbnail?.fields?.file?.url
        ? `https:${fields.thumbnail.fields.file.url}`
        : '/Picture1.png',
      featuredImageUrl: fields.featuredImage?.fields?.file?.url
        ? `https:${fields.featuredImage.fields.file.url}`
        : '/Picture1.png',
      content: fields.text || null,
      excerpt: '', // Can add excerpt extraction if needed
      createdAt: entry.sys.createdAt,
      updatedAt: entry.sys.updatedAt,
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error('Error fetching Contentful entry:', error)
    return NextResponse.json(
      { error: 'Failed to fetch blog post' },
      { status: 500 }
    )
  }
}
