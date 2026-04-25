# Interactive Study & Puzzle Lesson Updates

Fix plan for issues found during testing of the lesson builders. Organised into phases by logical grouping.

---

## Phase 1 — Core Editor Fixes

Unblocking the basic creation flow before anything else.

### Interactive Study: FEN Parsing in "Add Chapter"

**File:** `src/components/lessons/InteractiveStudyEditorBoard.tsx`

**Root cause:** The textarea (line 510) only accepts PGN. There is no code path to detect or handle a raw FEN string.

- [x] Add `isFenMode: boolean` local state inside the add-chapter form section (around line 486)
- [x] Render a "FEN" checkbox next to the PGN label (line 499)
- [x] In FEN mode, attempt `new Chess(value)` on change — show green indicator if valid, error if not
- [x] On "Add chapter" in FEN mode, synthesize a minimal PGN with `[SetUp "1"]` and `[FEN "..."]` headers before passing to `parsePgn` (the parser already reads these headers)
- [x] Keep PGN mode unchanged — checkbox only gates which validation and transform runs at save time

---

### Puzzle Creator: Board Editor Drag/Drop Broken

**File:** `src/components/lessons/PuzzleLessonBoard.tsx`

**Root cause:** `onPieceDrop` (line 364) calls `game.move({ from, to })` which enforces legal chess rules. Arbitrary position setup fails silently. There is also no external piece palette — only existing board pieces can be moved.

- [x] Split the puzzle creator into two explicit phases with a toggle button: **"Edit Position"** and **"Record Solution"**
- [x] In **Edit Position** mode, replace the inline `Chessboard` with the existing `BoardEditor` component (`src/components/lessons/BoardEditor.tsx`) — it uses `g.remove/put` for free placement and already has a piece palette
- [x] Wire `BoardEditor`'s `onFenChange(fen)` callback to the puzzle's `fen` field
- [x] In **Record Solution** mode, initialise `new Chess(puzzle.fen)` and enforce legal moves only
- [x] Add "Undo" and "Reset" buttons in Record Solution mode (also fixed pre-existing bug where `undoLastMove` used `game.undo()` on a FEN-loaded instance with no history — now replays from `startingFen`)
- [x] Add step labels ("Step 1: Set Up Position" / "Step 2: Record Solution") for clarity
- [x] `handleAddPuzzle` updated to use `startingFen` (captured when entering solution mode) as the puzzle's starting position, not the post-move `boardFen`

---

## Pre-Phase 2 Addition — Puzzle Creator: PGN Import

**File:** `src/components/lessons/PuzzleLessonBoard.tsx`

Added during testing when it became clear puzzles need a PGN path, not just FEN. The Lichess API returns `game.pgn` (bare move-text) + `puzzle.initialPly` to identify the puzzle start.

- [x] Add PGN import state: `pgnImportText`, `pgnParseError`, `pgnFenHistory`, `pgnMoveHistory`, `pgnPlyIndex`
- [x] Add `handleParsePgn` — calls `chess.loadPgn()` (handles bare move-text and full PGN headers), replays moves to build full FEN history
- [x] Render "Import from PGN" section in Edit Position mode above BoardEditor
- [x] Ply navigator (← ply N/total → + current move label) to step through the game and pick the exact starting position
- [x] "Use This Position" button sets `boardFen` to the selected ply's FEN, which `BoardEditor` picks up via its `initialFen` effect
- [x] Parsing defaults to last ply; clears on textarea change
- [x] "Parse PGN" button disabled when textarea empty

> **Future automation stowed (do not implement yet):** Auto-fetch batches from `/api/puzzle/batch/{theme}?nb=N&difficulty=D`, parse `initialPly` automatically, bulk-import puzzles with rating + themes. See memory `project_lichess_puzzle_api.md`.

---

## Phase 2 — Board ↔ Moves List Sync

Making the board and move list work together in both editors/viewers.

### Interactive Study: Bidirectional Sync

**File:** `src/components/lessons/InteractiveStudyEditorBoard.tsx`

**Root cause:** `handlePieceDrop` (line 296) uses `g.remove/put` — raw piece teleportation, not a chess move. It updates `boardFen` but never touches `pgnInput` or `parsedPgn`. The moves list is a read-only view of the loaded PGN.

- [x] Change `handlePieceDrop` to use `game.move({ from, to, promotion: 'q' })` for legal move enforcement
- [x] Introduce `activePositionRef` (useRef) + `liveFenHistory` to track live game state without stale closures
- [x] On a successful drop, derive the new SAN and append it to `liveMoves: { san: string }[]` state
- [x] Set `currentMoveIndex` to the new last index after each live move
- [x] Render `liveMoves` after the PGN moves in the list with a visual "continued" separator
- [x] If `currentMoveIndex` is mid-PGN when a live move is made, truncate via `localPgnOverride` (keeps chapter data intact, adjusts visual only)
- [x] Reset `liveMoves`, `liveFenHistory`, `localPgnOverride` on chapter change
- [x] Nav buttons (⏮ ← → ⏭) work across PGN + live sections using `totalMoveCount`

---

### Puzzle Viewer: Moves List

**File:** `src/app/academy/lesson/[lessonId]/_components/viewer-blocks/PuzzleViewerBlock.tsx`

**Root cause:** No moves list is rendered. `moveIndex` tracks solution progress in state but is never surfaced visually. No FEN history is built from the solution sequence.

- [ ] Pre-compute `solutionFenHistory: string[]` via `useMemo` — start from `data.fen`, iterate through `data.solution`, apply each move via chess.js, collect resulting FENs
- [ ] Render a compact moves list panel showing each solution move as a token/badge — solved moves in green, current expected move highlighted, future moves dimmed
- [ ] Make past moves clickable — clicking navigates to that FEN (`setPosition(solutionFenHistory[i])`)
- [ ] Add nav buttons (⏮ ← → ⏭) mirroring the Interactive Study viewer
- [ ] Keep the live validation logic unchanged — `moveIndex` remains the source of truth for what must be played next

> **Note:** Moves list deferred — the puzzle viewer only requires the first move of the solution to be played. A moves list is only useful once multi-move solutions are supported end-to-end.

---

## Phase 3 — Annotations & Decorations

Fixing arrows and highlights so both work simultaneously and colours render correctly.

### Interactive Study: Arrows + Highlights Conflict + Colour Selection

**File:** `src/components/lessons/InteractiveStudyEditorBoard.tsx`

**Root cause:** `react-chessboard` maintains its own internal arrow state from right-click drag that can silently override the `customArrows` prop on re-renders, causing drawn arrows to disappear when highlights are added.

- [x] Set `areArrowsAllowed={false}` on the `<Chessboard>` (line 407) to disable the library's built-in arrow drawing — all arrow state will then live exclusively in the `moveAnnotations` Map
- [x] Verify `handleSquareClick` in arrow mode correctly passes `drawnHighlights` alongside new arrow: `updateCurrentAnnotations([...drawnArrows, newArrow], drawnHighlights)` (line 283) — this is already correct, confirm no regression
- [x] Verify `handleSquareClick` in highlight mode correctly passes `drawnArrows` alongside new highlight (line 289) — also already correct, confirm no regression
- [x] Add `e.stopPropagation()` on the colour dot button click handlers (line 429) to prevent accidentally toggling `drawMode` off when selecting a colour
- [ ] Smoke test: draw green arrow → switch to red → draw red arrow → both persist → switch to highlight mode → click squares → all three (green arrow, red arrow, yellow highlight) remain visible simultaneously

---

### Puzzle Viewer: Decorations Conflict

**File:** `src/app/academy/lesson/[lessonId]/_components/viewer-blocks/PuzzleViewerBlock.tsx`

**Root cause:** Same `react-chessboard` internal arrow conflict as above. Also, `customSquareStyles` merge order means `customHighlights` (right-click) can override `selectedSquare` and `legalMoves` indicators.

- [x] Set `areArrowsAllowed={false}` on the `<Chessboard>` (line 252)
- [x] Fix `customSquareStyles` merge order: apply `customHighlights` first so that `selectedSquare` and `legalMoves` styles always render on top — piece selection must not be hidden by a user-placed highlight
- [ ] Smoke test: right-click highlight a square → select a piece on that square → legal move dots appear correctly over the highlight

---

## Phase 4 — Puzzle Viewer Overhaul

Bringing the puzzle viewer layout and feature completeness in line with the Interactive Study and Study viewers.

### Puzzle Viewer: Layout Redesign

**File:** `src/app/academy/lesson/[lessonId]/_components/viewer-blocks/PuzzleViewerBlock.tsx`

**Root cause:** Hardcoded `max-w-[400px] aspect-square` board with static `boardWidth={400}` (line 248). Breaks on small screens. No responsive column layout.

- [x] Add a `boardColRef` and `ResizeObserver` (copy pattern from `src/components/lessons/InteractiveStudyEditorBoard.tsx:194-208`) to compute `boardSize` dynamically
- [x] Switch outer layout to `grid grid-cols-1 lg:grid-cols-[65fr_35fr]` with `height: calc(100vh - 50px)` — matching the study viewer shells
- [x] Left column: board centred with `p-4` padding, width driven by `boardSize`
- [x] Right column: puzzle metadata (rating, themes), result feedback, hint area, retry/continue buttons — in a scrollable flex column
- [x] Mobile (below `lg`): board full width on top, controls stacked below with `overflow-y-auto`
- [x] Tablet (`md` to `lg`): board at 55%, controls at 45%

---

### Puzzle: Hints Backend Fix

**Files:** `src/components/lessons/PuzzleLessonBoard.tsx`, `src/app/academy/lesson/add/actions.ts`

**Root cause:** `PuzzleViewerBlock`'s `data` interface has a `hint` field (line 12) and renders it correctly (lines 310-317), but `PuzzleData` in `PuzzleLessonBoard.tsx` (line 33) has no `hint` field and no input for it. Hints are never saved so the button always has nothing to show. Also the disable condition is wrong.

- [x] Add `hint?: string` to the `PuzzleData` interface in `src/app/academy/lesson/add/page.tsx` (puzzle creator uses inline form, not PuzzleLessonBoard.tsx)
- [x] Add a "Hint (optional)" `<Input>` in the puzzle editor form (`add/page.tsx`)
- [x] `src/app/academy/lesson/add/actions.ts` `createPuzzleLesson` updated to accept and pass `hint` through to JSONB `blocks` column
- [x] Fix the Show Hints button: changed `disabled={!data.hint || showHint}` to `disabled={!data.hint}` — button can be tapped again to re-read hint; disables only when no hint exists

> **Note — Alternative Moves in Puzzle:** Not currently implemented. The solution is a linear move sequence. Alternatives exist only in Interactive Study via `SolvePoint.alternatives`. If needed later, add `alternatives?: string[]` per solution step mirroring that pattern. Out of scope for this update.

---

## Phase 5 — Puzzle Storm

### Architecture Decision

**New lesson type + new block type** (`puzzle_storm`). The storm is a self-contained block: one lesson, one block containing all puzzles + `timeLimit` in its `data`. `PuzzleStormViewerBlock` owns the full state machine (`idle → running → finished`) and calls `onSolved()` only when the student taps "Continue" on the results screen — keeping the lesson shell agnostic to the storm's internals.

**Model:** Lichess Puzzle Storm — shared countdown for the whole set, wrong move = auto-skip (no lives, no time penalty), score = puzzles solved correctly. Timer resets on page reload (ephemeral session state). Scores saved to DB on completion.

---

### Step 5.1 — Constants & Registry

**Files:** `src/lib/constants/lessonBlocks.ts`, `src/lib/blockRegistry.ts`

- [ ] Add `PUZZLE_STORM: 'puzzle_storm'` to `BLOCK_TYPES`
- [ ] Add `PUZZLE_STORM` to `DEFAULT_BLOCK_DATA`: `{ timeLimit: 180, puzzles: [] }`
- [ ] Add `PUZZLE_STORM` to `BLOCK_PALETTE` under `BLOCK_CATEGORIES.INTERACTIVE` with icon `'⚡'`
- [ ] Register in `BLOCK_REGISTRY`: label `'Puzzle Storm'`, description `'Timed tactical challenge — solve as many puzzles as possible before the clock runs out'`

---

### Step 5.2 — Lesson Type Modal

**File:** `src/components/lessons/LessonTypeSelectionModal.tsx`

- [ ] Add `'puzzle_storm'` to `LessonType` union: `"puzzle" | "study" | "interactive" | "puzzle_storm"`
- [ ] Add entry to `lessonTypes` array:
  - **Label:** `"Puzzle Storm"`
  - **Tagline:** `"Timed tactical challenge — solve as many puzzles as you can before the clock runs out"`
  - **Features:** `["Lichess-style storm", "Configurable time limit", "Score & accuracy tracking", "Personal best"]`

---

### Step 5.3 — DB Migration

**File:** `supabase/migrations/20260418_puzzle_storm_scores.sql`

```sql
CREATE TABLE puzzle_storm_scores (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id    UUID         NOT NULL REFERENCES lessons(id)  ON DELETE CASCADE,
  score        INTEGER      NOT NULL DEFAULT 0,
  attempted    INTEGER      NOT NULL DEFAULT 0,
  time_limit   INTEGER      NOT NULL,
  time_elapsed INTEGER      NOT NULL,
  completed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_puzzle_storm_user_lesson ON puzzle_storm_scores (user_id, lesson_id);
```

- `score` = puzzles solved correctly
- `attempted` = puzzles shown (solved + skipped)
- `time_limit` = 0 means untimed/practice
- `time_elapsed` = actual seconds used (≤ time_limit, or total session time if untimed)

No migration needed for `lessons.blocks` — JSONB is schema-flexible.

---

### Step 5.4 — Score Service

**File:** `src/services/puzzleStormService.ts` *(new)*

```ts
// Insert score; returns this user's all-time best score for the lesson
savePuzzleStormScore(
  lessonId: string,
  score: number,
  attempted: number,
  timeLimit: number,
  timeElapsed: number
): Promise<{ personalBest: number }>

// Fetch personal best for the idle pre-game screen
getPuzzleStormBest(lessonId: string): Promise<{ best: number | null }>
```

Both are `'use server'` actions. `savePuzzleStormScore` inserts then queries `MAX(score)` in one round-trip.

---

### Step 5.5 — Creator

**Files:** `src/app/academy/lesson/add/page.tsx`, `src/app/academy/lesson/add/actions.ts`

- [ ] Add `'puzzle_storm'` to `validTypes`
- [ ] Add `puzzleStormTimeLimit` state (`useState(180)`)
- [ ] `renderPuzzleStormEditor()`: time preset selector at the top + same puzzle list UI below — **all puzzle creation logic is shared, zero duplication**
- [ ] **Time preset selector** (radio-button pill group): `Off (∞) / 3 min / 5 min / 10 min` → values `0 / 180 / 300 / 600`
- [ ] `{selectedType === 'puzzle_storm' && renderPuzzleStormEditor()}` dispatch in the render

**`createPuzzleStormLesson()` server action:**

Same signature as `createPuzzleLesson` + `timeLimit: number` parameter. Packages all puzzles into ONE `puzzle_storm` block:

```ts
{
  id: "storm-1",
  type: "puzzle_storm",
  data: {
    timeLimit: 180,   // seconds; 0 = untimed
    puzzles: [
      { fen, solution: string[], description, hint, orientation }
    ]
  }
}
```

---

### Step 5.6 — Shared Utility

**File:** `src/lib/parseSolutionMove.ts` *(new — extracted)*

- [ ] Move `parseSolutionMove(raw: string, fen: string)` out of `PuzzleViewerBlock.tsx` into this file
- [ ] Update `PuzzleViewerBlock.tsx` to import from `@/lib/parseSolutionMove`
- [ ] `PuzzleStormViewerBlock.tsx` imports from the same path — no duplication of the UCI/SAN parsing logic

---

### Step 5.7 — Viewer

**File:** `src/app/academy/lesson/[lessonId]/_components/viewer-blocks/PuzzleStormViewerBlock.tsx` *(new)*

**State shape:**
```ts
type StormStatus = 'idle' | 'running' | 'finished'

// tracked in refs (never stale in callbacks):
puzzleIndexRef  // current puzzle index
timeElapsedRef  // seconds elapsed
solvedRef       // count of correct puzzles
skippedRef      // count of auto-skipped puzzles

// tracked in state (drives re-render):
status: StormStatus
displayPosition: string      // board FEN
lastMove: { from, to } | null
flashClass: 'correct' | 'wrong' | null   // CSS flash colour
solved: number
skipped: number
timeDisplay: number          // seconds — counts up or down depending on timeLimit
```

---

#### `idle` phase — Pre-game

Full-viewport centered card (no board):
- `⚡ Puzzle Storm` heading + lesson description
- Two stat pills: `N puzzles` · `3 min` (or `∞ Practice` if `timeLimit === 0`)
- `Your best: N` fetched via `getPuzzleStormBest` on mount (hidden if null / loading)
- "Start Storm" primary button

Board is **not mounted** in `idle` — clean entry, no premature Stockfish initialisation.

---

#### `running` phase — Active storm

Layout: `grid grid-cols-1 md:grid-cols-[55fr_45fr] lg:grid-cols-[65fr_35fr]` at `height: calc(100vh - 50px)`

**Left column** — board
- Same `boardColRef` + ResizeObserver pattern as `PuzzleViewerBlock`
- `customBoardStyle` gets a red or green `boxShadow` during flash (replaces inner class approach — avoids re-mounting board)
- `arePiecesDraggable`, `onPieceDrop`, `onSquareClick` — same click-to-move pattern as puzzle viewer
- No hint button

**Right column** (flex, gap-4, p-4):

1. **Timer** (largest element, top)
   - `timeLimit === 0`: up-counter `MM:SS`, neutral colour throughout
   - `timeLimit > 0`: countdown — default colour → amber (`text-amber-500`) at ≤ 60s → red (`text-red-500`) at ≤ 30s → `animate-pulse` at ≤ 10s
2. **Progress line**: `⚡ {solved} solved   ↷ {skipped} skipped   [{index + 1} / {total}]`
3. **Themes**: `{puzzle.description}` — small, muted, single line
4. `<hr className="border-border" />`
5. **Skip →** button (outline, full width) — manual skip, identical outcome to wrong move

**Correct move flow:**
1. `setFlash('correct')` → green board shadow
2. After 800ms: clear flash, increment solved, load next puzzle FEN, clear `lastMove`
3. If no next puzzle → `setStatus('finished')`

**Wrong move flow:**
1. `setFlash('wrong')` → red board shadow
2. After 600ms: clear flash, increment skipped, load next puzzle FEN
3. If no next puzzle → `setStatus('finished')`

**Skip button:** same as wrong move but skipped count only (no flash)

**Timer `useEffect`:**
```ts
useEffect(() => {
  if (status !== 'running') return
  if (timeLimit === 0) {
    // up-counter — no expiry
    const id = setInterval(() => { timeElapsedRef.current += 1; setTimeDisplay(t => t + 1) }, 1000)
    return () => clearInterval(id)
  }
  const id = setInterval(() => {
    timeElapsedRef.current += 1
    const remaining = timeLimit - timeElapsedRef.current
    setTimeDisplay(remaining)
    if (remaining <= 0) setStatus('finished')
  }, 1000)
  return () => clearInterval(id)
}, [status, timeLimit])
```

---

#### `finished` phase — Results

Board stays visible on the left, frozen at last position (`arePiecesDraggable={false}`).

Right column replaced with score card:

```
⚡  7
Puzzles solved

7 of 9 attempted  ·  78% accuracy
2:48 elapsed  /  3:00 limit

✓ New best!          (or  Best: 5)

[  Try Again  ]   [  Continue →  ]
```

- Accuracy = `(solved / attempted * 100).toFixed(0)`%  — shown as `—` if `attempted === 0`
- "Try Again" → resets all state → `setStatus('idle')`
- "Continue →" → calls `onSolved()`

**Score persistence:**
```ts
useEffect(() => {
  if (status !== 'finished' || scoreSavedRef.current) return
  scoreSavedRef.current = true   // guard against StrictMode double-fire
  savePuzzleStormScore(lessonId, solved, attempted, timeLimit, timeElapsedRef.current)
    .then(({ personalBest }) => setPersonalBest(personalBest))
    .catch(() => {})   // non-fatal — never block the results screen
}, [status])
```

---

### Step 5.8 — Shell Integration

**File:** `src/app/academy/lesson/[lessonId]/_components/LessonViewerShell.tsx`

- [ ] Import `PuzzleStormViewerBlock`
- [ ] Add to `ViewerBlockRenderer`:
  ```ts
  if (blockType === 'puzzle_storm') {
    return <PuzzleStormViewerBlock data={block.data as any} lessonId={lesson.id} onSolved={onSolved} />
  }
  ```

**Shell nav note:** The shell's Previous/Next/Finish buttons remain visible. They are a cosmetic distraction but not a functional risk — `onSolved()` only fires from the results "Continue" button. A storm lesson will typically be a single block so "Previous" is disabled and "Next/Finish" would just complete the lesson early without saving a score. Acceptable for Phase 5.

---

### Reuse Summary

| What | Strategy |
|---|---|
| Puzzle board editor (board, PGN import, solution, hint, description) | `renderPuzzleStormEditor()` renders shared puzzle state + same UI — zero new code for puzzle creation |
| `parseSolutionMove` | Extracted to `src/lib/parseSolutionMove.ts`, imported by both viewers |
| Board sizing (`boardColRef` + ResizeObserver) | Copied pattern — same 10 lines |
| `customSquareStyles` | Simplified in storm: only `lastMove` highlight + flash shadow on board wrapper. No selected square / legal move dots (no click-to-select UX needed for storm speed) |
| `BoardEditor`, `AnalysisPanel` | Unchanged — creator reuses them |

---

### Files Affected

| File | Change |
|---|---|
| `src/lib/constants/lessonBlocks.ts` | Add `PUZZLE_STORM` constant, palette entry, default data |
| `src/lib/blockRegistry.ts` | Register `PUZZLE_STORM` |
| `src/lib/parseSolutionMove.ts` | **New** — extracted from `PuzzleViewerBlock` |
| `src/components/lessons/LessonTypeSelectionModal.tsx` | Add `puzzle_storm` to `LessonType` + modal UI |
| `src/app/academy/lesson/add/page.tsx` | Add `puzzle_storm` creator + time preset selector |
| `src/app/academy/lesson/add/actions.ts` | Add `createPuzzleStormLesson` |
| `src/services/puzzleStormService.ts` | **New** — `savePuzzleStormScore`, `getPuzzleStormBest` |
| `src/app/academy/lesson/[lessonId]/_components/LessonViewerShell.tsx` | Add `puzzle_storm` block case |
| `src/app/academy/lesson/[lessonId]/_components/viewer-blocks/PuzzleStormViewerBlock.tsx` | **New** |
| `src/app/academy/lesson/[lessonId]/_components/viewer-blocks/PuzzleViewerBlock.tsx` | Update to import `parseSolutionMove` from lib |
| `supabase/migrations/20260418_puzzle_storm_scores.sql` | **New** — scores table |

---

> **Future — Lichess batch import:** Auto-fetch puzzle sets from `/api/puzzle/batch/{theme}?nb=N` and bulk-import into a storm lesson. Stowed per `project_lichess_puzzle_api.md` memory. The storm block's `puzzles[]` array is already shaped to receive this.

---

## Files Affected

| File | Phases |
|---|---|
| `src/components/lessons/InteractiveStudyEditorBoard.tsx` | 1, 2, 3 |
| `src/components/lessons/PuzzleLessonBoard.tsx` | 1, 4 |
| `src/app/academy/lesson/[lessonId]/_components/viewer-blocks/PuzzleViewerBlock.tsx` | 2, 3, 4 |
| `src/components/lessons/BoardEditor.tsx` | 1 (referenced, no changes needed) |
| `src/app/academy/lesson/add/actions.ts` | 4, 5 |
