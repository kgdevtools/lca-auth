# Session Notes — for next-session context

Kept in the project root (not in the harness's machine-level memory folder) by request.

---

## 2026-05-29 — tie_breaks, performance ranking, region resolving

### What was built / changed

1. **`tie_breaks` + `performance_rating` added to `rs_local_active_players`**
   (`src/migrations/002_local_active_players_view.sql`):
   - View now selects raw `sp.tie_breaks` (jsonb) and a derived
     `performance_rating` column via `detect_performance_rating(tie_breaks)`.
   - Heuristic: among numeric tie-break values, keep those in `[100, 3500]`, take
     the **largest** (point-based tie-breaks like Buchholz stay < 100), else NULL.
     `TB#` keys are positional/unstable — never read a fixed key.
   - Migration is **rebuild-safe**: `DROP MATERIALIZED VIEW IF EXISTS` before
     `CREATE`. Re-run by pasting into the Supabase SQL editor.
   - New test queries (#19–#25) in `src/scripts/seed/test-local-active-players.sql`
     (perf detection audit, tie-break coverage, single player by name/`unique_no`,
     tournament-by-federation).

2. **`rank-by-performance.ts`** (new, `npm run rank-by-performance`) — ranks
   players by average performance rating with per-tournament breakdowns. Filters:
   `--limit --min-tournaments --min-confidence --federation --born-after
   --born-before --sex --province --district --region-min-confidence --year
   --period --no-details`. See `SCRIPTS.md` for the full table.

3. **Tournament region resolver** (new):
   - `src/data/sa-region-gazetteer.json` — `Province → districts → {cities, areas,
     venues}`, all 9 provinces; Limpopo's 5 districts most complete.
   - `src/utils/region-match.ts` — `resolveRegion()`, gazetteer-first
     (exact → fuzzy → organizer/name fallback).
   - `src/scripts/seed/resolve-tournament-regions.ts`
     (`npm run resolve-tournament-regions`) — writes `tournament-regions.json`
     + `unmatched-regions.json`.

### Key decisions / conventions (non-obvious)

- **Two different name scorers, different scales — do not compare thresholds
  across them.** The view's `match_score` is PostgreSQL `pg_trgm`
  `greatest(similarity, word_similarity)` (view keeps ≥ 0.4). The Node side
  (`src/utils/name-match.ts`, used for `is_inactive`) is a `natural`-library
  composite (Jaccard + Jaro-Winkler + initials), thresholds 0.72 / 0.88. A 0.6 on
  pg_trgm ≠ 0.6 on the Node scorer. `rank-by-performance` filters the **stored
  pg_trgm `match_score`**, so its `--min-confidence` is on the pg_trgm scale.
- **`--min-confidence` (default 0.6)**: appearances below this have their registry
  identity discarded and group by name — so one person can split into an
  identity group + a name group at the borderline. This is intended.
- **`--period=YYYY` = chess season Oct YYYY → Sep YYYY+1** (labelled by START
  year, mirroring `getSourceTournaments(fromDate='2024-10-01')` in
  `src/db/tournaments.ts`). `--year` is plain calendar Jan–Dec. CONFIRM with user
  whether seasons should be labelled by end year instead (one-line change in
  `passesDate`).
- **Region resolver fuzzy matching excludes province *names*** (fixed the
  "Northern Academy" → "Northern Cape" Jaro-Winkler false positive). Gazetteer
  entries are normalised via `normaliseName()` at load, so casing/punctuation in
  the JSON is tolerated.
- Region/date/federation filters scope at the **appearance** level; birth-year/sex
  filters need a confident registry match (else player excluded).

### Open follow-ups

- Resolve remaining `unmatched-regions.json` rows by extending the gazetteer.
- Optional: persist region resolution to a DB table (`rs_tournament_regions`) so
  the view's SQL test queries can filter by district too (currently region lives
  only in `tournament-regions.json` consumed by the Node script).
- Possibly bump the view's own `match_score >= 0.4` threshold if other consumers
  want stricter matching (separate decision — affects all view consumers).
