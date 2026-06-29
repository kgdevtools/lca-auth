'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Chess, type Square } from 'chess.js'
import { Chessboard } from '@zoendev/react-chessboard'
import type { Square as CbSquare, Piece, PromotionPieceOption } from '@zoendev/react-chessboard/dist/chessboard/types/index'
import type { StoredPuzzle } from '@/services/dailyPuzzleService'

interface DailyPuzzleBoardProps {
  puzzle: StoredPuzzle
  /** Current solve status, owned by the parent so the side panel can react. */
  status: 'solving' | 'correct' | 'wrong' | 'revealed'
  onStatusChange: (s: 'solving' | 'correct' | 'wrong' | 'revealed') => void
  /** Fires once when the puzzle is solved cleanly (no wrong moves, no reveal). */
  onSolved: (clean: boolean) => void
  /** Played SAN moves (for the side MoveList). */
  onMovesChange: (sans: string[]) => void
  flipped: boolean
  size?: number
  /** Bumping this resets the board (Retry). */
  resetSignal: number
  /** Reveal the full solution on the board (Solution button). */
  reveal: boolean
}

// Accepts dashed UCI ("h3-g4"), plain UCI ("g7g5"/"e7e8q"), or SAN ("Qf2","O-O").
function parseSolutionMove(raw: string, fen: string): { from: string; to: string; promo?: string } | null {
  const t = raw.trim()
  if (/^[a-h][1-8]-[a-h][1-8]$/.test(t)) { const [f, to] = t.split('-'); return { from: f, to } }
  if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(t)) return { from: t.slice(0, 2), to: t.slice(2, 4), promo: t[4] }
  try { const g = new Chess(fen); const m = g.move(t); if (m) return { from: m.from, to: m.to, promo: m.promotion } } catch {}
  return null
}

function promotionPiece(opt: PromotionPieceOption): 'q' | 'r' | 'b' | 'n' {
  return opt[1].toLowerCase() as 'q' | 'r' | 'b' | 'n'
}

const LONG_PRESS_MS = 350
const MOVE_TOLERANCE = 10

export default function DailyPuzzleBoard({
  puzzle, status, onStatusChange, onSolved, onMovesChange, flipped, size, resetSignal, reveal,
}: DailyPuzzleBoardProps) {
  const startFen = puzzle.fen
  const solution = puzzle.solution

  // Lichess format: at the stored FEN it's the opponent's turn (solution[0] is
  // their pre-move); the student plays the OPPOSITE colour.
  const fenTurn     = startFen.split(' ')[1] === 'b' ? 'b' : 'w'
  const playerColor: 'w' | 'b' = fenTurn === 'w' ? 'b' : 'w'
  const orientation = playerColor === 'w' ? 'white' : 'black'

  const [displayFen,    setDisplayFen]    = useState(startFen)
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [pendingPromo,  setPendingPromo]  = useState<{ from: Square; to: Square } | null>(null)
  const [lastMove,      setLastMove]      = useState<{ from: string; to: string } | null>(null)
  const [wrongFlash,    setWrongFlash]    = useState(false)
  const [measured,      setMeasured]      = useState(360)
  const [arrows,        setArrows]        = useState<[CbSquare, CbSquare, string][]>([])
  const [highlights,    setHighlights]    = useState<string[]>([])
  const [drawingArrow,  setDrawingArrow]  = useState(false)

  const boardColRef = useRef<HTMLDivElement>(null)
  const positionRef = useRef(startFen)
  const moveIndexRef = useRef(0)
  const solvedRef = useRef(false)
  const boardBusyRef = useRef(false)
  const hadWrongRef = useRef(false)
  const playedSansRef = useRef<string[]>([])

  // annotation gesture refs
  const annoStartRef   = useRef<string | null>(null)
  const touchDownRef   = useRef<{ x: number; y: number; square: string | null } | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const drawingRef     = useRef(false)

  const boardSize = size && size > 0 ? size : measured

  // ── Reset (mount, puzzle change, retry) — then auto-play opponent pre-move ───
  useEffect(() => {
    positionRef.current = startFen
    moveIndexRef.current = 0
    solvedRef.current = false
    boardBusyRef.current = false
    hadWrongRef.current = false
    playedSansRef.current = []
    onMovesChange([])
    setDisplayFen(startFen)
    setSelectedSquare(null)
    setPendingPromo(null)
    setLastMove(null)
    setWrongFlash(false)
    setArrows([])
    setHighlights([])

    if (!solution[0]) return
    const parsed = parseSolutionMove(solution[0], startFen)
    if (!parsed) return
    boardBusyRef.current = true
    const t = setTimeout(() => {
      try {
        const g = new Chess(startFen)
        const r = g.move({ from: parsed.from, to: parsed.to, promotion: 'q' })
        if (r) {
          positionRef.current = g.fen()
          moveIndexRef.current = 1
          setDisplayFen(g.fen())
          setLastMove({ from: parsed.from, to: parsed.to })
        }
      } catch {}
      boardBusyRef.current = false
    }, 450)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startFen, resetSignal])

  // ── Reveal full solution on the board ───────────────────────────────────────
  useEffect(() => {
    if (!reveal) return
    try {
      const g = new Chess(startFen)
      for (const raw of solution) {
        const p = parseSolutionMove(raw, g.fen())
        if (!p) break
        g.move({ from: p.from, to: p.to, promotion: (p.promo as 'q') ?? 'q' })
      }
      setDisplayFen(g.fen())
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal])

  // ── Self-measure (mobile full-width slot) ───────────────────────────────────
  useEffect(() => {
    if (size && size > 0) return
    const el = boardColRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setMeasured(Math.max(180, Math.min(Math.floor(width), Math.floor(height), 560)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [size])

  const canMove = status !== 'correct' && status !== 'revealed' && !reveal

  const legalTargets = useMemo<Square[]>(() => {
    if (!selectedSquare || !canMove) return []
    try {
      return new Chess(positionRef.current).moves({ square: selectedSquare, verbose: true }).map((m: any) => m.to as Square)
    } catch { return [] }
  }, [selectedSquare, canMove, displayFen])

  // ── Puzzle move validation ──────────────────────────────────────────────────
  const tryMove = useCallback((from: Square, to: Square, promo?: 'q' | 'r' | 'b' | 'n'): boolean => {
    if (solvedRef.current || boardBusyRef.current || !canMove) return false
    const expectedRaw = solution[moveIndexRef.current]
    if (!expectedRaw) return false
    const parsed = parseSolutionMove(expectedRaw, positionRef.current)
    if (!parsed) return false

    if (from === parsed.from && to === parsed.to) {
      const g = new Chess(positionRef.current)
      let res
      try { res = g.move({ from, to, promotion: promo ?? 'q' }) } catch { return false }
      if (!res) return false
      positionRef.current = g.fen()
      moveIndexRef.current += 1
      playedSansRef.current = [...playedSansRef.current, res.san]
      onMovesChange(playedSansRef.current)
      setDisplayFen(g.fen())
      setLastMove({ from, to })
      setSelectedSquare(null)
      setWrongFlash(false)
      onStatusChange('solving')

      const next = solution[moveIndexRef.current]
      if (!next) {
        solvedRef.current = true
        onStatusChange('correct')
        onSolved(!hadWrongRef.current)
        return true
      }
      // auto-play opponent's reply
      boardBusyRef.current = true
      setTimeout(() => {
        const np = parseSolutionMove(next, positionRef.current)
        if (np) {
          const ng = new Chess(positionRef.current)
          const nr = ng.move({ from: np.from, to: np.to, promotion: 'q' })
          if (nr) {
            positionRef.current = ng.fen()
            moveIndexRef.current += 1
            playedSansRef.current = [...playedSansRef.current, nr.san]
            onMovesChange(playedSansRef.current)
            setDisplayFen(ng.fen())
            setLastMove({ from: np.from, to: np.to })
            if (moveIndexRef.current >= solution.length) {
              solvedRef.current = true
              onStatusChange('correct')
              onSolved(!hadWrongRef.current)
            }
          }
        }
        boardBusyRef.current = false
      }, 350)
      return true
    }

    // wrong move — flash, do not commit
    hadWrongRef.current = true
    setWrongFlash(true)
    setLastMove({ from, to })
    onStatusChange('wrong')
    setSelectedSquare(null)
    setTimeout(() => setWrongFlash(false), 500)
    return false
  }, [canMove, solution, onMovesChange, onStatusChange, onSolved])

  const handlePieceDrop = useCallback((s: CbSquare, t: CbSquare) => tryMove(s as Square, t as Square), [tryMove])

  const handlePromotionCheck = useCallback((from: CbSquare, to: CbSquare, piece: Piece): boolean => {
    const isW = piece === 'wP' && from[1] === '7' && to[1] === '8'
    const isB = piece === 'bP' && from[1] === '2' && to[1] === '1'
    if ((isW || isB) && canMove) { setPendingPromo({ from: from as Square, to: to as Square }); return true }
    return false
  }, [canMove])

  const handlePromotionSelect = useCallback((opt?: PromotionPieceOption, from?: CbSquare, to?: CbSquare): boolean => {
    const src = (from as Square | undefined) ?? pendingPromo?.from
    const dst = (to as Square | undefined) ?? pendingPromo?.to
    if (!src || !dst || !opt) { setPendingPromo(null); return false }
    const ok = tryMove(src, dst, promotionPiece(opt))
    setPendingPromo(null)
    return ok
  }, [pendingPromo, tryMove])

  const handleSquareClick = useCallback((square: CbSquare) => {
    const sq = square as Square
    if (!canMove) return
    const reader = new Chess(positionRef.current)
    if (selectedSquare) {
      if (selectedSquare === sq) { setSelectedSquare(null); return }
      if (legalTargets.includes(sq)) {
        const sel = reader.get(selectedSquare)
        const isPromo = sel?.type === 'p' && ((sel.color === 'w' && sq[1] === '8') || (sel.color === 'b' && sq[1] === '1'))
        if (isPromo) { setPendingPromo({ from: selectedSquare, to: sq }); return }
        tryMove(selectedSquare, sq)
        return
      }
      const p = reader.get(sq)
      setSelectedSquare(p && p.color === playerColor ? sq : null)
    } else {
      const p = reader.get(sq)
      if (p && p.color === playerColor) setSelectedSquare(sq)
    }
  }, [canMove, selectedSquare, legalTargets, tryMove, playerColor])

  // ── Annotation gestures (right-drag / long-press-drag) ──────────────────────
  const squareAtPoint = useCallback((x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null
    return el?.closest('[data-square]')?.getAttribute('data-square') ?? null
  }, [])
  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }, [])
  const finishAnnotation = useCallback((x: number, y: number) => {
    const start = annoStartRef.current
    annoStartRef.current = null
    if (!start) return
    const end = squareAtPoint(x, y)
    if (!end || start === end) {
      setHighlights(prev => prev.includes(start) ? prev.filter(s => s !== start) : [...prev, start])
      return
    }
    setArrows(prev => prev.some(a => a[0] === start && a[1] === end)
      ? prev
      : [...prev, [start as CbSquare, end as CbSquare, 'rgba(255,128,0,0.85)']])
  }, [squareAtPoint])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') { if (e.button === 2) annoStartRef.current = squareAtPoint(e.clientX, e.clientY); return }
    const square = squareAtPoint(e.clientX, e.clientY)
    touchDownRef.current = { x: e.clientX, y: e.clientY, square }
    clearLongPress()
    longPressTimer.current = setTimeout(() => {
      if (!touchDownRef.current) return
      annoStartRef.current = touchDownRef.current.square
      drawingRef.current = true
      setDrawingArrow(true)
    }, LONG_PRESS_MS)
  }, [squareAtPoint, clearLongPress])
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' || drawingRef.current || !touchDownRef.current) return
    if (Math.hypot(e.clientX - touchDownRef.current.x, e.clientY - touchDownRef.current.y) > MOVE_TOLERANCE) {
      clearLongPress(); touchDownRef.current = null
    }
  }, [clearLongPress])
  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') { if (e.button === 2) finishAnnotation(e.clientX, e.clientY); return }
    clearLongPress()
    if (drawingRef.current) { finishAnnotation(e.clientX, e.clientY); drawingRef.current = false; setDrawingArrow(false) }
    touchDownRef.current = null
  }, [finishAnnotation, clearLongPress])
  const onPointerCancel = useCallback(() => {
    clearLongPress(); touchDownRef.current = null; annoStartRef.current = null
    if (drawingRef.current) { drawingRef.current = false; setDrawingArrow(false) }
  }, [clearLongPress])

  // ── Square styles ───────────────────────────────────────────────────────────
  const squareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    const s: Record<string, React.CSSProperties> = {}
    highlights.forEach(sq => { s[sq] = { backgroundColor: 'rgba(255,128,0,0.5)' } })
    if (lastMove) {
      const c = wrongFlash ? 'rgba(239,68,68,0.5)' : 'rgba(155,199,0,0.41)'
      s[lastMove.from] = { backgroundColor: c }
      s[lastMove.to] = { backgroundColor: c }
    }
    if (selectedSquare && canMove) {
      s[selectedSquare] = { backgroundColor: 'rgba(20,85,30,0.5)' }
      legalTargets.forEach(sq => { s[sq] = { background: 'radial-gradient(circle, rgba(0,0,0,0.2) 28%, transparent 28%)' } })
    }
    return s
  }, [highlights, lastMove, wrongFlash, selectedSquare, canMove, legalTargets])

  const boardOrientation = flipped ? (orientation === 'white' ? 'black' : 'white') : orientation

  return (
    <div ref={boardColRef} className="flex items-center justify-center w-full h-full min-w-0 min-h-0">
      <div className="relative" style={{ width: boardSize, height: boardSize }}>
        <div
          className="rounded-sm overflow-hidden border border-border shadow-md"
          style={{ touchAction: drawingArrow ? 'none' : undefined }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onContextMenu={e => e.preventDefault()}
        >
          <Chessboard
            position={displayFen}
            boardWidth={boardSize}
            boardOrientation={boardOrientation}
            arePiecesDraggable={canMove && !drawingArrow}
            onSquareClick={handleSquareClick}
            onPieceDrop={handlePieceDrop}
            onPromotionCheck={handlePromotionCheck}
            onPromotionPieceSelect={handlePromotionSelect}
            promotionDialogVariant="modal"
            showPromotionDialog={pendingPromo !== null}
            promotionToSquare={pendingPromo?.to as CbSquare | undefined}
            areArrowsAllowed={false}
            animationDuration={200}
            customSquareStyles={squareStyles}
            customArrows={arrows.length > 0 ? arrows : undefined}
          />
        </div>
      </div>
    </div>
  )
}
