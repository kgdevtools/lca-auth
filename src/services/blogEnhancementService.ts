import { createClient } from '@/utils/supabase/server'
import type {
  BlogPostEnhancement,
  BlogComponentPlacement,
  BlogMedia,
  BlogCategory,
  BlogTag,
  EnhancedBlogPost,
  EnhancedBlogPreview,
  BlogEnhancementFormData,
  ComponentPlacementFormData,
  CategoryFormData,
  TagFormData,
  ComponentZone,
} from '@/types/blog-enhancement'
import { getBlogPosts, getBlogPostBySlug } from './blogService'

// =====================================================
// BLOG POSTS ENHANCEMENT QUERIES
// =====================================================

/**
 * Get blog enhancement by slug
 */
export async function getBlogEnhancementBySlug(
  slug: string
): Promise<BlogPostEnhancement | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    console.error('Error fetching blog enhancement:', error)
    return null
  }

  return data
}

/**
 * Get blog enhancement by Contentful ID
 */
export async function getBlogEnhancementByContentfulId(
  contentfulId: string
): Promise<BlogPostEnhancement | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('contentful_id', contentfulId)
    .single()

  if (error) {
    console.error('Error fetching blog enhancement:', error)
    return null
  }

  return data
}

/**
 * Get all blog enhancements
 */
export async function getAllBlogEnhancements(): Promise<BlogPostEnhancement[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching blog enhancements:', error)
    return []
  }

  return data || []
}

/**
 * Get all enhanced blog previews (merge Contentful + Supabase data)
 */
export async function getAllEnhancedBlogPreviews(): Promise<EnhancedBlogPreview[]> {
  // Fetch from Contentful
  const contentfulPosts = await getBlogPosts()

  // Fetch all enhancements from Supabase
  const enhancements = await getAllBlogEnhancements()

  // Create a map for quick lookup
  const enhancementMap = new Map(
    enhancements.map((e) => [e.contentful_id, e])
  )

  // Merge data
  const enhancedPreviews: EnhancedBlogPreview[] = contentfulPosts.map((post) => {
    const enhancement = enhancementMap.get(post.id)

    return {
      contentful_id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      author: post.author,
      date: post.date,
      thumbnailUrl: post.thumbnailUrl,
      enhancement_id: enhancement?.id || null,
      is_finalized: enhancement?.is_finalized || false,
      category: enhancement?.category || null,
      tags: enhancement?.tags || null,
      is_featured: enhancement?.is_featured || false,
      view_count: enhancement?.view_count || 0,
    }
  })

  return enhancedPreviews
}

/**
 * Create blog enhancement
 */
export async function createBlogEnhancement(
  data: BlogEnhancementFormData,
  userId: string
): Promise<BlogPostEnhancement | null> {
  const supabase = await createClient()
  const { data: created, error } = await supabase
    .from('blog_posts')
    .insert({
      contentful_id: data.contentful_id,
      slug: data.slug,
      category: data.category,
      tags: data.tags,
      is_featured: data.is_featured,
      layout_type: data.layout_type,
      is_finalized: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating blog enhancement:', error)
    return null
  }

  return created
}

/**
 * Update blog enhancement
 */
export async function updateBlogEnhancement(
  id: string,
  data: Partial<BlogEnhancementFormData>
): Promise<BlogPostEnhancement | null> {
  const supabase = await createClient()
  const { data: updated, error } = await supabase
    .from('blog_posts')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating blog enhancement:', error)
    return null
  }

  return updated
}

/**
 * Delete blog enhancement
 */
export async function deleteBlogEnhancement(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase.from('blog_posts').delete().eq('id', id)

  if (error) {
    console.error('Error deleting blog enhancement:', error)
    return false
  }

  return true
}

/**
 * Finalize blog post (publish)
 */
export async function finalizeBlogPost(
  id: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('blog_posts')
    .update({
      is_finalized: true,
      finalized_at: new Date().toISOString(),
      finalized_by: userId,
    })
    .eq('id', id)

  if (error) {
    console.error('Error finalizing blog post:', error)
    return false
  }

  return true
}

/**
 * Increment view count
 */
export async function incrementViewCount(slug: string): Promise<void> {
  const supabase = await createClient()
  await supabase.rpc('increment_blog_view_count', { post_slug: slug })
}

// =====================================================
// COMPONENT PLACEMENTS QUERIES
// =====================================================

/**
 * Get all components for a blog post
 */
export async function getComponentsByBlogPostId(
  blogPostId: string
): Promise<BlogComponentPlacement[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('blog_component_placements')
    .select('*')
    .eq('blog_post_id', blogPostId)
    .order('zone')
    .order('position')

  if (error) {
    console.error('Error fetching components:', error)
    return []
  }

  return data || []
}

/**
 * Create component placement
 */
export async function createComponentPlacement(
  data: ComponentPlacementFormData & { blog_post_id: string }
): Promise<BlogComponentPlacement | null> {
  const supabase = await createClient()
  const { data: created, error } = await supabase
    .from('blog_component_placements')
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error('Error creating component placement:', error)
    return null
  }

  return created
}

/**
 * Update component placement
 */
export async function updateComponentPlacement(
  id: string,
  data: Partial<ComponentPlacementFormData>
): Promise<BlogComponentPlacement | null> {
  const supabase = await createClient()
  const { data: updated, error } = await supabase
    .from('blog_component_placements')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating component placement:', error)
    return null
  }

  return updated
}

/**
 * Delete component placement
 */
export async function deleteComponentPlacement(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('blog_component_placements')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting component placement:', error)
    return false
  }

  return true
}

/**
 * Reorder components within a zone
 */
export async function reorderComponents(
  blogPostId: string,
  zone: ComponentZone,
  componentIds: string[]
): Promise<boolean> {
  const supabase = await createClient()

  // Update position for each component
  const updates = componentIds.map((id, index) =>
    supabase
      .from('blog_component_placements')
      .update({ position: index })
      .eq('id', id)
      .eq('blog_post_id', blogPostId)
      .eq('zone', zone)
  )

  const results = await Promise.all(updates)
  const hasError = results.some((result) => result.error)

  if (hasError) {
    console.error('Error reordering components')
    return false
  }

  return true
}

// =====================================================
// MEDIA LIBRARY QUERIES
// =====================================================

/**
 * Get all media
 */
export async function getAllMedia(filters?: {
  type?: 'image' | 'video'
}): Promise<BlogMedia[]> {
  const supabase = await createClient()
  let query = supabase.from('blog_media').select('*').order('created_at', { ascending: false })

  if (filters?.type) {
    query = query.eq('file_type', filters.type)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching media:', error)
    return []
  }

  return data || []
}

/**
 * Create media (after upload)
 */
export async function createMedia(
  data: Omit<BlogMedia, 'id' | 'created_at'>
): Promise<BlogMedia | null> {
  const supabase = await createClient()
  const { data: created, error } = await supabase
    .from('blog_media')
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error('Error creating media:', error)
    return null
  }

  return created
}

/**
 * Update media metadata
 */
export async function updateMedia(
  id: string,
  data: Partial<Omit<BlogMedia, 'id' | 'created_at'>>
): Promise<BlogMedia | null> {
  const supabase = await createClient()
  const { data: updated, error } = await supabase
    .from('blog_media')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating media:', error)
    return null
  }

  return updated
}

/**
 * Delete media
 */
export async function deleteMedia(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase.from('blog_media').delete().eq('id', id)

  if (error) {
    console.error('Error deleting media:', error)
    return false
  }

  return true
}

// =====================================================
// CATEGORIES QUERIES
// =====================================================

/**
 * Get all categories
 */
export async function getAllCategories(): Promise<BlogCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('blog_categories')
    .select('*')
    .order('display_order')

  if (error) {
    console.error('Error fetching categories:', error)
    return []
  }

  return data || []
}

/**
 * Create category
 */
export async function createCategory(
  data: CategoryFormData
): Promise<BlogCategory | null> {
  const supabase = await createClient()
  const { data: created, error } = await supabase
    .from('blog_categories')
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error('Error creating category:', error)
    return null
  }

  return created
}

/**
 * Update category
 */
export async function updateCategory(
  id: string,
  data: Partial<CategoryFormData>
): Promise<BlogCategory | null> {
  const supabase = await createClient()
  const { data: updated, error } = await supabase
    .from('blog_categories')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating category:', error)
    return null
  }

  return updated
}

/**
 * Delete category
 */
export async function deleteCategory(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase.from('blog_categories').delete().eq('id', id)

  if (error) {
    console.error('Error deleting category:', error)
    return false
  }

  return true
}

// =====================================================
// TAGS QUERIES
// =====================================================

/**
 * Get all tags
 */
export async function getAllTags(): Promise<BlogTag[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('blog_tags')
    .select('*')
    .order('usage_count', { ascending: false })

  if (error) {
    console.error('Error fetching tags:', error)
    return []
  }

  return data || []
}

/**
 * Create tag
 */
export async function createTag(data: TagFormData): Promise<BlogTag | null> {
  const supabase = await createClient()
  const { data: created, error } = await supabase
    .from('blog_tags')
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error('Error creating tag:', error)
    return null
  }

  return created
}

/**
 * Update tag
 */
export async function updateTag(
  id: string,
  data: Partial<TagFormData>
): Promise<BlogTag | null> {
  const supabase = await createClient()
  const { data: updated, error } = await supabase
    .from('blog_tags')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating tag:', error)
    return null
  }

  return updated
}

/**
 * Delete tag
 */
export async function deleteTag(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase.from('blog_tags').delete().eq('id', id)

  if (error) {
    console.error('Error deleting tag:', error)
    return false
  }

  return true
}
