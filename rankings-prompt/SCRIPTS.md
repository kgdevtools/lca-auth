# Scripts Reference

Runnable scripts in this project, with what they do and how to invoke them. Run
via the `npm run <name>` shortcuts (defined in `package.json`) or directly with
`npx tsx <path>`.

---

## Analytics & Reporting

### `rank-by-performance` — `src/scripts/rank-by-performance.ts`

Ranks players by their **average performance rating** across tournaments, reading
the `rs_local_active_players` materialized view. Performance rating per appearance
comes from the view's `performance_rating` column (heuristically detected from
`tie_breaks`). Prints a ranked list with a tournament-by-tournament breakdown
(date, tournament, region, rank, points, seed, perf, ±seed gap, match confidence).
The headline **avg perf** metric is rendered in amber.

**Identity grouping** (precedence): `unique_no` → `fide_id` → `rs_player_id`
(the view's fuzzy match) → order-invariant name. A match with `match_score` below
`--min-confidence` is treated as a wrong link: its registry identity/details are
discarded and the appearance groups by name instead (so a player can split into an
identity group + a name group at the borderline).

**Filters** (all stack; AND logic):

| Flag | Effect |
|---|---|
| `--limit=N` | Top N players (default 50) |
| `--min-tournaments=N` | Require ≥N rated tournaments (default 1) |
| `--min-confidence=N` | Match-confidence floor; below = treated as unmatched (default 0.6) |
| `--federation=RSA,LCP,…` | Player federation(s) — SQL `IN` filter |
| `--born-after=YYYY` | Juniors: `birth_year >= YYYY` (inclusive) |
| `--born-before=YYYY` | Seniors: `birth_year <= YYYY` (inclusive) |
| `--sex=M` / `--sex=F` | Registry sex |
| `--province=Limpopo,…` | Tournament province (needs `tournament-regions.json`) |
| `--district=Capricorn,…` | Tournament district (needs `tournament-regions.json`) |
| `--region-min-confidence=N` | Min region-resolution confidence to count (default 0) |
| `--year=YYYY` | Calendar year (Jan–Dec) of the tournament |
| `--period=YYYY` | Chess season, 1 Oct YYYY → 30 Sep YYYY+1 (labelled by start year) |
| `--no-details` | Ranking lines only, no per-tournament tables |

Birth-year/sex filters rely on **confidently-matched** registry data, so
players without a trusted match drop out while those filters are active. Region
and date filters apply at the **appearance level**, so averages/counts are scoped
and players with no qualifying tournament drop out.

```bash
npm run rank-by-performance -- --district=Capricorn --born-after=2008 --sex=M
npm run rank-by-performance -- --province=Limpopo --period=2024 --min-tournaments=3
```

### `resolve-tournament-regions` — `src/scripts/seed/resolve-tournament-regions.ts`

Resolves every `sd_tournaments` row to a South African **district** (and its
province) using the gazetteer resolver, prints an audit (counts by district, by
method, and a distinct location→district table to eyeball), and writes:

- **`tournament-regions.json`** — `{ tournament_id → { province, district, confidence, method, matchedOn } }`, consumed by `rank-by-performance --district/--province`.
- **`unmatched-regions.json`** — rows with no / low-confidence region (review queue).

When a location is missed, add the place/typo/venue to the gazetteer and re-run
(same human-in-the-loop pattern as `fide-manual-links.json`).

```bash
npm run resolve-tournament-regions
npm run resolve-tournament-regions -- --min-confidence=0.9   # review threshold
```

Supporting pieces:
- **`src/utils/region-match.ts`** — `resolveRegion({location, organizer, tournamentName})`. Gazetteer-first: exact token/phrase match → Jaro-Winkler fuzzy fallback (province *names* excluded from fuzzy to avoid e.g. "Northern Academy" → "Northern Cape") → organizer/name fallback. Returns `{province, district, confidence, method, matchedOn}`.
- **`src/data/sa-region-gazetteer.json`** — `Province → { province_aliases, districts: { District → {cities, areas, venues} } }`. All values normalised at load via `normaliseName()`, so casing/punctuation in entries is fine. Limpopo's 5 districts are the most complete; extend as needed.

---

## Pipeline / Data Maintenance

### `sync-active-players` — `src/scripts/sync-active-players.ts`

Full re-sync: recomputes `rs_players.is_inactive` from `sd_players` (complete
fuzzy rescan) then refreshes `rs_local_active_players`. Run after any change that
touches `rs_players` directly (FIDE links, manual edits, deletes). See
`PIPELINE_REFERENCE.md` for when this is needed vs. the automatic triggers.
Flags: `--dry-run`, `--min-score=0.65`.

### `build-registry` — `src/scripts/build-registry.ts`

Upserts all `rs_players` from `sd_chess_sa_std` (initial registry build).

### `migrate` — `src/scripts/migrate.ts`

Migration runner for `src/migrations/*.sql` (schema is normally applied by pasting
into the Supabase SQL editor; see `PIPELINE_REFERENCE.md`).

---

## Seed / FIDE Linking (`src/scripts/seed/`)

| Script | Purpose |
|---|---|
| `import-fide-list.ts` | Upsert `sd_fide_list` from a FIDE rating-list file |
| `link-fide-players.ts` | Fuzzy-link FIDE RSA records → `rs_players`, auto-apply confident matches |
| `apply-manual-links.ts` | Apply reviewed overrides from `fide-manual-links.json` |
| `mark-active-players.ts` | Full `is_inactive` rescan (no view refresh) |
| `review-unmatched.ts` | Inspect unlinked FIDE records |

---

## Not Yet Built (referenced in `package.json` / `PLAN.md`)

`ingest-games.ts`, `process-period.ts`, `run-all-periods.ts`, `inspect-player.ts`,
`check-qualification.ts` — see `PLAN.md`.

---

## Generated / Working Files (repo root)

| File | Produced by | Contents |
|---|---|---|
| `tournament-regions.json` | `resolve-tournament-regions` | tournament_id → resolved district/province |
| `unmatched-regions.json` | `resolve-tournament-regions` | tournaments needing region review |
| `fide-manual-links.json` | hand-curated | reviewed FIDE → rs_players overrides |
| `unmatched-sd.json` / `unmatched-fide.json` | mark-active / link-fide | review queues |
