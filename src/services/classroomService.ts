'use server'

import { createClient } from '@/utils/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SessionStatus = 'scheduled' | 'active' | 'ended'
export type SessionMode   = 'demonstration' | 'exercise'
export type LogEventType  =
  | 'session_start'
  | 'session_end'
  | 'mode_change'
  | 'board_freeze'
  | 'pawn_grant'
  | 'pawn_revoke'
  | 'pawn_request'
  | 'raise_hand'
  | 'lower_hand'
  | 'move'
  | 'position_set'

export interface ClassroomSession {
  id: string
  coach_id: string
  title: string
  status: SessionStatus
  mode: SessionMode
  current_fen: string
  current_pgn: string
  active_student_id: string | null
  board_frozen: boolean
  started_at: string | null
  ended_at: string | null
  created_at: string
  updated_at: string
}

export interface ClassroomSessionLog {
  id: string
  session_id: string
  user_id: string
  event_type: LogEventType
  metadata: Record<string, unknown> | null
  created_at: string
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function getSession(sessionId: string): Promise<ClassroomSession | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('classroom_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch session: ${error.message}`)
  return data as ClassroomSession | null
}

export async function getCoachSessions(coachId: string): Promise<ClassroomSession[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('classroom_sessions')
    .select('*')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch sessions: ${error.message}`)
  return (data ?? []) as ClassroomSession[]
}

// Returns the active session (if any) for the coach assigned to the given student.
export async function getActiveSessionForStudent(
  studentId: string,
): Promise<ClassroomSession | null> {
  const supabase = await createClient()

  const { data: assignment } = await supabase
    .from('coach_students')
    .select('coach_id')
    .eq('student_id', studentId)
    .maybeSingle()

  if (!assignment) return null

  const { data, error } = await supabase
    .from('classroom_sessions')
    .select('*')
    .eq('coach_id', assignment.coach_id)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch active session: ${error.message}`)
  return data as ClassroomSession | null
}

// Returns all sessions a student is explicitly enrolled in (scheduled + active).
export async function getEnrolledSessionsForStudent(
  studentId: string,
): Promise<ClassroomSession[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('classroom_sessions')
    .select('*, classroom_session_students!inner(student_id)')
    .eq('classroom_session_students.student_id', studentId)
    .in('status', ['scheduled', 'active'])
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch enrolled sessions: ${error.message}`)
  return (data ?? []).map(({ classroom_session_students: _css, ...session }) => session) as ClassroomSession[]
}

// Returns enrolled students for a session (with names).
export async function getSessionStudents(
  sessionId: string,
): Promise<{ id: string; full_name: string }[]> {
  const supabase = await createClient()

  const { data: enrollments, error: eErr } = await supabase
    .from('classroom_session_students')
    .select('student_id')
    .eq('session_id', sessionId)

  if (eErr) throw new Error(`Failed to fetch session students: ${eErr.message}`)

  const studentIds = (enrollments ?? []).map(e => e.student_id)
  if (studentIds.length === 0) return []

  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', studentIds)
    .order('full_name')

  if (pErr) throw new Error(`Failed to fetch student profiles: ${pErr.message}`)
  return (profiles ?? []).map(p => ({ id: p.id, full_name: p.full_name ?? 'Unknown' }))
}

// Enroll a student in a session.
export async function addStudentToSession(sessionId: string, studentId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('classroom_session_students')
    .insert({ session_id: sessionId, student_id: studentId })

  if (error && error.code !== '23505') throw new Error(`Failed to add student: ${error.message}`)
}

// Remove a student from a session.
export async function removeStudentFromSession(sessionId: string, studentId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('classroom_session_students')
    .delete()
    .eq('session_id', sessionId)
    .eq('student_id', studentId)

  if (error) throw new Error(`Failed to remove student: ${error.message}`)
}

// Returns all students assigned to this coach (for the add-student dropdown).
export async function getCoachRoster(
  coachId: string,
): Promise<{ id: string; full_name: string }[]> {
  const supabase = await createClient()

  const { data: assignments, error: aErr } = await supabase
    .from('coach_students')
    .select('student_id')
    .eq('coach_id', coachId)

  if (aErr) throw new Error(`Failed to fetch coach roster: ${aErr.message}`)

  const studentIds = (assignments ?? []).map(a => a.student_id)
  if (studentIds.length === 0) return []

  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', studentIds)
    .order('full_name')

  if (pErr) throw new Error(`Failed to fetch roster profiles: ${pErr.message}`)
  return (profiles ?? []).map(p => ({ id: p.id, full_name: p.full_name ?? 'Unknown' }))
}

// ── Report types ──────────────────────────────────────────────────────────────

export interface ClassroomKeyEvent {
  eventType: LogEventType
  userName:  string
  metadata:  Record<string, unknown> | null
  createdAt: string
}

export interface ClassroomSessionReport extends ClassroomSession {
  moveCount:        number
  participantCount: number
  durationMinutes:  number | null
  keyEvents:        ClassroomKeyEvent[]
}

// Returns all ended sessions for a coach with pre-computed stats and key events.
export async function getEndedSessionsWithStats(
  coachId: string,
): Promise<ClassroomSessionReport[]> {
  const supabase = await createClient()

  const { data: sessions, error: sessErr } = await supabase
    .from('classroom_sessions')
    .select('*')
    .eq('coach_id', coachId)
    .eq('status', 'ended')
    .order('started_at', { ascending: false })

  if (sessErr) throw new Error(`Failed to fetch sessions: ${sessErr.message}`)
  if (!sessions || sessions.length === 0) return []

  const sessionIds = sessions.map(s => s.id)

  const { data: logs, error: logErr } = await supabase
    .from('classroom_session_logs')
    .select('session_id, user_id, event_type, metadata, created_at')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: true })

  if (logErr) throw new Error(`Failed to fetch session logs: ${logErr.message}`)

  const allLogs = logs ?? []

  // Resolve user names in one query
  const userIds = [...new Set(allLogs.map(l => l.user_id))]
  const nameById: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)
    for (const p of profiles ?? []) {
      nameById[p.id] = p.full_name ?? 'Unknown'
    }
  }

  // Group logs and compute stats per session
  type RawLog = (typeof allLogs)[0]
  const logsBySession: Record<string, RawLog[]> = {}
  for (const log of allLogs) {
    if (!logsBySession[log.session_id]) logsBySession[log.session_id] = []
    logsBySession[log.session_id].push(log)
  }

  return (sessions as ClassroomSession[]).map(session => {
    const sessionLogs = logsBySession[session.id] ?? []
    const moveCount        = sessionLogs.filter(l => l.event_type === 'move').length
    const participantCount = new Set(sessionLogs.map(l => l.user_id)).size
    const durationMinutes  = session.started_at && session.ended_at
      ? Math.round(
          (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60_000,
        )
      : null

    const KEY_EVENTS = new Set<string>([
      'session_start', 'session_end', 'mode_change', 'board_freeze',
      'pawn_grant', 'pawn_revoke', 'raise_hand',
    ])

    const keyEvents: ClassroomKeyEvent[] = sessionLogs
      .filter(l => KEY_EVENTS.has(l.event_type))
      .map(l => ({
        eventType: l.event_type as LogEventType,
        userName:  nameById[l.user_id] ?? 'Unknown',
        metadata:  l.metadata as Record<string, unknown> | null,
        createdAt: l.created_at,
      }))

    return { ...session, moveCount, participantCount, durationMinutes, keyEvents }
  })
}

export async function getSessionLogs(sessionId: string): Promise<ClassroomSessionLog[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('classroom_session_logs')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch session logs: ${error.message}`)
  return (data ?? []) as ClassroomSessionLog[]
}

// ── Writes ────────────────────────────────────────────────────────────────────

export async function createSession(
  coachId: string,
  title: string,
): Promise<ClassroomSession> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('classroom_sessions')
    .insert({ coach_id: coachId, title: title.trim() })
    .select()
    .single()

  if (error) throw new Error(`Failed to create session: ${error.message}`)
  return data as ClassroomSession
}

export async function startSession(sessionId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('classroom_sessions')
    .update({ status: 'active', started_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (error) throw new Error(`Failed to start session: ${error.message}`)
}

export async function endSession(sessionId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('classroom_sessions')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', sessionId)

  if (error) throw new Error(`Failed to end session: ${error.message}`)
}

// Last-writer-wins — called fire-and-forget after each broadcast.
export async function updateSessionState(
  sessionId: string,
  fen: string,
  pgn: string,
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('classroom_sessions')
    .update({ current_fen: fen, current_pgn: pgn })
    .eq('id', sessionId)

  if (error) throw new Error(`Failed to persist session state: ${error.message}`)
}

export async function setMode(sessionId: string, mode: SessionMode): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('classroom_sessions')
    .update({ mode })
    .eq('id', sessionId)

  if (error) throw new Error(`Failed to set mode: ${error.message}`)
}

export async function setActiveStudent(
  sessionId: string,
  studentId: string | null,
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('classroom_sessions')
    .update({ active_student_id: studentId })
    .eq('id', sessionId)

  if (error) throw new Error(`Failed to set active student: ${error.message}`)
}

export async function setFrozen(sessionId: string, frozen: boolean): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('classroom_sessions')
    .update({ board_frozen: frozen })
    .eq('id', sessionId)

  if (error) throw new Error(`Failed to set frozen: ${error.message}`)
}

export async function logEvent(
  sessionId: string,
  userId: string,
  eventType: LogEventType,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('classroom_session_logs')
    .insert({ session_id: sessionId, user_id: userId, event_type: eventType, metadata: metadata ?? null })

  if (error) throw new Error(`Failed to log event: ${error.message}`)
}
