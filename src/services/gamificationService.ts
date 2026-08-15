'use server'

import { createClient } from '@/utils/supabase/server'
import { ACHIEVEMENTS, LEVEL_NAMES, type AchievementStats, type LevelNumber } from '@/lib/constants/achievements'
import { recordRatingEvent } from './academyRatingService'
import {
  LESSON_DIFFICULTY_RATING, DEFAULT_SEED, comboMultiplier, timerBoostFraction,
  DIFFICULTY_MULTIPLIER, PUZZLE_BLOCK_BASE, PUZZLE_RATING_ACTUAL, type PuzzleOutcome,
} from '@/lib/academyRating'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GamificationResult {
  pointsEarned:      number
  breakdown:         { lesson: number; quizBonus: number; firstAttemptBonus: number }
  newTotal:          number
  newLevel:          number
  levelName:         string
  levelUp:           boolean
  newAchievements:   { key: string; name: string; icon: string }[]
  /** Academy rating change from this lesson (null when not applied, e.g. already rated today) */
  rating:            { before: number; after: number } | null
}

export interface StudentGamificationSummary {
  totalPoints:      number
  level:            number
  levelName:        string
  currentStreak:    number
  longestStreak:    number
  lessonsCompleted: number
  puzzlesSolved:    number
  studiesCompleted: number
  totalTimeMinutes: number
  achievements:     { key: string; name: string; icon: string; earnedAt: string }[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LESSON_COMPLETION_BONUS = 5

function applyMultiplier(base: number, difficulty: string): number {
  return Math.round(base * (DIFFICULTY_MULTIPLIER[difficulty] ?? 1.0))
}

async function fetchLessonDifficulty(supabase: Awaited<ReturnType<typeof createClient>>, lessonId: string): Promise<string> {
  const { data } = await supabase.from('lessons').select('difficulty').eq('id', lessonId).single()
  return (data?.difficulty ?? 'easy').toLowerCase()
}

// ── Internal: call grant_points RPC ───────────────────────────────────────────

interface GrantResult {
  points_earned: number
  new_total:     number
  new_level:     number
  level_up:      boolean
}

async function callGrantPoints(
  studentId:     string,
  points:        number,
  actionType:    string,
  referenceId?:  string | null,
  referenceType?: string | null,
  metadata?:     Record<string, unknown>,
  note?:         string | null,
): Promise<GrantResult | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('grant_points', {
    p_student_id:     studentId,
    p_points:         points,
    p_action_type:    actionType,
    p_reference_id:   referenceId   ?? null,
    p_reference_type: referenceType ?? null,
    p_metadata:       metadata      ?? {},
    p_note:           note          ?? null,
  })
  if (error) {
    console.error('[gamification] grant_points failed:', actionType, error.message)
    return null
  }
  return data as GrantResult
}

// ── Internal: check and award newly unlocked achievements ─────────────────────

async function checkAndAwardAchievements(
  studentId: string,
  stats:     AchievementStats,
): Promise<{ key: string; name: string; icon: string }[]> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('student_achievements')
    .select('achievement_key')
    .eq('student_id', studentId)

  const alreadyEarned = new Set((existing ?? []).map(r => r.achievement_key))

  const toAward = ACHIEVEMENTS.filter(a => {
    if (!a.check) return false
    if (alreadyEarned.has(a.key)) return false
    return a.check(stats)
  })

  if (toAward.length === 0) return []

  await Promise.all(
    toAward.map(a =>
      supabase.rpc('award_achievement', {
        p_student_id:       studentId,
        p_achievement_key:  a.key,
        p_achievement_name: a.name,
        p_description:      a.description,
        p_icon:             a.icon,
      })
    )
  )

  return toAward.map(a => ({ key: a.key, name: a.name, icon: a.icon }))
}

// ── Internal: fetch stats for achievement checks ───────────────────────────────

async function fetchStats(studentId: string): Promise<AchievementStats> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('student_progress_summary')
    .select('lessons_completed, puzzles_solved, studies_completed, current_streak_days, longest_streak_days')
    .eq('student_id', studentId)
    .single()

  return {
    lessons_completed:   data?.lessons_completed   ?? 0,
    puzzles_solved:      data?.puzzles_solved       ?? 0,
    studies_completed:   data?.studies_completed    ?? 0,
    current_streak_days: data?.current_streak_days  ?? 0,
    longest_streak_days: data?.longest_streak_days  ?? 0,
    had_perfect_quiz:    false,
  }
}

// ── Public: per-block point events ────────────────────────────────────────────
// PuzzleOutcome / PUZZLE_BLOCK_BASE / PUZZLE_RATING_ACTUAL now live in
// academyRating.ts (single source of truth — see its own doc comment). Not
// re-exported here: a 'use server' file may only export async functions —
// consumers (e.g. progressService.ts) import the type from academyRating.ts
// directly instead.

export async function onPuzzleBlockSolved(
  studentId:     string,
  lessonId:      string,
  outcome:       PuzzleOutcome,
  blockKey:      string,
  puzzleRating:  number | null,
  /** Consecutive-clean-solve count *including this attempt* (0 if this
   *  attempt isn't a clean solve) — drives the combo multiplier. */
  comboStreak = 0,
  /** Seconds from puzzle-ready to solve — drives the speed bonus. */
  elapsedSeconds = Infinity,
): Promise<{ pointsEarned: number; rating: { before: number; after: number } | null }> {
  const supabase = await createClient()

  // Replaying a lesson the student has already completed earns nothing —
  // points/rating are a one-time reward for actually learning the material,
  // not something to farm by re-solving the same puzzles. Server-side check
  // (not just a client-side UI gate) so this can't be bypassed by a stale
  // client that hasn't noticed the lesson is already complete.
  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('status')
    .eq('student_id', studentId)
    .eq('lesson_id', lessonId)
    .maybeSingle()
  if (progress?.status === 'completed') {
    return { pointsEarned: 0, rating: null }
  }

  const base = PUZZLE_BLOCK_BASE[outcome] ?? 0
  const difficulty = await fetchLessonDifficulty(supabase, lessonId)

  // Combo/speed boost — only ever amplifies a genuine win (a clean solve),
  // never a reduced-credit or failed outcome, so it can't be used to soften
  // a bad puzzle's penalty.
  const isCleanWin = outcome === 'clean'
  const boostMultiplier = isCleanWin
    ? comboMultiplier(comboStreak) * (1 + timerBoostFraction(elapsedSeconds))
    : 1
  const pts = base > 0 ? Math.round(applyMultiplier(base, difficulty) * boostMultiplier) : 0

  if (pts > 0) {
    await callGrantPoints(studentId, pts, 'puzzle_block_solved', lessonId, 'lesson', {
      outcome, difficulty, base_pts: base, boost_multiplier: boostMultiplier, combo_streak: comboStreak,
    })
  }

  // Rating is tracked independently of points — a 0-point outcome (gave_up,
  // timeout) still needs to record its loss.
  let rating: { before: number; after: number } | null = null
  try {
    const actual = PUZZLE_RATING_ACTUAL[outcome]
    const opponentR = puzzleRating ?? LESSON_DIFFICULTY_RATING[difficulty] ?? DEFAULT_SEED
    const r = await recordRatingEvent(studentId, {
      source: 'puzzle', sourceRef: `${lessonId}:${blockKey}`, opponentR, actual,
      deltaMultiplier: boostMultiplier,
    })
    // r.applied === false means this exact puzzle block was already rated
    // today (idempotent replay guard) — rating stays null so the caller
    // knows to leave the displayed number alone / revert its optimistic
    // preview, rather than silently keeping a value that never persisted.
    if (r.applied) rating = { before: r.ratingBefore, after: r.ratingAfter }
  } catch (e) {
    console.error('[gamification] rating event (puzzle) failed:', e)
  }

  return { pointsEarned: pts, rating }
}

export async function onStudyChapterCompleted(
  studentId: string,
  lessonId:  string,
): Promise<{ pointsEarned: number }> {
  const supabase = await createClient()
  const difficulty = await fetchLessonDifficulty(supabase, lessonId)
  const pts = applyMultiplier(6, difficulty)

  await callGrantPoints(studentId, pts, 'study_chapter_complete', lessonId, 'lesson', {
    difficulty, base_pts: 6,
  })

  return { pointsEarned: pts }
}

export async function onInteractiveSolvePointCleared(
  studentId:     string,
  lessonId:      string,
  isAlternative: boolean,
): Promise<{ pointsEarned: number }> {
  const base = isAlternative ? 5 : 10
  const supabase = await createClient()
  const difficulty = await fetchLessonDifficulty(supabase, lessonId)
  const pts = applyMultiplier(base, difficulty)

  await callGrantPoints(studentId, pts, 'interactive_solve_point', lessonId, 'lesson', {
    difficulty, base_pts: base, is_alternative: isAlternative,
  })

  return { pointsEarned: pts }
}

// ── Public: lesson completed ───────────────────────────────────────────────────
// Called from progressService.ts after markLessonComplete() succeeds.
// Fetches lesson metadata itself so progressService stays unchanged.

export async function onLessonCompleted(
  studentId: string,
  lessonId:  string,
  quizScore: number | null,
  attempts:  number,
): Promise<GamificationResult> {
  const supabase = await createClient()

  const { data: lesson } = await supabase
    .from('lessons')
    .select('content_type, difficulty')
    .eq('id', lessonId)
    .single()

  const contentType = lesson?.content_type ?? 'puzzle'
  const difficulty  = (lesson?.difficulty ?? 'easy').toLowerCase()

  // Determine ledger action type for this lesson category. action_type is
  // unconstrained TEXT (no CHECK, unlike lessons.content_type) — a new value
  // here needs no migration.
  const isStudyType = contentType === 'study' || contentType === 'interactive_study'
  const actionType  = isStudyType
    ? 'lesson_complete_study'
    : contentType === 'combined'
      ? 'lesson_complete_combined'
      : 'lesson_complete_puzzle'

  // Award the flat completion bonus (per-block points are tracked separately during the lesson).
  const completionResult = await callGrantPoints(
    studentId, LESSON_COMPLETION_BONUS, actionType, lessonId, 'lesson',
    { difficulty, content_type: contentType, bonus_type: 'completion' },
  )

  let latestResult = completionResult
  let totalEarned  = LESSON_COMPLETION_BONUS

  const quizPts    = quizScore != null ? Math.round((quizScore / 100) * 15) : 0
  const masteryPts = attempts === 1 && quizScore != null && quizScore >= 80 ? 10 : 0

  // Grant quiz bonus (separate ledger entry)
  if (quizPts > 0) {
    const r = await callGrantPoints(studentId, quizPts, 'quiz_bonus', lessonId, 'lesson', { quiz_score: quizScore })
    if (r) latestResult = r
    totalEarned += quizPts
  }

  // Grant first-attempt mastery bonus (separate ledger entry)
  if (masteryPts > 0) {
    const r = await callGrantPoints(studentId, masteryPts, 'first_attempt_mastery', lessonId, 'lesson', { quiz_score: quizScore, attempts })
    if (r) latestResult = r
    totalEarned += masteryPts
  }

  // Achievement checks using post-grant stats
  const stats = await fetchStats(studentId)
  const newAchievements = await checkAndAwardAchievements(studentId, {
    ...stats,
    had_perfect_quiz: quizScore === 100,
  })

  // Feed the academy rating — only when this lesson actually produced a quiz
  // score. Puzzle-content lessons are rated per-block (onPuzzleBlockSolved)
  // as each puzzle is solved, not as a single blanket "win" on completion —
  // otherwise skipping straight through every puzzle would still read as a
  // full win here. Idempotent per lesson/day.
  let rating: GamificationResult['rating'] = null
  if (quizScore != null) {
    try {
      const lessonR = LESSON_DIFFICULTY_RATING[difficulty] ?? 1200
      const actual  = quizScore >= 80 ? 1 : quizScore >= 50 ? 0.5 : 0
      const r = await recordRatingEvent(studentId, { source: 'lesson', sourceRef: lessonId, opponentR: lessonR, actual })
      if (r.applied) rating = { before: r.ratingBefore, after: r.ratingAfter }
    } catch (e) {
      console.error('[gamification] rating event (lesson) failed:', e)
    }
  }

  const newLevel = latestResult?.new_level ?? 1

  return {
    pointsEarned:    totalEarned,
    breakdown:       { lesson: LESSON_COMPLETION_BONUS, quizBonus: quizPts, firstAttemptBonus: masteryPts },
    newTotal:        latestResult?.new_total ?? 0,
    newLevel,
    levelName:       LEVEL_NAMES[newLevel as LevelNumber] ?? 'Pawn',
    levelUp:         latestResult?.level_up ?? false,
    newAchievements,
    rating,
  }
}

// ── Public: daily activity ─────────────────────────────────────────────────────
// Called from progressService.ts on the first startLesson() of the day.
// Guards against double-granting by checking last_activity_date first.

export async function triggerDailyActivity(studentId: string): Promise<void> {
  const supabase = await createClient()

  const { data: summary } = await supabase
    .from('student_progress_summary')
    .select('last_activity_date, current_streak_days')
    .eq('student_id', studentId)
    .single()

  const today     = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 864e5).toISOString().split('T')[0]

  if (summary?.last_activity_date === today) return // already logged today

  // Grant daily activity points (grant_points also handles streak update in DB)
  await callGrantPoints(studentId, 2, 'daily_activity')

  // Compute what the new streak day is (using pre-grant values)
  const prevStreak   = summary?.current_streak_days ?? 0
  const newStreakDay = summary?.last_activity_date === yesterday ? prevStreak + 1 : 1

  if (newStreakDay === 7) {
    await callGrantPoints(studentId, 50, 'streak_weekly', null, null, { streak_day: 7 })
  } else if (newStreakDay >= 3) {
    await callGrantPoints(studentId, 5, 'streak_bonus', null, null, { streak_day: newStreakDay })
  }

  // Check streak achievements after any streak activity
  if (newStreakDay >= 3) {
    const stats = await fetchStats(studentId)
    await checkAndAwardAchievements(studentId, { ...stats, had_perfect_quiz: false })
  }
}

// ── Public: coach manual award ─────────────────────────────────────────────────

export async function grantCoachAward(
  studentId: string,
  points:    number,
  note:      string,
): Promise<void> {
  await callGrantPoints(studentId, points, 'coach_award', null, null, {}, note)
}

// ── Public: get student gamification summary ───────────────────────────────────

export async function getStudentGamificationSummary(
  studentId: string,
): Promise<StudentGamificationSummary | null> {
  const supabase = await createClient()

  const [summaryRes, achievementsRes] = await Promise.all([
    supabase
      .from('student_progress_summary')
      .select('total_points, level, current_streak_days, longest_streak_days, lessons_completed, puzzles_solved, studies_completed, total_time_minutes')
      .eq('student_id', studentId)
      .single(),
    supabase
      .from('student_achievements')
      .select('achievement_key, achievement_name, icon, earned_at')
      .eq('student_id', studentId)
      .order('earned_at', { ascending: false }),
  ])

  if (summaryRes.error || !summaryRes.data) return null
  const s = summaryRes.data

  return {
    totalPoints:      s.total_points,
    level:            s.level,
    levelName:        LEVEL_NAMES[s.level as LevelNumber] ?? 'Pawn',
    currentStreak:    s.current_streak_days,
    longestStreak:    s.longest_streak_days,
    lessonsCompleted: s.lessons_completed,
    puzzlesSolved:    s.puzzles_solved,
    studiesCompleted: s.studies_completed,
    totalTimeMinutes: s.total_time_minutes,
    achievements:     (achievementsRes.data ?? []).map(a => ({
      key:      a.achievement_key,
      name:     a.achievement_name,
      icon:     a.icon ?? '',
      earnedAt: a.earned_at,
    })),
  }
}
