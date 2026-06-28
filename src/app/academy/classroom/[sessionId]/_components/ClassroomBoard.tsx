'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Chess, type Square } from 'chess.js'
import { Chessboard } from '@zoendev/react-chessboard'
import type { Square as CbSquare, Piece, PromotionPieceOption } from '@zoendev/react-chessboard/dist/chessboard/types/index'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Arrow {
  from: string
  to: string
  color: string
}

export interface MoveResult {
  from: string
  to: string
  san: string
  newFen: string
  newPgn: string
}

const FEN_START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const ARROW_COLORS = [
  { name: 'Green',  color: 'green',  hex: '#22c55e' },
  { name: 'Red',    color: 'red',    hex: '#ef4444' },
  { name: 'Blue',   color: 'blue',   hex: '#3b82f6' },
  { name: 'Yellow', color: 'yellow', hex: '#eab308' },
]

interface ClassroomBoardProps {
  /** Live position — used for move-making + legal targets. */
  fen: string
  pgn: string
  /** Position actually rendered (may be a historical position while scrubbing). */
  displayFen: string
  /** Whether the local user may move right now (writable, not frozen, at live end). */
  canMove: boolean
  frozen: boolean
  arrows: Arrow[]
  highlights: string[]
  onMove: (result: MoveResult) => void
  onAnnotationsChange: (arrows: Arrow[], highlights: string[]) => void
  orientation: 'white' | 'black'
  /** Explicit board width (desktop, height-fit). Omit to self-measure the slot. */
  size?: number
}

function initGame(fen: string, pgn: string): Chess {
  if (pgn) {
    try { const g = new Chess(); g.loadPgn(pgn); return g } catch {}
  }
  try {
    const g = new Chess()
    if (fen && fen !== FEN_START) g.load(fen)
    return g
  } catch {
    return new Chess()
  }
}

function promotionPiece(opt: PromotionPieceOption): 'q' | 'r' | 'b' | 'n' {
  return opt[1].toLowerCase() as 'q' | 'r' | 'b' | 'n'
}

const LONG_PRESS_MS = 350
const MOVE_TOLERANCE = 10

export default function ClassroomBoard({
  fen,
  pgn,
  displayFen,
  canMove,
  frozen,
  arrows,
  highlights,
  onMove,
  onAnnotationsChange,
  orientation,
  size,
}: ClassroomBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [pendingPromo,   setPendingPromo]   = useState<{ from: Square; to: Square } | null>(null)
  const [drawingArrow,   setDrawingArrow]   = useState(false)
  const [measured,       setMeasured]       = useState(360)
  const boardColRef                         = useRef<HTMLDivElement>(null)
  const gameRef                             = useRef(initGame(fen, pgn))
  const prevFenRef                          = useRef(fen)

  const annoStartRef   = useRef<string | null>(null)
  const touchDownRef   = useRef<{ x: number; y: number; square: string | null } | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const drawingRef     = useRef(false)

  const boardSize = size && size > 0 ? size : measured

  // Sync game when the live FEN changes externally (broadcast position update)
  useEffect(() => {
    if (fen === prevFenRef.current) return
    prevFenRef.current = fen
    gameRef.current = initGame(fen, pgn)
    setSelectedSquare(null)
    setPendingPromo(null)
    annoStartRef.current = null
    touchDownRef.current = null
  }, [fen, pgn])

  // Self-measure only when no explicit size is supplied (mobile full-width slot).
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

  const legalTargets = useMemo<Square[]>(() => {
    if (!selectedSquare || !canMove) return []
    try {
      return new Chess(fen).moves({ square: selectedSquare, verbose: true }).map((m: any) => m.to as Square)
    } catch { return [] }
  }, [selectedSquare, fen, canMove])

  const customSquareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    const s: Record<string, React.CSSProperties> = {}
    highlights.forEach(sq => { s[sq] = { backgroundColor: 'rgba(234,179,8,0.45)' } })
    if (selectedSquare && canMove) {
      s[selectedSquare] = { backgroundColor: 'rgba(255,255,0,0.5)' }
      legalTargets.forEach(sq => {
        s[sq] = { background: 'radial-gradient(circle, rgba(0,0,0,0.18) 28%, transparent 28%)' }
      })
    }
    return s
  }, [highlights, selectedSquare, canMove, legalTargets])

  const customArrowsMap = useMemo(() =>
    arrows.map(a => {
      const hex = ARROW_COLORS.find(c => c.color === a.color)?.hex ?? '#22c55e'
      return [a.from, a.to, hex] as [CbSquare, CbSquare, string]
    })
  , [arrows])

  // ── Moves ──────────────────────────────────────────────────────────────────
  const tryMove = useCallback((source: Square, target: Square, promo?: 'q' | 'r' | 'b' | 'n'): boolean => {
    if (!canMove) return false
    const game = gameRef.current
    let result
    try { result = game.move({ from: source, to: target, promotion: promo ?? 'q' }) } catch { return false }
    if (!result) return false
    setSelectedSquare(null)
    setPendingPromo(null)
    onMove({ from: source, to: target, san: result.san, newFen: game.fen(), newPgn: game.pgn() })
    return true
  }, [canMove, onMove])

  const handlePieceDrop = useCallback((source: CbSquare, target: CbSquare) =>
    tryMove(source as Square, target as Square), [tryMove])

  const handlePromotionCheck = useCallback((from: CbSquare, to: CbSquare, piece: Piece): boolean => {
    const isWhite = piece === 'wP' && from[1] === '7' && to[1] === '8'
    const isBlack = piece === 'bP' && from[1] === '2' && to[1] === '1'
    if ((isWhite || isBlack) && canMove) {
      setPendingPromo({ from: from as Square, to: to as Square })
      return true
    }
    return false
  }, [canMove])

  const handlePromotionSelect = useCallback((opt?: PromotionPieceOption, from?: CbSquare, to?: CbSquare): boolean => {
    const src = (from as Square | undefined) ?? pendingPromo?.from
    const dst = (to as Square | undefined) ?? pendingPromo?.to
    if (!src || !dst || !opt) { setPendingPromo(null); return false }
    return tryMove(src, dst, promotionPiece(opt))
  }, [pendingPromo, tryMove])

  const handleSquareClick = useCallback((square: CbSquare) => {
    const sq = square as Square
    if (!canMove) return
    const reader = new Chess(fen)
    if (selectedSquare) {
      if (selectedSquare === sq) { setSelectedSquare(null); return }
      if (legalTargets.includes(sq)) {
        const sel = reader.get(selectedSquare)
        const isPromo = sel?.type === 'p' &&
          ((sel.color === 'w' && sq[1] === '8') || (sel.color === 'b' && sq[1] === '1'))
        if (isPromo) { setPendingPromo({ from: selectedSquare, to: sq }); return }
        const moved = tryMove(selectedSquare, sq)
        if (!moved) { const p = reader.get(sq); setSelectedSquare(p ? sq : null) }
        return
      }
      const p = reader.get(sq)
      setSelectedSquare(p ? sq : null)
    } else {
      const p = reader.get(sq)
      if (p) setSelectedSquare(sq)
    }
  }, [canMove, selectedSquare, legalTargets, tryMove, fen])

  // ── Annotation gestures (mouse right-drag + touch long-press-drag) ───────────
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
      onAnnotationsChange(
        arrows,
        highlights.includes(start) ? highlights.filter(s => s !== start) : [...highlights, start],
      )
      return
    }
    if (!arrows.some(a => a.from === start && a.to === end)) {
      onAnnotationsChange([...arrows, { from: start, to: end, color: 'green' }], highlights)
    }
  }, [arrows, highlights, squareAtPoint, onAnnotationsChange])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') {
      if (e.button === 2) annoStartRef.current = squareAtPoint(e.clientX, e.clientY)
      return
    }
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

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' || drawingRef.current || !touchDownRef.current) return
    if (Math.hypot(e.clientX - touchDownRef.current.x, e.clientY - touchDownRef.current.y) > MOVE_TOLERANCE) {
      clearLongPress()
      touchDownRef.current = null
    }
  }, [clearLongPress])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') {
      if (e.button === 2) finishAnnotation(e.clientX, e.clientY)
      return
    }
    clearLongPress()
    if (drawingRef.current) {
      finishAnnotation(e.clientX, e.clientY)
      drawingRef.current = false
      setDrawingArrow(false)
    }
    touchDownRef.current = null
  }, [finishAnnotation, clearLongPress])

  const handlePointerCancel = useCallback(() => {
    clearLongPress()
    touchDownRef.current = null
    annoStartRef.current = null
    if (drawingRef.current) { drawingRef.current = false; setDrawingArrow(false) }
  }, [clearLongPress])

  return (
    <div ref={boardColRef} className="flex items-center justify-center w-full h-full min-w-0 min-h-0">
      <div className="relative" style={{ width: boardSize, height: boardSize }}>
        {frozen && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none rounded-sm">
            <div className="bg-black/50 backdrop-blur-sm rounded-sm px-3 py-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-white" />
              <span className="text-white text-xs font-semibold tracking-wide">Frozen</span>
            </div>
          </div>
        )}
        <div
          className={cn('rounded-sm overflow-hidden border border-border shadow-md', frozen && 'opacity-75')}
          style={{ touchAction: drawingArrow ? 'none' : undefined }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onContextMenu={e => e.preventDefault()}
        >
          <Chessboard
            position={displayFen}
            boardWidth={boardSize}
            boardOrientation={orientation}
            arePiecesDraggable={canMove && !drawingArrow}
            onSquareClick={handleSquareClick}
            onPieceDrop={handlePieceDrop}
            onPromotionCheck={handlePromotionCheck}
            onPromotionPieceSelect={handlePromotionSelect}
            promotionDialogVariant="modal"
            showPromotionDialog={pendingPromo !== null}
            promotionToSquare={pendingPromo?.to as CbSquare | undefined}
            areArrowsAllowed={false}
            animationDuration={150}
            customSquareStyles={customSquareStyles}
            customArrows={customArrowsMap.length > 0 ? customArrowsMap : undefined}
          />
        </div>
      </div>
    </div>
  )
}
