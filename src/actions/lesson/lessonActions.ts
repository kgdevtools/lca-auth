'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { create, saveDraft, publish, remove } from '@/services/lesson/lessonService'
import { checkCoachRole, checkAdminRole } from '@/utils/auth/academyAuth'
import { type LessonInfo, type Block, validateLessonBlocks, validateLessonForPublish } from '@/lib/lessonSchema'

export async function createLesson(
  lessonInfo: LessonInfo,
  blocks: Block[],
  published: boolean = false
) {
  await checkCoachRole()
  
  await create(lessonInfo, blocks, published)
  
  revalidatePath('/academy/lessons')
  revalidatePath('/academy')
  
  if (published) {
    redirect('/academy/lessons')
  }
}

export async function saveLessonDraft(
  lessonId: string,
  lessonInfo: Partial<LessonInfo>,
  blocks: Block[]
) {
  await checkCoachRole()
  await saveDraft(lessonId, lessonInfo, blocks)
  revalidatePath('/academy/lessons')
}

export async function publishLesson(lessonId: string) {
  await checkCoachRole()
  await publish(lessonId)
  revalidatePath('/academy/lessons')
  revalidatePath('/academy')
}

export async function deleteLesson(lessonId: string) {
  await checkAdminRole()
  await remove(lessonId)
  revalidatePath('/academy/lessons')
  revalidatePath('/academy')
}