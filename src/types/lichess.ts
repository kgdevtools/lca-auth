// src/types/lichess.ts
// All Lichess-related TypeScript types for the LCA Academy coaching feature.
// Do NOT define Lichess types inline in service, component, or hook files — use this file.

// ================================================================
// Connection / OAuth
// ================================================================

export type LichessConnectionStatus = 'active' | 'pending_reconnect' | 'revoked'

/** Full DB row — includes access_token. Only use server-side. */
export interface LichessConnection {
  id: string
  user_id: string
  lichess_username: string
  access_token: string
  token_type: string
  scope: string
  expires_in: number | null
  connected_at: string
  last_synced_at: string | null
  is_active: boolean
  status: LichessConnectionStatus
  created_at: string
  updated_at: string
}

/** Safe public subset — never exposes the access_token. Use in client components and props. */
export interface LichessConnectionPublic {
  id: string
  user_id: string
  lichess_username: string
  scope: string
  connected_at: string
  last_synced_at: string | null
  is_active: boolean
  status: LichessConnectionStatus
}

// ================================================================
// PKCE / OAuth utilities
// ================================================================

export interface PKCEChallenge {
  codeVerifier: string
  codeChallenge: string
}

export interface LichessTokenResponse {
  access_token: string
  token_type: string
  /** May be undefined for non-expiring personal tokens */
  expires_in?: number
  /** Space-separated scopes granted by the user */
  scope?: string
}

// ================================================================
// Lichess API — User / Account
// ================================================================

export interface LichessPerf {
  games: number
  rating: number
  rd: number
  prog: number
  prov?: boolean
  rank?: number
}

export interface LichessPuzzleModePerf {
  runs: number
  score: number
}

export interface LichessPerfs {
  bullet?: LichessPerf
  blitz?: LichessPerf
  rapid?: LichessPerf
  classical?: LichessPerf
  correspondence?: LichessPerf
  chess960?: LichessPerf
  kingOfTheHill?: LichessPerf
  threeCheck?: LichessPerf
  antichess?: LichessPerf
  atomic?: LichessPerf
  horde?: LichessPerf
  racingKings?: LichessPerf
  crazyhouse?: LichessPerf
  ultraBullet?: LichessPerf
  puzzle?: LichessPerf
  storm?: LichessPuzzleModePerf
  racer?: LichessPuzzleModePerf
  streak?: LichessPuzzleModePerf
}

export interface LichessProfile {
  flag?: string
  location?: string
  bio?: string
  realName?: string
  fideRating?: number
}

export interface LichessPlayTime {
  total: number
  tv: number
}

export interface LichessCount {
  all: number
  rated: number
  win: number
  loss: number
  draw: number
  bookmark?: number
  playing?: number
  import?: number
  me?: number
}

/** Response from GET /api/account (authenticated) or GET /api/user/{username} */
export interface LichessUser {
  id: string
  username: string
  perfs?: LichessPerfs
  title?: string
  flair?: string
  createdAt?: number
  seenAt?: number
  profile?: LichessProfile
  playTime?: LichessPlayTime
  count?: LichessCount
  url?: string
  online?: boolean
  playing?: string
  disabled?: boolean
  tosViolation?: boolean
  patron?: boolean
}

// ================================================================
// Lichess API — Puzzle Activity
// ================================================================

export interface LichessPuzzleActivityItem {
  /** Unix timestamp in milliseconds */
  date: number
  win: boolean
  puzzle: {
    id: string
    fen: string
    lastMove: string
    plays: number
    rating: number
    solution: string[]
    themes: string[]
  }
}

// ================================================================
// Lichess API — Games
// ================================================================

export interface LichessGamePlayer {
  user?: {
    id: string
    name: string
    title?: string
    patron?: boolean
  }
  rating?: number
  ratingDiff?: number
  name?: string
  provisional?: boolean
  aiLevel?: number
  analysis?: {
    inaccuracy: number
    mistake: number
    blunder: number
    acpl: number
    accuracy?: number
  }
  team?: string
}

export interface LichessGameOpening {
  eco: string
  name: string
  ply: number
}

export interface LichessClock {
  initial: number
  increment: number
  totalTime: number
}

/** Represents one game from GET /api/games/user/{username} (JSON format) */
export interface LichessGameJson {
  id: string
  rated: boolean
  variant: string
  speed: string
  perf: string
  createdAt: number
  lastMoveAt: number
  status: string
  source?: string
  players: {
    white: LichessGamePlayer
    black: LichessGamePlayer
  }
  winner?: 'white' | 'black'
  initialFen?: string
  opening?: LichessGameOpening
  moves?: string
  pgn?: string
  clock?: LichessClock
  tournament?: string
  swiss?: string
}

// ================================================================
// Lichess API — Puzzle Dashboard
// ================================================================

export interface LichessPuzzlePerformance {
  nb: number
  firstWins: number
  replayWins: number
  puzzleRatingAvg: number
  performance: number
}

export interface LichessPuzzleDashboard {
  days: number
  global: LichessPuzzlePerformance
  themes: Record<string, {
    results: LichessPuzzlePerformance
    theme: string
  }>
}

// ================================================================
// Sync
// ================================================================

export interface LichessSyncResult {
  success: boolean
  username: string | null
  puzzlesSynced: number
  gamesSynced: number
  syncedAt: string
  error?: string
}

// ================================================================
// Assignments
// ================================================================

export type LichessAssignmentType = 'puzzle' | 'game_review' | 'opening' | 'note'
export type LichessAssignmentStatus = 'pending' | 'in_progress' | 'completed'
export type LichessAssignmentPriority = 'low' | 'normal' | 'high'

/**
 * details JSONB examples by type:
 *   puzzle:      { puzzle_id?: string, theme?: string, count?: number }
 *   game_review: { game_id: string, url: string }
 *   opening:     { name: string, color: 'white' | 'black', eco?: string }
 *   note:        {} (description field holds the note text)
 */
export interface LichessAssignment {
  id: string
  coach_id: string
  student_id: string
  type: LichessAssignmentType
  title: string
  description: string | null
  details: Record<string, unknown>
  status: LichessAssignmentStatus
  priority: LichessAssignmentPriority
  due_date: string | null
  assigned_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}
