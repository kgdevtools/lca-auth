# Web App Rankings — LLM Prompt & Integration Guide

How to build a **read-only** "Player Rankings" page (call it something appropriate) in your existing **Next.js
(App Router)** web app that displays this project's rankings (from the
`rs_local_active_players` materialized view) with filters and a collapsible
per-player tournament breakdown. Styling: **Tailwind + shadcn/ui**. Full feature
set (all filters, named tournaments, province/district).

---

## 1. Access model (recap)

- The web app talks to **two separate Supabase projects** via **two clients** — its
  existing one, plus a dedicated read-only client for this ratings project.
- Use **distinct env var names** and the **anon key** (never the service key, which
  bypasses security and must never reach the browser).
- On the ratings DB, expose the objects to the anon role once:
  ```sql
  GRANT SELECT ON public.rs_local_active_players, public.sd_tournaments TO anon;
  ```

---

## 2. Files to attach to the LLM's context

| File | Why it's needed |
|---|---|
| `src/scripts/rank-by-performance.ts` | **The authoritative spec.** Grouping precedence, confidence gating, averaging, every filter, and the display layout live here — the LLM should port this logic 1:1. |
| `src/migrations/002_local_active_players_view.sql` | The view's exact column list + what `performance_rating` means (so the LLM selects the right columns). |
| `SCRIPTS.md` | The filter reference table in plain English. |
| `tournament-regions.json` | The actual region mapping **data** — the web app must bundle this (see caveats). |
| `SESSION_NOTES.md` | The non-obvious rules (dual scorers, `--min-confidence` split, `--period` = start year) so the LLM doesn't misread them. |

**Caveats to pass along with the files:**

1. `tournament-regions.json` lives in *this* project, not the web app. Copy it into
   the web app (e.g. `lib/tournament-regions.json`). It goes stale when tournaments
   are added — re-run `npm run resolve-tournament-regions` here and re-copy. (Cleaner
   long-term: store it as a `rs_tournament_regions` table so the app reads it via
   Supabase like everything else.)
2. Run the `GRANT SELECT` above on the ratings DB so the anon key can read both
   objects.

---

## 3. The prompt (copy-paste into the web app's LLM)

```
GOAL
Build a READ-ONLY "Player Rankings" page in our existing Next.js App Router app.
It displays chess players ranked by average performance rating, with filters and a
collapsible per-player tournament breakdown. All data comes from a SEPARATE,
read-only Supabase project. NEVER write to any database. Use the anon key only —
never the service key.

ATTACHED REFERENCE FILES
- rank-by-performance.ts  ← THE SPEC. Port its grouping/aggregation/filter/display
  logic exactly. Everything below summarises it; if anything conflicts, this file wins.
- 002_local_active_players_view.sql ← the view's columns + performance_rating meaning.
- SCRIPTS.md ← plain-English filter reference.
- tournament-regions.json ← region mapping data (bundle into the app).
- SESSION_NOTES.md ← non-obvious conventions; read before coding.

SETUP
- Add env vars (browser-readable, anon key — NOT service):
    NEXT_PUBLIC_RATINGS_SUPABASE_URL
    NEXT_PUBLIC_RATINGS_SUPABASE_ANON_KEY
- Create lib/ratingsClient.ts: a dedicated @supabase/supabase-js client for the
  ratings project, separate from any existing client in this app.
- Copy tournament-regions.json into lib/ and import it as a static JSON module.

DATA SOURCES (ratings project, read-only)
1. View `rs_local_active_players` — ONE ROW PER TOURNAMENT APPEARANCE. Select:
   tournament_id, rank, name, name_sorted, federation, tournament_rating, points,
   performance_rating, match_score, rs_player_id, unique_no, fide_id, title, sex,
   fide_rating, current_rating, birth_year.
   PostgREST caps responses at 1000 rows — paginate with .range() until exhausted.
2. Table `sd_tournaments` — select id, tournament_name, date. Join in memory by
   tournament_id to get each appearance's tournament NAME and DATE.
3. tournament-regions.json — map tournament_id -> { province, district, confidence }.

AGGREGATION (port from rank-by-performance.ts)
- Identity grouping precedence per appearance row:
    unique_no -> fide_id -> rs_player_id -> name_sorted (order-invariant name).
- Confidence gate: match_score is on the pg_trgm scale. If match_score < minConfidence
  (default 0.6) OR null, treat the registry match as WRONG: ignore unique_no/fide_id/
  rs_player_id and registry details (title/sex/fide_rating/current_rating/birth_year)
  for that row, and group it by name. (A person can legitimately split into an
  identity group + a name group at the borderline — that is expected.)
- Per player, compute: avgPerf (mean of non-null performance_rating, rounded),
  bestPerf (max), worstPerf (min), ratedTournaments (count with perf), totalAppearances,
  avgSeed, avgGap (mean of perf-seed where both present), avgPoints, avgMatch.
  Carry: name (most frequent spelling), title, sex, federation, uniqueNo, fideId,
  fideRating, currentRating, birthYear, and how it was grouped (identityKind:
  unique_no | fide_id | fuzzy-match | name).
- Attach to each appearance: tournamentName, date (from sd_tournaments), and
  province/district (from the regions json).
- Sort players by avgPerf desc, then ratedTournaments desc. Apply `limit`.

FILTERS (all combine with AND)
Appearance-level (scope the player's tournaments, recomputing averages; players with
no qualifying tournament drop out):
- federation: string[] (player federation, e.g. RSA, LCP)  — note this is on the
  appearance rows, so filter the source rows by federation IN [...].
- province: string[]  (from regions json)
- district: string[]  (from regions json)
- year: number (calendar Jan–Dec of the tournament date)
- period: number — chess SEASON labelled by START year: 1 Oct YEAR -> 30 Sep YEAR+1.
  Implement as date >= Oct 1 of YEAR and date < Oct 1 of YEAR+1. Dates may be
  "YYYY-MM-DD" or "YYYY/MM/DD"; parse both. Null/unparseable date = excluded when a
  date filter is active.
Player-level (need a confident registry match; players without one drop out when active):
- minTournaments: number (default 1) — require >= N rated tournaments.
- minConfidence: number (default 0.6).
- bornAfter: number (birth_year >= it; juniors), bornBefore: number (birth_year <= it; seniors).
- sex: "M" | "F".
- limit: number (default 50).

UI (Tailwind + shadcn/ui)
- Filter bar at top using shadcn components: multi-select (federation, province,
  district), Select (sex), and Input(type=number) for minTournaments, minConfidence,
  bornAfter, bornBefore, year, period, limit. Filtering must be instant (client-side).
- Below it, a ranked list of shadcn <Card>s, one per player, in order:
  Line 1: "#<rank>" (muted), name (bold), title as a <Badge> if present, federation (muted).
  Line 2 (the headline): "avg perf <n>" rendered in AMBER and bold so it stands out;
          then "best <n>" (green), "low <n>", "<rated> rated / <played> played".
  Line 3 (context): seed avg, "Δseed avg <signed>" (green if +, red if -), pts avg,
          "match <0.00>", fide <n>, cur <n>, sex, "born <year> (~<age>y)" — omit any that are null.
  Line 4 (identity): "uno <n>", "fide <n>", "grouped by <identityKind>" (muted).
  COLLAPSIBLE tournament breakdown (shadcn <Collapsible>, COLLAPSED BY DEFAULT, with a
  toggle like "Show N tournaments"): a <Table> sorted newest-first with columns:
  Date | Tournament | Region (district, else province) | Rank | Pts | Seed | Perf |
  ±Seed (signed, green/red) | Conf. Show "n/a"/"—" for missing values.
- Loading, empty ("no players match"), and error states. Fully typed (TypeScript).

DELIVERABLES
lib/ratingsClient.ts, lib/tournament-regions.json (import), a server component
page (app/rankings/page.tsx) that fetches the three sources once, and a client
component that does grouping + filtering + rendering in memory (data volume is a few
thousand rows, so client-side aggregation is fine; if it grows, move aggregation to a
route handler). A shared aggregation util + types module shared with the spec's logic.

CONSTRAINTS
- READ-ONLY, anon key only, never expose the service key.
- Do not invent columns; use exactly the view columns listed above.
- The pg_trgm match_score and the Node name-matcher are DIFFERENT scales — only the
  view's match_score is relevant here; do not re-score names.
```
