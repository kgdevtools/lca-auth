import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      contentful_id,
      slug,
      category,
      tags,
      is_featured,
      layout_type,
      is_finalized,
      components,
    } = body

    // Create blog post enhancement
    const { data: enhancement, error: enhancementError } = await supabase
      .from('blog_posts')
      .insert({
        contentful_id,
        slug,
        category,
        tags,
        is_featured,
        layout_type: layout_type || 'default',
        is_finalized: false,
      })
      .select()
      .single()

    if (enhancementError) {
      console.error('Error creating enhancement:', enhancementError)
      return NextResponse.json(
        { error: 'Failed to create enhancement' },
        { status: 500 }
      )
    }

    // Create component placements if any
    if (components && components.length > 0) {
      const componentInserts = components.map((comp: any) => ({
        blog_post_id: enhancement.id,
        component_type: comp.component_type,
        zone: comp.zone,
        position: comp.position,
        config: comp.config,
      }))

      const { error: componentsError } = await supabase
        .from('blog_component_placements')
        .insert(componentInserts)

      if (componentsError) {
        console.error('Error creating components:', componentsError)
      }
    }

    return NextResponse.json({ success: true, enhancement })
  } catch (error) {
    console.error('Error in POST /api/blog/enhancements:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, category, tags, is_featured, layout_type, components } = body

    // Update blog post enhancement
    const { error: updateError } = await supabase
      .from('blog_posts')
      .update({
        category,
        tags,
        is_featured,
        layout_type,
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating enhancement:', updateError)
      return NextResponse.json(
        { error: 'Failed to update enhancement' },
        { status: 500 }
      )
    }

    // Delete existing components
    await supabase.from('blog_component_placements').delete().eq('blog_post_id', id)

    // Re-create components
    if (components && components.length > 0) {
      const componentInserts = components.map((comp: any) => ({
        blog_post_id: id,
        component_type: comp.component_type,
        zone: comp.zone,
        position: comp.position,
        config: comp.config,
      }))

      if (componentInserts.length > 0) {
        const { error: componentsError } = await supabase
          .from('blog_component_placements')
          .insert(componentInserts)

        if (componentsError) {
          console.error('Error creating components:', componentsError)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PUT /api/blog/enhancements:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
