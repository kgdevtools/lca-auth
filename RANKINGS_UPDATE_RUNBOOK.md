# Rankings Update Runbook — adding a new tournament

> How a finished tournament gets from an Excel upload all the way into `/player-rankings`.
> This is the **manual loop** as the system actually works today (the automated ETL in
> `.claude/plans/tournament-etl-pipeline-plan.md` is the future version of this).
> Drafted 2026-06-20.

---

## The mental model (read once)

There are **two separate Supabase projects**:

| | **Academy DB** (`NEXT_PUBLIC_SUPABASE_URL`) | **Ratings DB** (`NEXT_PUBLIC_RATINGS_SUPABASE_URL`) |
|---|---|---|
| Tables | `tournaments`, `players` (+ auth, lessons, gamification) | `sd_tournaments`, `sd_players`, `rs_players`, matview `rs_local_active_players` |
| Written by | Admin **Excel upload** (`src/repositories/tournamentRepo.ts`) | `~/Desktop/rating-system` repo / manual SQL |
| Read by `/player-rankings`? | **NO** | **YES — exclusively (read-only)** |

**Key fact:** `lca-auth` reads the Ratings DB read-only (`src/lib/ratingsClient.ts`) — zero writes, zero RPC.
So **uploading a tournament via the academy admin flow does NOT make it appear in the rankings.**
The rows must be copied into the Ratings DB's `sd_tournaments` / `sd_players`.

**The good news (no full pipeline re-run):** `rating-system/src/migrations/004_auto_refresh_triggers.sql`
puts a trigger on `sd_players` that fires once **per INSERT statement** and:
1. incrementally fuzzy-matches *only the new names* against `rs_players` → flips matches to `is_inactive = FALSE`;
2. runs `REFRESH MATERIALIZED VIEW rs_local_active_players`.

So the matview is current the moment the `sd_players` INSERT returns. The heavy scripts
(`build-registry`, `link-fide-players`, `sync-active-players`) are **only** for changes to
`rs_players` directly — not for adding tournaments.

### The full chain

```
1. Academy DB  ── admin Excel upload ──►  tournaments + players   (incl. tie_breaks, rounds)
                                              │
2.            ── copy NEW rows, same ids ────►  sd_tournaments  (FIRST — FK parent)
                                              ──►  sd_players      (SECOND)
                                                     │
3.                          INSERT trigger fires ──► marks rs_players active (new names)
                                                 └─► REFRESH rs_local_active_players  ✅ matview current
                                              │
4. rating-system: npm run resolve-tournament-regions  ──► regenerates tournament-regions.json
                                              │
5. lca-auth: replace src/lib/tournament-regions.json + REDEPLOY
             (clears the ~1h ISR + in-memory pool cache; new tournament gets its region)
```

### Schema parity (the copy is a clean column map)

| Academy `players` (source) | Ratings `sd_players` (target) |
|---|---|
| `id, tournament_id, rank, name, federation, rating, points, rounds, tie_breaks` | same + `created_at` (default) |

| Academy `tournaments` (source) | Ratings `sd_tournaments` (target) |
|---|---|
| `id, tournament_name, organizer, federation, tournament_director, chief_arbiter, arbiter, time_control, rate_of_play, location, rounds, tournament_type, rating_calculation, date, average_elo, average_age, source` | same + `deputy_chief_arbiter` (nullable, skip), `created_at` (default) |

- **`tie_breaks` is the whole game:** `performance_rating` is derived at refresh time by
  `detect_performance_rating(tie_breaks)` — the largest numeric value in **[100, 3500]**
  (e.g. the `TB5` value like `1443`). No tie_breaks → NULL perf → the appearance contributes
  nothing. The academy upload **does** capture `tie_breaks` + `rounds` (`tournamentRepo.ts:90-91`), so the copy preserves the ranking signal.
- FK: `sd_players.tournament_id → sd_tournaments(id)` (cascade) → **insert tournaments first.**
- Academy and Ratings **share tournament IDs by design** (`src/lib/cdcSelection.ts:7`) → carry the same `id` values.

---

## Step A — Generate the `sd_*` INSERTs

**Run in the ACADEMY Supabase SQL editor** *after* uploading the tournament via the admin flow.
It emits two rows of text. Paste the **tournaments** output first, then the **players** output,
into the **Ratings** SQL editor.

```sql
-- ▼▼ SELECTOR: choose the new tournament(s). Use ONE form. ▼▼
--   by exact name(s):   t.tournament_name IN ('Capricorn ... U20', 'Capricorn ... U18')
--   by recency:         t.created_at > '2026-06-20'
--   by id(s):           t.id IN ('uuid1','uuid2')
WITH sel AS (
  SELECT id FROM tournaments t
  WHERE t.tournament_name IN ('REPLACE_WITH_NEW_TOURNAMENT_NAME')   -- ◄ edit
)

-- 1) sd_tournaments block — PASTE THIS FIRST in the Ratings editor (FK parent)
SELECT 1 AS ord,
  'INSERT INTO public.sd_tournaments (id, tournament_name, organizer, federation, '
  || 'tournament_director, chief_arbiter, arbiter, time_control, rate_of_play, location, '
  || 'rounds, tournament_type, rating_calculation, date, average_elo, average_age, source) VALUES '
  || string_agg(
       format('(%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L)',
         t.id, t.tournament_name, t.organizer, t.federation,
         t.tournament_director, t.chief_arbiter, t.arbiter, t.time_control, t.rate_of_play, t.location,
         t.rounds, t.tournament_type, t.rating_calculation, t.date, t.average_elo, t.average_age, t.source),
       E',\n')
  || E'\nON CONFLICT (id) DO NOTHING;' AS sql_to_paste
FROM tournaments t WHERE t.id IN (SELECT id FROM sel)

UNION ALL

-- 2) sd_players block — PASTE THIS SECOND (its INSERT fires the matview-refresh trigger)
SELECT 2 AS ord,
  'INSERT INTO public.sd_players (id, tournament_id, rank, name, federation, rating, points, rounds, tie_breaks) VALUES '
  || string_agg(
       format('(%L,%L,%L,%L,%L,%L,%L,%L::jsonb,%L::jsonb)',
         p.id, p.tournament_id, p.rank, p.name, p.federation, p.rating, p.points, p.rounds, p.tie_breaks),
       E',\n')
  || E'\nON CONFLICT (id) DO NOTHING;' AS sql_to_paste
FROM players p WHERE p.tournament_id IN (SELECT id FROM sel)
ORDER BY ord;
```

**Why it's safe**
- `format('%L', …)` does Postgres literal-escaping (handles `ë` in "Daniëlle", apostrophes, etc.).
- `%L::jsonb` round-trips the `rounds` / `tie_breaks` JSON.
- `ON CONFLICT (id) DO NOTHING` makes re-runs idempotent (shared-ID design).
- Tournaments-before-players respects the FK; the single `sd_players` INSERT trips the
  `AFTER INSERT … FOR EACH STATEMENT` trigger → matview refreshes **once**, automatically.

> The Academy `players` / `tournaments` tables always have an `id` column, so it's carried over directly.

---

## Step B — Registry coverage check

**Run in the RATINGS editor *after* inserting.** Shows which new players matched a registry row vs. fell through.

```sql
SELECT v.name, v.match_score, v.rs_player_id, v.birth_year,
       v.current_rating, v.fide_rating, v.performance_rating
FROM rs_local_active_players v
WHERE v.tournament_id IN ('REPLACE_WITH_NEW_TOURNAMENT_ID')   -- ids from Step A
ORDER BY (v.rs_player_id IS NULL) DESC, v.name;
```

- `rs_player_id IS NULL` → **no registry match** (no `rs_players` row, or below the 0.4 pg_trgm floor).
  These rank by name only: no age band, no Chess SA / FIDE rating, excluded from Junior / Gender filters.
- `performance_rating IS NULL` → no rating value found in `tie_breaks` (appearance contributes nothing) — eyeball these.

If many rows are NULL, add `rs_players` registry rows (separate step) before relying on age / rating filters.

---

## Step C — Regions + redeploy

A brand-new `tournament_id` is **not** in the bundled `tournament-regions.json` (compiled into `lca-auth`),
so until this step it shows only under **"All regions"** — invisible to the default Limpopo / Capricorn filters.

1. In `~/Desktop/rating-system`: `npm run resolve-tournament-regions`
   → regenerates `tournament-regions.json` (+ `unmatched-regions.json` for review).
   - If the new venue isn't resolved, add the place/venue to `src/data/sa-region-gazetteer.json` and re-run.
2. Copy the regenerated file to `lca-auth/src/lib/tournament-regions.json`.
3. **Redeploy `lca-auth`** — clears the `revalidate=3600` ISR cache **and** the in-memory pool cache
   in `src/lib/rankingsServer.ts` (both ~1h), so the new tournament + region appear immediately.

---

## Caching note (why it can look "missing")

Two ~1h layers in `lca-auth`:
- page / route `revalidate = 3600` (ISR) — `src/app/player-rankings/page.tsx`, `.../data/route.ts`;
- in-memory pool `Map` (TTL 1h, per period) — `src/lib/rankingsServer.ts`, survives on a warm instance.

After the matview refresh, expect up to ~1h lag without a redeploy. A redeploy is instant.

---

## Quick checklist

- [ ] Upload tournament via admin Excel flow → Academy `tournaments` + `players` populated.
- [ ] Run **Step A** in Academy editor; copy the two output blocks.
- [ ] Paste into Ratings editor: `sd_tournaments` block **first**, `sd_players` block **second**.
- [ ] Confirm no error; the `sd_players` INSERT auto-refreshed the matview.
- [ ] Run **Step B** in Ratings editor; review unmatched / NULL-perf players.
- [ ] (If needed) add missing `rs_players` registry rows.
- [ ] **Step C:** `resolve-tournament-regions` → update `tournament-regions.json` in `lca-auth` → redeploy.
- [ ] Verify the tournament + its players show in `/player-rankings` (try the Limpopo and All-regions views).
