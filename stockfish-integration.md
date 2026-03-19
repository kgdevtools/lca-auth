# Stockfish.js Integration in Next.js 16

## The Goal
Embed a chess engine in a Next.js 16 (Turbopack) app to evaluate positions in real time.

## Files Involved
- `src/services/stockfish.ts` — engine singleton
- `src/hooks/useStockfish.ts` — React interface
- `src/components/analysis/AnalysisPanel.tsx` — UI
- `public/engine/` — static engine files

## Problems & Solutions

**Wrong package** — `@lichess-org/stockfish-web` wasn't installed. Switched to the `stockfish` npm package whose pre-built files live in `node_modules/stockfish/bin/`.

**Wrong loading strategy** — tried `new Worker()` with `stockfish-18-lite.js` (multi-threaded). It requires `SharedArrayBuffer` and spawns its own internal workers, so `onmessage` never fired. Switched to `stockfish-18-lite-single.js`.

**Wrong WASM filename** — the single-threaded file hardcodes `stockfish.wasm`. Copied and renamed the wasm to match.

**Race condition crash** — two `useEffect` hooks in `AnalysisPanel` both called `analyze()` on mount, sending rapid `stop/go` pairs that caused a WASM `unreachable` crash. Fixed by removing the duplicate effect.

**Pending FEN timing** — `analyze()` was called before `readyok`. Fixed with a `pendingFenRef` queue in `useStockfish`.

## What Finally Worked
`new Worker("/engine/stockfish-18-lite-single.js")` + `public/engine/stockfish.wasm` + single `useEffect` driving analysis.
