# Student Reports & Tracking Statistics - Technical Summary

**Date:** 2026-04-07  
**Status:** Planned (Migration Created)

---

## 1. Current Implementation

### Points Formula
Located in `src/repositories/lesson/studentRepository.ts`:
```typescript
// 10pts per completed lesson + up to 10 bonus from quiz score
export function derivePoints(status: string, quizScore: number | null): number {
  if (status !== 'completed') return 0
  const base = 10
  const bonus = quizScore != null ? Math.round((quizScore / 100) * 10) : 0
  return base + bonus
}
```

### How Points Are Earned
1. **Lesson completion** - triggers `markLessonComplete()` in `progressService.ts`
2. **Quiz scores** - tracked via `updateQuizScore()`, bonus points calculated from score

### What Gets Tracked (Current)
- `lesson_progress` table: status, progress_percentage, quiz_score, time_spent_seconds, attempts, started_at, completed_at, last_accessed_at
- Exercises in lessons (puzzles, studies) - when user solves them, `onSolved()` is called

---

## 2. New Gamification System

### Migration Created
`supabase/migrations/20260406_student_gamification.sql`

#### New Tables

**a) `student_progress_summary`**
- `student_id` (FK to profiles)
- `total_points` - cumulative points
- `level` - derived from points
- `current_streak_days` / `longest_streak_days`
- `last_activity_date`
- `puzzles_solved` / `studies_completed` / `lessons_completed`
- `total_time_minutes`

**b) `student_achievements`**
- `student_id` (FK)
- `achievement_key` (unique per student)
- `achievement_name`
- `description`
- `icon`
- `earned_at`

**c) `student_study_progress`**
- `student_id` (FK)
- `lesson_id` (FK)
- `current_chapter` / `total_chapters` / `chapters_completed`
- `started_at` / `completed_at` / `last_accessed_at`

#### New Functions

- `update_student_progress()` - Updates points, stats, streak, level
- `award_achievement()` - Awards badge (idempotent)

---

## 3. Planned Exercise-Level Points

| Exercise Type | Points |
|--------------|--------|
| Puzzle solved | 1 pt |
| Study chapter completed | 3 pts |
| Lesson completed | 10 pts + quiz bonus |

### Implementation Notes
- Points should be awarded when user solves a puzzle or completes a study chapter
- Need to call `update_student_progress()` from:
  - `PuzzleViewerBlock.tsx` (on correct solution)
  - `StudyViewerBlock.tsx` (on chapter complete)
  - `LessonViewerShell.tsx` (on lesson complete)

---

## 4. Achievements / Badges (To Be Discussed)

**Pending Discussion:**
- What achievements should exist?
- Achievement triggers (auto vs coach-assigned)
- Visual display (icons, badges page)

**Proposed Achievement Categories:**
1. **Progress Milestones** - "10 Lessons", "50 Puzzles", etc.
2. **Streaks** - "7 Day Streak", "30 Day Streak"
3. **Perfect Scores** - "First 100%", "10 Perfect Quizzes"
4. **Time-based** - "Early Bird" (first login of day), "Night Owl"

---

## 5. Pages / Features to Update

### Existing Pages
- `/academy/students` - Already shows points, needs to integrate new summary table
- `/academy/reports` - Already shows progress, needs exercise-level detail
- `/academy/reports` (student view) - "My Progress" needs update

### New Pages (Potential)
- `/academy/students/[id]/achievements` - View student badges
- `/user/achievements` - Student views own badges

---

## 6. Next Steps

1. **Run migration** - Apply `20260406_student_gamification.sql` to Supabase
2. **Update progressService.ts** - Add calls to `update_student_progress()` for exercise events
3. **Update studentRepository.ts** - Fetch from new `student_progress_summary` table
4. **Discuss achievements** - Define badge list and triggers
5. **Update UI** - Display new stats in students page and reports

---

## 7. Files to Modify

| File | Change |
|------|--------|
| `src/services/progressService.ts` | Add calls to update_student_progress |
| `src/repositories/lesson/studentRepository.ts` | Switch to new summary table |
| `src/app/academy/students/page.tsx` | Use new summary data |
| `src/app/academy/reports/page.tsx` | Use new summary data |
| UI components | Display streaks, levels, badges |

---

## 8. Open Questions

- [ ] Should we backfill existing student data to new tables?
- [ ] How to handle coach-assigned custom achievements?
- [ ] Leaderboards - per-coach or global?
- [ ] Daily goals system?
