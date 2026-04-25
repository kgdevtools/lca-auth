import { redirect } from 'next/navigation'
import { getCurrentUserWithProfile } from '@/utils/auth/academyAuth'
import { getCoachStudentsWithProgress, getAllStudentsWithProgressAdmin, getStudentSelfProgress, getStudentLessonDetail, getStudentFeedback } from '@/repositories/lesson/studentRepository'
import { getAllLessons, type LessonWithCategory } from '@/repositories/lesson/lessonRepository'
import { getStudentGamificationSummary } from '@/services/gamificationService'
import ReportsClient from './_components/ReportsClient'

export const metadata = {
  title: 'Reports — LCA Academy',
  description: 'View student progress and reports',
}

function transformLessons(lessons: LessonWithCategory[]) {
  return lessons.map(l => ({
    id: l.id,
    title: l.title,
    difficulty: l.difficulty,
    content_type: l.content_type,
  }))
}

export default async function ReportsPage() {
  const { profile } = await getCurrentUserWithProfile()

  if (!profile) redirect('/login')

  if (profile.role === 'student') {
    const [selfProgress, gamification] = await Promise.all([
      getStudentSelfProgress(profile.id),
      getStudentGamificationSummary(profile.id),
    ])
    return (
      <ReportsClient
        role="student"
        selfProgress={selfProgress}
        gamification={gamification}
      />
    )
  }

  if (profile.role !== 'coach' && profile.role !== 'admin') {
    redirect('/academy')
  }

  const isAdmin = profile.role === 'admin'
  const [students, lessons] = await Promise.all([
    isAdmin
      ? getAllStudentsWithProgressAdmin()
      : getCoachStudentsWithProgress(profile.id),
    getAllLessons(),
  ])

  const studentIds = students.map(s => s.id)
  const studentLessonsData: Record<string, { lessons: any[]; feedback: any[] }> = {}

  if (studentIds.length > 0) {
    const lessonDetails = await Promise.all(
      studentIds.map(id => getStudentLessonDetail(id).catch(() => []))
    )
    const feedbacks = await Promise.all(
      studentIds.map(id => getStudentFeedback(id).catch(() => []))
    )

    studentIds.forEach((id, i) => {
      studentLessonsData[id] = {
        lessons: lessonDetails[i],
        feedback: feedbacks[i],
      }
    })
  }

  return (
    <ReportsClient
      role={profile.role}
      students={students}
      lessons={transformLessons(lessons)}
      isAdmin={isAdmin}
      studentLessonsData={studentLessonsData}
    />
  )
}