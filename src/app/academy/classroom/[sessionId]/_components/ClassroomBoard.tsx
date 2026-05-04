'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Chess, type Square } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { MoreVertical, X, Lock, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
  { name: 'Green',  value: 'G', color: 'green',  hex: '#22c55e' },
  { name: 'Red',    value: 'R', color: 'red',    hex: '#ef4444' },
  { name: 'Blue',   value: 'B', color: 'blue',   hex: '#3b82f6' },
  { name: 'Yellow', value: 'Y', color: 'yellow', hex: '#eab308' },
]

interface ClassroomBoardProps {
  fen: string
  pgn: string
  isWritable: boolean
  frozen: boolean
  remoteArrows?: Arrow[]
  remoteHighlights?: string[]
  onMove: (result: MoveResult) => void
  onAnnotationsChange?: (arrows: Arrow[], highlights: string[]) => void
  // Coach-only position controls — omit for student view
  onReset?: () => void
  onSetFen?: (fen: string) => void
  onLoadPgn?: (fen: string, pgn: string) => void
  controlsDisabled?: boolean
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

type InputMode = 'none' | 'fen' | 'pgn'

export default function ClassroomBoard({
  fen,
  pgn,
  isWritable,
  frozen,
  remoteArrows = [],
  remoteHighlights = [],
  onMove,
  onAnnotationsChange,
  onReset,
  onSetFen,
  onLoadPgn,
  controlsDisabled = false,
}: ClassroomBoardProps) {
  const [orientation,    setOrientation]    = useState<'white' | 'black'>('white')
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [arrows,         setArrows]         = useState<Arrow[]>(remoteArrows)
  const [highlights,     setHighlights]     = useState<string[]>(remoteHighlights)
  const [inputMode,      setInputMode]      = useState<InputMode>('none')
  const [inputValue,     setInputValue]     = useState('')
  const [inputError,     setInputError]     = useState<string | null>(null)
  const [viewIndex,      setViewIndex]      = useState(-1) // -1 = live end
  const boardColRef                         = useRef<HTMLDivElement>(null)
  const [boardSize,      setBoardSize]      = useState(480)
  const gameRef                             = useRef(initGame(fen, pgn))
  const prevFenRef                          = useRef(fen)
  const rightDragStartRef                   = useRef<string | null>(null)
  const rightDragCurrentRef                 = useRef<string | null>(null)

  const hasCoachControls = !!(onReset || onSetFen || onLoadPgn)

  const closeInput = () => { setInputMode('none'); setInputValue(''); setInputError(null) }

  const openInput = (mode: 'fen' | 'pgn') => {
    setInputMode(prev => prev === mode ? 'none' : mode)
    setInputValue('')
    setInputError(null)
  }

  const handleApplyInput = () => {
    setInputError(null)
    if (inputMode === 'fen') {
      try {
        new Chess(inputValue.trim())
        onSetFen?.(inputValue.trim())
        closeInput()
      } catch { setInputError('Invalid FEN string') }
    } else if (inputMode === 'pgn') {
      try {
        const g = new Chess(); g.loadPgn(inputValue.trim())
        onLoadPgn?.(g.fen(), g.pgn())
        closeInput()
      } catch { setInputError('Invalid PGN') }
    }
  }

  // Sync game when FEN changes externally (broadcast position update)
  useEffect(() => {
    if (fen === prevFenRef.current) return
    prevFenRef.current = fen
    gameRef.current = initGame(fen, pgn)
    setSelectedSquare(null)
    rightDragStartRef.current = null
    rightDragCurrentRef.current = null
  }, [fen, pgn])

  useEffect(() => { setArrows(remoteArrows) },         [remoteArrows])
  useEffect(() => { setHighlights(remoteHighlights) }, [remoteHighlights])

  // Build FEN history from PGN for navigation
  const fenHistory = useMemo<string[]>(() => {
    if (!pgn) return []
    try {
      const g = new Chess()
      g.loadPgn(pgn)
      const hist = g.history({ verbose: true }) as Array<{ san: string }>
      const temp = new Chess()
      const fens: string[] = [temp.fen()]
      for (const m of hist) {
        try { temp.move(m.san); fens.push(temp.fen()) } catch {}
      }
      return fens
    } catch { return [] }
  }, [pgn])

  // When new moves arrive (pgn changes), jump back to live end
  useEffect(() => { setViewIndex(-1) }, [pgn])

  useEffect(() => {
    const el = boardColRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setBoardSize(Math.max(200, Math.min(Math.floor(width) - 8, Math.floor(height) - 56)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Navigation: -1 = live end; 0..n = specific position in history
  const totalPositions = fenHistory.length  // 0 when no pgn
  const effectiveIdx   = viewIndex === -1 ? totalPositions - 1 : Math.min(viewIndex, totalPositions - 1)
  const isAtEnd        = totalPositions === 0 || effectiveIdx >= totalPositions - 1
  const displayFen     = !isAtEnd && fenHistory[effectiveIdx] != null ? fenHistory[effectiveIdx] : fen

  const canNavBack    = totalPositions > 0 && effectiveIdx > 0
  const canNavForward = !isAtEnd

  const goToStart = () => setViewIndex(0)
  const goToPrev  = () => setViewIndex(Math.max(0, effectiveIdx - 1))
  const goToNext  = () => {
    const next = effectiveIdx + 1
    if (next >= totalPositions - 1) setViewIndex(-1)
    else setViewIndex(next)
  }
  const goToEnd = () => setViewIndex(-1)

  const canMove = isWritable && !frozen && isAtEnd

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
      return [a.from, a.to, hex] as [string, string, string]
    })
  , [arrows])

  const updateAnnotations = useCallback((nextArrows: Arrow[], nextHighlights: string[]) => {
    setArrows(nextArrows)
    setHighlights(nextHighlights)
    onAnnotationsChange?.(nextArrows, nextHighlights)
  }, [onAnnotationsChange])

  const tryMove = useCallback((source: Square, target: Square): boolean => {
    if (!canMove) return false
    const game = gameRef.current
    let result
    try { result = game.move({ from: source, to: target, promotion: 'q' }) } catch { return false }
    if (!result) return false
    setSelectedSquare(null)
    updateAnnotations([], [])
    onMove({ from: source, to: target, san: result.san, newFen: game.fen(), newPgn: game.pgn() })
    return true
  }, [canMove, onMove, updateAnnotations])

  const handlePieceDrop = useCallback((source: Square, target: Square) => tryMove(source, target), [tryMove])

  const handleSquareClick = useCallback((square: Square) => {
    updateAnnotations([], [])
    if (!canMove) return
    if (selectedSquare) {
      if (selectedSquare === square) { setSelectedSquare(null); return }
      const moved = tryMove(selectedSquare, square)
      if (!moved) {
        const piece = new Chess(fen).get(square)
        setSelectedSquare(piece ? square : null)
      }
    } else {
      const piece = new Chess(fen).get(square)
      if (piece) setSelectedSquare(square)
    }
  }, [canMove, selectedSquare, tryMove, fen, updateAnnotations])

  const handleSquareRightClick = useCallback((square: Square) => {
    rightDragStartRef.current = square
    rightDragCurrentRef.current = square
  }, [])

  const handleMouseOverSquare = useCallback((square: Square) => {
    if (rightDragStartRef.current) rightDragCurrentRef.current = square
  }, [])

  const handleBoardMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button !== 2) return
    const start = rightDragStartRef.current
    const end   = rightDragCurrentRef.current
    rightDragStartRef.current   = null
    rightDragCurrentRef.current = null
    if (!start) return
    if (!end || start === end) {
      updateAnnotations(
        arrows,
        highlights.includes(start) ? highlights.filter(s => s !== start) : [...highlights, start],
      )
    } else {
      if (!arrows.some(a => a.from === start && a.to === end)) {
        updateAnnotations([...arrows, { from: start, to: end, color: 'green' }], highlights)
      }
    }
  }, [arrows, highlights, updateAnnotations])

  const hasAnnotations = arrows.length > 0 || highlights.length > 0

  return (
    <div
      ref={boardColRef}
      className="flex flex-col h-full min-w-0 overflow-hidden"
      onMouseUp={handleBoardMouseUp}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Board */}
      <div className="flex items-center justify-center flex-1 min-h-0 p-3">
        <div className="relative">
          {frozen && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none rounded-sm">
              <div className="bg-black/50 backdrop-blur-sm rounded-sm px-3 py-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-white" />
                <span className="text-white text-xs font-semibold tracking-wide">Frozen</span>
              </div>
            </div>
          )}
          <div className={cn('rounded-sm overflow-hidden border border-border shadow-md', frozen && 'opacity-75')}>
            <Chessboard
              position={displayFen}
              boardWidth={boardSize}
              onSquareClick={handleSquareClick}
              onSquareRightClick={handleSquareRightClick}
              onMouseOverSquare={handleMouseOverSquare}
              onPieceDrop={handlePieceDrop}
              arePiecesDraggable={canMove}
              areArrowsAllowed={false}
              animationDuration={150}
              boardOrientation={orientation}
              customSquareStyles={customSquareStyles}
              customArrows={customArrowsMap.length > 0 ? customArrowsMap as any : undefined}
            />
          </div>
        </div>
      </div>

      {/* Inline FEN / PGN input panel */}
      {inputMode !== 'none' && (
        <div className="flex-shrink-0 px-3 pb-2 flex flex-col gap-1.5">
          {inputMode === 'fen' ? (
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleApplyInput(); if (e.key === 'Escape') closeInput() }}
              placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
              autoFocus
              className="w-full text-xs px-2 py-1.5 rounded-sm border border-border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          ) : (
            <textarea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') closeInput() }}
              placeholder="1. e4 e5 2. Nf3 Nc6 ..."
              rows={3}
              autoFocus
              className="w-full text-xs px-2 py-1.5 rounded-sm border border-border bg-background font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}
          {inputError && <p className="text-[10px] text-destructive">{inputError}</p>}
          <div className="flex gap-1.5">
            <button
              onClick={handleApplyInput}
              className="text-xs px-3 py-1 rounded-sm bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
            >
              Apply
            </button>
            <button
              onClick={closeInput}
              className="text-xs px-3 py-1 rounded-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Board Controls — navigation + menu */}
      <div className="flex-shrink-0 px-3 pb-2">
        <div className="flex items-center gap-1 p-1.5 bg-card border border-border rounded-sm shadow-sm">
          <Button variant="outline" size="sm" onClick={goToStart} disabled={!canNavBack} className="flex-1 h-9 rounded-sm">
            <ChevronsLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToPrev} disabled={!canNavBack} className="flex-1 h-9 rounded-sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToNext} disabled={!canNavForward} className="flex-1 h-9 rounded-sm">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToEnd} disabled={!canNavForward} className="flex-1 h-9 rounded-sm">
            <ChevronsRight className="w-4 h-4" />
          </Button>
          {hasAnnotations && (
            <button
              onClick={() => updateAnnotations([], [])}
              title="Clear annotations"
              className="h-9 px-1.5 flex items-center gap-1 text-xs text-destructive hover:bg-destructive/10 rounded-sm transition-colors flex-shrink-0"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 flex-shrink-0 rounded-sm" title="More controls">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              {hasCoachControls && (
                <>
                  <DropdownMenuItem disabled={controlsDisabled} onSelect={() => { onReset?.(); closeInput() }}>
                    Reset
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={controlsDisabled} onSelect={() => openInput('fen')}>
                    Set FEN
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={controlsDisabled} onSelect={() => openInput('pgn')}>
                    Load PGN
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onSelect={() => setOrientation(p => p === 'white' ? 'black' : 'white')}>
                Flip board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
