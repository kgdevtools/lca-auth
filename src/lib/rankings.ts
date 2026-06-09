/**
 * Framework-agnostic, browser-safe port of the ratings project's
 * rank-by-performance script. `rankPlayers()` takes the raw view rows +
 * tournaments + region mapping and a filter object, and returns ranked players
 * (with per-tournament appearances): grouping precedence, confidence gating,
 * averaging, and all filters. No I/O, no Node APIs.
 */

import { classifyTournament, type TournamentType } from "./cdcSelection";

// ── Raw shapes (as returned by Supabase / the regions json) ───────────────────

export interface RawViewRow {
  tournament_id: string;
  rank: number | string | null;
  name: string;
  name_sorted: string | null;
  /** This appearance's single federation code (per-event, may "miss" others). */
  federation: string | null;
  /** Player-level array of every federation code the player has held. Same on
   *  every appearance row for a player; null/absent for legacy rows. */
  federations: string[] | null;
  tournament_rating: number | string | null;
  points: number | string | null;
  performance_rating: number | string | null;
  match_score: number | string | null;
  rs_player_id: string | null;
  unique_no: number | string | null;
  fide_id: number | string | null;
  title: string | null;
  sex: string | null;
  fide_rating: number | string | null;
  current_rating: number | string | null;
  birth_year: number | string | null;
}

export interface RawTournament {
  id: string;
  tournament_name: string | null;
  date: string | null;
}

/** Extra per-tournament metadata for the profile's Tournaments tab. */
export interface RawTournamentMeta {
  id: string;
  location: string | null;
  chief_arbiter: string | null;
  arbiter: string | null;
}

/**
 * A single parsed round result from `sd_players.rounds` (JSONB). `opponent` is the
 * opponent's FINAL-STANDINGS rank as a string (e.g. "35" from a "35b1" token), so it
 * indexes directly into a tournament's roster keyed by `rank`. `null` opponent +
 * `result: "bye"` marks a bye/no-pairing. Shapes from both parser versions are
 * compatible with this; fields may be absent on dirty rows, hence all-nullable.
 */
export interface RoundToken {
  opponent: string | null;
  color: 'white' | 'black' | null;
  result: 'win' | 'loss' | 'draw' | 'bye' | null;
  raw?: string;
}

/**
 * One row of a tournament's full roster from `rs_local_active_players` — the profile
 * page fetches these (incl. `rounds`, which the lean rankings pull omits) to resolve
 * round tokens to real opponents by final-standings `rank`.
 */
export interface RawRosterRow {
  tournament_id: string;
  rank: number | string | null;
  name: string;
  federation: string | null;
  tournament_rating: number | string | null;
  points: number | string | null;
  rounds: RoundToken[] | null;
}

export interface RegionEntry {
  province: string | null;
  district: string | null;
  confidence: number;
}
/** Shape of tournament-regions.json: { tournament_id -> RegionEntry }. */
export type RegionMap = Record<string, RegionEntry>;

// ── Filters ───────────────────────────────────────────────────────────────────

export interface RankingFilters {
  /** Require >= N rated tournaments (default 1). */
  minTournaments?: number;
  /** Match-confidence floor; below this a registry match is discarded (default 0.6). */
  minConfidence?: number;
  /** Player federation(s), e.g. ["RSA","LCP"]. Case-insensitive. */
  federations?: string[];
  /** Tournament province(s) (needs regions). Case-insensitive. */
  provinces?: string[];
  /** Tournament district(s) (needs regions). Case-insensitive. */
  districts?: string[];
  /** Min region-resolution confidence to count an appearance (default 0). */
  regionMinConfidence?: number;
  /** Juniors: birth_year >= this (inclusive). */
  bornAfter?: number;
  /** Seniors: birth_year <= this (inclusive). */
  bornBefore?: number;
  /** Registry sex. */
  sex?: 'M' | 'F' | null;
  /** Calendar year (Jan–Dec) of the tournament date. */
  year?: number;
  /** Chess season labelled by START year: 1 Oct YEAR -> 30 Sep YEAR+1. */
  period?: number;
  /** Top N players (default 50). */
  limit?: number;
}

// ── Output shapes ─────────────────────────────────────────────────────────────

export type IdentityKind = 'unique_no' | 'fide_id' | 'fuzzy-match' | 'name';

export interface Appearance {
  tournamentId: string;
  tournamentName: string;
  date: string | null;
  province: string | null;
  district: string | null;
  /** CDC selection classification of the tournament (by name). */
  type: TournamentType;
  rank: number | null;
  points: number | null;
  seed: number | null;
  perf: number | null;
  /** perf - seed when both present. */
  gap: number | null;
  matchScore: number | null;
}

export interface RankedPlayer {
  key: string;
  identityKind: IdentityKind;
  name: string;
  title: string | null;
  sex: string | null;
  /** Single representative federation code, derived from `federations` with a
   *  local-first precedence (see pickFederation). Falls back to the scalar. */
  federation: string | null;
  /** Every federation code the player has held (UPPER-cased, deduped, sorted). */
  federations: string[];
  uniqueNo: string | null;
  fideId: string | null;
  fideRating: number | null;
  currentRating: number | null;
  birthYear: number | null;
  avgPerf: number;
  bestPerf: number;
  worstPerf: number;
  ratedTournaments: number;
  totalAppearances: number;
  /** Number of tournaments the player finished 1st (rank === 1). */
  wins: number;
  /** The player's earliest tournament's seed rating (first instance, NOT an average). */
  tournamentRating: number | null;
  avgGap: number | null;
  avgPoints: number | null;
  avgMatch: number | null;
  /** CDC selection counts (only meaningful within a single cycle / period). */
  juniorTournaments: number;
  openTournaments: number;
  /** Counted (junior/open) tournaments played in Capricorn district. */
  capricornTournaments: number;
  hasCapricornOpen: boolean;
  /** Played ≥1 event (any type) in Capricorn district / Limpopo province — used by
   *  the location-based region filter so non-Limpopo-federation players who turned
   *  up at local tournaments are still rankable. */
  playedCapricorn: boolean;
  playedLimpopo: boolean;
  /** Newest first. */
  appearances: Appearance[];
}

/** A ranked player without the heavy per-appearance history — what the rankings
 *  table ships to the client. The full `appearances` are fetched on demand when
 *  a row is expanded (see /player-rankings/data route + rankingsServer). */
export type RankedSummary = Omit<RankedPlayer, "appearances">;

// ── Helpers ───────────────────────────────────────────────────────────────────

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null;
}

/** National federation code — used as the last-resort display code. */
const NATIONAL_FEDERATION = 'RSA';

/**
 * Choose the single representative federation code for display/filtering from a
 * player's full `federations` array. This is a regional academy app, so a local
 * union code is preferred over the national RSA code: a player who has *ever*
 * played under a local union is "local" first. Precedence:
 *   LCP → CSA → any other valid code (≠ RSA, alphabetical) → RSA (last resort).
 * Single-char "B"/"W" tokens (dirty sd_players data) are ignored.
 */
export function pickFederation(federations: string[] | null | undefined): string | null {
  if (!federations) return null;
  const codes = federations.map((c) => c.toUpperCase()).filter((c) => c.length >= 2);
  if (codes.length === 0) return null;
  if (codes.includes('LCP')) return 'LCP';
  if (codes.includes('CSA')) return 'CSA';
  const other = codes.filter((c) => c !== NATIONAL_FEDERATION).sort()[0];
  return other ?? NATIONAL_FEDERATION;
}

/** Parse "YYYY-MM-DD" or "YYYY/MM/DD" → epoch ms (UTC). null on failure. */
function parseDateMs(s: string | null | undefined): number | null {
  if (!s) return null;
  const d = new Date(s.trim().replace(/\//g, '-') + 'T00:00:00Z');
  return isNaN(d.getTime()) ? null : d.getTime();
}

// ── Internal accumulator ──────────────────────────────────────────────────────

interface PlayerAcc {
  key: string;
  identityKind: IdentityKind;
  nameCounts: Map<string, number>;
  title: string | null;
  sex: string | null;
  federation: string | null;
  /** Union of all (cleaned) federation codes seen across this player's rows. */
  federations: Set<string>;
  uniqueNo: string | null;
  fideId: string | null;
  fideRating: number | null;
  currentRating: number | null;
  birthYear: number | null;
  appearances: Appearance[];
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function rankPlayers(
  appearances: RawViewRow[],
  tournaments: RawTournament[],
  regions: RegionMap,
  filters: RankingFilters = {},
): RankedPlayer[] {
  const minConfidence = filters.minConfidence ?? 0.6;
  const minTournaments = filters.minTournaments ?? 1;
  const regionMinConfidence = filters.regionMinConfidence ?? 0;
  const limit = filters.limit ?? 50;
  const feds = (filters.federations ?? []).map((f) => f.toUpperCase());
  const provs = (filters.provinces ?? []).map((p) => p.toLowerCase());
  const dists = (filters.districts ?? []).map((d) => d.toLowerCase());
  const regionFilterActive = provs.length > 0 || dists.length > 0;
  const dateFilterActive = filters.year != null || filters.period != null;

  const tournById = new Map(tournaments.map((t) => [t.id, t]));

  const passesRegion = (tid: string): boolean => {
    if (!regionFilterActive) return true;
    const e = regions[tid];
    if (!e || e.confidence < regionMinConfidence) return false;
    if (provs.length && !provs.includes((e.province ?? '').toLowerCase())) return false;
    if (dists.length && !dists.includes((e.district ?? '').toLowerCase())) return false;
    return true;
  };

  const passesDate = (dateStr: string | null): boolean => {
    if (!dateFilterActive) return true;
    const ms = parseDateMs(dateStr);
    if (ms === null) return false;
    const d = new Date(ms);
    if (filters.year != null && d.getUTCFullYear() !== filters.year) return false;
    if (filters.period != null) {
      const start = Date.UTC(filters.period, 9, 1); // 1 Oct (month index 9)
      const end = Date.UTC(filters.period + 1, 9, 1); // 1 Oct next year (exclusive)
      if (ms < start || ms >= end) return false;
    }
    return true;
  };

  const players = new Map<string, PlayerAcc>();

  for (const r of appearances) {
    const tourn = tournById.get(r.tournament_id);

    // Appearance-level filters. Federation is a player-level fact (same array on
    // every row), so match against the full array, falling back to the scalar.
    const rowFeds = (r.federations ?? (r.federation ? [r.federation] : [])).map((c) =>
      c.toUpperCase(),
    );
    if (feds.length && !rowFeds.some((c) => feds.includes(c))) continue;
    if (!passesRegion(r.tournament_id)) continue;
    if (!passesDate(tourn?.date ?? null)) continue;

    // Drop non-participation rows (no-shows / byes / withdrawals): no points
    // *and* no performance value. Excluded everywhere — history list, counts
    // and averages — since the appearance is never recorded.
    const pointsVal = num(r.points);
    const perfVal = num(r.performance_rating);
    if ((pointsVal === null || pointsVal === 0) && perfVal === null) continue;

    // Identity precedence + confidence gate.
    const ms = num(r.match_score);
    const confident = ms !== null && ms >= minConfidence;
    const uno = confident && r.unique_no !== null ? String(r.unique_no) : null;
    const fid = confident && r.fide_id !== null ? String(r.fide_id) : null;
    const rsId = confident ? r.rs_player_id : null;

    let key: string;
    let identityKind: IdentityKind;
    if (uno) { key = `uno:${uno}`; identityKind = 'unique_no'; }
    else if (fid) { key = `fide:${fid}`; identityKind = 'fide_id'; }
    else if (rsId) { key = `rs:${rsId}`; identityKind = 'fuzzy-match'; }
    else { key = `name:${r.name_sorted ?? r.name.toLowerCase()}`; identityKind = 'name'; }

    let p = players.get(key);
    if (!p) {
      p = {
        key,
        identityKind,
        nameCounts: new Map(),
        title: confident ? r.title : null,
        sex: confident ? r.sex : null,
        federation: r.federation,
        federations: new Set<string>(),
        uniqueNo: uno,
        fideId: fid,
        fideRating: confident ? num(r.fide_rating) : null,
        currentRating: confident ? num(r.current_rating) : null,
        birthYear: confident ? num(r.birth_year) : null,
        appearances: [],
      };
      players.set(key, p);
    }

    p.nameCounts.set(r.name, (p.nameCounts.get(r.name) ?? 0) + 1);
    for (const c of rowFeds) if (c.length >= 2) p.federations.add(c);
    p.federation ??= r.federation;
    p.uniqueNo ??= uno;
    p.fideId ??= fid;
    if (confident) {
      p.title ??= r.title;
      p.sex ??= r.sex;
      p.fideRating ??= num(r.fide_rating);
      p.currentRating ??= num(r.current_rating);
      p.birthYear ??= num(r.birth_year);
    }

    const reg = regions[r.tournament_id];
    const perf = perfVal;
    const seed = num(r.tournament_rating);
    p.appearances.push({
      tournamentId: r.tournament_id,
      tournamentName: tourn?.tournament_name ?? '(unknown tournament)',
      date: tourn?.date ?? null,
      province: reg?.province ?? null,
      district: reg?.district ?? null,
      type: classifyTournament(tourn?.tournament_name),
      rank: num(r.rank),
      points: pointsVal,
      seed,
      perf,
      gap: perf !== null && seed !== null ? perf - seed : null,
      matchScore: num(r.match_score),
    });
  }

  // Aggregate + player-level filters.
  const ranked: RankedPlayer[] = [];
  for (const p of players.values()) {
    const perfs = p.appearances.map((a) => a.perf).filter((v): v is number => v !== null);
    if (perfs.length < minTournaments) continue;

    // Player-level filters (need trusted registry data).
    if (filters.bornAfter != null && !(p.birthYear !== null && p.birthYear >= filters.bornAfter)) continue;
    if (filters.bornBefore != null && !(p.birthYear !== null && p.birthYear <= filters.bornBefore)) continue;
    if (filters.sex && (p.sex ?? '').toUpperCase() !== filters.sex) continue;

    let name = '';
    let bestN = -1;
    for (const [n, c] of p.nameCounts) if (c > bestN) { name = n; bestN = c; }

    const pts = p.appearances.map((a) => a.points).filter((v): v is number => v !== null);
    const matches = p.appearances.map((a) => a.matchScore).filter((v): v is number => v !== null);
    const gaps = p.appearances.map((a) => a.gap).filter((v): v is number => v !== null);
    const avgGap = mean(gaps);

    // Tournament rating = the seed rating from the player's EARLIEST tournament
    // (first instance), not an average across tournaments.
    const firstSeed =
      p.appearances
        .filter((a) => a.seed !== null)
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))[0]?.seed ?? null;

    const federations = [...p.federations].sort();
    const federation = pickFederation(federations) ?? p.federation;

    // CDC selection counts — only the counted (junior/open) appearances.
    const counted = p.appearances.filter((a) => a.type !== 'other');
    const juniorTournaments = counted.filter((a) => a.type === 'junior').length;
    const openTournaments = counted.filter((a) => a.type === 'open').length;
    const capricornTournaments = counted.filter((a) => a.district === 'Capricorn').length;
    const hasCapricornOpen = counted.some((a) => a.type === 'open' && a.district === 'Capricorn');
    // Location-based participation across ALL appearances (any tournament type).
    const playedCapricorn = p.appearances.some((a) => a.district === 'Capricorn');
    const playedLimpopo = p.appearances.some((a) => a.province === 'Limpopo');
    const wins = p.appearances.filter((a) => a.rank === 1).length;

    ranked.push({
      key: p.key,
      identityKind: p.identityKind,
      name,
      title: p.title,
      sex: p.sex,
      federation,
      federations,
      uniqueNo: p.uniqueNo,
      fideId: p.fideId,
      fideRating: p.fideRating,
      currentRating: p.currentRating,
      birthYear: p.birthYear,
      avgPerf: Math.round(mean(perfs)!),
      bestPerf: Math.max(...perfs),
      worstPerf: Math.min(...perfs),
      ratedTournaments: perfs.length,
      totalAppearances: p.appearances.length,
      wins,
      tournamentRating: firstSeed === null ? null : Math.round(firstSeed),
      avgGap: avgGap === null ? null : Math.round(avgGap),
      avgPoints: mean(pts),
      avgMatch: mean(matches),
      juniorTournaments,
      openTournaments,
      capricornTournaments,
      hasCapricornOpen,
      playedCapricorn,
      playedLimpopo,
      appearances: [...p.appearances].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    });
  }

  ranked.sort((a, b) => b.avgPerf - a.avgPerf || b.ratedTournaments - a.ratedTournaments);
  return ranked.slice(0, limit);
}
