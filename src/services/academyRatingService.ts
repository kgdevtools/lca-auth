'use server'

import { createClient } from '@/utils/supabase/server'
import {
  expectedScore,
  activityPerf,
  nextRating,
  seedRating,
  computeAggregates,
  consistencyWord,
  trajectoryWord,
  upsetWord,
  type RatingEventLite,
  type RatingAggregates,
} from '@/lib/academyRating'

// ── Types ───────────────────────────────────────────────────────────────────

export type RatingSource = 'puzzle' | 'lesson' | 'classroom' | 'coach'

export interface RecordRatingInput {
  source:    RatingSource
  /** puzzle id / lesson id — drives daily idempotency */
  sourceRef: string | null
  /** opponent rating R (puzzle rating, or difficulty-mapped for lessons) */
  opponentR: number
  /** 1 solved / 0.5 partial / 0 failed */
  actual:    number
}

export interface RecordRatingResult {
  /** false when this activity was already rated today (idempotent skip) */
  applied:      boolean
  ratingBefore: number
  ratingAfter:  number
}

export interface AcademyRatingSummary {
  rating:      number
  peak:        number
  ratedCount:  number
  aggregates:  RatingAggregates
  /** plain-language bands (identical wording to /player-rankings) */
  trajectory:  { word: string; tone: 'up' | 'down' | 'neutral' } | null
  consistency: string | null
  /** upset word only when sample ≥ 5, else null (caller shows fraction alone) */
  upset:       string | null
  /** newest-first rating_after series for a sparkline */
  history:     number[]
}

const RECENT_WINDOW = 50

// ── Internal: seed a fresh student's rating (CHESSA → tier → 800) ─────────────

async function fetchSeedRating(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
): Promise<number> {
  const { data: prof } = await supabase
    .from('profiles')
    .select('tournament_fullname')
    .eq('id', studentId)
    .maybeSingle()

  let chessa: number | null = null
  const fullname = (prof as { tournament_fullname?: string | null } | null)?.tournament_fullname
  if (fullname) {
    const { data: playerRow } = await supabase
      .from('active_players_august_2025_profiles')
      .select('RATING')
      .ilike('name', fullname)
      .limit(1)
      .maybeSingle()
    const r = Number((playerRow as { RATING?: unknown } | null)?.RATING)
    if (Number.isFinite(r) && r > 0) chessa = r
  }

  const { data: ap } = await supabase
    .from('academy_profiles')
    .select('tier')
    .eq('student_id', studentId)
    .maybeSingle()
  const tier = (ap as { tier?: string | null } | null)?.tier ?? null

  return seedRating(chessa, tier)
}

// ── Public: record one rating event ───────────────────────────────────────────
// Computes the Elo step in TS (single source of truth) and persists via the
// SECURITY DEFINER record_rating_event RPC. Idempotent per student/source/ref/day.

export async function recordRatingEvent(
  studentId: string,
  input:     RecordRatingInput,
): Promise<RecordRatingResult> {
  const supabase = await createClient()

  const { data: summary } = await supabase
    .from('student_progress_summary')
    .select('academy_rating, rating_rated_count')
    .eq('student_id', studentId)
    .maybeSingle()

  const ratedCount = summary?.rating_rated_count ?? 0
  // First-ever rated activity: seed from CHESSA → tier → 800 (ignore the 800 default).
  const ratingBefore = ratedCount === 0
    ? await fetchSeedRating(supabase, studentId)
    : (summary?.academy_rating ?? 800)

  const expected = expectedScore(ratingBefore, input.opponentR)
  const perf     = activityPerf(input.opponentR, input.actual)
  const ratingAfter = nextRating(ratingBefore, input.opponentR, input.actual, ratedCount)

  const { data, error } = await supabase.rpc('record_rating_event', {
    p_student_id:    studentId,
    p_source:        input.source,
    p_source_ref:    input.sourceRef,
    p_opponent_r:    input.opponentR,
    p_actual:        input.actual,
    p_expected:      Math.round(expected * 1000) / 1000,
    p_perf:          perf,
    p_rating_before: ratingBefore,
    p_rating_after:  ratingAfter,
  })

  if (error) {
    console.error('[academyRating] record_rating_event failed:', error.message)
    return { applied: false, ratingBefore, ratingAfter: ratingBefore }
  }

  const applied = (data as { applied?: boolean } | null)?.applied ?? false
  return { applied, ratingBefore, ratingAfter: applied ? ratingAfter : ratingBefore }
}

// ── Public: read a student's academy rating summary ────────────────────────────

export async function getAcademyRatingSummary(
  studentId: string,
): Promise<AcademyRatingSummary | null> {
  const supabase = await createClient()

  const [summaryRes, eventsRes] = await Promise.all([
    supabase
      .from('student_progress_summary')
      .select('academy_rating, rating_peak, rating_rated_count')
      .eq('student_id', studentId)
      .maybeSingle(),
    supabase
      .from('student_rating_events')
      .select('opponent_r, actual, expected, perf, rating_after')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(RECENT_WINDOW),
  ])

  if (summaryRes.error) return null
  const s = summaryRes.data
  const rows = eventsRes.data ?? []

  const events: RatingEventLite[] = rows.map(r => ({
    opponentR: r.opponent_r,
    actual:    Number(r.actual),
    expected:  Number(r.expected),
    perf:      r.perf,
  }))

  const aggregates = computeAggregates(events)

  return {
    rating:      s?.academy_rating ?? 800,
    peak:        s?.rating_peak ?? 800,
    ratedCount:  s?.rating_rated_count ?? 0,
    aggregates,
    trajectory:  trajectoryWord(aggregates.recentForm),
    consistency: consistencyWord(aggregates.consistency),
    upset:       aggregates.upsetSampleSize >= 5 ? upsetWord(aggregates.upsetRate) : null,
    history:     rows.map(r => r.rating_after).reverse(), // oldest→newest for a sparkline
  }
}
