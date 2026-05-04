'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentUserWithProfile } from '@/utils/auth/academyAuth'
import * as classroomService from '@/services/classroomService'
import type { SessionMode, LogEventType, ClassroomSession, ClassroomSessionReport } from '@/services/classroomService'

export type { ClassroomSession }

// ── Guards ────────────────────────────────────────────────────────────────────

async function requireCoach() {
  const { profile } = await getCurrentUserWithProfile()
  if (profile.role !== 'coach' && profile.role !== 'admin') {
    throw new Error('Unauthorised: coach access required')
  }
  return profile
}

// Verifies the calling user is the coach who owns this session.
async function requireCoachOwnsSession(sessionId: string) {
  const profile = await requireCoach()
  const session = await classroomService.getSession(sessionId)
  if (!session) throw new Error('Session not found')
  if (session.coach_id !== profile.id) throw new Error('Unauthorised: you do not own this session')
  return { profile, session }
}

// Verifies the calling user is either the session coach or a student of that coach.
async function requireSessionParticipant(sessionId: string) {
  const { profile } = await getCurrentUserWithProfile()
  const session = await classroomService.getSession(sessionId)
  if (!session) throw new Error('Session not found')

  if (session.coach_id === profile.id) return { profile, session }

  if (profile.role === 'student' || profile.role === 'admin') return { profile, session }

  throw new Error('Unauthorised: not a participant in this session')
}

// ── Session lifecycle ─────────────────────────────────────────────────────────

export async function createClassroomSession(title: string): Promise<string> {
  const profile = await requireCoach()

  if (!title.trim()) throw new Error('Session title is required')

  const session = await classroomService.createSession(profile.id, title)
  revalidatePath('/academy/classroom')
  redirect(`/academy/classroom/${session.id}`)
}

export async function startClassroomSession(sessionId: string): Promise<void> {
  const { profile, session } = await requireCoachOwnsSession(sessionId)

  if (session.status !== 'scheduled') {
    throw new Error('Only scheduled sessions can be started')
  }

  await classroomService.startSession(sessionId)
  await classroomService.logEvent(sessionId, profile.id, 'session_start')
  revalidatePath(`/academy/classroom/${sessionId}`)
  revalidatePath('/academy/classroom')
}

export async function endClassroomSession(sessionId: string): Promise<void> {
  const { profile, session } = await requireCoachOwnsSession(sessionId)

  if (session.status !== 'active') {
    throw new Error('Only active sessions can be ended')
  }

  await classroomService.endSession(sessionId)
  await classroomService.logEvent(sessionId, profile.id, 'session_end')
  revalidatePath(`/academy/classroom/${sessionId}`)
  revalidatePath('/academy/classroom')
}

// ── In-session state (called fire-and-forget from client) ─────────────────────

// Persists FEN + PGN after each broadcast. Last-writer-wins.
export async function persistSessionState(
  sessionId: string,
  fen: string,
  pgn: string,
): Promise<void> {
  await requireSessionParticipant(sessionId)
  await classroomService.updateSessionState(sessionId, fen, pgn)
}

export async function setClassroomMode(
  sessionId: string,
  mode: SessionMode,
): Promise<void> {
  const { profile } = await requireCoachOwnsSession(sessionId)
  await classroomService.setMode(sessionId, mode)
  await classroomService.logEvent(sessionId, profile.id, 'mode_change', { mode })
  revalidatePath(`/academy/classroom/${sessionId}`)
}

export async function grantPawn(
  sessionId: string,
  studentId: string,
  studentName: string,
): Promise<void> {
  const { profile } = await requireCoachOwnsSession(sessionId)
  await classroomService.setActiveStudent(sessionId, studentId)
  await classroomService.logEvent(sessionId, profile.id, 'pawn_grant', { studentId, studentName })
  revalidatePath(`/academy/classroom/${sessionId}`)
}

export async function revokePawn(sessionId: string): Promise<void> {
  const { profile } = await requireCoachOwnsSession(sessionId)
  await classroomService.setActiveStudent(sessionId, null)
  await classroomService.logEvent(sessionId, profile.id, 'pawn_revoke')
  revalidatePath(`/academy/classroom/${sessionId}`)
}

export async function freezeBoard(sessionId: string, frozen: boolean): Promise<void> {
  const { profile } = await requireCoachOwnsSession(sessionId)
  await classroomService.setFrozen(sessionId, frozen)
  await classroomService.logEvent(sessionId, profile.id, 'board_freeze', { frozen })
  revalidatePath(`/academy/classroom/${sessionId}`)
}

// Generic log writer — students and coaches call this for raise_hand,
// pawn_request, move, etc.
export async function logClassroomEvent(
  sessionId: string,
  eventType: LogEventType,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { profile } = await requireSessionParticipant(sessionId)
  await classroomService.logEvent(sessionId, profile.id, eventType, metadata)
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function getCoachSessions(): Promise<ClassroomSession[]> {
  const profile = await requireCoach()
  return classroomService.getCoachSessions(profile.id)
}

export async function getClassroomSessionsReport(): Promise<ClassroomSessionReport[]> {
  const profile = await requireCoach()
  return classroomService.getEndedSessionsWithStats(profile.id)
}

// Used by the classroom page server component to load session + determine role.
export async function getSessionForUser(sessionId: string): Promise<{
  session: ClassroomSession
  role: 'coach' | 'student'
}> {
  const { profile } = await getCurrentUserWithProfile()
  const session = await classroomService.getSession(sessionId)

  if (!session) throw new Error('Session not found')

  const isCoach = session.coach_id === profile.id
  const isAdmin = profile.role === 'admin'

  if (isCoach || isAdmin) {
    return { session, role: 'coach' }
  }

  // Verify the student is explicitly enrolled in this session
  const { createClient } = await import('@/utils/supabase/server')
  const supabase = await createClient()
  const { data: enrollment } = await supabase
    .from('classroom_session_students')
    .select('id')
    .eq('session_id', sessionId)
    .eq('student_id', profile.id)
    .maybeSingle()

  if (!enrollment) throw new Error('Unauthorised: not enrolled in this session')

  return { session, role: 'student' }
}

// Called by StudentView after channel subscribes to close the timing gap between
// server render and subscription. Returns authoritative DB state.
export async function getSessionState(sessionId: string): Promise<{
  fen:             string
  pgn:             string
  frozen:          boolean
  activeStudentId: string | null
}> {
  const { session } = await requireSessionParticipant(sessionId)
  return {
    fen:             session.current_fen,
    pgn:             session.current_pgn,
    frozen:          session.board_frozen,
    activeStudentId: session.active_student_id,
  }
}

// Used by the academy dashboard to show the Live Now badge.
export async function getActiveSessionForCurrentStudent(): Promise<ClassroomSession | null> {
  const { profile } = await getCurrentUserWithProfile()
  if (profile.role !== 'student') return null
  return classroomService.getActiveSessionForStudent(profile.id)
}

// ── Session enrollment (coach only) ──────────────────────────────────────────

export async function getSessionEnrolledStudents(
  sessionId: string,
): Promise<{ id: string; full_name: string }[]> {
  await requireCoachOwnsSession(sessionId)
  return classroomService.getSessionStudents(sessionId)
}

export async function addSessionStudent(sessionId: string, studentId: string): Promise<void> {
  await requireCoachOwnsSession(sessionId)
  await classroomService.addStudentToSession(sessionId, studentId)
  revalidatePath(`/academy/classroom/${sessionId}`)
}

export async function removeSessionStudent(sessionId: string, studentId: string): Promise<void> {
  await requireCoachOwnsSession(sessionId)
  await classroomService.removeStudentFromSession(sessionId, studentId)
  revalidatePath(`/academy/classroom/${sessionId}`)
}
