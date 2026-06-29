/**
 * Academy rating — pure math.
 *
 * Applies the `/player-rankings` performance methodology (see
 * docs/player-profile-metrics.md) to academy activity. Each scored activity
 * (a puzzle solve, a lesson quiz) is treated as one rated "game" against an
 * opponent of known rating `R`. The student's academy rating moves live
 * (Elo step) and the rankings-style aggregates (avgPerf, recent form,
 * consistency, upsets, best win, Δ vs expected) are derived off the stored
 * per-activity performance history.
 *
 * This module has no I/O — it is the single source of truth for the formulas,
 * shared by the service layer and any UI that recomputes display bands.
 */

export const PERF_MIN = 400
export const PERF_MAX = 2800
export const DEFAULT_SEED = 800

/** Tier → seed rating when no CHESSA rating is linked. */
export const TIER_SEED: Record<string, number> = {
  beginner: 600,
  intermediate: 1000,
  advanced: 1400,
}

/** Lesson difficulty → opponent rating `R` (puzzles carry their own rating). */
export const LESSON_DIFFICULTY_RATING: Record<string, number> = {
  easy: 1000,
  medium: 1400,
  hard: 1800,
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** Elo expected score for a player rated `S` against opponent rated `R`. */
export function expectedScore(S: number, R: number): number {
  return 1 / (1 + 10 ** ((R - S) / 400))
}

/**
 * Single-game performance rating: `R + 400·(actual − 0.5)`, clamped to a sane
 * band. solved → R+200, draw/partial → R, failed → R−200.
 */
export function activityPerf(opponentR: number, actual: number): number {
  return clamp(Math.round(opponentR + 400 * (actual - 0.5)), PERF_MIN, PERF_MAX)
}

/** K-factor: provisional (32) for the first 30 rated activities, then 16. */
export function kFactor(ratedCount: number): number {
  return ratedCount < 30 ? 32 : 16
}

/** Live rating step. Returns the new rating, rounded and clamped. */
export function nextRating(S: number, opponentR: number, actual: number, ratedCount: number): number {
  const expected = expectedScore(S, opponentR)
  const k = kFactor(ratedCount)
  return clamp(Math.round(S + k * (actual - expected)), PERF_MIN, PERF_MAX)
}

/** Seed a student's starting rating: CHESSA → tier → 800. */
export function seedRating(chessaRating: number | null | undefined, tier: string | null | undefined): number {
  if (chessaRating != null && Number.isFinite(chessaRating) && chessaRating > 0) {
    return clamp(Math.round(chessaRating), PERF_MIN, PERF_MAX)
  }
  if (tier && TIER_SEED[tier] != null) return TIER_SEED[tier]
  return DEFAULT_SEED
}

// ── Aggregates (mirror docs/player-profile-metrics.md) ───────────────────────

export interface RatingEventLite {
  /** opponent rating R at the time of the attempt */
  opponentR: number
  /** 1 / 0.5 / 0 */
  actual: number
  /** expected score recorded at attempt time */
  expected: number
  /** per-activity performance rating */
  perf: number
}

export interface RatingAggregates {
  /** mean(perf) — headline "Performance". null until ≥1 event. */
  avgPerf: number | null
  /** mean(last-5 perf) − avgPerf, rounded. null when <2 events. */
  recentForm: number | null
  /** population σ of perf, rounded. null when <2 events. */
  consistency: number | null
  /** wins where R>S / attempts where R>S, ×100. null when no such attempts. */
  upsetRate: number | null
  /** count of attempts vs higher-rated (gates the upset word). */
  upsetSampleSize: number
  /** highest opponent rating among solved (actual===1). null when none. */
  bestWin: number | null
  /** (Σactual − Σexpected)/G × 100, 1dp. null when no events. */
  expectedDeltaPct: number | null
  /** total rated events */
  count: number
}

const mean = (xs: number[]): number | null =>
  xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null

/**
 * Compute the rankings-style aggregates from a student's rating-event history.
 * `events` must be ordered newest-first (so `slice(0,5)` is the recent window).
 */
export function computeAggregates(events: RatingEventLite[]): RatingAggregates {
  const perfs = events.map(e => e.perf)
  const avg = mean(perfs)

  let recentForm: number | null = null
  if (perfs.length >= 2 && avg !== null) {
    const recent = mean(perfs.slice(0, 5))
    if (recent !== null) recentForm = Math.round(recent - avg)
  }

  let consistency: number | null = null
  if (perfs.length >= 2 && avg !== null) {
    const variance = perfs.reduce((s, v) => s + (v - avg) ** 2, 0) / perfs.length
    consistency = Math.round(Math.sqrt(variance))
  }

  let higher = 0
  let upsetWins = 0
  let bestWin: number | null = null
  let actSum = 0
  let expSum = 0
  for (const e of events) {
    actSum += e.actual
    expSum += e.expected
    if (e.actual === 1) bestWin = bestWin === null ? e.opponentR : Math.max(bestWin, e.opponentR)
    // R>S inferred from expected<0.5 (expected was computed at S vs R)
    if (e.expected < 0.5) {
      higher += 1
      if (e.actual === 1) upsetWins += 1
    }
  }

  const upsetRate = higher > 0 ? Math.round((upsetWins / higher) * 100) : null
  const expectedDeltaPct = events.length > 0
    ? Math.round(((actSum - expSum) / events.length) * 1000) / 10
    : null

  return {
    avgPerf: avg !== null ? Math.round(avg) : null,
    recentForm,
    consistency,
    upsetRate,
    upsetSampleSize: higher,
    bestWin,
    expectedDeltaPct,
    count: events.length,
  }
}

// ── Plain-language bands (identical thresholds to the rankings doc) ───────────

export function consistencyWord(sigma: number | null): string | null {
  if (sigma === null) return null
  if (sigma < 60) return 'Very consistent'
  if (sigma < 110) return 'Fairly consistent'
  if (sigma <= 180) return 'Somewhat erratic'
  return 'Unpredictable'
}

export type TrajectoryTone = 'up' | 'down' | 'neutral'

export function trajectoryWord(formDelta: number | null): { word: string; tone: TrajectoryTone } | null {
  if (formDelta === null) return null
  if (formDelta > 40) return { word: 'On a tear', tone: 'up' }
  if (formDelta >= 15) return { word: 'On the rise', tone: 'up' }
  if (formDelta > -15) return { word: 'Holding steady', tone: 'neutral' }
  if (formDelta >= -40) return { word: 'Cooling off', tone: 'down' }
  return { word: 'In a slump', tone: 'down' }
}

/** Upset tier word — only meaningful when sample ≥ 5 (else caller hides it). */
export function upsetWord(rate: number | null): string | null {
  if (rate === null) return null
  if (rate >= 50) return 'Giant-killer'
  if (rate >= 30) return 'Punches up'
  if (rate >= 15) return 'Occasional upsets'
  return 'Plays to rating'
}

/** Map a tier to a target puzzle-rating band for auto-filtering a daily pool. */
export function tierRatingBand(rating: number, tier: string | null | undefined): { min: number; max: number } {
  // Center on the student's live rating, widen a little, with a tier-aware floor/ceiling.
  const seed = tier && TIER_SEED[tier] != null ? TIER_SEED[tier] : rating
  const center = Math.round((rating + seed) / 2)
  return { min: center - 300, max: center + 300 }
}
