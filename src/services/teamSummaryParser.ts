import * as XLSX from "xlsx"
import { parseDate } from "@/lib/dateUtils"
import { cleanCell, parseIntOrNull } from "@/lib/teamTournamentUtils"
import { inferOpponents, type OpponentGame } from "@/lib/teamPairingInference"

/**
 * Team Tournament SUMMARY parser.
 *
 * Parses the two whole-tournament Swiss-Manager exports together:
 *   1. "Team Composition with Points" — per-team roster by board (FED, per-round
 *      results, Pts/Games/%/Rtg-Ø) + final team standings (MP / game points).
 *   2. "Player Performance List" — per-player Rank/Pts/Games/WIN:MP/DE/ratP, where
 *      `ratP` is the performance rating used by /player-rankings.
 *
 * The two are joined on (player name, team) into one per-player record. This is the
 * bridge data later pushed into the Ratings pipeline (sd_*) with perf = ratP.
 * Pure: no I/O beyond the passed-in buffers. Round-by-round board pairings (who
 * played whom) still come from the separate round-file parser.
 */

export interface TeamSummaryMetadata {
  tournament_name?: string
  organizer?: string
  tournament_director?: string
  chief_arbiter?: string
  deputy_chief_arbiter?: string
  arbiter?: string
  location?: string
  date?: string
  end_date?: string
  rounds?: number
}

export interface TeamStanding {
  rank: number
  team_name: string
  match_points: number
  game_points: number
}

export interface TeamPlayerPerformance {
  team_name: string
  board: number | null
  name: string
  federation: string | null
  rating: number | null
  /** Game points scored by the player (board Pts). */
  points: number | null
  games: number | null
  /** WIN:MP wins count (Player Performance List). */
  wins: number | null
  /** Performance rating (ratP) — the ranking metric. */
  performance_rating: number | null
  /** Score percentage (Composition "%"). */
  pct: number | null
  /** Average opponent rating (Composition "Rtg-Ø"). */
  rtg_avg: number | null
  /** Per-round result tokens, e.g. ["0","½","1","+",…]. */
  per_round: (string | null)[]
  /** Per-round opponents, inferred from the composition (see inferOpponents). */
  opponents?: OpponentGame[]
}

export interface TeamSummaryData {
  metadata: TeamSummaryMetadata
  teams: TeamStanding[]
  players: TeamPlayerPerformance[]
}

// ── helpers ──────────────────────────────────────────────────────────────────

const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim()

/** "5½" → 5.5, "½" → 0.5, "4" → 4, "+"/"-"/"" → null. */
function parseScore(val: any): number | null {
  const s = cleanCell(val)
  if (!s || s === "-" || s === "+") return null
  const n = parseFloat(s.replace("½", ".5").replace(",", "."))
  return Number.isFinite(n) ? n : null
}

/** "33,3" → 33.3 */
function parsePercent(val: any): number | null {
  const s = cleanCell(val)
  if (!s) return null
  const n = parseFloat(s.replace(",", "."))
  return Number.isFinite(n) ? n : null
}

function readSheet(buffer: Buffer): any[][] {
  const wb = XLSX.read(buffer, { type: "buffer" })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null }) as any[][]
}

function afterColon(text: string): string | undefined {
  const i = text.indexOf(":")
  return i >= 0 ? text.slice(i + 1).trim() : undefined
}

/** Shared metadata header (rows 0–~9): tournament name + "Field : value" lines. */
function parseMetadata(rows: any[][]): TeamSummaryMetadata {
  const meta: TeamSummaryMetadata = {}
  if (rows[0]?.[0]) meta.tournament_name = cleanCell(rows[0][0])

  for (let i = 1; i < Math.min(12, rows.length); i++) {
    const first = cleanCell(rows[i]?.[0])
    if (!first) continue
    const value = afterColon(first)
    const strip = (v?: string) => v?.replace(/\s*\([^)]*\)\s*$/, "").trim()

    if (/^organizer/i.test(first)) meta.organizer = value
    else if (/^tournament director/i.test(first)) meta.tournament_director = value
    else if (/^chief arbiter/i.test(first)) meta.chief_arbiter = strip(value)
    else if (/^deputy chief arbiter/i.test(first)) meta.deputy_chief_arbiter = strip(value)
    else if (/^arbiter/i.test(first)) meta.arbiter = value
    else if (/^(town|location)/i.test(first)) meta.location = value
    else if (/^date\s*:/i.test(first) && value) {
      // "2025/12/15 To 2025/12/17"
      const [start, end] = value.split(/\bto\b/i).map((s) => s.trim())
      meta.date = parseDate(start)
      if (end) meta.end_date = parseDate(end)
    }
    // "Ranking list after round 6 ..."
    const roundMatch = first.match(/after round\s+(\d+)/i)
    if (roundMatch) meta.rounds = parseInt(roundMatch[1], 10)
  }
  return meta
}

// ── 1. Team Composition with Points ──────────────────────────────────────────

const TEAM_HEADER = /^(\d+)\.\s*(.+?)\s*\(\s*([\d½]+)\s*MP\s*\/\s*([\d½]+)\s*Pts/i

function parseComposition(rows: any[][]): { teams: TeamStanding[]; players: TeamPlayerPerformance[] } {
  const teams: TeamStanding[] = []
  const players: TeamPlayerPerformance[] = []

  let currentTeam: string | null = null
  // Column layout from the most recent "Bo." header (round count varies per event).
  let roundStart = -1
  let ptsIdx = -1
  let gamIdx = -1
  let pctIdx = -1
  let rtgAvgIdx = -1

  for (const row of rows) {
    if (!row || row.length === 0) continue
    const first = cleanCell(row[0])
    if (!first) continue

    const teamMatch = first.match(TEAM_HEADER)
    if (teamMatch) {
      currentTeam = cleanCell(teamMatch[2])
      teams.push({
        rank: parseInt(teamMatch[1], 10),
        team_name: currentTeam,
        match_points: parseScore(teamMatch[3]) ?? 0,
        game_points: parseScore(teamMatch[4]) ?? 0,
      })
      continue
    }

    // Board table header: locate the summary columns (round count is variable).
    if (/^bo\.?$/i.test(first)) {
      ptsIdx = row.findIndex((c) => /^pts/i.test(cleanCell(c)))
      gamIdx = row.findIndex((c) => /^gam/i.test(cleanCell(c)))
      pctIdx = row.findIndex((c) => cleanCell(c) === "%")
      // The LAST "Rtg" column is Rtg-Ø (avg opponent); index 2 is the player's own Rtg.
      rtgAvgIdx = -1
      row.forEach((c, i) => { if (/rtg/i.test(cleanCell(c))) rtgAvgIdx = i })
      roundStart = 4 // Bo. | Name | Rtg | FED | <rounds…>
      continue
    }

    // Board row: a numeric board within the current team.
    const board = parseIntOrNull(first)
    if (currentTeam && board !== null && ptsIdx > 0) {
      const perRound = roundStart >= 0 && ptsIdx > roundStart
        ? row.slice(roundStart, ptsIdx).map((c) => cleanCell(c) || null)
        : []
      players.push({
        team_name: currentTeam,
        board,
        name: cleanCell(row[1]),
        federation: cleanCell(row[3]) || null,
        rating: parseIntOrNull(row[2]),
        points: parseScore(row[ptsIdx]),
        games: parseIntOrNull(row[gamIdx]),
        wins: null,
        performance_rating: null,
        pct: parsePercent(row[pctIdx]),
        rtg_avg: parseIntOrNull(row[rtgAvgIdx]),
        per_round: perRound,
      })
    }
  }

  return { teams, players }
}

// ── 2. Player Performance List ────────────────────────────────────────────────

interface PerfRow { ratP: number | null; wins: number | null; games: number | null; points: number | null }

function parsePerformance(rows: any[][]): Map<string, PerfRow> {
  const byKey = new Map<string, PerfRow>()
  let cols: { name: number; team: number; pts: number; games: number; wins: number; ratP: number } | null = null

  for (const row of rows) {
    if (!row) continue
    const first = cleanCell(row[0])

    if (!cols && /^rank$/i.test(first)) {
      const idx = (re: RegExp) => row.findIndex((c) => re.test(cleanCell(c)))
      cols = {
        name: idx(/^name$/i),
        team: idx(/^team$/i),
        pts: idx(/^pts/i),
        games: idx(/^games$/i),
        wins: idx(/^win/i),
        ratP: idx(/^ratp$/i),
      }
      continue
    }
    if (!cols) continue
    const name = cleanCell(row[cols.name])
    const team = cleanCell(row[cols.team])
    if (!name) continue
    byKey.set(`${norm(name)}|${norm(team)}`, {
      ratP: parseIntOrNull(row[cols.ratP]),
      wins: parseIntOrNull(row[cols.wins]),
      games: parseIntOrNull(row[cols.games]),
      points: parseScore(row[cols.pts]),
    })
  }
  return byKey
}

// ── main ──────────────────────────────────────────────────────────────────────

export function parseTeamSummaryExcel(
  compositionBuffer: Buffer,
  performanceBuffer: Buffer,
): TeamSummaryData {
  const compRows = readSheet(compositionBuffer)
  const perfRows = readSheet(performanceBuffer)

  const metadata = parseMetadata(compRows)
  const { teams, players } = parseComposition(compRows)
  const perf = parsePerformance(perfRows)

  // Join performance (ratP, wins) onto the composition roster by (name, team).
  for (const p of players) {
    const hit = perf.get(`${norm(p.name)}|${norm(p.team_name)}`)
    if (hit) {
      p.performance_rating = hit.ratP
      p.wins = hit.wins
      if (p.games == null) p.games = hit.games
      if (p.points == null) p.points = hit.points
    }
  }

  // Fall back to the performance list's round count if composition didn't reveal it.
  if (metadata.rounds == null) {
    metadata.rounds = parseMetadata(perfRows).rounds
  }

  // Infer each player's per-round opponents from the board results (no round files).
  inferOpponents(players)

  return { metadata, teams, players }
}
