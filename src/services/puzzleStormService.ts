'use server'

import { createClient } from '@/utils/supabase/server'
import { getCurrentUserWithProfile } from '@/utils/auth/academyAuth'

// ── Types ───────────────────────────────────────────────────────────────────

export interface SavePuzzleStormScoreResult {
  personalBest: number
}

export interface PuzzleStormBest {
  best: number | null
}

// ── Actions ─────────────────────────────────────────────────────────────────
// Both self-authenticate (rather than trust a caller-supplied user id) — RLS
// on puzzle_storm_scores also enforces auth.uid() = user_id, but the insert
// itself must carry the real signed-in id.

export async function savePuzzleStormScore(
  lessonId: string,
  score: number,
  attempted: number,
  timeLimit: number,
  timeElapsed: number,
): Promise<SavePuzzleStormScoreResult> {
  const { profile } = await getCurrentUserWithProfile()
  if (!profile) throw new Error('User profile not found')

  const supabase = await createClient()
  const { error: insertError } = await supabase.from('puzzle_storm_scores').insert({
    user_id: profile.id,
    lesson_id: lessonId,
    score,
    attempted,
    time_limit: timeLimit,
    time_elapsed: timeElapsed,
  })
  if (insertError) throw new Error(`savePuzzleStormScore: ${insertError.message}`)

  const { data, error: bestError } = await supabase
    .from('puzzle_storm_scores')
    .select('score')
    .eq('user_id', profile.id)
    .eq('lesson_id', lessonId)
    .order('score', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (bestError) throw new Error(`savePuzzleStormScore: ${bestError.message}`)

  return { personalBest: data?.score ?? score }
}

export async function getPuzzleStormBest(lessonId: string): Promise<PuzzleStormBest> {
  const { profile } = await getCurrentUserWithProfile()
  if (!profile) throw new Error('User profile not found')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('puzzle_storm_scores')
    .select('score')
    .eq('user_id', profile.id)
    .eq('lesson_id', lessonId)
    .order('score', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`getPuzzleStormBest: ${error.message}`)

  return { best: data?.score ?? null }
}
