# CDC Selection Integration — `/player-rankings`

Integrate Capricorn District Chess (CDC) Junior **and** Senior selection criteria into
the public `/player-rankings` page, plus column changes and filter fixes.

## Background / data model

- `/player-rankings` runs on the **ratings Supabase project** (`ratingsClient.ts`):
  `rs_local_active_players` + `sd_tournaments`, aggregated by `rankPlayers()` in
  `src/lib/rankings.ts`. Each `Appearance` already carries `province`/`district`
  resolved from the static `src/lib/tournament-regions.json` map.
- A full CDC qualification engine already exists in the **admin** module
  (`src/app/admin/admin-dashboard/tournament-selection/actions.ts`,
  `getJuniorPlayersWithStats`) on the app's own Supabase. We are **not** reusing it
  directly; we port its classification keywords into a shared, framework-agnostic
  module and compute on the rankings pipeline.

## Decisions (confirmed)

- **Classification source:** self-contained — junior/open by tournament-name
  keywords; **Capricorn = `district === 'Capricorn'`** from the regions map.
  (Since `sd_tournaments` and app `tournaments` share IDs, the curated
  `tournament_selection_meta` can be swapped in later by ID with minimal change.)
- **Cycle scope:** the new criteria columns are populated only when the **2025**
  period (Oct 2025 – Sep 2026) is selected; otherwise `—`.
- **"Open that counts" rating gate (≥1200/1400 top-seed avg):** skipped for now
  (matches current admin behaviour).
- **Senior = any non-junior player.**

## Criteria

- **Junior:** 6 counted tournaments total, **(4 JQ + 2 Open)** or **(3 JQ + 3 Open)**,
  and **≥1 Open played in Capricorn**.
- **Senior:** 6 counted tournaments total, **Just six tournaments, qualifies(must have participated not just entered).
- "Counted" tournament = classified `junior` or `open` (team/other excluded).

## Column changes (per notes)

Remove: Tournament Rating (`First` seed), FIDE, Chess SA.
Keep: `#`, Player, Performance (Avg / Best).
Change: `No. Tournaments` → **Junior / Open** counts.
Add: **Meets Criteria** (✓/✗ icon, green/red shading), **Comment** (status text).

---

## Phases

### Phase 1 — Classification + counts (server) — `DONE`
- New `src/lib/cdcSelection.ts`: `TournamentType`, `JUNIOR_KEYWORDS`,
  `classifyTournament(name)`, `juniorCriteria(counts)`, `seniorCriteria(counts)`.
- `src/lib/rankings.ts`:
  - `Appearance.type: TournamentType` (computed from tournament name).
  - `RankedPlayer`/`RankedSummary`: `juniorTournaments`, `openTournaments`,
    `capricornTournaments`, `hasCapricornOpen`.
  - Aggregate the counts in the per-player loop.
- `tsc --noEmit`.

### Phase 2 — Table UI rework — `DONE`
- `RankingsView.tsx` + `rankings.module.css`: remove the three columns (+ their
  `SortField`/`SortTh`/group headers); Junior/Open count sub-columns; Meets Criteria
  cell (green/red ✓/✗, only period 2025 + junior/senior category); Comment cell.
  meets/comment derived client-side via `cdcSelection.ts`.

### Phase 3 — Filters — `DONE`
- `FilterBar.tsx`: add `seniors` category option; add Qualified-only (QF) toggle.
- `RankingsView.tsx`: fix age-group to an exact 2-year band (no overlap) when an
  age group is selected; apply QF filter.
- Age bands (REF_YEAR 2026): U08 `[2018,2019]`, U10 `[2016,2017]`, U12 `[2014,2015]`,
  U14 `[2012,2013]`, U16 `[2010,2011]`, U18 `[2008,2009]`, U20 `[2006,2007]`.

### Phase 4
- `tsc --noEmit` after each phase. No builds / dev servers.
