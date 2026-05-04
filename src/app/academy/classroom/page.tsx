import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUserWithProfile } from '@/utils/auth/academyAuth'
import { getCoachSessions, getEnrolledSessionsForStudent } from '@/services/classroomService'
import { createClient } from '@/utils/supabase/server'
import ClassroomListClient from './_components/ClassroomListClient'
import type { ClassroomSession } from '@/services/classroomService'

export const metadata: Metadata = {
  title: 'Classroom — LCA Academy',
}

export default async function ClassroomPage() {
  const { profile } = await getCurrentUserWithProfile()
  if (!profile) redirect('/login')

  const isCoach   = profile.role === 'coach' || profile.role === 'admin'
  const isStudent = profile.role === 'student'

  if (isCoach) {
    const sessions = await getCoachSessions(profile.id)
    return (
      <ClassroomListClient
        role="coach"
        sessions={sessions}
        activeSession={sessions.find(s => s.status === 'active') ?? null}
        currentUserId={profile.id}
      />
    )
  }

  if (isStudent) {
    // Sessions this student is explicitly enrolled in (scheduled + active)
    const enrolledSessions = await getEnrolledSessionsForStudent(profile.id)
    const activeSession    = enrolledSessions.find(s => s.status === 'active') ?? null
    const upcomingSessions = enrolledSessions.filter(s => s.status === 'scheduled')

    // Past sessions: enrolled sessions with status='ended' + fallback from coach_students
    let endedSessions: ClassroomSession[] = []
    const supabase = await createClient()

    const { data: enrolledEnded } = await supabase
      .from('classroom_sessions')
      .select('*, classroom_session_students!inner(student_id)')
      .eq('classroom_session_students.student_id', profile.id)
      .eq('status', 'ended')
      .order('ended_at', { ascending: false })
      .limit(10)

    if (enrolledEnded && enrolledEnded.length > 0) {
      endedSessions = enrolledEnded.map(({ classroom_session_students: _css, ...s }) => s) as ClassroomSession[]
    } else {
      // Backward-compat: show ended sessions from assigned coach
      const { data: assignment } = await supabase
        .from('coach_students')
        .select('coach_id')
        .eq('student_id', profile.id)
        .maybeSingle()

      if (assignment) {
        const { data } = await supabase
          .from('classroom_sessions')
          .select('*')
          .eq('coach_id', assignment.coach_id)
          .eq('status', 'ended')
          .order('ended_at', { ascending: false })
          .limit(10)
        endedSessions = (data ?? []) as ClassroomSession[]
      }
    }

    return (
      <ClassroomListClient
        role="student"
        sessions={endedSessions}
        activeSession={activeSession}
        upcomingSessions={upcomingSessions}
        currentUserId={profile.id}
      />
    )
  }

  redirect('/academy')
}
