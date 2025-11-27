# Team Tournament Rankings Integration Plan

## Problem Summary

You've successfully synced team tournament player data to `active_players_august_2025_profiles` using the hardened SQL script. However, these players are **not appearing in the rankings** because:

1. Team tournament records have `NULL` for `performance_rating` and `tie_breaks`
2. The rankings page filters out records without valid tie-breaks (see `page.tsx:42-49`)
3. Result: Team tournament players are loaded but excluded from stats calculations

## Solution Overview

Calculate individual player performance ratings from their board-level games in team tournaments using **FIDE-standard formulas** and **Swiss Manager tie-breaks**.

## Implementation Steps

### Step 1: Calculate Performance Ratings (SQL)

Run the SQL script: `.claude/team-tournament-performance-calculation.sql`

This script:
- ✅ Uses **FIDE-standard performance rating formula**: `Rp = Ra + dp`
  - `Ra` = Average opponent rating
  - `dp` = Rating adjustment from FIDE lookup table based on score percentage
- ✅ Calculates proper **Swiss Manager tie-breaks**:
  - **TB1**: Number of Wins (Direct Encounter equivalent for individual games)
  - **TB2**: Buchholz (sum of opponent scores in the tournament)
  - **TB3**: Sonneborn-Berger (weighted: win=opponent score, draw=0.5×opponent score, loss=0)
- ✅ Updates `active_players_august_2025_profiles` with calculated values

### Step 2: Verify Rankings Integration (No Code Changes Needed!)

The rankings page **already reads from `active_players_august_2025_profiles`**, so once performance ratings are calculated, team tournament players will automatically appear in rankings.

**Current Implementation** (src/app/rankings/server-actions.ts:218-394):
```typescript
// Fetches ALL records from active_players_august_2025_profiles
const rows = await fetchAllProfilesBatched(supabase);

// Filters tournaments with valid tie_breaks
const playedTournaments = player.tournaments.filter(tournament => {
  const tieBreaks = tournament.tie_breaks || {}
  const hasValidTieBreaks = Object.values(tieBreaks).some(value =>
    value !== null && value !== undefined && value !== "" && value !== 0
  )
  return hasValidTieBreaks && tournament.performance_rating
})
```

Once team tournament records have `performance_rating` and `tie_breaks`, they will pass this filter automatically.

## Technical Details

### Performance Rating Formula (FIDE Standard)

The FIDE performance rating uses a lookup table that converts score percentage to rating adjustment:

| Score % | dp    | Score % | dp  |
|---------|-------|---------|-----|
| 0%      | -800  | 50%     | 0   |
| 25%     | -193  | 75%     | +193|
| 50%     | 0     | 100%    | +800|

**Formula**: `Performance Rating = Average Opponent Rating + dp`

**Example**:
- Player scores 5.5/9 (61.1% = 0.61)
- Average opponent rating: 1650
- dp for 61% ≈ +80
- Performance rating = 1650 + 80 = **1730**

### Tie-Breaks (Swiss Manager Standard)

**TB1 - Number of Wins (Direct Encounter)**
- Counts total wins in the tournament
- Used as primary tie-break after total points

**TB2 - Buchholz**
- Sum of all opponents' total tournament scores
- Rewards playing against stronger-performing opponents
- Formula: `Σ(opponent's total score)`

**TB3 - Sonneborn-Berger**
- Weighted sum: wins count full opponent score, draws count half
- Formula: `Σ(wins × opponent_score) + Σ(draws × opponent_score × 0.5)`

### Database Schema

Team tournament data structure:
```
team_tournaments
  ├── team_rounds
  │     └── team_pairings
  │           └── board_pairings (individual games)
  │                 ├── white_player_id → team_players
  │                 ├── black_player_id → team_players
  │                 ├── white_score, black_score
  │                 └── white_rating, black_rating
```

Performance calculations aggregate `board_pairings` per player per tournament.

## Testing

After running the SQL script, verify:

1. **Check updated records count**:
```sql
SELECT COUNT(*) FROM active_players_august_2025_profiles
WHERE tournament_id IN (SELECT id::text FROM team_tournaments)
  AND performance_rating IS NOT NULL;
```

2. **Sample records**:
```sql
SELECT name, tournament_name, performance_rating, tie_breaks
FROM active_players_august_2025_profiles
WHERE tournament_id IN (SELECT id::text FROM team_tournaments)
  AND performance_rating IS NOT NULL
LIMIT 10;
```

3. **Visit rankings page**: Players from team tournaments should now appear in the rankings alongside individual tournament players

4. **Check aggregation**: A player who participated in both individual and team tournaments should show all tournaments in their performance details modal

## Expected Results

- ✅ Team tournament players appear in rankings
- ✅ Performance ratings calculated using FIDE standards
- ✅ Proper tie-breaks (Buchholz, Sonneborn-Berger)
- ✅ Players aggregate across ALL tournaments (individual + team)
- ✅ Rankings sorted by average performance rating across all events

## Sources

- [FIDE Title Regulations (Performance Rating)](https://handbook.fide.com/chapter/B012023)
- [FIDE Tie-Break Regulations](https://handbook.fide.com/chapter/TieBreakRegulations2023)
- [Performance Rating (Chess) - Wikipedia](https://en.wikipedia.org/wiki/Performance_rating_(chess))
- [How Tie-break Systems Work in Chess](https://chess-teacher.com/how-tie-break-systems-work-in-chess/)
- [Chess Stack Exchange - Performance Rating Calculation](https://chess.stackexchange.com/questions/18209/how-do-you-calculate-your-tournament-performance-rating)

## Notes

- Excludes forfeited games from performance calculations (standard practice)
- Only processes games with valid opponent ratings
- Uses exact FIDE dp lookup table for accuracy
- Tie-breaks match Swiss Manager output format
