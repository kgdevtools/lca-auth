# Player Rankings (v1) — Build Progress

A **new, read-only** `/player-rankings` page that ranks players by **average
performance rating**, reading from a **separate ratings Supabase project**. It is
independent of the existing `/rankings` page (different data source, different
purpose) — **the existing `/rankings` is untouched.**

Source spec + reference ports live in `rankings-prompt/` (read those for the full
rationale). This doc tracks what we decided and what's done.

---

## Decisions (locked)

1. **Route:** `/player-rankings` (new; coexists with `/rankings`).
2. **Data source:** a **separate** ratings Supabase project (not this app's DB).
   Read-only, **anon key only**, via a dedicated client (`src/lib/ratingsClient.ts`).
   - Env vars (in `.env`): `NEXT_PUBLIC_RATINGS_SUPABASE_URL`,
     `NEXT_PUBLIC_RATINGS_SUPABASE_ANON_KEY`.
   - DB grant (run once in the **ratings** project SQL editor):
     `GRANT SELECT ON public.rs_local_active_players, public.sd_tournaments TO anon;`
3. **Aggregation:** client-side via `rankPlayers()` (follow the prompt). If load
   perf is bad, move aggregation server-side (route handler / server component).
   *This is the deliberate fallback — noted, not yet needed.*
4. **Region data (province/district):** **bundled** static JSON
   (`src/lib/tournament-regions.json`, 189 tournaments). Goes stale when new
   tournaments are added to the ratings DB — re-run `npm run resolve-tournament-regions`
   in the ratings project and re-copy the file. (Long-term option: move to a
   `rs_tournament_regions` table.)
5. **Filters:** ALL of them in v1 (federation, province, district, sex,
   born-after, born-before, year, period, minTournaments, minConfidence, limit).
   Tweak after we have a running demo.
6. **Styling:** match the `/academy` look (palette + components), amber avgPerf
   accent, mobile-responsive. Done LAST (Phase 5).

## Data model (ratings DB)

- View `rs_local_active_players` — ONE ROW PER TOURNAMENT APPEARANCE. PostgREST
  caps at 1000 rows → paginate with `.range()`.
- Table `sd_tournaments` (id, tournament_name, date) — joined in memory by
  `tournament_id` for each appearance's name + date.
- `tournament-regions.json` — `tournament_id -> { province, district, confidence }`.

Identity grouping precedence per appearance: `unique_no -> fide_id -> rs_player_id
-> name_sorted`. Confidence gate: `match_score < 0.6` (pg_trgm scale) ⇒ discard the
registry match and group by name. A person can legitimately split into an identity
group + a name group at the borderline (expected).

## Phases

- [x] **Phase 0 — Data layer**
  - `src/lib/tournament-regions.json` (bundled)
  - `src/lib/rankings.ts` (pure `rankPlayers()` + types; port of the spec)
- [x] **Phase 1 — Client wiring**
  - `src/lib/ratingsClient.ts` (read-only client + paginated `fetchRankingData()`)
  - `.env` updated (user), GRANT run (user)
- [x] **Phase 2 — Running demo** (code complete; pending user verification it renders)
  - `src/app/player-rankings/page.tsx` (server: `fetchRankingData()` + `revalidate=3600`)
  - `src/app/player-rankings/RankingsView.tsx` (client: minimal ranked list,
    `#rank · name · amber avgPerf`, default filters `{minTournaments:1, limit:50}`)
- [x] **Phase 3 — Filters** (all of them, plain controls — `FilterBar.tsx`)
- [x] **Phase 4 — Table view** (full per-player summary table in `RankingsView.tsx`:
  # · Name · Title · Fed · Sex · Born · Avg Perf · Best · Low · Rated · Played ·
  Seed Avg · ΔSeed · Pts Avg · Match · FIDE · Cur. Replaced the earlier ranked
  list + inline `PlayerDetail` expand, which was deleted.)
- [ ] **Phase 5 — Styling** (match `/academy`)

## Constraints

- READ-ONLY, anon key only, never the service key.
- No builds / dev servers — `tsc --noEmit` only after edits.
- Small, phased changes; no massive single-file rewrites.
- Existing `/rankings` and `/junior-rankings` are NOT touched.

## Files (this app)

| File | Status | Purpose |
|---|---|---|
| `src/lib/tournament-regions.json` | done | bundled region map |
| `src/lib/rankings.ts` | done | pure aggregation + types |
| `src/lib/ratingsClient.ts` | done | read-only ratings client + `fetchRankingData()` |
| `src/app/player-rankings/page.tsx` | todo | server fetch |
| `src/app/player-rankings/RankingsView.tsx` | todo | client view |
