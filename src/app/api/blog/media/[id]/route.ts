import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get media info to delete from storage
    const { data: media, error: fetchError } = await supabase
      .from('blog_media')
      .select('file_url')
      .eq('id', params.id)
      .single()

    if (fetchError || !media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    // Extract file path from URL
    const urlParts = media.file_url.split('/blog-assets/')
    if (urlParts.length > 1) {
      const filePath = `blog-media/${urlParts[1].split('/').pop()}`

      // Delete from storage
      await supabase.storage.from('blog-assets').remove([filePath])
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('blog_media')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error deleting media:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete media' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/blog/media/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { alt_text, caption } = body

    const { data, error } = await supabase
      .from('blog_media')
      .update({
        alt_text,
        caption,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating media:', error)
      return NextResponse.json(
        { error: 'Failed to update media' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PUT /api/blog/media/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
