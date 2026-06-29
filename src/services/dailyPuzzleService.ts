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
}

const todayStr = () => new Date().toISOString().slice(0, 10)

function mapSet(row: {
  id: string; coach_id: string; for_date: string; puzzles: unknown
}): DailyPuzzleSet {
  return {
    id:      row.id,
    coachId: row.coach_id,
    forDate: row.for_date,
    puzzles: Array.isArray(row.puzzles) ? (row.puzzles as StoredPuzzle[]) : [],
  }
}

// ── Coach: read/write today's pool ────────────────────────────────────────────

export async function getTodaysSetForCoach(coachId: string): Promise<DailyPuzzleSet | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('daily_puzzle_sets')
    .select('id, coach_id, for_date, puzzles')
    .eq('coach_id', coachId)
    .eq('for_date', todayStr())
    .maybeSingle()
  return data ? mapSet(data) : null
}

export async function upsertTodaysSet(coachId: string, puzzles: StoredPuzzle[]): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('daily_puzzle_sets')
    .upsert(
      { coach_id: coachId, for_date: todayStr(), puzzles },
      { onConflict: 'coach_id,for_date' },
    )
  if (error) throw new Error(`upsertTodaysSet: ${error.message}`)
}

// ── Student: today's set (via their coach) + attempts ─────────────────────────

export async function getTodaysSetForStudent(studentId: string): Promise<DailyPuzzleSet | null> {
  const supabase = await createClient()
  const { data: link } = await supabase
    .from('coach_students')
    .select('coach_id')
    .eq('student_id', studentId)
    .maybeSingle()
  if (!link?.coach_id) return null

  const { data } = await supabase
    .from('daily_puzzle_sets')
    .select('id, coach_id, for_date, puzzles')
    .eq('coach_id', link.coach_id)
    .eq('for_date', todayStr())
    .maybeSingle()
  return data ? mapSet(data) : null
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
