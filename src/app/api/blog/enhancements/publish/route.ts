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
      id,
      contentful_id,
      slug,
      category,
      tags,
      is_featured,
      layout_type,
      components,
    } = body

    console.log('📝 Publishing blog post:', { id, contentful_id, slug, componentCount: components?.length || 0 })
    console.log('🎯 Components to save:', JSON.stringify(components, null, 2))

    // If no existing enhancement, create it
    if (!id) {
      const { data: newEnhancement, error: createError } = await supabase
        .from('blog_posts')
        .insert({
          contentful_id,
          slug,
          category,
          tags,
          is_featured,
          layout_type: layout_type || 'default',
          is_finalized: true,
          finalized_at: new Date().toISOString(),
          finalized_by: user.id,
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating enhancement:', createError)
        return NextResponse.json(
          { error: 'Failed to publish blog post' },
          { status: 500 }
        )
      }

      // Create component placements
      if (components && components.length > 0) {
        const componentInserts = components.map((comp: any) => ({
          blog_post_id: newEnhancement.id,
          component_type: comp.component_type,
          zone: comp.zone,
          position: comp.position,
          config: comp.config,
        }))

        if (componentInserts.length > 0) {
          console.log('💾 Inserting components:', componentInserts)
          const { data: insertedComponents, error: componentsError } = await supabase
            .from('blog_component_placements')
            .insert(componentInserts)
            .select()

          if (componentsError) {
            console.error('❌ Error inserting components:', componentsError)
          } else {
            console.log('✅ Components inserted successfully:', insertedComponents)
          }
        }
      }

      return NextResponse.json({ success: true })
    }

    // Update existing enhancement
    const { error: updateError } = await supabase
      .from('blog_posts')
      .update({
        category,
        tags,
        is_featured,
        layout_type,
        is_finalized: true,
        finalized_at: new Date().toISOString(),
        finalized_by: user.id,
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating enhancement:', updateError)
      return NextResponse.json(
        { error: 'Failed to publish blog post' },
        { status: 500 }
      )
    }

    // Delete and recreate components
    await supabase.from('blog_component_placements').delete().eq('blog_post_id', id)

    if (components && components.length > 0) {
      const componentInserts = components.map((comp: any) => ({
        blog_post_id: id,
        component_type: comp.component_type,
        zone: comp.zone,
        position: comp.position,
        config: comp.config,
      }))

      if (componentInserts.length > 0) {
        console.log('💾 Updating - Inserting components:', componentInserts)
        const { data: insertedComponents, error: componentsError } = await supabase
          .from('blog_component_placements')
          .insert(componentInserts)
          .select()

        if (componentsError) {
          console.error('❌ Error inserting components:', componentsError)
        } else {
          console.log('✅ Components updated successfully:', insertedComponents)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/blog/enhancements/publish:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
