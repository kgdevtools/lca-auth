import { getPublishedLessons, getAllCategories } from '@/services/lessonService'
import { getAllProgress } from '@/services/progressService'
import LessonsPageClient from '@/components/academy/lessons/LessonsPageClient'

export default async function LessonsPage() {
  const lessons = await getPublishedLessons()
  const categories = await getAllCategories()
  const progressData = await getAllProgress().catch(() => [])

  // Transform progress data to match expected format
  const transformedProgress = progressData.map(p => ({
    lesson_id: p.lesson_id,
    status: p.status,
    quiz_score: p.quiz_score ?? undefined,
    time_spent_seconds: p.time_spent_seconds ?? undefined,
    attempts: p.attempts ?? undefined,
  }))

  return (
    <LessonsPageClient
      initialLessons={lessons}
      initialCategories={categories}
      initialProgress={transformedProgress}
    />
  )
}