// Pure constants/types for the Coach Game Performance Reports feature — no
// framework or server dependency, so client components can import PHASES (a
// real runtime value, not just a type) without pulling in gameLogRepository.ts
// and its `@/utils/supabase/server` (next/headers) import into the client
// bundle. Same reasoning as StoredAnnotationSet living in lib/decorations.ts
// rather than the decorations hook file — see [[project_lesson_builder_prod_port]].

export const PHASES = ['opening', 'middlegame', 'endgame', 'tactics', 'strategy', 'psychology'] as const
export type GamePhase = typeof PHASES[number]
export type GameResult = 'win' | 'draw' | 'loss'
export type GameSource = 'manual' | 'lichess'

export interface AssessmentCriterion {
  id: string
  phase: GamePhase
  name: string
  description: string | null
  sort_order: number
}

/** One of the 27 criteria, with its current score for a specific game (null
 *  if not yet scored) — the shape the "Score this game" view renders. */
export interface ScoredCriterion extends AssessmentCriterion {
  score: number | null
}

export type PhaseScores = Record<GamePhase, number | null>
