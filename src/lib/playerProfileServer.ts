/**
 * Server-only player-profile assembly. Builds the opponents/games/record sections
 * for the profile page on top of the cached rankings pool:
 *
 *   1. getPlayer(key)               → the full RankedPlayer (summary + appearances).
 *   2. fetchTournamentPlayers(ids)  → every roster row for the player's tournaments.
 *   3. Resolve each round token ("35b1" → opponent who finished 35th) by indexing the
 *      roster by final-standings `rank`, the exact heuristic the round numbers encode.
 *
 * The round data lives in `sd_players.rounds` (NOT in the lean rankings pull), so this
 * is a profile-only query and never weighs down the rankings table.
 */
import { fetchTournamentMeta, fetchTournamentPlayers } from './ratingsClient';
import { getPlayer } from './rankingsServer';
import { fetchTeamGamesForPlayer } from './teamGamesServer';
import type { Appearance, RankedPlayer, RawRosterRow, RoundToken } from './rankings';

// ── Output shapes ─────────────────────────────────────────────────────────────

export type RoundResult = 'win' | 'loss' | 'draw' | 'bye' | null;

/** One resolved round of one event. `opponentName === null` ⇒ bye or unresolved. */
export interface GameEntry {
  round: number;
  opponentName: string | null;
  opponentRank: number | null;
  opponentRating: number | null;
  opponentFed: string | null;
  color: 'white' | 'black' | null;
  result: RoundResult;
}

/** One tournament's per-round breakdown for the player. */
export interface EventGames {
  appearance: Appearance;
  rounds: GameEntry[];
  /** Tournament venue/location (from sd_tournaments), or null. */
  location: string | null;
  /** Chief arbiter, falling back to arbiter; null if neither recorded. */
  arbiter: string | null;
}

/** Aggregate record against a single opponent across every event. */
export interface HeadToHead {
  name: string;
  wins: number;
  losses: number;
  draws: number;
  events: number;
  /** Opponent's most-recently-seen tournament rating, or null. */
  rating: number | null;
  /** Opponent's most-recently-seen federation code, or null. */
  fed: string | null;
  /** Each decisive/drawn meeting — result + the colour the player held. */
  meetings: { result: 'win' | 'loss' | 'draw'; color: 'white' | 'black' | null }[];
}

/** Win/loss/draw tally for one slice (overall or a single colour). */
export interface WLD {
  wins: number;
  losses: number;
  draws: number;
}

export interface RecordTotals extends WLD {
  byes: number;
  /** Decisive + drawn games (excludes byes). */
  games: number;
  /** Score over `games` as a percentage, or null when no games. */
  scorePct: number | null;
  /** Same tally split by the colour the player held. */
  white: WLD;
  black: WLD;
  /** Tournaments finished 1st (rank === 1). */
  tournamentVictories: number;
  /** Best (lowest) final standing achieved across events, or null. */
  bestRank: number | null;
  /** How many times the player achieved `bestRank`. */
  bestRankCount: number;
}

/**
 * Derived insight metrics. See docs/player-profile-metrics.md for exact formulas.
 * Every field is `null` when its minimum-sample guard isn't met.
 */
export interface DerivedMetrics {
  /** σ of performance across rated events (population stddev). */
  consistency: number | null;
  /** Mean rating of resolved opponents faced (per game). */
  strengthOfSchedule: number | null;
  /** Actual − Elo-expected score, in percentage points. */
  expectedDelta: number | null;
  /** Last-3 rated events' avg perf − career avg perf. */
  recentForm: number | null;
  /** Final standings of the last 3 tournaments, newest first (rank or null). */
  recentFinishes: (number | null)[];
  /** OLS slope of perf over time, points per year. */
  trendSlope: number | null;
  /** % of tournaments finishing top 3. */
  podiumRate: number | null;
  /** % of games vs higher-rated opponents that were won. */
  upsetRate: number | null;
  /** Wins vs higher-rated opponents (numerator of upsetRate). */
  upsetWins: number;
  /** Games vs higher-rated opponents (denominator; gates the Giant-killer tag). */
  upsetSampleSize: number;
  /** Highest opponent rating beaten. */
  bestWin: number | null;
}

export interface PlayerProfile {
  player: RankedPlayer;
  /** Per-tournament breakdown, newest first (mirrors appearances order). */
  byEvent: EventGames[];
  /** Head-to-head aggregate, most-played opponents first. */
  headToHead: HeadToHead[];
  record: RecordTotals;
  metrics: DerivedMetrics;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Lowercase, strip accents/punctuation, collapse spaces — for opponent matching. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null;
}

const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;
/** Parse "YYYY-MM-DD" / "YYYY/MM/DD" → fractional year (e.g. 2025.4). null on failure. */
function dateYears(s: string | null): number | null {
  if (!s) return null;
  const d = new Date(s.trim().replace(/\//g, '-') + 'T00:00:00Z');
  return isNaN(d.getTime()) ? null : d.getTime() / MS_PER_YEAR;
}

const SCORE = { win: 1, draw: 0.5, loss: 0 } as const;

/** Compute the derived insight metrics. See docs/player-profile-metrics.md. */
function computeMetrics(player: RankedPlayer, byEvent: EventGames[]): DerivedMetrics {
  // A — consistency (σ of perf across rated events)
  const perfs = player.appearances.map((a) => a.perf).filter((v): v is number => v !== null);
  let consistency: number | null = null;
  const mu = mean(perfs);
  if (perfs.length >= 2 && mu !== null) {
    const variance = perfs.reduce((s, v) => s + (v - mu) ** 2, 0) / perfs.length;
    consistency = Math.round(Math.sqrt(variance));
  }

  // B/C/F/G — game-level passes (need per-event seed S and opponent rating R)
  const oppRatings: number[] = [];
  let expSum = 0;
  let actSum = 0;
  let cGames = 0; // games with both S and R (for expected-vs-actual)
  let higher = 0; // games vs higher-rated
  let upsetWins = 0;
  let bestWin: number | null = null;

  for (const ev of byEvent) {
    const S = ev.appearance.seed;
    for (const g of ev.rounds) {
      if (g.opponentName === null || g.result === 'bye' || g.result === null) continue;
      const R = g.opponentRating;
      if (R !== null) {
        oppRatings.push(R);
        if (g.result === 'win') bestWin = bestWin === null ? R : Math.max(bestWin, R);
      }
      if (S !== null && R !== null) {
        expSum += 1 / (1 + 10 ** ((R - S) / 400));
        actSum += SCORE[g.result];
        cGames += 1;
        if (R > S) {
          higher += 1;
          if (g.result === 'win') upsetWins += 1;
        }
      }
    }
  }

  const strengthOfSchedule = oppRatings.length ? Math.round(mean(oppRatings)!) : null;
  const expectedDelta = cGames > 0 ? Math.round(((actSum - expSum) / cGames) * 1000) / 10 : null;
  const upsetRate = higher > 0 ? Math.round((upsetWins / higher) * 100) : null;

  // D — recent form (appearances are newest-first)
  let recentForm: number | null = null;
  if (perfs.length >= 2) {
    const last3 = player.appearances
      .filter((a): a is typeof a & { perf: number } => a.perf !== null)
      .slice(0, 3)
      .map((a) => a.perf);
    const recent = mean(last3);
    if (recent !== null) recentForm = Math.round(recent - player.avgPerf);
  }

  // I — trend slope (OLS of perf over time, points/year)
  let trendSlope: number | null = null;
  const pts = player.appearances
    .map((a) => ({ x: dateYears(a.date), y: a.perf }))
    .filter((p): p is { x: number; y: number } => p.x !== null && p.y !== null);
  if (pts.length >= 2) {
    const xm = mean(pts.map((p) => p.x))!;
    const ym = mean(pts.map((p) => p.y))!;
    let num = 0;
    let den = 0;
    for (const p of pts) {
      num += (p.x - xm) * (p.y - ym);
      den += (p.x - xm) ** 2;
    }
    if (den > 0) trendSlope = Math.round(num / den);
  }

  // E — podium rate
  const ranks = player.appearances.map((a) => a.rank).filter((v): v is number => v !== null);
  const podiumRate = ranks.length
    ? Math.round((ranks.filter((r) => r <= 3).length / ranks.length) * 100)
    : null;

  // Form (sport-table style) — final standings of the last 3 events, newest first.
  const recentFinishes = player.appearances.slice(0, 3).map((a) => a.rank);

  return {
    consistency,
    strengthOfSchedule,
    expectedDelta,
    recentForm,
    recentFinishes,
    trendSlope,
    podiumRate,
    upsetRate,
    upsetWins,
    upsetSampleSize: higher,
    bestWin,
  };
}

/** Normalise a stored round entry, tolerating dirty/legacy shapes. */
function normaliseRound(raw: RoundToken | null | undefined): RoundToken | null {
  if (!raw || typeof raw !== 'object') return null;
  const result =
    raw.result === 'win' || raw.result === 'loss' || raw.result === 'draw' || raw.result === 'bye'
      ? raw.result
      : null;
  const color = raw.color === 'white' || raw.color === 'black' ? raw.color : null;
  const opponent = raw.opponent != null && /^\d+$/.test(String(raw.opponent)) ? String(raw.opponent) : null;
  return { opponent, color, result, raw: raw.raw };
}

// ── Assembly ──────────────────────────────────────────────────────────────────

/**
 * Assemble the full profile for `key`, or `null` when the player isn't in the pool.
 * `period` defaults to all-time; pass it to mirror the row the profile was opened from.
 */
export async function getPlayerProfile(
  key: string,
  period?: number,
): Promise<PlayerProfile | null> {
  const player = await getPlayer(key, period);
  if (!player) return null;

  const tournamentIds = player.appearances.map((a) => a.tournamentId);

  // Roster lookup is best-effort: if the grant/table is missing, fall back to a
  // numbers-only view rather than failing the whole page.
  let rosterRows: RawRosterRow[] = [];
  let metaMap = new Map<string, { location: string | null; arbiter: string | null }>();
  try {
    const [roster, meta] = await Promise.all([
      fetchTournamentPlayers(tournamentIds),
      fetchTournamentMeta(tournamentIds).catch((err) => {
        console.error('[playerProfile] tournament meta fetch failed:', err);
        return [];
      }),
    ]);
    rosterRows = roster;
    metaMap = new Map(
      meta.map((m) => [m.id, { location: m.location, arbiter: m.chief_arbiter ?? m.arbiter }]),
    );
  } catch (err) {
    console.error('[playerProfile] roster fetch failed:', err);
  }

  // tournament_id → (rank → row) and tournament_id → rows[] (name fallback).
  const byRank = new Map<string, Map<number, RawRosterRow>>();
  const byTournament = new Map<string, RawRosterRow[]>();
  for (const r of rosterRows) {
    const rank = toNum(r.rank);
    if (!byTournament.has(r.tournament_id)) byTournament.set(r.tournament_id, []);
    byTournament.get(r.tournament_id)!.push(r);
    if (rank !== null) {
      if (!byRank.has(r.tournament_id)) byRank.set(r.tournament_id, new Map());
      byRank.get(r.tournament_id)!.set(rank, r);
    }
  }

  const playerNameNorm = norm(player.name);

  // Team-tournament events bridge in with no round tokens — resolve their
  // opponents from the Academy team schema instead (Option B). Best-effort.
  const teamGames = await fetchTeamGamesForPlayer(tournamentIds, player.name);

  const byEvent: EventGames[] = [];
  const h2h = new Map<string, HeadToHead>();
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let byes = 0;
  const white: WLD = { wins: 0, losses: 0, draws: 0 };
  const black: WLD = { wins: 0, losses: 0, draws: 0 };

  for (const appearance of player.appearances) {
    // Build this event's games: team events come from the Academy team schema
    // (no round tokens); everything else resolves from the roster's round tokens.
    let rounds: GameEntry[];
    const teamRounds = teamGames.get(appearance.tournamentId);
    if (teamRounds) {
      rounds = teamRounds;
    } else {
      const rankMap = byRank.get(appearance.tournamentId);
      const rows = byTournament.get(appearance.tournamentId) ?? [];
      // The player's own roster row: by final-standings rank, else by name.
      let ownRow: RawRosterRow | undefined =
        appearance.rank != null ? rankMap?.get(appearance.rank) : undefined;
      if (!ownRow) ownRow = rows.find((r) => norm(r.name) === playerNameNorm);

      const tokens = Array.isArray(ownRow?.rounds) ? ownRow!.rounds : [];
      rounds = [];
      tokens.forEach((rawTok, i) => {
        const tok = normaliseRound(rawTok);
        if (!tok) return;
        if (tok.opponent === null) {
          rounds.push({ round: i + 1, opponentName: null, opponentRank: null, opponentRating: null, opponentFed: null, color: tok.color, result: tok.result ?? 'bye' });
          return;
        }
        const oppRank = Number(tok.opponent);
        const oppRow = rankMap?.get(oppRank);
        rounds.push({
          round: i + 1,
          opponentName: oppRow?.name ?? null,
          opponentRank: oppRank,
          opponentRating: toNum(oppRow?.tournament_rating),
          opponentFed: oppRow?.federation ?? null,
          color: tok.color,
          result: tok.result,
        });
      });
    }

    // Shared tally — record + head-to-head — over the event's games.
    const seenOpponentsThisEvent = new Set<string>();
    for (const g of rounds) {
      if (g.opponentName === null) {
        if (g.result === 'bye' || g.result === null) byes += 1;
        continue;
      }
      const slice = g.color === 'white' ? white : g.color === 'black' ? black : null;
      if (g.result === 'win') { wins += 1; if (slice) slice.wins += 1; }
      else if (g.result === 'loss') { losses += 1; if (slice) slice.losses += 1; }
      else if (g.result === 'draw') { draws += 1; if (slice) slice.draws += 1; }

      const k = norm(g.opponentName);
      let agg = h2h.get(k);
      if (!agg) {
        agg = { name: g.opponentName, wins: 0, losses: 0, draws: 0, events: 0, rating: null, fed: null, meetings: [] };
        h2h.set(k, agg);
      }
      // appearances are newest-first, so the first non-null value seen is the
      // opponent's most-recent rating / federation.
      if (agg.rating === null) agg.rating = g.opponentRating;
      if (agg.fed === null && g.opponentFed) agg.fed = g.opponentFed;
      if (g.result === 'win' || g.result === 'loss' || g.result === 'draw') {
        if (g.result === 'win') agg.wins += 1;
        else if (g.result === 'loss') agg.losses += 1;
        else agg.draws += 1;
        agg.meetings.push({ result: g.result, color: g.color });
      }
      if (!seenOpponentsThisEvent.has(k)) {
        agg.events += 1;
        seenOpponentsThisEvent.add(k);
      }
    }

    const meta = metaMap.get(appearance.tournamentId);
    byEvent.push({
      appearance,
      rounds,
      location: meta?.location ?? null,
      arbiter: meta?.arbiter ?? null,
    });
  }

  // Best (lowest) final standing + how many times it was achieved.
  const allRanks = player.appearances.map((a) => a.rank).filter((v): v is number => v !== null);
  const bestRank = allRanks.length ? Math.min(...allRanks) : null;
  const bestRankCount = bestRank === null ? 0 : allRanks.filter((r) => r === bestRank).length;

  const games = wins + losses + draws;
  const record: RecordTotals = {
    wins,
    losses,
    draws,
    byes,
    games,
    scorePct: games > 0 ? Math.round(((wins + draws / 2) / games) * 1000) / 10 : null,
    white,
    black,
    tournamentVictories: player.wins,
    bestRank,
    bestRankCount,
  };

  const headToHead = [...h2h.values()].sort(
    (a, b) =>
      b.wins + b.losses + b.draws - (a.wins + a.losses + a.draws) ||
      a.name.localeCompare(b.name),
  );

  const metrics = computeMetrics(player, byEvent);

  return { player, byEvent, headToHead, record, metrics };
}
