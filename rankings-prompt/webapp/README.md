# webapp/ — drop-in files for the rankings page

Ready-to-use TypeScript for displaying this project's rankings in your **Next.js
App Router** web app. These are hand-written ports of `rank-by-performance.ts` so
you don't have to trust an LLM to reproduce the logic. The UI (shadcn/ui) is still
generated from `WEBAPP_RANKINGS_PROMPT.md`; these files are the data + logic layer
it should build on.

## What's here

| File | Copy to | Purpose |
|---|---|---|
| `lib/ratingsClient.ts` | your app `lib/` | Read-only Supabase client for the ratings project + `fetchRankingData()` (paginated view + tournaments). |
| `lib/rankings.ts` | your app `lib/` | Types + `rankPlayers()` — grouping, confidence gating, averaging, all filters. Pure, no I/O. |

You also need the region data: copy **`tournament-regions.json`** (repo root of the
ratings project) into your app, e.g. `lib/tournament-regions.json`.

## One-time setup

1. Env (anon key — NEVER the service key):
   ```
   NEXT_PUBLIC_RATINGS_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_RATINGS_SUPABASE_ANON_KEY=eyJ...
   ```
2. Grant read access on the ratings DB (SQL editor, once):
   ```sql
   GRANT SELECT ON public.rs_local_active_players, public.sd_tournaments TO anon;
   ```

## Wiring example (server component fetches, client component renders)

```tsx
// app/rankings/page.tsx  (Server Component)
import { fetchRankingData } from '@/lib/ratingsClient';
import regions from '@/lib/tournament-regions.json';
import RankingsView from './RankingsView';

export const revalidate = 3600; // cache the raw pull for an hour

export default async function RankingsPage() {
  const { appearances, tournaments } = await fetchRankingData();
  return <RankingsView appearances={appearances} tournaments={tournaments} regions={regions} />;
}
```

```tsx
// app/rankings/RankingsView.tsx  ("use client")
'use client';
import { useMemo, useState } from 'react';
import { rankPlayers, type RankingFilters, type RawViewRow, type RawTournament, type RegionMap } from '@/lib/rankings';

export default function RankingsView(props: {
  appearances: RawViewRow[];
  tournaments: RawTournament[];
  regions: RegionMap;
}) {
  const [filters, setFilters] = useState<RankingFilters>({ minTournaments: 1, limit: 50 });

  const players = useMemo(
    () => rankPlayers(props.appearances, props.tournaments, props.regions, filters),
    [props, filters],
  );

  // Build your shadcn/ui filter bar (setFilters) + Card list with a collapsible
  // appearances table here. See WEBAPP_RANKINGS_PROMPT.md for the exact layout.
  return null;
}
```

`rankPlayers()` returns `RankedPlayer[]` already sorted (avgPerf desc, then
ratedTournaments) and limited. Each player carries `appearances` (newest first)
for the collapsible breakdown, plus `avgPerf`, `bestPerf`, `avgGap`, `identityKind`,
etc. — every field the terminal output shows.

## Filters (all optional, combine with AND)

`minTournaments`, `minConfidence` (default 0.6), `federations[]`, `provinces[]`,
`districts[]`, `regionMinConfidence`, `bornAfter`, `bornBefore`, `sex`, `year`,
`period` (season start year, Oct→Sep), `limit` (default 50). See `rankings.ts`
JSDoc and `SCRIPTS.md` for details.

## Keeping region data fresh

`tournament-regions.json` is a static snapshot. When tournaments are added, re-run
`npm run resolve-tournament-regions` in the ratings project and re-copy the file
(or move the mapping into a `rs_tournament_regions` DB table and read it via
Supabase instead of bundling).
