import { redirect } from 'next/navigation'
import { getLessonById, isLessonAssignedToStudent } from '@/repositories/lesson/lessonRepository'
import { getCurrentUserWithProfile } from '@/utils/auth/academyAuth'
import { getStudentGamificationSummary } from '@/services/gamificationService'
import LessonViewerShell from './_components/LessonViewerShell'

interface PageProps {
  params: Promise<{
    lessonId: string
  }>
}

export const metadata = {
  title: 'Lesson - LCA Academy',
  description: 'Learn chess with interactive lessons',
}

export default async function LessonViewerPage({ params }: PageProps) {
  const { lessonId } = await params
  
  const { profile } = await getCurrentUserWithProfile()
  if (!profile) {
    redirect('/login')
  }

  const lesson = await getLessonById(lessonId)
  
  if (!lesson) {
    redirect('/academy/lesson')
  }

  const isCoachOrAdmin = profile.role === 'coach' || profile.role === 'admin'

  if (!isCoachOrAdmin) {
    // Students can only view lessons assigned to them
    const isAssigned = await isLessonAssignedToStudent(lessonId, profile.id)
    if (!isAssigned) {
      redirect('/academy/lesson')
    }
  }

  const [blocks, gamificationSummary] = await Promise.all([
    Promise.resolve((lesson.blocks || []) as Array<{ id: string; type: string; data: Record<string, unknown> }>),
    isCoachOrAdmin ? Promise.resolve(null) : getStudentGamificationSummary(profile.id).catch(() => null),
  ])

  return (
    <LessonViewerShell
      lesson={{
        id: lesson.id,
        title: lesson.title,
        slug: lesson.slug,
        description: lesson.description,
        difficulty: lesson.difficulty,
        blocks,
      }}
      gamificationSummary={gamificationSummary}
    />
  )
}