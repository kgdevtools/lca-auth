# TOURNAMENT_UPLOAD_RANKINGS_UPDATE_PIPELINE

> The scripted pipeline that takes a chess-results.com Excel export all the way to the live
> `/player-rankings` page. Supersedes the manual SQL-editor loop in `RANKINGS_UPDATE_RUNBOOK.md`
> (which stays as background reading — the mental model section there is still the best intro).
> Built and battle-tested 2026-07-19/20 on Limpopo Open 2026 + the July-18 batch (3 events).

---

## The two databases (never confuse them)

| | **Academy DB** | **Ratings DB** |
|---|---|---|
| Supabase project | lca-auth's own | rating-system's (`arjuqrrubhddzlodrlwo`) |
| Credentials | `~/Desktop/lca-auth/.env` → `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `~/Desktop/rating-system/.env.example` → `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` |
| Tables touched by this pipeline | `tournaments`, `players` | `sd_tournaments`, `sd_players`, matview `rs_local_active_players` (via trigger), reads `lcar_players`, `lcar_player_profiles`, `rs_player_aliases`, `rs_players` |
| Who writes | Steps 2 (script) | Step 5 (you, SQL editor paste) |
| What the live site reads | nothing from here | `rs_local_active_players`, read-only |

**Tournament/player IDs are shared across both DBs by design** — the Ratings copy carries the
Academy UUIDs verbatim.

## Policies (user-confirmed, do not silently change)

1. **Uploads are verbatim.** Whatever the Excel says is what lands in `players` and `sd_players`
   — ratings, points, rounds, tie_breaks are never edited or backfilled. The single exception:
   a computed `"PR"` key is **merged into `tie_breaks` in the Ratings copy only** (step 4),
   because `detect_performance_rating()` needs a value in [100, 3500] or the event contributes
   nothing to rankings.
2. **Degenerate sections get no PR.** Tiny events (e.g. a 2-player round robin) produce
   formula-correct but distorting PRs (perfect score vs one unrated opponent = 2200). Promote
   them with `--no-pr` so they exist for the record without touching performance rankings.
3. **Registry ratings for unrated fields.** When the organizer registered players without a
   rating list, PR is computed with identity-matched ratings: `lcar_players.rating` when > 0,
   else the crosstable value. The match itself is never persisted — it only feeds the PR number.
4. **Batch = one refresh.** The `sd_players` trigger (`004_auto_refresh_triggers.sql`) runs a
   full `REFRESH MATERIALIZED VIEW rs_local_active_players` **per INSERT statement**. The
   emitter therefore packs every player of every tournament in the batch into ONE INSERT.
   Never split it per tournament.

## Known parser gotchas (all handled by the scripts, listed so nobody "fixes" them)

- **Date bug:** `"Date : 2026/07/17 to 2026/07/18"` ranges mangle the metadata date (e.g.
  `1956-12-31`). Always pass `--date=YYYY-MM-DD` (the event's START date) on upload.
- **Forfeits look like results:** the parser maps `+` → `win`, `-` → `loss` but keeps `raw`
  (`"2b+"`, `"4w-"`). PR computation excludes any round whose `raw` ends in `+`, `-`, or `=`
  (Swiss Manager excludes unplayed games). Byes have `opponent: null` and are excluded too.
- **Tiny round robins parse to 0 players:** their crosstable has opponent-number columns, not
  `N.Rd` columns. `upload-tournament.ts` falls back to `parseTwoPlayerRR()` automatically.

---

## The pipeline

All terminal commands run from **`~/Desktop/lca-auth`** with `npx tsx`.
Scripts live in `~/Desktop/lca-auth/scripts/`.

### Step 0 — Download + preview (no writes)

Export the final ranking crosstable from chess-results.com as Excel (`chessResultsList(N).xlsx`
in `~/Downloads`). Then:

```bash
npx tsx scripts/parse-preview.ts "/home/ben-skg/Downloads/chessResultsList(N).xlsx"
```

Check: tournament name (the duplicate guard keys on it), player count, round count, whether the
`Rtg` column is populated, which `TB#` columns exist, and the **real start date** from the raw
`Date :` row (ignore the parsed metadata date — see gotchas).

**Affects:** nothing.

### Step 1 — (unrated fields only) Identify players + review PRs

If the export has empty/0 ratings, match names against the LCAR registry and eyeball the PRs
**before** uploading anything:

```bash
npx tsx scripts/match-and-pr.ts "/home/ben-skg/Downloads/chessResultsList(N).xlsx" [more files]
```

Reads (Ratings DB): `lcar_players`, `lcar_player_profiles`, `rs_player_aliases`.
Matching = rating-system's `src/utils/name-match.ts` (order-invariant composite score;
≥ 0.88 confident, 0.72–0.88 review tier). Output: per player — best match, score, LCAR rating,
birth year, PR. Decide here which sections (if any) are degenerate → `--no-pr` later.

**Affects:** nothing (read-only).

### Step 2 — Upload to the Academy DB

```bash
npx tsx scripts/upload-tournament.ts "/home/ben-skg/Downloads/chessResultsList(N).xlsx" \
    --date=YYYY-MM-DD --dry-run    # always dry-run first
npx tsx scripts/upload-tournament.ts "..." --date=YYYY-MM-DD    # real run
```

Same insert path as the admin web upload (`src/repositories/tournamentRepo.ts`) including the
duplicate-tournament-name guard. Prints the new `tournament_id` on the last line — **collect
these, steps 3–5 need them.** Repeat per file.

**Affects:** Academy DB `tournaments` (1 row), `players` (N rows).

### Step 3 — (optional sanity) PR table for an uploaded tournament

```bash
npx tsx scripts/compute-pr.ts <tournament_id>
```

**Affects:** nothing (read-only).

### Step 4 — Emit the batch migration

```bash
npx tsx scripts/emit-batch-migration.ts <id1> <id2> ... \
    [--no-pr=<idX>,<idY>] 2>/dev/null | grep -v "^◇" \
    > ~/Desktop/rating-system/src/migrations/0NN_<slug>.sql
```

(the `grep -v "^◇"` strips dotenvx log lines from stdout; number `0NN` = next free slot in
`rating-system/src/migrations/`.)

What it does: reads the Academy rows, re-runs the registry match (step 1 logic) to assign PR
ratings, and emits one SQL file:
- one `INSERT INTO sd_tournaments` (all tournaments in the batch);
- **one** `INSERT INTO sd_players` (every player, `tie_breaks` verbatim + `"PR"` key, except
  `--no-pr` tournaments) — single statement, single matview refresh;
- a verification `SELECT` against `rs_local_active_players` at the end.

Both INSERTs are `ON CONFLICT (id) DO NOTHING` → re-runs are safe.

**Affects:** creates `~/Desktop/rating-system/src/migrations/0NN_<slug>.sql`. No DB writes.

### Step 5 — Run the migration (manual, SQL editor)

Paste the whole `0NN_*.sql` file into the **Ratings DB** SQL editor and run once.
The `sd_players` INSERT is the slow statement (it's the matview refresh). The verification
grid appears when it finishes — expect: every player row present; `performance_rating` equal
to the injected PR (NULL for `--no-pr` tournaments); `rs_player_id IS NULL` rows are registry
misses (they rank by name only, no age/gender/rating filters).

Weak-link caveat: the trigger's trigram matcher stores links down to 0.4 similarity. Consumers
discard < 0.6, but links in the **0.6–0.75 band pass the default floor and can be wrong
identities** — eyeball them in the verification grid.

Rejecting a wrong link: insert a row into **`rs_match_exclusions`** (Ratings DB, created by
migration `021_match_exclusions.sql`) with the crosstable name (via
`sort_player_name_tokens()`) and the wrong `rs_player_id`, then
`REFRESH MATERIALIZED VIEW rs_local_active_players` — the view's matcher skips excluded pairs
permanently (name-level, global, reversible by deleting the row). Migration 021 is the template;
its seed block shows the exact INSERT shape. If the wrong ratings also fed PR computation,
follow the `020_pr_refinement_july18.sql` pattern: recompute PRs with the curated identity list
and ship a single `UPDATE sd_players ... jsonb_set(tie_breaks,'{PR}',...)` statement.

**Affects:** Ratings DB `sd_tournaments`, `sd_players`; trigger flips matched `rs_players` to
active and refreshes `rs_local_active_players`.

### Step 6 — Regions

```bash
cd ~/Desktop/rating-system
npm run resolve-tournament-regions
```

Reads Ratings DB `sd_tournaments` (so it must run **after** step 5), regenerates
`~/Desktop/rating-system/tournament-regions.json` (+ `unmatched-regions.json`). If a new event
is unmatched or province-only, add its venue to
`~/Desktop/rating-system/src/data/sa-region-gazetteer.json` and re-run. Then:

```bash
cp ~/Desktop/rating-system/tournament-regions.json ~/Desktop/lca-auth/src/lib/tournament-regions.json
```

**Affects:** `rating-system/tournament-regions.json`, `rating-system/unmatched-regions.json`,
`lca-auth/src/lib/tournament-regions.json`.

### Step 7 — Ship to master + redeploy

The regions JSON is compiled into the site, and two ~1h caches (ISR `revalidate=3600`,
in-memory pool in `src/lib/rankingsServer.ts`) hide new data until a deploy. Deploys trigger
off pushes to `master`.

If you're on a feature branch with work you don't want to ship, commit **only the JSON** to
master via a throwaway worktree:

```bash
cd ~/Desktop/lca-auth
git worktree add --detach /tmp/lca-master origin/master
cp src/lib/tournament-regions.json /tmp/lca-master/src/lib/
cd /tmp/lca-master
git add src/lib/tournament-regions.json
git commit -m "Add <events> to tournament-regions"
git push origin HEAD:master
cd ~/Desktop/lca-auth
git fetch origin master:master        # fast-forward the local ref
git worktree remove /tmp/lca-master
```

(On master with a clean tree? Just commit and push normally.)

**Affects:** git `master` + production deployment.

### Step 8 — Verify live

Hard-refresh `limpopochessacademy.co.za/player-rankings` after the build: the events appear
under their region filters, and the injected PRs move the performance rankings.

---

## Quick checklist

- [ ] Preview each file; note real start date; ratings present or not?
- [ ] Unrated field → `match-and-pr.ts`, review matches + PRs, pick `--no-pr` sections
- [ ] `upload-tournament.ts --dry-run` then real, per file; collect tournament IDs
- [ ] `emit-batch-migration.ts <ids> [--no-pr=...]` → `rating-system/src/migrations/0NN_*.sql`
- [ ] Paste `0NN_*.sql` in Ratings SQL editor; check verification grid (PRs, registry misses,
      weak 0.6–0.75 links)
- [ ] `resolve-tournament-regions` → copy JSON to `lca-auth/src/lib/` (gazetteer if unmatched)
- [ ] Push JSON to master (worktree if branched) → auto-redeploy → verify live

## File inventory

| File | Role |
|---|---|
| `scripts/parse-preview.ts` | dry-run Excel parse |
| `scripts/upload-tournament.ts` | CLI upload → Academy DB (dup guard, `--date`, RR fallback) |
| `scripts/match-and-pr.ts` | registry identify + PR review for unrated fields (exports `buildRegistry`, `bestMatch`, `parseTwoPlayerRR`) |
| `scripts/compute-pr.ts` | PR table for one Academy tournament |
| `scripts/emit-batch-migration.ts` | Academy rows → paste-ready Ratings SQL (PR injection, `--no-pr`, single-statement batch) |
| `scripts/emit-ratings-migration.ts` | single-tournament predecessor of the batch emitter (kept for reference) |
| `src/services/parserService.ts` | the Excel parser everything rides on (see gotchas) |
| `rating-system/src/core/performance.ts` | `computeTpr` — Swiss-Manager-exact PR (validated: 0 deviation on identical inputs) |
| `rating-system/src/utils/name-match.ts` | name normalisation + composite match score |
| `rating-system/src/migrations/018_*.sql`, `019_*.sql` | shipped examples of steps 4–5 output |
| `RANKINGS_UPDATE_RUNBOOK.md` | the original manual loop + mental model |
