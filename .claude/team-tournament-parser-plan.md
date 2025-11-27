# Team Tournament Parser - Implementation Plan

## Overview
Team tournaments differ fundamentally from individual tournaments: multiple files (one per round) must be parsed and aggregated to build complete tournament standings. Each file contains team pairings with board-by-board results.

## Key Differences from Individual Parsers

### Data Structure
- **Individual tournaments**: Single file → All rounds in columns → Final standings
- **Team tournaments**: Multiple files → Each round separate → Aggregate to build standings

### Information Hierarchy
```
Tournament
├── Metadata (name, organizer, date, location)
├── Rounds (multiple files)
│   ├── Round N
│   │   ├── Team Pairing (Team A vs Team B, score)
│   │   │   ├── Board 1: Player A1 vs Player B1
│   │   │   ├── Board 2: Player A2 vs Player B2
│   │   │   └── Board N: Player AN vs Player BN
```

### What We Need to Extract

**Per Round File:**
1. Tournament metadata (name, organizer, arbiters, date, location, round number)
2. Team pairings (team names, match scores like "3-3", "4-2")
3. Board pairings (player names, ratings, colors, results)

**Aggregated Across All Rounds:**
1. Team standings (match points, game points, tie-breaks)
2. Individual player statistics (games played, results, performance rating)
3. Complete team rosters

## Database Schema

### New Tables Required

#### `team_tournaments`
```sql
- id (uuid, PK)
- tournament_name (text)
- organizer (text)
- federation (text)
- chief_arbiter (text)
- arbiter (text)
- tournament_director (text)
- location (text)
- date (date)
- rounds (int) -- Total rounds uploaded
- tournament_type (text) -- "Team"
- source (text) -- Original file names
- created_at (timestamp)
```

#### `teams`
```sql
- id (uuid, PK)
- team_tournament_id (uuid, FK → team_tournaments)
- team_name (text)
- rank (int) -- Final standing
- match_points (decimal) -- Match wins/draws
- game_points (decimal) -- Total board points
- tie_breaks (jsonb) -- TB1, TB2, etc.
- created_at (timestamp)
```

#### `team_players`
```sql
- id (uuid, PK)
- team_id (uuid, FK → teams)
- player_name (text)
- rating (int)
- title (text) -- GM, IM, FM, etc.
- board_number (int) -- Primary board assignment
- games_played (int)
- points (decimal)
- performance_rating (int)
- created_at (timestamp)
```

#### `team_rounds`
```sql
- id (uuid, PK)
- team_tournament_id (uuid, FK → team_tournaments)
- round_number (int)
- round_date (date)
- source_file (text) -- Original filename
- created_at (timestamp)
```

#### `team_pairings`
```sql
- id (uuid, PK)
- team_round_id (uuid, FK → team_rounds)
- pairing_number (int) -- e.g., 6.1, 6.2
- team_white_id (uuid, FK → teams)
- team_black_id (uuid, FK → teams)
- team_white_score (decimal) -- e.g., 3.5
- team_black_score (decimal) -- e.g., 2.5
- created_at (timestamp)
```

#### `board_pairings`
```sql
- id (uuid, PK)
- team_pairing_id (uuid, FK → team_pairings)
- board_number (int)
- white_player_id (uuid, FK → team_players)
- black_player_id (uuid, FK → team_players)
- white_rating (int)
- black_rating (int)
- result (text) -- "1-0", "0-1", "½-½", "0-0" (both forfeit)
- white_result (text) -- "win", "loss", "draw", "forfeit"
- black_result (text)
- created_at (timestamp)
```

## Parser Implementation

### File: `src/services/teamTournamentParser.ts`

#### Core Parser Class: `TeamTournamentParser`

**Constructor:**
```typescript
constructor(fileName: string, roundNumber?: number)
```

**Main Method:**
```typescript
parse(buffer: Buffer): TeamRoundData
```

**Output Interface:**
```typescript
interface TeamRoundData {
  tournament_metadata: TeamTournamentMetadata
  round_number: number
  team_pairings: TeamPairing[]
}

interface TeamTournamentMetadata {
  tournament_name: string
  organizer?: string
  chief_arbiter?: string
  arbiter?: string
  date?: string
  location?: string
  round_date?: string
}

interface TeamPairing {
  pairing_number: string // "6.1", "11.2"
  team_white: string
  team_black: string
  team_white_score: number
  team_black_score: number
  board_pairings: BoardPairing[]
}

interface BoardPairing {
  board_number: number
  white_player: string
  black_player: string
  white_rating: number | null
  black_rating: number | null
  white_title?: string
  black_title?: string
  result: string // "1-0", "0-1", "½-½"
}
```

### Parsing Strategy

#### 1. Metadata Extraction
**Tournament name:** Row 0 (e.g., "2025 CDC Primary Schools League")
**Age/Section:** Row 1 (e.g., "U/13A", "U15 Championship") - append to tournament name

**Metadata fields (scan rows 2-15):**
- `Organizer(s) : <value>` → organizer
- `Tournament Director : <value>` → tournament_director
- `Chief Arbiter : <value>` → chief_arbiter (may include license number in parentheses)
- `Deputy Chief Arbiter : <value>` → deputy_chief_arbiter
- `Arbiter : <value>` → arbiter
- `Town : <value>` or `Location : <value>` → location
- `Date : <value>` → date (handle ranges: "2025/02/05 To 2025/10/30")

**Round information:**
- Pattern: `Round <N> on <DATE> at <TIME>` (e.g., "Round 18 on 2025/10/30 at 14:00")
- Extract round_number and round_date

**Stop scanning** when encountering team pairing pattern (row with format like "18.1 10 Mitchell House...")

#### 2. Team Pairing Detection

**Excel column structure:**
```
Col A: Pairing number (e.g., "18.1", "6.2", "11.4")
Col B: White team rank (optional, may be empty)
Col C: White team name
Col D: Match score (e.g., "0 - 5", "3 - 3", "6F - 0F")
Col E: Black team rank (optional, may be empty)
Col F: Black team name
```

**Detection pattern:**
- Column A matches: `/^\d+\.\d+$/` (e.g., "18.1", "3.2")
- Column D matches score format: `/^([\d½]+F?)\s*[-–]\s*([\d½]+F?)$/`

**Score formats:**
- Standard: "3 - 3", "4 - 2", "6 - 0"
- Half points: "½ - 3½", "1½ - 4½"
- Forfeits: "6F - 0F", "0F - 6F" (F = forfeit)

**Team name extraction:**
- Strip leading/trailing whitespace
- Handle empty ranks gracefully (rank may be missing)

#### 3. Board Pairing Extraction

**Two formats detected:**

**Format 1: Local tournaments (no titles)**
```
Col A: Board number (1-6, sequential)
Col B: White player name (or "-" for forfeit/absent)
Col C: White rating (integer or 0, may be empty)
Col D: Result (e.g., "1 : 0", "0 : 1", "½ : ½", "+ : -", "- : +")
Col E: Black player name (or "-" for forfeit/absent)
Col F: Black rating (integer or 0, may be empty)
```

**Format 2: International tournaments (with titles)**
```
Col A: Board number (1-4, sequential)
Col B: White player title (GM, IM, FM, WGM, etc.)
Col C: White player name
Col D: White rating
Col E: Result (e.g., "0 : 1", "½ : ½", "1 : 0")
Col F: Black player title
Col G: Black player name
Col H: Black rating
```

**Format detection logic:**
- If column B (first row after team pairing) contains title keywords (GM, IM, FM, WGM, WIM, WFM, CM, WCM, NM) → Format 2
- Otherwise → Format 1

**Board extraction rules:**
1. Start immediately after team pairing row
2. Continue while column A is numeric (1, 2, 3, 4, 5, 6)
3. Stop when:
   - Column A matches pairing pattern (`\d+\.\d+`) → next team pairing
   - Column A is empty or non-numeric
   - Reached footer/empty rows

**Handle missing players:**
- Player name = "-" → forfeit by that color
- Empty player name → treat as forfeit
- Rating = 0 or empty → store as null

#### 4. Result Parsing

**Result format: "white_score : black_score"**

**Score mappings:**
- `"1 : 0"` or `"1:0"` → white wins (white: 1, black: 0)
- `"0 : 1"` or `"0:1"` → black wins (white: 0, black: 1)
- `"½ : ½"` or `"0.5:0.5"` → draw (white: 0.5, black: 0.5)
- `"+ : -"` → white wins by forfeit (white: 1, black: 0, forfeit: true)
- `"- : +"` → black wins by forfeit (white: 0, black: 1, forfeit: true)
- `"- : -"` → double forfeit (white: 0, black: 0)

**Normalized result output:**
```typescript
{
  result: "1:0" | "0:1" | "½:½" | "0:0"  // Normalized format
  white_score: number  // 0, 0.5, or 1
  black_score: number  // 0, 0.5, or 1
  white_result: "win" | "draw" | "loss" | "forfeit"
  black_result: "win" | "draw" | "loss" | "forfeit"
}
```

#### 5. Validation Rules

**Team score validation:**
- Sum of board scores should equal team score (within 0.5 tolerance)
- Warn if mismatch detected
- Handle forfeits: "6F - 0F" means full forfeit (6 boards)

**Board count validation:**
- Standard: 4-6 boards per team
- Olympiad: typically 4 boards
- Warn if board count is unusual (< 3 or > 8)

**Player validation:**
- Player name not empty (unless forfeit)
- Rating is valid integer (0-3000 range) or null

**Round number extraction:**
- Primary: From "Round N" text in metadata
- Fallback: From pairing numbers (e.g., "18.1" → round 18)
- Fallback 2: From filename pattern "Round_18" or "R18"

## Repository Layer

### File: `src/repositories/teamTournamentRepo.ts`

#### Main Function: `saveTeamTournamentRound()`

**Input:** `TeamRoundData` (parsed round)

**Process:**
1. Check if tournament exists (by name)
   - If exists: Load existing tournament
   - If new: Create new tournament record

2. Create/update round record

3. For each team pairing:
   - Create/find team records (by name + tournament)
   - Create team_pairing record
   - For each board pairing:
     - Create/find team_player records
     - Create board_pairing record
     - Update player statistics

4. Aggregate team standings:
   - Calculate match points (win=2, draw=1, loss=0)
   - Calculate game points (sum of board results)
   - Compute tie-breaks (if all rounds uploaded)

**Return:** Tournament ID + round summary

## Upload Flow

### File: `src/app/admin/upload-team-tournament/page.tsx`

#### Multi-File Upload UI

**Features:**
1. Tournament selection/creation
   - Dropdown: Select existing team tournament OR create new
   - If new: Enter tournament name

2. Round file upload
   - File input with round number
   - Multiple file selection support
   - Display uploaded rounds table

3. Upload confirmation
   - Show parsed data preview
   - Display: Round, teams, boards, warnings
   - Batch upload button

### File: `src/app/admin/upload-team-tournament/upload-form.tsx`

**State Management:**
```typescript
{
  tournamentId: string | null
  tournamentName: string
  roundFiles: { roundNumber: number, file: File }[]
  uploadedRounds: number[]
  parseResults: TeamRoundData[]
}
```

**Upload Strategy:**
- Option A: Upload all rounds at once (batch)
- Option B: Upload round-by-round (incremental)

### Server Action: `src/app/admin/upload-team-tournament/server-actions.ts`

```typescript
async function uploadTeamTournamentRound(
  formData: FormData
): Promise<{
  ok: boolean
  tournament_id?: string
  round_number?: number
  pairings_count?: number
  error?: string
}>
```

## Aggregation Logic

### Calculate Team Standings

**After each round upload:**
1. Fetch all team_pairings for tournament
2. For each team:
   - Count match points (2 for win, 1 for draw, 0 for loss)
   - Sum game points (total board scores)
   - Calculate tie-breaks:
     - TB1: Sonneborn-Berger
     - TB2: Match points
     - TB3: Game points
     - TB4: Direct encounter

3. Rank teams by: Match points → TB1 → TB2 → TB3

4. Update `teams.rank`, `teams.match_points`, `teams.game_points`

### Calculate Player Statistics

**For each player after round upload:**
- Games played (count board_pairings)
- Total points (sum results)
- Performance rating (average opponent rating + 400 * (score% - 0.5))

## Utilities

### File: `src/lib/teamTournamentUtils.ts`

**Functions:**
```typescript
- parseTeamScore(scoreStr: string): { white: number, black: number }
- parseResult(resultStr: string): { white_result: string, black_result: string }
- detectRoundNumber(filename: string): number | null
- calculateMatchResult(whiteScore: number, blackScore: number): "win" | "draw" | "loss"
- calculatePerformanceRating(opponentRatings: number[], results: number[]): number
- extractPlayerTitle(nameStr: string): { name: string, title?: string }
```

## Validation & Error Handling

### Parser Validation
- Verify team pairing format matches expected patterns
- Ensure board counts are consistent
- Validate score sums (team score = sum of board scores)
- Check for duplicate teams in same round

### Upload Validation
- Prevent duplicate round uploads (same tournament + round number)
- Verify tournament metadata consistency across rounds
- Warn if team names don't match across rounds (typos)

### Data Integrity
- Foreign key constraints on all relationships
- Transaction-based uploads (rollback on error)
- Validation before aggregation

## Testing Strategy

### Unit Tests
1. Parser tests with sample files (Primary, High School, Olympiad formats)
2. Score calculation tests
3. Aggregation logic tests

### Integration Tests
1. Multi-round upload flow
2. Team standing calculations
3. Player statistics accuracy

## Migration Path

### Database Migration
```sql
-- Create all team tournament tables
-- Add indexes on foreign keys
-- Add indexes on team_name, player_name for lookups
```

### UI Components
- Reuse existing upload form patterns
- Adapt file input for multi-file selection
- Create team tournament listing page

## Open Questions

1. **Team name normalization:**
   - How to handle minor variations in team names across rounds?
   - Solution: Fuzzy matching or manual reconciliation UI

2. **Player matching:**
   - Same player on different boards in different rounds?
   - Solution: Store board_number as "primary assignment", track actual boards per round

3. **Incomplete rounds:**
   - Handle forfeits, byes, unplayed games?
   - Solution: Store result as "forfeit" or "bye", score accordingly

4. **International formats:**
   - Different scoring systems (match points vs game points only)?
   - Solution: Detect format, store both, use appropriate for standings

## Implementation Phases

### Phase 1: Core Parser ⚡ START HERE
**Files to create:**
- `src/services/teamTournamentParser.ts` - Main parser class
- `src/lib/teamTournamentUtils.ts` - Helper functions for score parsing, title extraction

**Tasks:**
1. Define TypeScript interfaces (TeamRoundData, TeamPairing, BoardPairing, etc.)
2. Implement metadata extraction (tournament name, organizer, arbiters, dates, round info)
3. Implement team pairing detection (parse pairing number, team names, match scores)
4. Implement board pairing extraction with format detection (local vs international)
5. Implement result parsing (handle all score formats: "1:0", "+ : -", "½:½", etc.)
6. Add validation logic (score sums, board counts, player validation)
7. Console logging for debugging (similar to existing parsers)

**Output:** Parser that converts Excel round file → TeamRoundData JSON

**Test with:** 3 sample files (Primary League, High School League, Chess Olympiad)

### Phase 2: Database Layer
- Create Supabase migration for new tables
- Implement `teamTournamentRepo.ts`
- Test round saving logic
- Handle team/player lookup and creation

### Phase 3: Upload UI
- Build multi-file upload form
- Integrate with parser + repository
- Preview parsed data
- Round-by-round upload support

### Phase 4: Aggregation & Standings
- Implement team standings calculation
- Calculate player statistics
- Display team tournament results page

### Phase 5: Polish & Integration
- Error handling
- Validation
- Team name reconciliation
- Integration with existing tournament listings

---

## Phase 1 Implementation Checklist

**Architecture adherence:**
- ✅ Follow existing parser patterns (ParserService, RoundRobinParser structure)
- ✅ Reuse shared utilities (parseDate from dateUtils.ts)
- ✅ Use similar interfaces (maintain TournamentMetadata style)
- ✅ Add console.log debugging throughout
- ✅ Handle empty/missing fields gracefully

**Key differences from individual parsers:**
- Parse single round at a time (not all rounds in one file)
- Extract team pairings with nested board pairings
- Support two board pairing formats (with/without titles)
- Handle forfeit notation ("6F - 0F", "+ : -", "- : +")
- Extract round number from multiple sources

**Ready to implement:** Phase 1 is fully specified and ready to start coding.
