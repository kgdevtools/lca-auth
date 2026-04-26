import { createClient } from '@/utils/supabase/server'

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

export interface LessonBlock {
  id: string
  type: string
  data: Record<string, unknown>
}

export interface Lesson {
  id: string
  title: string
  slug: string
  description: string | null
  category_id: string | null
  content_type: string
  content_data: Record<string, unknown> | null
  blocks: LessonBlock[]
  difficulty: string | null
  estimated_duration_minutes: number | null
  display_order: number
  published: boolean
  published_at: string | null
  created_by: string | null
  creator_name: string | null
  creator_role: string | null
  created_at: string
  updated_at: string
}

export interface LessonWithCategory extends Lesson {
  category: LessonCategory | null
}

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

export async function getAllLessons(): Promise<LessonWithCategory[]> {
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
      return null
    }
    console.error('Error fetching lesson:', error)
    throw new Error('Failed to fetch lesson')
  }

  return data
}

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

export async function createLesson(lessonData: {
  title: string
  slug: string
  description?: string
  category_id?: string
  content_type: string
  content_data?: Record<string, unknown>
  blocks?: LessonBlock[]
  difficulty?: string
  estimated_duration_minutes?: number
  display_order?: number
  published?: boolean
  created_by: string
}): Promise<Lesson> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      title: lessonData.title,
      slug: lessonData.slug,
      description: lessonData.description || null,
      category_id: lessonData.category_id || null,
      content_type: lessonData.content_type,
      content_data: lessonData.content_data || {},
      blocks: lessonData.blocks || [],
      difficulty: lessonData.difficulty || null,
      estimated_duration_minutes: lessonData.estimated_duration_minutes || null,
      display_order: lessonData.display_order || 0,
      published: lessonData.published || false,
      published_at: lessonData.published ? new Date().toISOString() : null,
      created_by: lessonData.created_by,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating lesson:', error)
    throw new Error('Failed to create lesson')
  }

  return data
}

export async function updateLesson(
  lessonId: string,
  updates: Partial<{
    title: string
    slug: string
    description: string
    category_id: string
    content_type: string
    content_data: Record<string, unknown>
    blocks: LessonBlock[]
    difficulty: string
    estimated_duration_minutes: number
    display_order: number
    published: boolean
    created_by: string
  }>
): Promise<Lesson> {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() }

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

  return data
}

export async function deleteLesson(lessonId: string): Promise<{ success: boolean }> {
  const supabase = await createClient()

  // Revoke any points earned from this lesson before removing it
  const { error: rpcError } = await supabase.rpc('revoke_lesson_points', { p_lesson_id: lessonId })
  if (rpcError) {
    console.error('Error revoking lesson points:', rpcError)
    throw new Error('Failed to revoke lesson points')
  }

  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', lessonId)

  if (error) {
    console.error('Error deleting lesson:', error)
    throw new Error('Failed to delete lesson')
  }

  return { success: true }
}

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

export async function getLessonsAssignedToStudent(studentId: string): Promise<Lesson[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lesson_students')
    .select(`
      lesson:lessons(*)
    `)
    .eq('student_id', studentId)

  if (error) {
    console.error('Error fetching assigned lessons:', error)
    throw new Error('Failed to fetch assigned lessons')
  }

  return (data || []).map((row: any) => row.lesson).filter(Boolean) as Lesson[]
}

export async function assignStudentsToLesson(
  lessonId: string,
  studentIds: string[],
  assignedBy: string
): Promise<void> {
  const supabase = await createClient()

  if (studentIds.length === 0) return

  const rows = studentIds.map((studentId) => ({
    lesson_id: lessonId,
    student_id: studentId,
    assigned_by: assignedBy,
  }))

  const { error } = await supabase
    .from('lesson_students')
    .upsert(rows, { onConflict: 'lesson_id,student_id' })

  if (error) {
    console.error('Error assigning students to lesson:', error)
    throw new Error('Failed to assign students to lesson')
  }
}

export async function isLessonAssignedToStudent(
  lessonId: string,
  studentId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lesson_students')
    .select('id')
    .eq('lesson_id', lessonId)
    .eq('student_id', studentId)
    .maybeSingle()

  if (error) {
    console.error('Error checking lesson assignment:', error)
    return false
  }

  return !!data
}

export async function getStudentsForDropdown(): Promise<Array<{ id: string; full_name: string }>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'student')
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Error fetching students:', error)
    throw new Error('Failed to fetch students')
  }

  return (data || []).map((s) => ({ id: s.id, full_name: s.full_name || 'Unknown' }))
}

export async function getCoachesForDropdown(): Promise<Array<{ id: string; full_name: string }>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('role', ['coach', 'admin'])
    .order('full_name', { ascending: true })
  if (error) throw new Error('Failed to fetch coaches')
  return (data || []).map((c: { id: string; full_name: string | null }) => ({ id: c.id, full_name: c.full_name || 'Unknown' }))
}

export async function getStudentsAssignedToLesson(lessonId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lesson_students')
    .select('student_id')
    .eq('lesson_id', lessonId)
  if (error) throw new Error('Failed to fetch assigned students')
  return (data || []).map((r: { student_id: string }) => r.student_id)
}

export async function reassignStudentsForLesson(
  lessonId: string,
  studentIds: string[],
  assignedBy: string
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('lesson_students').delete().eq('lesson_id', lessonId)
  if (studentIds.length === 0) return
  const rows = studentIds.map((studentId) => ({ lesson_id: lessonId, student_id: studentId, assigned_by: assignedBy }))
  const { error } = await supabase.from('lesson_students').insert(rows)
  if (error) throw new Error('Failed to reassign students')
}

export async function resetLessonProgress(lessonId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('reset_lesson_progress', { p_lesson_id: lessonId })
  if (error) throw new Error('Failed to reset lesson progress')
}

export async function bulkDeleteLessons(lessonIds: string[]): Promise<void> {
  for (const id of lessonIds) {
    await deleteLesson(id)
  }
}