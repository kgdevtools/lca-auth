// ── Level names ───────────────────────────────────────────────────────────────
// Thresholds: 0 / 100 / 300 / 600 / 1000 / 1500 pts

export const LEVEL_NAMES = {
  1: 'Pawn',
  2: 'Knight',
  3: 'Bishop',
  4: 'Rook',
  5: 'Queen',
  6: 'King',
} as const

export type LevelNumber = keyof typeof LEVEL_NAMES

// ── Achievement stats (subset of student_progress_summary) ───────────────────

export interface AchievementStats {
  lessons_completed:   number
  puzzles_solved:      number
  studies_completed:   number
  current_streak_days: number
  longest_streak_days: number
  had_perfect_quiz:    boolean
}

// ── Achievement catalog ───────────────────────────────────────────────────────
// Definitions live here (code). Only earned rows live in student_achievements DB table.
// check: null means coach-only — no automatic unlock.

interface AchievementDef {
  key:         string
  name:        string
  description: string
  icon:        string
  check:       ((stats: AchievementStats) => boolean) | null
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Milestone ──────────────────────────────────────────────────────────────
  { key: 'first_lesson',        name: 'First Steps',    description: 'Complete your first lesson',  icon: '🎯', check: s => s.lessons_completed >= 1  },
  { key: 'five_lessons',        name: 'Scholar',        description: 'Complete 5 lessons',          icon: '📚', check: s => s.lessons_completed >= 5  },
  { key: 'ten_lessons',         name: 'Dedicated',      description: 'Complete 10 lessons',         icon: '🏅', check: s => s.lessons_completed >= 10 },
  { key: 'twenty_five_lessons', name: 'Master Student', description: 'Complete 25 lessons',         icon: '🏆', check: s => s.lessons_completed >= 25 },

  // ── Streak ─────────────────────────────────────────────────────────────────
  { key: 'streak_3',  name: 'On Fire',      description: '3-day activity streak',  icon: '🔥', check: s => s.longest_streak_days >= 3  },
  { key: 'streak_7',  name: 'Week Warrior', description: '7-day activity streak',  icon: '⚡', check: s => s.longest_streak_days >= 7  },
  { key: 'streak_30', name: 'Iron Will',    description: '30-day activity streak', icon: '💎', check: s => s.longest_streak_days >= 30 },

  // ── Mastery ────────────────────────────────────────────────────────────────
  { key: 'perfect_quiz', name: 'Perfect Score', description: 'Get 100% on a quiz', icon: '⭐', check: s => s.had_perfect_quiz },

  // ── Puzzle ─────────────────────────────────────────────────────────────────
  { key: 'puzzle_debut',  name: 'Puzzle Solver', description: 'Complete your first puzzle lesson', icon: '♟️', check: s => s.puzzles_solved >= 1  },
  { key: 'puzzle_hunter', name: 'Puzzle Hunter', description: 'Complete 10 puzzle lessons',        icon: '🎲', check: s => s.puzzles_solved >= 10 },

  // ── Study ──────────────────────────────────────────────────────────────────
  { key: 'chess_scholar', name: 'Chess Scholar', description: 'Complete your first study lesson', icon: '📖', check: s => s.studies_completed >= 1 },
  { key: 'deep_thinker',  name: 'Deep Thinker',  description: 'Complete 5 study lessons',         icon: '🔭', check: s => s.studies_completed >= 5 },

  // ── Coach-awarded (manual only) ────────────────────────────────────────────
  { key: 'most_improved',    name: 'Most Improved',    description: 'Awarded by coach',                      icon: '📈', check: null },
  { key: 'star_student',     name: 'Star Student',     description: 'Awarded by coach',                      icon: '🌟', check: null },
  { key: 'tournament_ready', name: 'Tournament Ready', description: 'Awarded by coach — ready to compete',   icon: '♛',  check: null },
]
