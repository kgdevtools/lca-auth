import { redirect } from 'next/navigation'
import LessonBuilderClient from '@/app/academy/lesson/add/LessonBuilderClient'
import { getLessonForEdit } from '@/app/academy/lesson/add/actions'

export const metadata = { title: 'Edit Lesson - LCA Academy' }

export default async function EditLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params

  let editData
  try {
    editData = await getLessonForEdit(lessonId)
  } catch {
    redirect('/academy/lesson')
  }

  return <LessonBuilderClient mode="edit" editData={editData} />
}
