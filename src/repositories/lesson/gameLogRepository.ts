import { createClient } from '@/utils/supabase/server'
import { PHASES, type GamePhase, type GameResult, type GameSource, type AssessmentCriterion, type ScoredCriterion, type PhaseScores } from '@/lib/gameAssessment'
import type { StoredAnnotationSet } from '@/lib/decorations'

// Re-exported so existing call sites (`from '@/repositories/lesson/gameLogRepository'`)
// keep working — but client components should import PHASES and the pure
// types directly from '@/lib/gameAssessment' instead (see that file's doc
// comment for why: this module is server-only).
export { PHASES }
export type { GamePhase, GameResult, GameSource, AssessmentCriterion, ScoredCriterion, PhaseScores }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GameLogEntry {
  id: string
  student_id: string
  coach_id: string
  date: string
  opponent: string | null
  event: string | null
  result: GameResult
  notes: string | null
  source: GameSource
  lichess_game_id: string | null
  eco: string | null
  opening: string | null
  created_at: string
  updated_at: string
  /** Rolled up from game_criteria_scores — null per-phase until at least one
   *  of that phase's criteria has been scored (partial scoring is allowed). */
  phase_scores: PhaseScores
  criteria_scored_count: number
  /** Average of whichever phases currently have a value, ×20. Null until at
   *  least one criterion anywhere on this game has been scored. */
  overall_score: number | null
}

/** Full row including the heavy fields (pgn/annotations) — only fetched when
 *  the board editor actually opens for one entry, kept out of the Game Log
 *  list query (getGameLogForStudent) to keep that cheap. */
export interface GameLogEntryDetail extends GameLogEntry {
  pgn: string | null
  annotations: Record<string, StoredAnnotationSet>
}

export interface StudentDashboardStats {
  gamesPlayed: number
  gamesScored: number
  avgOverall: number | null
  record: { wins: number; draws: number; losses: number }
  phaseAverages: PhaseScores
  strongestPhase: GamePhase | null
  weakestPhase: GamePhase | null
  games: Array<Pick<GameLogEntry, 'id' | 'date' | 'result' | 'overall_score' | 'phase_scores'>>
}

export interface GameLogEntryInput {
  studentId: string
  coachId: string
  date: string
  opponent?: string | null
  event?: string | null
  result: GameResult
  notes?: string | null
  source?: GameSource
  lichessGameId?: string | null
  eco?: string | null
  opening?: string | null
  /** Set by Import PGN / Lichess-pick-with-moves / Manual play — the game's
   *  full PGN (source of truth, re-parsed on load). Undefined leaves it
   *  untouched on update; null explicitly clears it. */
  pgn?: string | null
  annotations?: Record<string, StoredAnnotationSet>
}

// ── Shared rollup helper ────────────────────────────────────────────────────
// Same math used per-game (getGameLogForStudent) and across games
// (getStudentDashboardStats) — kept in one place so both stay consistent.

function emptyPhaseScores(): PhaseScores {
  return { opening: null, middlegame: null, endgame: null, tactics: null, strategy: null, psychology: null }
}

function rollupPhaseScores(rows: Array<{ phase: GamePhase; score: number }>): { phaseScores: PhaseScores; overall: number | null } {
  const byPhase = new Map<GamePhase, number[]>()
  for (const row of rows) {
    const list = byPhase.get(row.phase) ?? []
    list.push(row.score)
    byPhase.set(row.phase, list)
  }

  const phaseScores = emptyPhaseScores()
  for (const phase of PHASES) {
    const scores = byPhase.get(phase)
    if (scores && scores.length > 0) {
      phaseScores[phase] = scores.reduce((s, v) => s + v, 0) / scores.length
    }
  }

  const scoredPhases = PHASES.map(p => phaseScores[p]).filter((v): v is number => v != null)
  const overall = scoredPhases.length > 0
    ? Math.round((scoredPhases.reduce((s, v) => s + v, 0) / scoredPhases.length) * 20)
    : null

  return { phaseScores, overall }
}

// ── assessment_criteria (fixed rubric lookup) ──────────────────────────────

export async function getAssessmentCriteria(): Promise<AssessmentCriterion[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('assessment_criteria')
    .select('id, phase, name, description, sort_order')
    .order('phase')
    .order('sort_order')

  if (error) throw new Error('Failed to fetch assessment criteria')

  return (data ?? []) as AssessmentCriterion[]
}

// ── Game Log ─────────────────────────────────────────────────────────────────

export async function getGameLogForStudent(studentId: string): Promise<GameLogEntry[]> {
  const supabase = await createClient()

  const { data: entries, error: eErr } = await supabase
    .from('game_log_entries')
    .select('id, student_id, coach_id, date, opponent, event, result, notes, source, lichess_game_id, eco, opening, created_at, updated_at')
    .eq('student_id', studentId)
    .order('date', { ascending: false })

  if (eErr) throw new Error('Failed to fetch game log')
  if (!entries || entries.length === 0) return []

  const entryIds = entries.map(e => e.id)

  const { data: scoreRows, error: sErr } = await supabase
    .from('game_criteria_scores')
    .select('game_log_entry_id, score, criterion:assessment_criteria(phase)')
    .in('game_log_entry_id', entryIds)

  if (sErr) throw new Error('Failed to fetch criteria scores')

  const scoresByEntry = new Map<string, Array<{ phase: GamePhase; score: number }>>()
  ;(scoreRows ?? []).forEach((row: any) => {
    const phase = row.criterion?.phase as GamePhase | undefined
    if (!phase) return
    const list = scoresByEntry.get(row.game_log_entry_id) ?? []
    list.push({ phase, score: row.score })
    scoresByEntry.set(row.game_log_entry_id, list)
  })

  return entries.map(entry => {
    const rows = scoresByEntry.get(entry.id) ?? []
    const { phaseScores, overall } = rollupPhaseScores(rows)
    return {
      ...entry,
      phase_scores: phaseScores,
      criteria_scored_count: rows.length,
      overall_score: overall,
    } as GameLogEntry
  })
}

export async function createGameLogEntry(input: GameLogEntryInput): Promise<GameLogEntryDetail> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('game_log_entries')
    .insert({
      student_id: input.studentId,
      coach_id: input.coachId,
      date: input.date,
      opponent: input.opponent ?? null,
      event: input.event ?? null,
      result: input.result,
      notes: input.notes ?? null,
      source: input.source ?? 'manual',
      lichess_game_id: input.lichessGameId ?? null,
      eco: input.eco ?? null,
      opening: input.opening ?? null,
      pgn: input.pgn ?? null,
      annotations: input.annotations ?? {},
    })
    .select('id, student_id, coach_id, date, opponent, event, result, notes, source, lichess_game_id, eco, opening, pgn, annotations, created_at, updated_at')
    .single()

  if (error) throw new Error('Failed to create game log entry')

  return {
    ...data,
    annotations: (data.annotations ?? {}) as Record<string, StoredAnnotationSet>,
    phase_scores: emptyPhaseScores(),
    criteria_scored_count: 0,
    overall_score: null,
  } as GameLogEntryDetail
}

export async function updateGameLogEntry(
  id: string,
  input: Partial<Omit<GameLogEntryInput, 'studentId' | 'coachId'>>
): Promise<void> {
  const supabase = await createClient()

  const patch: Record<string, unknown> = {}
  if (input.date !== undefined) patch.date = input.date
  if (input.opponent !== undefined) patch.opponent = input.opponent
  if (input.event !== undefined) patch.event = input.event
  if (input.result !== undefined) patch.result = input.result
  if (input.notes !== undefined) patch.notes = input.notes
  if (input.eco !== undefined) patch.eco = input.eco
  if (input.opening !== undefined) patch.opening = input.opening
  if (input.pgn !== undefined) patch.pgn = input.pgn
  if (input.annotations !== undefined) patch.annotations = input.annotations

  const { error } = await supabase.from('game_log_entries').update(patch).eq('id', id)
  if (error) throw new Error('Failed to update game log entry')
}

/** Full detail for one entry (pgn + annotations included) — used only when
 *  the board editor opens for that specific game. */
export async function getGameLogEntryDetail(id: string): Promise<GameLogEntryDetail> {
  const supabase = await createClient()

  const { data: entry, error: eErr } = await supabase
    .from('game_log_entries')
    .select('id, student_id, coach_id, date, opponent, event, result, notes, source, lichess_game_id, eco, opening, pgn, annotations, created_at, updated_at')
    .eq('id', id)
    .single()

  if (eErr || !entry) throw new Error('Failed to fetch game log entry')

  const { data: scoreRows, error: sErr } = await supabase
    .from('game_criteria_scores')
    .select('score, criterion:assessment_criteria(phase)')
    .eq('game_log_entry_id', id)

  if (sErr) throw new Error('Failed to fetch criteria scores')

  const rows = (scoreRows ?? [])
    .map((row: any) => ({ phase: row.criterion?.phase as GamePhase | undefined, score: row.score as number }))
    .filter((r): r is { phase: GamePhase; score: number } => !!r.phase)

  const { phaseScores, overall } = rollupPhaseScores(rows)

  return {
    ...entry,
    annotations: (entry.annotations ?? {}) as Record<string, StoredAnnotationSet>,
    phase_scores: phaseScores,
    criteria_scored_count: rows.length,
    overall_score: overall,
  } as GameLogEntryDetail
}

export async function deleteGameLogEntry(id: string): Promise<void> {
  const supabase = await createClient()
  // game_criteria_scores rows cascade via the FK — nothing else to clean up.
  const { error } = await supabase.from('game_log_entries').delete().eq('id', id)
  if (error) throw new Error('Failed to delete game log entry')
}

// ── Criteria Detail (scoring) ───────────────────────────────────────────────

export async function getGameCriteriaScores(gameLogEntryId: string): Promise<ScoredCriterion[]> {
  const [criteria, supabase] = await Promise.all([getAssessmentCriteria(), createClient()])

  const { data: scoreRows, error } = await supabase
    .from('game_criteria_scores')
    .select('criterion_id, score')
    .eq('game_log_entry_id', gameLogEntryId)

  if (error) throw new Error('Failed to fetch game criteria scores')

  const scoreMap = new Map((scoreRows ?? []).map(r => [r.criterion_id, r.score as number]))

  return criteria.map(c => ({ ...c, score: scoreMap.get(c.id) ?? null }))
}

export async function upsertGameCriteriaScore(
  gameLogEntryId: string,
  criterionId: string,
  score: number
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('game_criteria_scores')
    .upsert(
      { game_log_entry_id: gameLogEntryId, criterion_id: criterionId, score },
      { onConflict: 'game_log_entry_id,criterion_id' }
    )

  if (error) throw new Error('Failed to save criterion score')
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export async function getStudentDashboardStats(studentId: string): Promise<StudentDashboardStats> {
  const entries = await getGameLogForStudent(studentId)

  const record = entries.reduce(
    (acc, e) => {
      if (e.result === 'win') acc.wins++
      else if (e.result === 'draw') acc.draws++
      else acc.losses++
      return acc
    },
    { wins: 0, draws: 0, losses: 0 }
  )

  // Phase averages across every scored criterion in every game (not an
  // average-of-per-game-averages — this weights every individual score
  // equally regardless of how many criteria a given game happened to have
  // scored, which is the more honest number under partial scoring).
  const phaseAverages = emptyPhaseScores()
  for (const phase of PHASES) {
    const values = entries.map(e => e.phase_scores[phase]).filter((v): v is number => v != null)
    phaseAverages[phase] = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : null
  }

  const rankedPhases = PHASES
    .map(p => ({ phase: p, value: phaseAverages[p] }))
    .filter((p): p is { phase: GamePhase; value: number } => p.value != null)
    .sort((a, b) => b.value - a.value)

  const scoredOveralls = entries.map(e => e.overall_score).filter((v): v is number => v != null)
  const avgOverall = scoredOveralls.length > 0
    ? Math.round(scoredOveralls.reduce((s, v) => s + v, 0) / scoredOveralls.length)
    : null

  return {
    gamesPlayed: entries.length,
    gamesScored: entries.filter(e => e.criteria_scored_count > 0).length,
    avgOverall,
    record,
    phaseAverages,
    strongestPhase: rankedPhases[0]?.phase ?? null,
    weakestPhase: rankedPhases.at(-1)?.phase ?? null,
    games: entries.map(e => ({ id: e.id, date: e.date, result: e.result, overall_score: e.overall_score, phase_scores: e.phase_scores })),
  }
}
