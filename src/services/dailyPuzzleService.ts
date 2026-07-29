'use server'

import { createClient } from '@/utils/supabase/server'

// ── Types ───────────────────────────────────────────────────────────────────

/** A puzzle payload stored inline in a daily set (no Lichess re-fetch needed). */
export interface StoredPuzzle {
  lichessId:   string
  fen:         string
  pgn?:        string
  solution:    string[]
  themes:      string[]
  rating:      number | null
  orientation: 'white' | 'black'
}

export interface DailyPuzzleSet {
  id:       string
  coachId:  string
  forDate:  string
  puzzles:  StoredPuzzle[]
  /** Empty = visible to all of the coach's students. */
  assignedStudentIds: string[]
}

const todayStr = () => new Date().toISOString().slice(0, 10)

function mapSet(row: {
  id: string; coach_id: string; for_date: string; puzzles: unknown; assigned_student_ids?: string[] | null
}): DailyPuzzleSet {
  return {
    id:      row.id,
    coachId: row.coach_id,
    forDate: row.for_date,
    puzzles: Array.isArray(row.puzzles) ? (row.puzzles as StoredPuzzle[]) : [],
    assignedStudentIds: Array.isArray(row.assigned_student_ids) ? row.assigned_student_ids : [],
  }
}

// ── Coach: read/write today's pool ────────────────────────────────────────────

export async function getTodaysSetForCoach(coachId: string): Promise<DailyPuzzleSet | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('daily_puzzle_sets')
    .select('id, coach_id, for_date, puzzles, assigned_student_ids')
    .eq('coach_id', coachId)
    .eq('for_date', todayStr())
    .maybeSingle()
  return data ? mapSet(data) : null
}

export async function upsertTodaysSet(
  coachId: string,
  puzzles: StoredPuzzle[],
  assignedStudentIds: string[] = [],
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('daily_puzzle_sets')
    .upsert(
      { coach_id: coachId, for_date: todayStr(), puzzles, assigned_student_ids: assignedStudentIds },
      { onConflict: 'coach_id,for_date' },
    )
  if (error) throw new Error(`upsertTodaysSet: ${error.message}`)
}

/** This coach's own students, for the daily-set student-tagging picker. */
export async function getMyStudentsForDailyPuzzles(
  coachId: string,
): Promise<Array<{ id: string; full_name: string }>> {
  const supabase = await createClient()
  const { data: links } = await supabase
    .from('coach_students')
    .select('student_id')
    .eq('coach_id', coachId)
  const studentIds = (links ?? []).map(l => l.student_id)
  if (studentIds.length === 0) return []

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', studentIds)
    .order('full_name', { ascending: true })

  return (profiles ?? []).map(p => ({ id: p.id, full_name: p.full_name || 'Unknown' }))
}

// ── Student: today's set (via their coach) + attempts ─────────────────────────

export interface StudentDailySetResult {
  /** null only when the student has no coach at all */
  coachId: string | null
  /** null when the (most recent) coach hasn't published a set for today yet */
  set: DailyPuzzleSet | null
}

export async function getTodaysSetForStudent(studentId: string): Promise<StudentDailySetResult> {
  const supabase = await createClient()
  // A student can have more than one coach (coach_students is many-to-many).
  // `.maybeSingle()` here would throw once a second coach row exists, which
  // silently read back as "no coach at all" for the student.
  const { data: links } = await supabase
    .from('coach_students')
    .select('coach_id')
    .eq('student_id', studentId)
    .order('assigned_at', { ascending: false })
  if (!links || links.length === 0) return { coachId: null, set: null }

  const coachIds = links.map(l => l.coach_id)
  const { data: rows } = await supabase
    .from('daily_puzzle_sets')
    .select('id, coach_id, for_date, puzzles, assigned_student_ids')
    .in('coach_id', coachIds)
    .eq('for_date', todayStr())

  const sets = (rows ?? []).map(mapSet)
  // Prefer the most-recently-assigned coach's set; a set with no tags is visible
  // to all of that coach's students, otherwise the student must be tagged in.
  const visible = coachIds
    .map(cid => sets.find(s => s.coachId === cid))
    .find((s): s is DailyPuzzleSet => !!s && (s.assignedStudentIds.length === 0 || s.assignedStudentIds.includes(studentId)))

  return { coachId: coachIds[0], set: visible ?? null }
}

/** puzzleId → solved, for the puzzles this student has already attempted today. */
export async function getStudentAttemptsToday(studentId: string): Promise<Record<string, boolean>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('student_rating_events')
    .select('source_ref, actual')
    .eq('student_id', studentId)
    .eq('source', 'puzzle')
    .eq('day', todayStr())
  const out: Record<string, boolean> = {}
  for (const r of data ?? []) {
    if (r.source_ref) out[r.source_ref] = Number(r.actual) === 1
  }
  return out
}
