import { revalidatePath } from 'next/cache'
import {
  getAllCategories,
  getPublishedLessons,
  getAllLessons,
  getLessonBySlug,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  type Lesson,
  type LessonWithCategory,
} from '@/repositories/lesson/lessonRepository'
import { checkCoachRole, checkAdminRole, getCurrentUserWithProfile } from '@/utils/auth/academyAuth'
import { validateLessonForPublish, type LessonInfo, type Block } from '@/lib/lessonSchema'

export async function getCategories() {
  return getAllCategories()
}

export async function getPublished() {
  return getPublishedLessons()
}

export async function getAll() {
  await checkCoachRole()
  return getAllLessons()
}

export async function getBySlug(slug: string) {
  const lesson = await getLessonBySlug(slug)
  
  if (!lesson) {
    return null
  }

  if (!lesson.published) {
    const { profile } = await getCurrentUserWithProfile()
    if (!profile || (profile.role !== 'coach' && profile.role !== 'admin')) {
      return null
    }
  }

  return lesson
}

export async function getById(id: string) {
  await checkCoachRole()
  return getLessonById(id)
}

export async function create(
  lessonInfo: LessonInfo,
  blocks: Block[],
  published: boolean = false
): Promise<Lesson> {
  await checkCoachRole()
  
  const { profile } = await getCurrentUserWithProfile()
  if (!profile) {
    throw new Error('User profile not found')
  }

  const validation = validateLessonForPublish(lessonInfo, blocks)
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '))
  }

  const lesson = await createLesson({
    title: lessonInfo.title,
    slug: lessonInfo.slug,
    description: lessonInfo.description,
    category_id: lessonInfo.categoryId,
    content_type: 'block',
    blocks: blocks.map((b) => ({ id: b.id, type: b.type, data: b.data })),
    difficulty: lessonInfo.difficulty,
    estimated_duration_minutes: lessonInfo.estimatedDurationMinutes,
    published,
    created_by: profile.id,
  })

  revalidatePath('/academy/lessons')
  
  return lesson
}

export async function saveDraft(
  lessonId: string,
  lessonInfo: Partial<LessonInfo>,
  blocks: Block[]
): Promise<Lesson> {
  await checkCoachRole()

  const updateData: Partial<{
    title: string
    slug: string
    description: string
    category_id: string
    content_type: string
    content_data: Record<string, unknown>
    blocks: Array<{ id: string; type: string; data: Record<string, unknown> }>
    difficulty: string
    estimated_duration_minutes: number
    display_order: number
    published: boolean
  }> = {
    blocks: blocks.map((b) => ({ id: b.id, type: b.type, data: b.data })),
  }

  if (lessonInfo.title) updateData.title = lessonInfo.title
  if (lessonInfo.slug) updateData.slug = lessonInfo.slug
  if (lessonInfo.description !== undefined) updateData.description = lessonInfo.description
  if (lessonInfo.categoryId) updateData.category_id = lessonInfo.categoryId
  if (lessonInfo.difficulty) updateData.difficulty = lessonInfo.difficulty
  if (lessonInfo.estimatedDurationMinutes) {
    updateData.estimated_duration_minutes = lessonInfo.estimatedDurationMinutes
  }

  const lesson = await updateLesson(lessonId, updateData)

  revalidatePath('/academy/lessons')
  
  return lesson
}

export async function publish(lessonId: string): Promise<Lesson> {
  await checkCoachRole()

  const lesson = await getLessonById(lessonId)
  if (!lesson) {
    throw new Error('Lesson not found')
  }

  const blocks = (lesson.blocks || []) as Block[]
  const lessonInfo: LessonInfo = {
    title: lesson.title,
    slug: lesson.slug,
    description: lesson.description || undefined,
    difficulty: lesson.difficulty as LessonInfo['difficulty'],
    estimatedDurationMinutes: lesson.estimated_duration_minutes || undefined,
    tags: [],
  }

  const validation = validateLessonForPublish(lessonInfo, blocks)
  if (!validation.valid) {
    throw new Error(validation.errors.join('; '))
  }

  const updated = await updateLesson(lessonId, { published: true })

  revalidatePath('/academy/lessons')
  
  return updated
}

export async function unpublish(lessonId: string): Promise<Lesson> {
  await checkCoachRole()

  const updated = await updateLesson(lessonId, { published: false })

  revalidatePath('/academy/lessons')
  
  return updated
}

export async function remove(lessonId: string): Promise<{ success: boolean }> {
  await checkAdminRole()

  const result = await deleteLesson(lessonId)

  revalidatePath('/academy/lessons')
  
  return result
}

export async function getByCategory(categoryId: string) {
  const { getLessonsByCategory } = await import('@/repositories/lesson/lessonRepository')
  return getLessonsByCategory(categoryId)
}