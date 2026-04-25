import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getCurrentUserWithProfile, checkCoachForStudent } from '@/utils/auth/academyAuth'
import { getStudentLessonDetail, getStudentFeedback } from '@/repositories/lesson/studentRepository'
import { getAllCoaches } from '@/actions/academy/coachActions'
import { getStudentGamificationSummary } from '@/services/gamificationService'
import StudentDetailClient from './_components/StudentDetailClient'

export const metadata = {
  title: 'Student Detail — LCA Academy',
  description: 'View student progress and feedback',
}

export default async function StudentDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { profile } = await getCurrentUserWithProfile()
  const { studentId } = await params

  if (!profile) redirect('/login')

  if (profile.role !== 'coach' && profile.role !== 'admin') {
    redirect('/academy')
  }

  await checkCoachForStudent(studentId)

  const supabase = await createClient()
  const { data: studentProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', studentId)
    .single()

  const [lessons, feedback, coaches, gamification, academyProfile] = await Promise.all([
    getStudentLessonDetail(studentId),
    getStudentFeedback(studentId),
    profile.role === 'admin' ? getAllCoaches() : Promise.resolve([]),
    getStudentGamificationSummary(studentId),
    supabase.from('academy_profiles').select('tier').eq('student_id', studentId).maybeSingle(),
  ])

  return (
    <StudentDetailClient
      studentId={studentId}
      studentName={studentProfile?.full_name ?? 'Student'}
      lessons={lessons}
      feedback={feedback}
      isAdmin={profile.role === 'admin'}
      coaches={coaches}
      gamification={gamification}
      tier={academyProfile.data?.tier ?? null}
    />
  )
}