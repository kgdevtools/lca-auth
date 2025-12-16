'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkCoachRole, checkAdminRole, getCurrentUserWithProfile } from '@/utils/auth/academyAuth'

export interface LessonCategory {
  id: string
  name: string
  description: string | null
  slug: string
  icon: string | null
  display_order: number
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  title: string
  slug: string
  description: string | null
  category_id: string | null
  content_type: 'text' | 'video' | 'quiz' | 'puzzle' | 'mixed'
  content_data: any
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null
  estimated_duration_minutes: number | null
  display_order: number
  published: boolean
  published_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface LessonWithCategory extends Lesson {
  category: LessonCategory | null
}

// ============================================
// LESSON CATEGORIES
// ============================================

/**
 * Get all lesson categories
 */
export async function getAllCategories(): Promise<LessonCategory[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lesson_categories')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching categories:', error)
    throw new Error('Failed to fetch categories')
  }

  return data || []
}

/**
 * Create a new lesson category (Coach/Admin)
 */
export async function createCategory(categoryData: {
  name: string
  description?: string
  slug: string
  icon?: string
  display_order?: number
}) {
  await checkCoachRole() // Both coaches and admins can create categories

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lesson_categories')
    .insert({
      name: categoryData.name,
      description: categoryData.description || null,
      slug: categoryData.slug,
      icon: categoryData.icon || null,
      display_order: categoryData.display_order || 0,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating category:', error)
    throw new Error('Failed to create category')
  }

  revalidatePath('/academy')
  return data
}

// ============================================
// LESSONS - READ OPERATIONS
// ============================================

/**
 * Get all published lessons
 */
export async function getPublishedLessons(): Promise<LessonWithCategory[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lessons')
    .select(`
      *,
      category:lesson_categories(*)
    `)
    .eq('published', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching lessons:', error)
    throw new Error('Failed to fetch lessons')
  }

  return data || []
}

/**
 * Get all lessons (including unpublished) - Admin/Coach only
 */
export async function getAllLessons(): Promise<LessonWithCategory[]> {
  await checkCoachRole()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lessons')
    .select(`
      *,
      category:lesson_categories(*)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all lessons:', error)
    throw new Error('Failed to fetch lessons')
  }

  return data || []
}

/**
 * Get lessons by category
 */
export async function getLessonsByCategory(categoryId: string): Promise<LessonWithCategory[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lessons')
    .select(`
      *,
      category:lesson_categories(*)
    `)
    .eq('category_id', categoryId)
    .eq('published', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching lessons by category:', error)
    throw new Error('Failed to fetch lessons')
  }

  return data || []
}

/**
 * Get a single lesson by slug
 */
export async function getLessonBySlug(slug: string): Promise<LessonWithCategory | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lessons')
    .select(`
      *,
      category:lesson_categories(*)
    `)
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching lesson:', error)
    throw new Error('Failed to fetch lesson')
  }

  return data
}

/**
 * Get a single lesson by ID
 */
export async function getLessonById(id: string): Promise<LessonWithCategory | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lessons')
    .select(`
      *,
      category:lesson_categories(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching lesson:', error)
    throw new Error('Failed to fetch lesson')
  }

  return data
}

// ============================================
// LESSONS - WRITE OPERATIONS (Admin/Coach)
// ============================================

/**
 * Create a new lesson
 */
export async function createLesson(lessonData: {
  title: string
  slug: string
  description?: string
  category_id?: string
  content_type: 'text' | 'video' | 'quiz' | 'puzzle' | 'mixed'
  content_data: any
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  estimated_duration_minutes?: number
  display_order?: number
  published?: boolean
}) {
  await checkCoachRole() // Both coaches and admins can create

  const { profile } = await getCurrentUserWithProfile()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      title: lessonData.title,
      slug: lessonData.slug,
      description: lessonData.description || null,
      category_id: lessonData.category_id || null,
      content_type: lessonData.content_type,
      content_data: lessonData.content_data,
      difficulty: lessonData.difficulty || null,
      estimated_duration_minutes: lessonData.estimated_duration_minutes || null,
      display_order: lessonData.display_order || 0,
      published: lessonData.published || false,
      published_at: lessonData.published ? new Date().toISOString() : null,
      created_by: profile.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating lesson:', error)
    throw new Error('Failed to create lesson')
  }

  revalidatePath('/academy/lessons')
  revalidatePath('/academy/admin')
  return data
}

/**
 * Update an existing lesson
 */
export async function updateLesson(
  lessonId: string,
  updates: Partial<{
    title: string
    slug: string
    description: string
    category_id: string
    content_type: 'text' | 'video' | 'quiz' | 'puzzle' | 'mixed'
    content_data: any
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    estimated_duration_minutes: number
    display_order: number
    published: boolean
  }>
) {
  await checkCoachRole()

  const supabase = await createClient()

  // If publishing, set published_at
  const updateData: any = { ...updates, updated_at: new Date().toISOString() }
  if (updates.published === true) {
    updateData.published_at = new Date().toISOString()
  } else if (updates.published === false) {
    updateData.published_at = null
  }

  const { data, error } = await supabase
    .from('lessons')
    .update(updateData)
    .eq('id', lessonId)
    .select()
    .single()

  if (error) {
    console.error('Error updating lesson:', error)
    throw new Error('Failed to update lesson')
  }

  revalidatePath('/academy/lessons')
  revalidatePath('/academy/admin')
  return data
}

/**
 * Delete a lesson (Admin only)
 */
export async function deleteLesson(lessonId: string) {
  await checkAdminRole()

  const supabase = await createClient()

  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', lessonId)

  if (error) {
    console.error('Error deleting lesson:', error)
    throw new Error('Failed to delete lesson')
  }

  revalidatePath('/academy/lessons')
  revalidatePath('/academy/admin')
  return { success: true }
}

/**
 * Toggle lesson published status
 */
export async function toggleLessonPublished(lessonId: string, published: boolean) {
  await checkCoachRole()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lessons')
    .update({
      published,
      published_at: published ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', lessonId)
    .select()
    .single()

  if (error) {
    console.error('Error toggling lesson published status:', error)
    throw new Error('Failed to update lesson')
  }

  revalidatePath('/academy/lessons')
  revalidatePath('/academy/admin')
  return data
}
