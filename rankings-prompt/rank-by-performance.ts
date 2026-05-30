/**
 * Ranks players by their AVERAGE performance rating across all tournaments,
 * reading from the rs_local_active_players materialized view.
 *
 * Performance rating per appearance comes from the view's performance_rating
 * column (heuristically detected from tie_breaks). A player's score is the mean
 * of that value over every tournament where it was detected. Each player's
 * tournament-by-tournament breakdown is printed beneath their ranking line.
 *
 * Players are identified by rs_player_id when matched to the registry; local-only
 * players (no rs match) are grouped by their order-invariant name so spelling /
 * word-order variants of the same person collapse into one entry.
 *
 * Usage:
 *   npx tsx src/scripts/rank-by-performance.ts
 *   npx tsx src/scripts/rank-by-performance.ts --limit=20
 *   npx tsx src/scripts/rank-by-performance.ts --min-tournaments=3
 *   npx tsx src/scripts/rank-by-performance.ts --federation=RSA,LCP,LMG,LSG,LVT,CSA
 *   npx tsx src/scripts/rank-by-performance.ts --min-confidence=0.7
 *   npx tsx src/scripts/rank-by-performance.ts --born-after=2005    (juniors)
 *   npx tsx src/scripts/rank-by-performance.ts --born-before=1985   (seniors)
 *   npx tsx src/scripts/rank-by-performance.ts --sex=F
 *   npx tsx src/scripts/rank-by-performance.ts --district=Capricorn,Waterberg
 *   npx tsx src/scripts/rank-by-performance.ts --province=Limpopo
 *   npx tsx src/scripts/rank-by-performance.ts --year=2025         (calendar year)
 *   npx tsx src/scripts/rank-by-performance.ts --period=2024       (season Oct 2024–Sep 2025)
 *   npx tsx src/scripts/rank-by-performance.ts --no-details   (ranking lines only)
 *
 * Matches below --min-confidence (default 0.6) are treated as a wrong match —
 * the registry identity is discarded and the appearance is grouped by name.
 *
 * --born-after / --born-before / --sex filter on registry data (birth_year, sex),
 * which only exists for confidently matched players — anyone without a trusted
 * match is excluded while those filters are active. Bounds are inclusive.
 *
 * --district / --province filter on the tournament's resolved region, read from
 * tournament-regions.json (run `npm run resolve-tournament-regions` first). They
 * restrict each player's APPEARANCES to that region, so averages and counts are
 * region-scoped and players with no qualifying tournament drop out.
 *
 * --year is a calendar year (Jan–Dec). --period is a chess season that runs
 * 1 Oct → 30 Sep, labelled by its START year: --period=2024 = 2024-10-01 →
 * 2025-09-30. Both filter appearances by the tournament date the same way the
 * region filters do.
 */
import { readFileSync, existsSync } from 'node:fs';
import { supabase, fetchAllPages } from '../db/client.js';
import { parseDateString } from '../utils/date.js';
import { phaseHeader, info, warn, summary } from '../utils/logger.js';

// ── CLI args ──────────────────────────────────────────────────────────────────

const argNum = (name: string, fallback: number): number => {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  const n = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(n) ? n : fallback;
};
const argStr = (name: string): string | undefined =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

const LIMIT           = argNum('limit', 50);
const MIN_TOURNAMENTS = argNum('min-tournaments', 1);
const MIN_CONFIDENCE  = argNum('min-confidence', 0.6);
const FEDERATIONS     = [...new Set(
  (argStr('federation') ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
)];
const BORN_AFTER      = argNum('born-after', NaN);   // juniors:  birth_year >= this
const BORN_BEFORE     = argNum('born-before', NaN);  // seniors:  birth_year <= this
const SEX             = argStr('sex')?.trim().toUpperCase() || null;
const csvLower = (name: string) =>
  [...new Set((argStr(name) ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))];
const DISTRICTS       = csvLower('district');
const PROVINCES       = csvLower('province');
const REGION_MIN_CONFIDENCE = argNum('region-min-confidence', 0);
const REGION_FILTER_ACTIVE  = DISTRICTS.length > 0 || PROVINCES.length > 0;
const YEAR            = argNum('year', NaN);    // calendar year (Jan–Dec)
const PERIOD          = argNum('period', NaN);  // chess season start year (Oct PERIOD → Sep PERIOD+1)
const SHOW_DETAILS    = !process.argv.includes('--no-details');

/** True if a tournament date passes the active --year / --period filters. */
function passesDate(dateStr: string | null): boolean {
  if (!Number.isFinite(YEAR) && !Number.isFinite(PERIOD)) return true;
  const d = parseDateString(dateStr);
  if (!d) return false; // unparseable/null date can't satisfy a date filter
  if (Number.isFinite(YEAR) && d.getUTCFullYear() !== YEAR) return false;
  if (Number.isFinite(PERIOD)) {
    const t = d.getTime();
    // Season: 1 Oct PERIOD (inclusive) → 1 Oct PERIOD+1 (exclusive) = through 30 Sep.
    if (t < Date.UTC(PERIOD, 9, 1) || t >= Date.UTC(PERIOD + 1, 9, 1)) return false;
  }
  return true;
}

// ── Styling (ANSI, gracefully degrades when not a TTY) ────────────────────────

const tty = process.stdout.isTTY;
const sgr = (code: string) => (s: string | number) => (tty ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const style = {
  bold:  sgr('1'),
  dim:   sgr('2'),
  cyan:  sgr('36'),
  green: sgr('32'),
  red:   sgr('31'),
  yellow:sgr('33'),
  amber: sgr('93'),  // bright yellow/amber — for the headline avg-perf metric
};

// How wide the Tournament column may grow before truncating (was cropping names).
const TOURNAMENT_COL_WIDTH = 52;

/** Colour a signed delta: green for positive, red for negative. */
const signed = (n: number): string => {
  const s = `${n > 0 ? '+' : ''}${n}`;
  return n > 0 ? style.green(s) : n < 0 ? style.red(s) : style.dim(s);
};

const num = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const mean = (xs: number[]): number | null =>
  xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null;

const notNull = <T>(v: T | null): v is T => v !== null;

const dot = () => style.dim('·');
/** Join the non-empty parts with a dim middot separator. */
const joinParts = (parts: (string | null | false)[]): string =>
  parts.filter(Boolean).join(`  ${dot()}  `);

// ── Local aligned table that measures *visible* width (ANSI-aware) ────────────
// logger.table pads by raw .length, which colour codes inflate; this strips ANSI
// for width math so coloured cells still line up in a real terminal.
const ANSI = /\x1b\[[0-9;]*m/g;
const vlen = (s: string): number => s.replace(ANSI, '').length;
const padVis = (s: string, w: number): string => s + ' '.repeat(Math.max(0, w - vlen(s)));

function printTable(headers: string[], rows: string[][], indent = '    '): void {
  const widths = headers.map((h, i) =>
    Math.max(vlen(h), ...rows.map((r) => vlen(r[i] ?? ''))),
  );
  const line = (cols: string[]) =>
    indent + cols.map((c, i) => padVis(c, widths[i])).join('  ');
  console.log(style.dim(line(headers)));
  console.log(style.dim(indent + widths.map((w) => '-'.repeat(w)).join('  ')));
  for (const r of rows) console.log(line(r));
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ViewRow = {
  tournament_id: string;
  rank: number | null;
  name: string;
  name_sorted: string | null;
  federation: string | null;
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
};

type Tournament = { id: string; tournament_name: string | null; date: string | null };

type Appearance = {
  tournamentName: string;
  date: string | null;
  rank: number | null;
  points: number | null;
  seed: number | null;
  perf: number | null;
  matchScore: number | null;
  province: string | null;
  district: string | null;
};

// How a player's rows were grouped together (in priority order).
type IdentityKind = 'unique_no' | 'fide_id' | 'fuzzy-match' | 'name';

type Player = {
  key: string;
  identityKind: IdentityKind;
  name: string;
  nameCounts: Map<string, number>;
  federation: string | null;
  uniqueNo: string | null;
  fideId: string | null;
  title: string | null;
  sex: string | null;
  fideRating: number | null;
  currentRating: number | null;
  birthYear: number | null;
  appearances: Appearance[];
};

// ── Load data ─────────────────────────────────────────────────────────────────

phaseHeader('Rank Players by Average Performance Rating');
info(`Min tournaments : ${MIN_TOURNAMENTS}`);
info(`Min confidence  : ${MIN_CONFIDENCE}  (matches below this are treated as unmatched)`);
info(`Top N           : ${LIMIT}`);
if (FEDERATIONS.length) info(`Federations     : ${FEDERATIONS.join(', ')}`);
if (Number.isFinite(BORN_AFTER))  info(`Born in/after   : ${BORN_AFTER}  (juniors)`);
if (Number.isFinite(BORN_BEFORE)) info(`Born in/before  : ${BORN_BEFORE}  (seniors)`);
if (SEX) info(`Sex             : ${SEX}`);
if (PROVINCES.length) info(`Provinces       : ${PROVINCES.join(', ')}`);
if (DISTRICTS.length) info(`Districts       : ${DISTRICTS.join(', ')}`);
if (Number.isFinite(YEAR))   info(`Year            : ${YEAR}  (calendar Jan–Dec)`);
if (Number.isFinite(PERIOD)) info(`Period (season) : ${PERIOD}/${PERIOD + 1}  (${PERIOD}-10-01 → ${PERIOD + 1}-09-30)`);

// ── Tournament region map (for --district / --province) ───────────────────────

type RegionEntry = { province: string | null; district: string | null; confidence: number };
const REGION_FILE = 'tournament-regions.json';
const regionLoaded = existsSync(REGION_FILE);
const regionMap: Record<string, RegionEntry> = regionLoaded
  ? (JSON.parse(readFileSync(REGION_FILE, 'utf8')) as Record<string, RegionEntry>)
  : {};

if (REGION_FILTER_ACTIVE && !regionLoaded) {
  warn(`--district/--province needs ${REGION_FILE}. Run: npm run resolve-tournament-regions`);
  process.exit(1);
}

/** True if a tournament's resolved region passes the active province/district filter. */
function passesRegion(tournamentId: string): boolean {
  if (!REGION_FILTER_ACTIVE) return true;
  const e = regionMap[tournamentId];
  if (!e || e.confidence < REGION_MIN_CONFIDENCE) return false;
  if (PROVINCES.length && !PROVINCES.includes((e.province ?? '').toLowerCase())) return false;
  if (DISTRICTS.length && !DISTRICTS.includes((e.district ?? '').toLowerCase())) return false;
  return true;
}

info('\nLoading rs_local_active_players...');
const rows = (await fetchAllPages((from, to) => {
  let q = supabase
    .from('rs_local_active_players')
    .select(
      'tournament_id, rank, name, name_sorted, federation, tournament_rating, ' +
        'points, performance_rating, match_score, rs_player_id, unique_no, ' +
        'fide_id, title, sex, fide_rating, current_rating, birth_year',
    )
    .range(from, to);
  if (FEDERATIONS.length) q = q.in('federation', FEDERATIONS);
  return q;
})) as unknown as ViewRow[];
info(`View rows loaded : ${rows.length}`);

info('Loading sd_tournaments...');
const tournRows = (await fetchAllPages((from, to) =>
  supabase.from('sd_tournaments').select('id, tournament_name, date').range(from, to),
)) as unknown as Tournament[];
const tournById = new Map(tournRows.map((t) => [t.id, t]));
info(`Tournaments loaded : ${tournById.size}`);

// ── Group rows into players ───────────────────────────────────────────────────

const players = new Map<string, Player>();

for (const r of rows) {
  const tourn = tournById.get(r.tournament_id);

  // Region + date filters: restrict to qualifying appearances before grouping.
  if (!passesRegion(r.tournament_id)) continue;
  if (!passesDate(tourn?.date ?? null)) continue;

  // Identity precedence:
  //   1. unique_no  — the rs_players registry ID (most reliable)
  //   2. fide_id    — for foreign players with no unique_no
  //   3. rs_player_id — the view's fuzzy-match result (match_score based)
  //   4. name_sorted — order-invariant name, query-16 style, for the unmatched
  // A fuzzy match below MIN_CONFIDENCE is almost certainly a different person,
  // so the registry identity (and its details) are discarded for this row and
  // it groups by name instead.
  const ms = num(r.match_score);
  const confident = ms !== null && ms >= MIN_CONFIDENCE;
  const uno = confident && r.unique_no !== null ? String(r.unique_no) : null;
  const fid = confident && r.fide_id !== null ? String(r.fide_id) : null;
  const rsId = confident ? r.rs_player_id : null;

  let key: string;
  let identityKind: IdentityKind;
  if (uno)        { key = `uno:${uno}`;  identityKind = 'unique_no'; }
  else if (fid)   { key = `fide:${fid}`; identityKind = 'fide_id'; }
  else if (rsId)  { key = `rs:${rsId}`;  identityKind = 'fuzzy-match'; }
  else            { key = `name:${r.name_sorted ?? r.name.toLowerCase()}`; identityKind = 'name'; }

  let p = players.get(key);
  if (!p) {
    p = {
      key,
      identityKind,
      name: r.name,
      nameCounts: new Map(),
      federation: r.federation,
      uniqueNo: uno,
      fideId: fid,
      title: confident ? r.title : null,
      sex: confident ? r.sex : null,
      fideRating: confident ? num(r.fide_rating) : null,
      currentRating: confident ? num(r.current_rating) : null,
      birthYear: confident ? num(r.birth_year) : null,
      appearances: [],
    };
    players.set(key, p);
  }

  // Track the most frequently used display name for this player.
  p.nameCounts.set(r.name, (p.nameCounts.get(r.name) ?? 0) + 1);
  // Backfill from whichever row has them. Federation comes from the tournament
  // entry (sd_players) so it's valid regardless of match confidence; registry
  // details are only trusted on confident rows.
  p.federation    ??= r.federation;
  p.uniqueNo      ??= uno;
  p.fideId        ??= fid;
  if (confident) {
    p.title         ??= r.title;
    p.sex           ??= r.sex;
    p.fideRating    ??= num(r.fide_rating);
    p.currentRating ??= num(r.current_rating);
    p.birthYear     ??= num(r.birth_year);
  }

  const reg = regionMap[r.tournament_id];
  p.appearances.push({
    tournamentName: tourn?.tournament_name ?? '(unknown tournament)',
    date: tourn?.date ?? null,
    rank: num(r.rank),
    points: num(r.points),
    seed: num(r.tournament_rating),
    perf: num(r.performance_rating),
    matchScore: num(r.match_score),
    province: reg?.province ?? null,
    district: reg?.district ?? null,
  });
}

// Resolve each player's display name to their most-used spelling.
for (const p of players.values()) {
  let best = p.name;
  let bestN = -1;
  for (const [n, c] of p.nameCounts) if (c > bestN) { best = n; bestN = c; }
  p.name = best;
}

// ── Rank by average performance ───────────────────────────────────────────────

type Ranked = Player & {
  avgPerf: number;
  bestPerf: number;
  worstPerf: number;
  ratedTournaments: number;
  totalAppearances: number;
  avgSeed: number | null;
  avgGap: number | null;
  avgPoints: number | null;
  avgMatch: number | null;
};

const ranked: Ranked[] = [];
for (const p of players.values()) {
  const perfs = p.appearances.map((a) => a.perf).filter(notNull);
  if (perfs.length < MIN_TOURNAMENTS) continue;

  const seeds   = p.appearances.map((a) => a.seed).filter(notNull);
  const pts     = p.appearances.map((a) => a.points).filter(notNull);
  const matches = p.appearances.map((a) => a.matchScore).filter(notNull);
  const gaps    = p.appearances
    .filter((a) => a.perf !== null && a.seed !== null)
    .map((a) => a.perf! - a.seed!);

  const avgSeed = mean(seeds);
  const avgGap  = mean(gaps);
  ranked.push({
    ...p,
    avgPerf: Math.round(mean(perfs)!),
    bestPerf: Math.max(...perfs),
    worstPerf: Math.min(...perfs),
    ratedTournaments: perfs.length,
    totalAppearances: p.appearances.length,
    avgSeed: avgSeed === null ? null : Math.round(avgSeed),
    avgGap: avgGap === null ? null : Math.round(avgGap),
    avgPoints: mean(pts),
    avgMatch: mean(matches),
  });
}

// Registry-based filters (birth year / sex). These need trusted registry data,
// so players without a confident match (null birth_year / sex) drop out while
// the corresponding filter is active. Bounds are inclusive.
let pool = ranked;
if (Number.isFinite(BORN_AFTER))  pool = pool.filter((p) => p.birthYear !== null && p.birthYear >= BORN_AFTER);
if (Number.isFinite(BORN_BEFORE)) pool = pool.filter((p) => p.birthYear !== null && p.birthYear <= BORN_BEFORE);
if (SEX) pool = pool.filter((p) => (p.sex ?? '').toUpperCase() === SEX);

pool.sort((a, b) => b.avgPerf - a.avgPerf || b.ratedTournaments - a.ratedTournaments);

if (pool.length === 0) {
  warn(`No players met the criteria (min ${MIN_TOURNAMENTS} tournament(s) with a detected performance rating, plus any birth-year/sex filters).`);
  process.exit(0);
}

const top = pool.slice(0, LIMIT);

// ── Display ───────────────────────────────────────────────────────────────────

const filterTags = [
  FEDERATIONS.length ? `federations: ${FEDERATIONS.join(', ')}` : '',
  PROVINCES.length ? `provinces: ${PROVINCES.join(', ')}` : '',
  DISTRICTS.length ? `districts: ${DISTRICTS.join(', ')}` : '',
  Number.isFinite(YEAR) ? `year: ${YEAR}` : '',
  Number.isFinite(PERIOD) ? `season: ${PERIOD}/${PERIOD + 1}` : '',
].filter(Boolean).join(' · ');

console.log(`\n${'═'.repeat(78)}`);
console.log(`  ${style.bold('TOP ' + top.length + ' BY AVERAGE PERFORMANCE RATING')}` +
  (filterTags ? style.dim(`   (${filterTags})`) : ''));
console.log('═'.repeat(78));

const rankWidth = String(top.length).length;

top.forEach((p, i) => {
  const pos = `#${String(i + 1).padStart(rankWidth, ' ')}`;

  // Line 1 — rank, name, title, federation.
  console.log(
    `\n${style.cyan(pos)}  ${style.bold(p.name)}` +
      (p.title ? `  ${style.yellow(p.title)}` : '') +
      `  ${style.dim(p.federation ?? '—')}`,
  );

  // Line 2 — the ranking metric and tournament counts.
  console.log(
    '    ' +
      joinParts([
        `${style.bold(style.amber('avg perf ' + p.avgPerf))}`,
        `best ${style.green(p.bestPerf)}`,
        `low ${p.worstPerf}`,
        `${p.ratedTournaments} rated / ${p.totalAppearances} played`,
      ]),
  );

  // Line 3 — surrounding context (seed, gap, points, match confidence, registry ratings, age).
  const thisYear = new Date().getFullYear();
  console.log(
    '    ' +
      joinParts([
        p.avgSeed !== null && `seed avg ${p.avgSeed}`,
        p.avgGap !== null && `Δseed avg ${signed(p.avgGap)}`,
        p.avgPoints !== null && `pts avg ${p.avgPoints.toFixed(1)}`,
        p.avgMatch !== null && `match ${p.avgMatch.toFixed(2)}`,
        p.fideRating !== null && `fide ${p.fideRating}`,
        p.currentRating !== null && `cur ${p.currentRating}`,
        p.sex && `sex ${p.sex}`,
        p.birthYear !== null && `born ${p.birthYear} (~${thisYear - p.birthYear}y)`,
      ]) || style.dim('    (no registry details)'),
  );

  // Line 4 — identifiers and how this player's rows were grouped.
  console.log(
    '    ' +
      joinParts([
        p.uniqueNo && `uno ${p.uniqueNo}`,
        p.fideId && `fide ${p.fideId}`,
        style.dim(`grouped by ${p.identityKind}`),
      ]),
  );

  if (!SHOW_DETAILS) return;

  // Tournament breakdown, newest first. A Region column appears when the
  // tournament-regions.json mapping is available.
  const apps = [...p.appearances].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const rowsOut = apps.map((a) => {
    const gap = a.perf !== null && a.seed !== null ? a.perf - a.seed : null;
    const row = [
      a.date ?? '—',
      (a.tournamentName ?? '—').slice(0, TOURNAMENT_COL_WIDTH),
    ];
    if (regionLoaded) row.push(a.district ?? a.province ?? style.dim('—'));
    row.push(
      a.rank !== null ? String(a.rank) : '—',
      a.points !== null ? a.points.toFixed(1) : '—',
      a.seed !== null ? String(a.seed) : '—',
      a.perf !== null ? String(a.perf) : style.dim('n/a'),
      gap !== null ? signed(gap) : '—',
      a.matchScore !== null ? a.matchScore.toFixed(2) : style.dim('—'),
    );
    return row;
  });
  const headers = regionLoaded
    ? ['Date', 'Tournament', 'Region', 'Rank', 'Pts', 'Seed', 'Perf', '±Seed', 'Conf']
    : ['Date', 'Tournament', 'Rank', 'Pts', 'Seed', 'Perf', '±Seed', 'Conf'];
  printTable(headers, rowsOut);
});

summary(
  `Ranked ${pool.length} player(s) with ≥${MIN_TOURNAMENTS} rated tournament(s); ` +
    `showing top ${top.length}.`,
);
