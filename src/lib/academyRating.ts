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

/** Lesson difficulty → points multiplier, applied on top of PUZZLE_BLOCK_BASE. */
export const DIFFICULTY_MULTIPLIER: Record<string, number> = { easy: 1.0, medium: 1.25, hard: 1.5 }

// ── Puzzle outcome → points / rating ──────────────────────────────────────────
// Single source of truth for both — mirrored by gamificationService.ts
// (server, authoritative), PuzzleViewerBlock.tsx (client, optimistic preview),
// and PuzzleAuthoringPanel.tsx's Gamification tab (static reference table for
// coaches). Points scale with how much help was needed to reach the solution
// — a wrong first guess caps the puzzle at half its clean value even if the
// student self-corrects; a hint costs more than a self-correction (asking for
// help outweighs a blunder you catch yourself). gave_up/timeout earn nothing.
export type PuzzleOutcome = 'clean' | 'wrong_first' | 'hint' | 'hint_wrong' | 'gave_up' | 'timeout'

/** Base points per outcome, before DIFFICULTY_MULTIPLIER and any combo/speed boost. */
export const PUZZLE_BLOCK_BASE: Record<PuzzleOutcome, number> = {
  clean: 10, wrong_first: 5, hint: 3, hint_wrong: 2, gave_up: 0, timeout: 0,
}

// Elo "actual" per outcome. Every outcome is a rated attempt — including
// gave_up/timeout — because treating "didn't solve it" as a no-op made
// skipping a puzzle you're unsure about strictly safer than attempting it,
// which undermines the point of a penalty. Lichess's puzzle rating works the
// same way: a wrong first move fails the puzzle, full stop, regardless of
// whether you then find the right idea — so wrong_first/hint/hint_wrong/
// gave_up/timeout all record as a loss (0) here; only a clean solve records a
// win (1). No partial credit for "eventually."
export const PUZZLE_RATING_ACTUAL: Record<PuzzleOutcome, number> = {
  clean: 1, wrong_first: 0, hint: 0, hint_wrong: 0, gave_up: 0, timeout: 0,
}

export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

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

// K-factor bands, scaled down from FIDE's tested 40/20 provisional/established
// split (see rating-system's src/core/k-factor.ts) by roughly the same 2:1
// ratio — halved again because that engine applies K once per rating PERIOD
// (a batch of games, K×n capped at 700) while this one applies K live on
// every single event with no such batch cap, so a much smaller K is the
// live-update equivalent of the same "don't let one game overwrite months of
// history" guardrail. See also DAILY_RATING_SWING_CAP below, which borrows
// the K×n≤700 cap itself (adapted to a rolling day instead of a period).
export function kFactor(ratedCount: number): number {
  return ratedCount < 30 ? 24 : 12
}

/** Live rating step. Returns the new rating, rounded and clamped. */
export function nextRating(S: number, opponentR: number, actual: number, ratedCount: number): number {
  const expected = expectedScore(S, opponentR)
  const k = kFactor(ratedCount)
  return clamp(Math.round(S + k * (actual - expected)), PERF_MIN, PERF_MAX)
}

// ── Puzzle combo & speed boosts ───────────────────────────────────────────────
// Rewards a hot streak and a fast solve with a bigger points/rating swing on
// *that one puzzle* — deliberately capped so neither can run away with the
// numbers. Pure functions so gamificationService.ts (server, authoritative)
// and PuzzleViewerBlock.tsx (client, optimistic preview) can never disagree.
// Both multipliers only ever apply to a clean solve (points) / a win (rating)
// — a loss is never amplified by streak or speed.
//
// Retuned after real usage showed the original table (2x@3 → 4x@15, +25%
// speed) was far too hot: 1880 → 2100 (+220) over just 18 puzzles. Streaks
// now need to run much longer to matter, and the ceiling is far lower — this
// is on top of DAILY_RATING_SWING_CAP below, which is the real backstop.

/** Multiplier ceiling, reached at streak 25 and held until the streak hits
 *  `COMBO_RESET_STREAK`. */
export const COMBO_MAX_MULTIPLIER = 2.0
/** Consecutive-clean-solve count at which the combo resets to zero — one
 *  grand-finale swing at the cap, then back to baseline (1.0x). */
export const COMBO_RESET_STREAK = 50

/**
 * Combo multiplier from a clean-solve streak (count *including* the solve
 * being scored): 1.0x below 5, then 1.2x at 5, +0.2x every 5 more (1.4x @10,
 * 1.6x @15, 1.8x @20), capped at 2.0x from streak 25 onward.
 */
export function comboMultiplier(streak: number): number {
  if (streak < 5) return 1.0
  const milestone = Math.floor(streak / 5) // 1 @5-9, 2 @10-14, 3 @15-19, ...
  return Math.min(COMBO_MAX_MULTIPLIER, 1.2 + 0.2 * (milestone - 1))
}

/**
 * Fast-solve bonus fraction, by time-to-solve: +10% under 2s, +7% under 5s,
 * +5% under 7s, nothing past that — an ordinary-paced solve is unaffected.
 */
export function timerBoostFraction(elapsedSeconds: number): number {
  if (elapsedSeconds < 2) return 0.10
  if (elapsedSeconds < 5) return 0.07
  if (elapsedSeconds < 7) return 0.05
  return 0
}

/**
 * Borrowed directly from rating-system's K×n≤700 period cap (see
 * src/core/k-factor.ts) — there, a whole rating PERIOD's total swing is
 * bounded regardless of how many games or how hot the streak. This app has
 * no periods (rating updates live, per puzzle), so the same guardrail is
 * reapplied as a bound on the *cumulative rating swing per calendar day*:
 * academyRatingService sums today's already-applied deltas and clamps the
 * next one to whatever headroom is left. 150 is a deliberately tight number
 * for now — the earlier no-cap table let a single day run to +220.
 */
export const DAILY_RATING_SWING_CAP = 150

/**
 * Clamps a proposed rating delta so today's cumulative swing (this delta
 * included) never exceeds ±DAILY_RATING_SWING_CAP. Headroom-based, not a
 * hard reject — the event still applies, just for whatever's left of the
 * cap (0 once the day's cap is already spent).
 */
export function applyDailySwingCap(proposedDelta: number, todaysSwingSoFar: number): number {
  if (proposedDelta === 0) return 0
  if (proposedDelta > 0) {
    const headroom = DAILY_RATING_SWING_CAP - todaysSwingSoFar
    return Math.max(0, Math.min(proposedDelta, headroom))
  }
  const headroom = DAILY_RATING_SWING_CAP + todaysSwingSoFar // a negative swing-so-far eats into this headroom too
  return -Math.max(0, Math.min(-proposedDelta, headroom))
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
