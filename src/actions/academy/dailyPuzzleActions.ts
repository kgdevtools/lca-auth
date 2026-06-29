'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUserWithProfile } from '@/utils/auth/academyAuth'
import * as dailyPuzzleService from '@/services/dailyPuzzleService'
import type { StoredPuzzle, DailyPuzzleSet } from '@/services/dailyPuzzleService'
import { recordRatingEvent } from '@/services/academyRatingService'
import { onDailyPuzzleSolved, triggerDailyActivity } from '@/services/gamificationService'

// ── Guards ────────────────────────────────────────────────────────────────────

async function requireCoach() {
  const { profile } = await getCurrentUserWithProfile()
  if (profile.role !== 'coach' && profile.role !== 'admin') {
    throw new Error('Unauthorised: coach access required')
  }
  return profile
}

// ── Coach: curate today's pool ──────────────────────────────────────────────────

export async function saveDailyPuzzleSet(puzzles: StoredPuzzle[]): Promise<void> {
  const profile = await requireCoach()
  await dailyPuzzleService.upsertTodaysSet(profile.id, puzzles)
  revalidatePath('/academy/puzzles')
  revalidatePath('/academy')
}

export async function getCoachTodaySet(): Promise<DailyPuzzleSet | null> {
  const profile = await requireCoach()
  return dailyPuzzleService.getTodaysSetForCoach(profile.id)
}

// ── Student: record a puzzle attempt ────────────────────────────────────────────
// Idempotent per puzzle/day (gated by record_rating_event). Returns the rating
// delta + points so the solver can animate the result.

export interface PuzzleSolveResult {
  applied:      boolean
  solved:       boolean
  ratingBefore: number
  ratingAfter:  number
  pointsEarned: number
}

export async function recordPuzzleAttempt(input: {
  puzzleId:     string
  puzzleRating: number | null
  solved:       boolean
}): Promise<PuzzleSolveResult> {
  const { profile } = await getCurrentUserWithProfile()

  const opponentR = input.puzzleRating ?? 1200
  const actual    = input.solved ? 1 : 0

  const rating = await recordRatingEvent(profile.id, {
    source:    'puzzle',
    sourceRef: input.puzzleId,
    opponentR,
    actual,
  })

  let pointsEarned = 0
  if (rating.applied && input.solved) {
    const { pointsEarned: p } = await onDailyPuzzleSolved(profile.id, input.puzzleRating)
    pointsEarned = p
  }

  // Streak tick (idempotent within triggerDailyActivity itself).
  await triggerDailyActivity(profile.id).catch(() => {})

  revalidatePath('/academy')

  return {
    applied:      rating.applied,
    solved:       input.solved,
    ratingBefore: rating.ratingBefore,
    ratingAfter:  rating.ratingAfter,
    pointsEarned,
  }
}
