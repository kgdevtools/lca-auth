import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const altText = formData.get('alt_text') as string
    const caption = formData.get('caption') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Determine file type
    const fileType = file.type.startsWith('image/') ? 'image' : 'video'

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}-${sanitizedName}`
    const filePath = `blog-media/${fileName}`

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('blog-assets')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading to storage:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('blog-assets')
      .getPublicUrl(filePath)

    // Save metadata to database
    const { data: mediaData, error: dbError } = await supabase
      .from('blog_media')
      .insert({
        file_name: file.name,
        file_type: fileType,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        alt_text: altText || null,
        caption: caption || null,
        uploaded_by: user.id,
        used_in_posts: [],
      })
      .select()
      .single()

    if (dbError) {
      console.error('Error saving media metadata:', dbError)
      // Try to clean up uploaded file
      await supabase.storage.from('blog-assets').remove([filePath])
      return NextResponse.json(
        { error: 'Failed to save media metadata' },
        { status: 500 }
      )
    }

    return NextResponse.json(mediaData)
  } catch (error) {
    console.error('Error in POST /api/blog/media/upload:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
