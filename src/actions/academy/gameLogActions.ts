'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { getCurrentUserWithProfile } from '@/utils/auth/academyAuth'
import { getLichessConnectionByUserId } from '@/repositories/lichessConnectionRepo'
import { getLichessRecentGames, getLichessGamePgn } from '@/services/lichess.service'
import type { StoredAnnotationSet } from '@/lib/decorations'
import {
  getAssessmentCriteria,
  getGameLogForStudent,
  getGameLogEntryDetail,
  getGameCriteriaScores,
  getStudentDashboardStats,
  createGameLogEntry,
  updateGameLogEntry,
  deleteGameLogEntry,
  upsertGameCriteriaScore,
  type AssessmentCriterion,
  type GameLogEntry,
  type GameLogEntryDetail,
  type ScoredCriterion,
  type StudentDashboardStats,
  type GameResult,
} from '@/repositories/lesson/gameLogRepository'

// ── Guards ────────────────────────────────────────────────────────────────────
// Same pattern as coachActions.ts's (module-private) requireCoachOrAdminForStudent
// — duplicated here rather than shared, matching that file's own convention.

async function requireCoachOrAdminForStudent(studentId: string) {
  const { profile } = await getCurrentUserWithProfile()
  if (profile.role === 'admin') return profile

  if (profile.role === 'coach') {
    const supabase = await createClient()
    const { data } = await supabase
      .from('coach_students')
      .select('id')
      .eq('coach_id', profile.id)
      .eq('student_id', studentId)
      .single()
    if (!data) throw new Error('Unauthorised: student not assigned to this coach')
    return profile
  }

  throw new Error('Unauthorised: coach or admin access required')
}

async function requireStaff() {
  const { profile } = await getCurrentUserWithProfile()
  if (profile.role !== 'coach' && profile.role !== 'admin') {
    throw new Error('Unauthorised: coach or admin access required')
  }
  return profile
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function getAssessmentCriteriaAction(): Promise<AssessmentCriterion[]> {
  await requireStaff()
  return getAssessmentCriteria()
}

export async function getGameLogAction(studentId: string): Promise<GameLogEntry[]> {
  await requireCoachOrAdminForStudent(studentId)
  return getGameLogForStudent(studentId)
}

export async function getGameCriteriaScoresAction(
  studentId: string,
  gameLogEntryId: string
): Promise<ScoredCriterion[]> {
  await requireCoachOrAdminForStudent(studentId)
  return getGameCriteriaScores(gameLogEntryId)
}

export async function getStudentDashboardStatsAction(studentId: string): Promise<StudentDashboardStats> {
  await requireCoachOrAdminForStudent(studentId)
  return getStudentDashboardStats(studentId)
}

/** Full entry (pgn + annotations included) — used only when the board
 *  editor opens for that specific game, not the Game Log list view. */
export async function getGameLogEntryDetailAction(
  studentId: string,
  entryId: string
): Promise<GameLogEntryDetail> {
  await requireCoachOrAdminForStudent(studentId)
  return getGameLogEntryDetail(entryId)
}

/**
 * Full rich PGN (clocks/evals) for one specific Lichess game — called only
 * once a coach actually picks that game from the list getLichessGamesForStudentAction
 * returned, not for every candidate shown there.
 */
export async function getLichessGamePgnAction(studentId: string, lichessGameId: string): Promise<string> {
  await requireCoachOrAdminForStudent(studentId)

  const connection = await getLichessConnectionByUserId(studentId)
  if (!connection || !connection.is_active || connection.status !== 'active') {
    throw new Error('This student has no active Lichess connection')
  }

  return getLichessGamePgn(lichessGameId, connection.access_token)
}

// ── Lichess pick (Game Log's "optional Lichess pick" entry mode) ───────────────
// Live-fetches the student's recent Lichess games for a coach to pick from —
// no persisted cache, no new sync infra, matches what's already fetched (and
// discarded) by lichessSync.service.ts. The access token never leaves the
// server: this returns only the mapped picker rows.

export interface LichessGamePickOption {
  lichessGameId: string
  date: string
  opponent: string
  result: GameResult
  eco: string | null
  opening: string | null
}

export interface LichessGamesForPicker {
  connected: boolean
  username: string | null
  games: LichessGamePickOption[]
}

export async function getLichessGamesForStudentAction(studentId: string): Promise<LichessGamesForPicker> {
  await requireCoachOrAdminForStudent(studentId)

  const connection = await getLichessConnectionByUserId(studentId)
  if (!connection || !connection.is_active || connection.status !== 'active') {
    return { connected: false, username: connection?.lichess_username ?? null, games: [] }
  }

  const rawGames = await getLichessRecentGames(connection.lichess_username, connection.access_token, 20)
  const usernameLower = connection.lichess_username.toLowerCase()

  const games: LichessGamePickOption[] = rawGames
    // Only games with a definite outcome — Game Log's result is strictly win/draw/loss.
    .filter(g => g.status === 'draw' || g.winner === 'white' || g.winner === 'black')
    .map(g => {
      const isWhite = (g.players.white.user?.name ?? '').toLowerCase() === usernameLower
      const opponent = (isWhite ? g.players.black.user?.name : g.players.white.user?.name) ?? 'Unknown'
      const result: GameResult = !g.winner
        ? 'draw'
        : (g.winner === 'white') === isWhite ? 'win' : 'loss'

      return {
        lichessGameId: g.id,
        date: new Date(g.createdAt).toISOString().slice(0, 10),
        opponent,
        result,
        eco: g.opening?.eco ?? null,
        opening: g.opening?.name ?? null,
      }
    })

  return { connected: true, username: connection.lichess_username, games }
}

// ── Writes ───────────────────────────────────────────────────────────────────

export interface AddGameInput {
  studentId: string
  date: string
  opponent?: string | null
  event?: string | null
  result: GameResult
  notes?: string | null
  source?: 'manual' | 'lichess'
  lichessGameId?: string | null
  eco?: string | null
  opening?: string | null
  /** Set by Import PGN / Lichess-pick-with-moves / Manual play. */
  pgn?: string | null
  annotations?: Record<string, StoredAnnotationSet>
}

export async function createGameLogEntryAction(input: AddGameInput): Promise<GameLogEntryDetail> {
  const profile = await requireCoachOrAdminForStudent(input.studentId)

  const entry = await createGameLogEntry({ ...input, coachId: profile.id })
  revalidatePath('/academy/reports')
  return entry
}

export async function updateGameLogEntryAction(
  studentId: string,
  entryId: string,
  patch: Partial<Omit<AddGameInput, 'studentId'>>
): Promise<void> {
  await requireCoachOrAdminForStudent(studentId)
  await updateGameLogEntry(entryId, patch)
  revalidatePath('/academy/reports')
}

export async function deleteGameLogEntryAction(studentId: string, entryId: string): Promise<void> {
  await requireCoachOrAdminForStudent(studentId)
  await deleteGameLogEntry(entryId)
  revalidatePath('/academy/reports')
}

export async function upsertGameCriteriaScoreAction(
  studentId: string,
  gameLogEntryId: string,
  criterionId: string,
  score: number
): Promise<void> {
  await requireCoachOrAdminForStudent(studentId)
  if (typeof score !== 'number' || Number.isNaN(score) || score < 1 || score > 5) {
    throw new Error('Score must be a number between 1 and 5')
  }
  // 1 decimal place — matches the Rate scroller's granularity.
  const rounded = Math.round(score * 10) / 10
  await upsertGameCriteriaScore(gameLogEntryId, criterionId, rounded)
  revalidatePath('/academy/reports')
}
