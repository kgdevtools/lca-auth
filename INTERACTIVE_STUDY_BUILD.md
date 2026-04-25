# Interactive Study Lesson — Builder Reference 20260411

## What Is It?
An Interactive Study is a Study lesson where the coach marks specific moves in the PGN as **solve points** — moves the student must find on the board. The study plays through normally until a solve point is reached; at that moment the move list hides what comes next, the board goes interactive, and the student must play the correct move (or an accepted alternative) before the study continues.

---

## How It Works — Student View

1. Student opens the lesson. Board shows the starting position (or from a set FEN if the creator configured it that way). Move list is visible up to (but not including) the first solve point.
2. Student clicks through the study freely — reading annotations, comments, arrows, highlights — as in a normal study.
3. When the student navigates to the position just before a solve point, the board activates **puzzle mode**:
   - Pieces become draggable; click-to-move and square highlighting/arrows are all available.
   - The solve point move in the list shows as `?` (hidden).
   - A prompt appears near the move list: either *"Find the best move"* or the **custom description the creator wrote for that solve point**.
4. Student plays a move on the board:
   - **Correct (main move):** green flash, the `?` reveals the actual SAN, full points recorded.
   - **Correct (alternative):** green flash, reveals, partial points recorded.
   - **Wrong:** red flash + illegal-reason message, retry freely. No penalty for retries.
5. After a correct solve:
   - The opponent's response (if any) **auto-plays after ~800 ms**.
   - All study moves, comments, arrows, and highlights up to the **next solve point** become visible.
   - The next solve point activates — board goes interactive again, `?` appears, prompt shows.
   - This repeats until the end of the chapter (Lichess-style "Interactive Lesson" loop).
6. At the end of a chapter the **Next Chapter** button pulses (`animate-pulse`).
7. At the end of the last chapter `onSolved()` fires → lesson complete screen.

---

## How It Works — Coach/Creator View

1. Coach selects **Interactive Study** from the lesson-type modal.
2. Adds chapters exactly as in a normal Study — enter chapter name + PGN, click **Add Chapter** (or import from Lichess / upload PGN file).
3. After a chapter is added and selected, the **move list** (already rendered in the left panel) shows each move as usual — but now each move chip is interactive:
   - Clicking/hovering a move chip reveals a small inline `◎` toggle (target icon) right on the chip.
   - Clicking `◎` marks the move as a **solve point** — the chip highlights amber.
4. When a move is marked as a solve point, a small inline form **expands below that move chip**:
   - **Description** (optional): text shown to the student as the prompt, e.g. *"White has a winning tactic — find it!"*. If left blank, shows generic "Find the best move".
   - **Alternatives** (optional): comma-separated SAN strings for moves also accepted with partial credit, e.g. `Nf6, Nd4`.
   - Clicking `◎` again (or a small `×`) removes the solve point and collapses the form.
5. Coach can mark as many moves as desired across as many chapters as desired.
6. Fills in lesson metadata (title, difficulty, assign students) and clicks **Create lesson**.

> The solve-point UI lives **entirely within the existing move list** — no separate panel or section.

---

## Data Shape

```ts
// A single solve point inside a chapter
interface SolvePoint {
  moveIndex: number        // 0-based index in parsedMoves[] for this chapter
  description?: string     // prompt text shown to the student (optional)
  alternatives?: string[]  // accepted alternative SAN strings (partial credit)
}

// Chapter (extends standard StudyChapter)
interface InteractiveStudyChapter {
  id: string
  name: string
  orientation: 'white' | 'black'
  pgn: string
  solveMoves?: SolvePoint[]   // ← the only new field vs. Study
  headers?: Record<string, string>
  moves?: ParsedPgnMove[]
  fullPgn?: string
}

// Block data (same shape as Study, different type)
interface InteractiveStudyBlockData {
  chapters: InteractiveStudyChapter[]
  displaySettings?: { showEval, showClocks, showArrows, showHighlights }
}
```

Block type constant: `'interactive_study'`

---

## Key Logic Notes

| Concern | Approach |
|---|---|
| Hidden moves | `visibleUpTo = nextUnsolved ? nextUnsolved.moveIndex - 1 : parsedMoves.length - 1` |
| Solve mode active | `currentMoveIndex === nextUnsolved.moveIndex - 1` |
| Initial position | `currentMoveIndex = -1` → loop `i <= -1` runs 0 times → starting FEN |
| Student prompt | `nextUnsolved.description ?? "Find the best move"` |
| Alternative matching | `new Chess(fen).move(altSan)` → compare `.from` / `.to` |
| Solved state key | `"${chapterIndex}:${moveIndex}"` → `'main' \| 'alternative'` |
| Auto-play response | `setTimeout(800ms)` advance by 1 if next move is not itself a solve point |
| Points hook | `solvedMap` available at `onSolved()` for future gamification integration |

---

## File Checklist

### Phase 1 — Infrastructure (constants → schema → registry) ✅
- [x] **`src/lib/constants/lessonBlocks.ts`**
  - [x] Add `INTERACTIVE_STUDY: 'interactive_study'` to `BLOCK_TYPES`
  - [x] Add palette entry `{ type, label: 'Interactive Study', icon: '🎯', category: INTERACTIVE, description: 'Study with embedded solve points' }`
  - [x] Add `DEFAULT_BLOCK_DATA['interactive_study']` = `{ chapters: [], displaySettings: { showEval: true, showClocks: true, showArrows: true, showHighlights: true } }`

- [x] **`src/lib/lessonSchema.ts`**
  - [x] Add `solvePointSchema = z.object({ moveIndex: z.number().int().min(0), description: z.string().optional(), alternatives: z.array(z.string()).optional() })`
  - [x] Add `interactiveStudyBlockDataSchema` — same as `studyBlockDataSchema` + `solveMoves?: z.array(solvePointSchema)` per chapter
  - [x] Add to `blockDataSchema` discriminated union

- [x] **`src/lib/blockRegistry.ts`**
  - [x] Add registry entry for `INTERACTIVE_STUDY`

- [x] **`src/services/lesson/blockService.ts`** *(bonus fix)*
  - [x] Added `INTERACTIVE_STUDY: 0` to `getBlockCountByType` record

---

### Phase 2 — Server Action ✅
- [x] **`src/app/academy/lesson/add/actions.ts`**
  - [x] Add `SolvePoint` interface
  - [x] Add `createInteractiveStudyLesson(lessonInfo, chapters, displaySettings, solveMovesByChapterId, moveAnnotations?, studentIds?)`
  - [x] Clone of `createStudyLesson` with block type `'interactive_study'` and `solveMoves` merged into each chapter

---

### Phase 3 — Viewer Block (student side) ✅
- [x] **`src/app/academy/lesson/[lessonId]/_components/viewer-blocks/InteractiveStudyViewerBlock.tsx`** *(new)*
  - [x] State: `currentChapterIndex`, `currentMoveIndex` (starts -1), `parsedMoves`, `fenHistory`, `solvedMap`, `selectedSquare`, `wrongMoveMade`, `illegalReason`, `lastMove`, `customHighlights`, `chapterDropdownOpen`
  - [x] `useEffect` on chapter change: parse PGN → `parsedMoves` + `fenHistory`, reset `currentMoveIndex` to -1
  - [x] Derived: `nextUnsolved`, `isSolveMode`, `maxNavIndex`, `visibleUpTo`, `boardFen`
  - [x] Move list: normal buttons 0..`visibleUpTo-1`, `?` placeholder at solve point (amber, clickable), hidden beyond; solved points show `✓`
  - [x] Prompt area: show `nextUnsolved.description ?? "Find the best move"` when `isSolveMode`
  - [x] `handleSolveMove(from, to)`: main → alternatives → wrong; on correct update `solvedMap`, advance, auto-play response after 800ms
  - [x] Board: `arePiecesDraggable={isSolveMode}`, click-to-move in solve mode, highlights-only outside solve mode
  - [x] Nav buttons: Next disabled when `isSolveMode`
  - [x] Chapter dropdown
  - [x] Next Chapter button pulses (`animate-pulse`) at end-of-chapter; `onSolved()` at end of last chapter

- [x] **`src/app/academy/lesson/[lessonId]/_components/LessonViewerShell.tsx`**
  - [x] Import `InteractiveStudyViewerBlock`
  - [x] Add `if (blockType === 'interactive_study')` case

---

### Phase 4 — Editor Board (coach side) ✅
- [x] **`src/components/lessons/InteractiveStudyEditorBoard.tsx`** *(new)*
  - [x] Same props as `StudyEditorBoard` + `solveMovesByChapterId: Record<string, SolvePoint[]>` + `onSolveMovesByChapterIdChange`
  - [x] LEFT panel: board + toolbar + nav identical to `StudyEditorBoard`
  - [x] Move list: each move chip has an inline `◎` toggle (shows on hover for unmarked moves, always visible when marked)
    - [x] Marked move: amber tinted chip
    - [x] When marked: solve point detail form appears in section below move list — **Description** input + **Alternatives** input (comma-separated SAN)
    - [x] Click `◎` again (or `×`) to unmark
  - [x] RIGHT panel: identical chapters panel — chapter list shows `◎ N` solve point count badge per chapter
  - [x] `onToggleSolvePoint(moveIndex)`: add/remove from current chapter's solve list
  - [x] `onUpdateSolvePoint(moveIndex, patch)`: update `description` and/or `alternatives[]`

- [x] **`src/app/academy/lesson/add/page.tsx`**
  - [x] Import `InteractiveStudyEditorBoard` + `SolvePoint` type
  - [x] Add `interactiveSolveMoves` state: `useState<Record<string, SolvePoint[]>>({})`
  - [x] Replaced `renderInteractiveEditor()` placeholder with real editor
  - [x] Submit calls `createInteractiveStudyLesson` (reuses same chapter state as study)
  - [x] Resets `interactiveSolveMoves` on successful submit

---

### Verification ⬜
- [ ] `tsc --noEmit` — zero errors
- [ ] `/academy/lesson/add?type=interactive` shows editor, not placeholder
- [ ] Add chapter → mark 2 moves as solve points → add descriptions/alternatives → save lesson
- [ ] Student view: moves after first solve point are hidden; prompt shows creator's description
- [ ] Correct main move → green → opponent auto-responds → study reveals up to next solve point
- [ ] Alternative move → also accepted (partial credit in solvedMap)
- [ ] Wrong move → red flash + message → retry works
- [ ] After last solve in chapter → Next Chapter pulses
- [ ] After last chapter → lesson complete screen
