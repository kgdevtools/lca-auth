# Gamification Implementation Tasks
**Last updated:** 2026-04-10  
**Reference:** `GAMIFICATION_DESIGN.md`  
**Rule:** One phase at a time. Complete and verify before moving to the next.

---

## Phase 1 — Database: Run existing migration ✅

> Establishes the base tables. Nothing in the app changes yet.

- [x] Run `supabase/migrations/20260406_student_gamification.sql` in Supabase SQL editor
  - Creates: `student_progress_summary`, `student_achievements`, `student_study_progress`
  - Creates: `update_student_progress()`, `award_achievement()` DB functions
  - Creates: `handle_student_created` trigger (auto-creates summary row on new student)
- [x] Verify tables exist — confirmed
- [x] Backfill existing students — confirmed rows present with total_points=0, level=1

**What can break:** Nothing in the app reads these tables yet. Safe to run.

---

## Phase 2 — Database: New migration (academy_profiles + points_transactions + grant_points) ✅

> Adds the ledger table, tier system, and the canonical `grant_points` DB function.  
> Replaces the level formula in `student_progress_summary` with the chess-themed CASE thresholds.

- [x] Write `supabase/migrations/20260410_gamification_full.sql`
- [x] `academy_profiles` table — confirmed
- [x] `points_transactions` table — confirmed
- [x] `grant_points()` function — confirmed, smoke test passed (15 pts → new_total=15, level=1)
- [x] Bug fixed: streak SELECT was reading `last_activity_date` after it was already overwritten to `v_today` in the main UPDATE. Fixed by reading `level`, `last_activity_date`, `current_streak_days` together in step 3, before the main UPDATE. Migration file updated. **Re-run the grant_points function block in Supabase** (copy STEP 5 from the migration file — it's a `CREATE OR REPLACE FUNCTION` so safe to re-run).

**What can break:** Nothing in the app uses these yet. Safe to run.

---

## Phase 3 — Backend: gamificationService.ts ✅

> Single service file that wraps all gamification logic for the app layer.  
> No UI changes in this phase.

- [x] Created `src/lib/constants/achievements.ts` — LEVEL_NAMES, AchievementStats type, ACHIEVEMENTS catalog (15 achievements: milestone, streak, mastery, puzzle, study, coach-awarded)
- [x] Created `src/services/gamificationService.ts` with:
  - [x] `onLessonCompleted(studentId, lessonId, quizScore, attempts)` — fetches lesson content_type+difficulty, computes points (base × multiplier + quiz bonus + mastery bonus), calls `grant_points` RPC per action type, checks achievements, returns `GamificationResult`
  - [x] `triggerDailyActivity(studentId)` — checks `last_activity_date`, grants daily_activity (2 pts), streak_bonus (5 pts days 3–6) or streak_weekly (50 pts day 7)
  - [x] `grantCoachAward(studentId, points, note)` — wraps coach_award grant
  - [x] `getStudentGamificationSummary(studentId)` — reads summary + achievements, returns typed object
- [ ] Run `tsc --noEmit` — verify no errors

**What can break:** Nothing yet — service exists but nothing calls it.

---

## Phase 4 — Backend: Wire into progressService.ts ✅

> Hooks the gamification service into the two existing trigger points.  
> This is when points start being persisted to the DB.

- [x] Import `onLessonCompleted`, `triggerDailyActivity`, `GamificationResult` from gamificationService
- [x] `markLessonComplete`: changed return type to `{ progress: LessonProgress; gamification: GamificationResult | null }`. Awaits `onLessonCompleted(profile.id, lessonId, existing.quiz_score, existing.attempts)` in try/catch (non-fatal). Shell (`LessonViewerShell.tsx`) discards the return value — no breaking change.
- [x] `startLesson`: calls `triggerDailyActivity(profile.id)` in try/catch (non-fatal) in both branches (existing progress update + new record creation). Guards are inside `triggerDailyActivity` itself.
- [x] `tsc --noEmit` — clean (only pre-existing errors remain)
- [ ] Manual smoke test: open and complete a lesson in the app, verify `points_transactions` row and `student_progress_summary` update in Supabase

**What can break:** `markLessonComplete` callers expecting `LessonProgress` directly — only caller is `LessonViewerShell.tsx` which discards the result (`.catch(() => {})`). No UI breakage.

---

## Phase 5 — Backend: Remove derivePoints() from studentRepository.ts ✅

> Once points are persisted, the in-memory formula is redundant.  
> Total points now come from `student_progress_summary`; per-lesson points use new formula.

- [x] Removed `derivePoints()` (was: 10 base + up to 10 quiz bonus)
- [x] Added internal `computeLessonPoints(status, contentType, difficulty, quizScore)` — new formula matching gamificationService (15/20 base × difficulty multiplier + up to 15 quiz bonus). Used for per-lesson display only.
- [x] `getCoachStudentsWithProgress()`: added `student_progress_summary` query; student total points now read from `summaryMap` (includes streak bonuses, coach awards, etc.)
- [x] `getStudentLessonDetail()`: per-lesson `points` kept — now uses `computeLessonPoints` with content_type + difficulty
- [x] `getStudentSelfProgress()`: total `points` now from `student_progress_summary.total_points` (parallel fetch with lessons + feedback)
- [x] `tsc --noEmit` — clean (only pre-existing errors)

**Note:** Lessons with `difficulty: "intermediate"` (outside easy/medium/hard) default to ×1.0 multiplier. Address when adding difficulty options to lesson builder.

---

## Phase 6 — Backend: Coach manual award action ✅

> Gives coaches the ability to manually grant points to a student.  
> Backend only in this phase — no UI yet.

- [x] Added `requireCoachOrAdminForStudent(studentId)` guard — admin passes freely; coach must have the student in `coach_students`
- [x] Added `grantManualPoints(studentId, points, note)` — validates positive integer + non-empty note, calls `grantCoachAward()` from gamificationService, revalidates student detail path
- [x] `tsc --noEmit` — clean

**What can break:** Nothing yet — action exists but no UI calls it.

---

## Phase 7 — Backend: Coach tier assignment ✅

> Allows coaches to set a student's tier (beginner / intermediate / advanced).  
> Requires `academy_profiles` table from Phase 2.

- [x] Exported `StudentTier` type (`'beginner' | 'intermediate' | 'advanced'`)
- [x] Added `setStudentTier(studentId, tier)` — UPSERTs into `academy_profiles` on `student_id` conflict, revalidates student list + detail paths
- [x] `tsc --noEmit` — clean

**What can break:** Nothing yet — action exists but no UI calls it.

---

## Phase 8 — UI: LessonCompleteScreen (animated celebration) ✅

> First visible gamification UI. Students see what they earned when a lesson ends.
> Target audience: kids 8–14. Keep it celebratory, clear, and fast.

- [x] `LessonViewerShell.tsx`: added `gamification` + `gamificationPending` state; `LESSON_COMPLETE` dispatches instantly, `markLessonComplete` result captured async (non-blocking)
- [x] `LessonCompleteScreen.tsx` rewritten:
  - Staggered Framer Motion entrance (stagger 70ms, fade+slide from y:10)
  - Count-up animation for points earned + total (600ms, ease-out cubic via rAF)
  - Skeleton pulse while gamification loads
  - Points breakdown line (lesson · quiz · mastery) shown only when bonuses exist
  - Level section: chess piece unicode + level name + amber "Level up" badge + thin progress bar (CSS transition 700ms) + "X / Y pts to NextLevel"
  - New achievements: simple border pills with icon + name
  - Graceful null: shows lesson title + buttons even if gamification fails
  - Follows project design: `text-[10px] uppercase tracking-wide` labels, `font-bold tabular-nums tracking-tight` numbers, `rounded-lg border border-border bg-card`
- [x] `tsc --noEmit` — clean

**Note:** Framer Motion `Variants` type requires `ease` NOT in the variant object — put `transition` inline on `motion.div` instead. Matches existing project pattern in `LessonViewerShell.tsx`.

---

## Phase 9 — UI: Academy dashboard stats widget + lesson card points

> Persistent gamification presence across the academy. Students always know where they stand.

### 9a — Academy dashboard (`/academy`) stats widget
- [ ] Fetch `student_progress_summary` for current student on the academy dashboard server component
- [ ] Add a `GamificationStatsCard` component showing:
  - Level badge (chess piece + name, e.g. "Knight")
  - Total points with XP bar: progress from current level threshold to next (e.g. "245 / 300 pts to Rook")
  - Current streak with flame icon (🔥 3-day streak)
  - Lessons completed count
- [ ] Coaches/admins see an aggregate overview instead (total students, avg points, most active student)
- [ ] Run `tsc --noEmit`

### 9b — Lesson cards show point value
- [ ] On `LessonCard` component (used in `/academy/lesson` and `/user/lessons`): add a small points badge in the corner
  - Shows estimated points: e.g. "15 pts" for easy puzzle, "25 pts" for hard study
  - Computed from `content_type` + `difficulty` — no extra DB call needed
  - Style: small pill/badge, muted but visible
- [ ] Run `tsc --noEmit`

**What can break:** Academy dashboard page data fetching changes (coach/admin must not see student-only query).

---

## Phase 10 — UI: Student progress summary (reports + student detail)

> Surface the persistent gamification data in existing pages.  
> No new pages — update what's already there.

- [ ] `/academy/reports` (student self view): replace computed `points` with `student_progress_summary` data — show total_points, level badge, current streak, longest streak, achievements count
- [ ] `/academy/students/[studentId]` (coach detail view): show student's total_points, level, tier, streak, earned achievements list
- [ ] `/academy/students` (coach roster): replace `derivePoints()` column with `total_points` from `student_progress_summary`; add level badge column
- [ ] Run `tsc --noEmit`
- [ ] Visual check all three pages

**What can break:** Data shapes change if Phase 5 altered `StudentWithProgress`.

---

## Phase 11 — UI: Coach manual award + tier controls

> Wire the Phase 6 & 7 backend actions into the student detail UI.

- [ ] In `/academy/students/[studentId]`: add "Award Points" button → modal (points input + note)
- [ ] In `/academy/students/[studentId]`: add tier selector (dropdown: Beginner / Intermediate / Advanced)
- [ ] Both actions show toast on success/failure
- [ ] Run `tsc --noEmit`

---

## Phase 12 — UI: Leaderboard page

> New page. Segmented by tier. All-time rankings. Keep it exciting — visible ranking motivates engagement.

- [ ] Create `/academy/leaderboard/page.tsx`
  - Server component — fetches top 20 students per tier from `student_progress_summary` JOIN `academy_profiles`
  - Tabs: Beginner | Intermediate | Advanced
  - Columns: Rank (medal icon for top 3 🥇🥈🥉), Name, Level badge, Points, Streak
  - Current student's row highlighted (different bg)
  - Coach/admin sees all tiers; student sees own tier by default
- [ ] Add "Leaderboard" link to `AcademySidebar`
- [ ] Run `tsc --noEmit`

---

## Phase 13 — UI: Achievements display

> Show earned badges as a visual trophy shelf. Kids love collecting things.

- [ ] Read `student_achievements` for a given student via `getStudentGamificationSummary()`
- [ ] `AchievementBadge` component: icon (large) + name + earned_at date — locked badges shown as greyed-out silhouettes with "?" (progress toward earning them)
- [ ] Show in `/academy/reports` (student self view, full shelf) and `/academy/students/[studentId]` (coach view, compact row)
- [ ] Staggered entrance animation (Framer Motion) when the shelf comes into view
- [ ] Run `tsc --noEmit`

---

## Deferred / Out of Scope for Now

- Quiz bonus points — depends on MCQ block being built (not yet)
- `student_study_progress` chapter tracking — table exists, wire-up deferred
- Streak freeze / grace days
- Custom coach-assigned achievements
- Per-term leaderboard reset (decided: all-time for now)
- Point deductions (decided: no negative points)
