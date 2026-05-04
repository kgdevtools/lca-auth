import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUserWithProfile } from '@/utils/auth/academyAuth'
import { getSessionForUser } from '@/actions/academy/classroomActions'
import * as classroomService from '@/services/classroomService'
import CoachView from './_components/CoachView'
import StudentView from './_components/StudentView'

export const metadata: Metadata = { title: 'Classroom — LCA Academy' }

interface Props {
  params: Promise<{ sessionId: string }>
}

export default async function ClassroomSessionPage({ params }: Props) {
  const { sessionId } = await params

  const { profile } = await getCurrentUserWithProfile()

  let result: Awaited<ReturnType<typeof getSessionForUser>>
  try {
    result = await getSessionForUser(sessionId)
  } catch {
    redirect('/academy/classroom')
  }

  const { session, role } = result!
  const userName = profile.full_name ?? (role === 'coach' ? 'Coach' : 'Student')

  if (role === 'coach') {
    const [enrolledStudents, coachStudents] = await Promise.all([
      classroomService.getSessionStudents(session.id),
      classroomService.getCoachRoster(profile.id),
    ])
    return (
      <CoachView
        session={session}
        userId={profile.id}
        userName={userName}
        enrolledStudents={enrolledStudents}
        coachStudents={coachStudents}
      />
    )
  }

  return <StudentView session={session} userId={profile.id} userName={userName} />
}
