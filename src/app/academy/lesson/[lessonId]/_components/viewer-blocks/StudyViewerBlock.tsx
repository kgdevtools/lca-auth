'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Chess, type Move, type Square } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Badge } from '@/components/ui/badge'
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
} from 'lucide-react'
import { parsePgn, type ParsedPgnMove } from '@/lib/pgnParser'
import { ARROW_RENDER_COLOR, HIGHLIGHT_RENDER_COLOR, type DecorationColor } from '@/lib/decorations'
import { cn } from '@/lib/utils'
import { trackStudyChapterComplete } from '@/services/progressService'

interface StudyChapter {
  id: string
  name: string
  orientation: 'white' | 'black'
  pgn: string
  headers?: Record<string, string>
  moves?: ParsedPgnMove[]
  fullPgn?: string
}

interface StudyViewerBlockProps {
  data: {
    chapters?: StudyChapter[]
    displaySettings?: {
      showEval?: boolean
      showClocks?: boolean
      showArrows?: boolean
      showHighlights?: boolean
    }
  }
  onSolved: () => void
  lessonId?: string
  onBlockComplete?: (pts: number, label: string) => void
}

interface ParsedMove extends Move {
  moveNumber: number
  comment?: string
  clock?: string
  eval?: string | number
  arrows?: Array<{ from: string; to: string; color?: DecorationColor }>
  highlights?: Array<{ square: string; color?: DecorationColor; squares?: string[] }>
  nag?: string
}

export default function StudyViewerBlock({ data, onSolved, lessonId, onBlockComplete }: StudyViewerBlockProps) {
  const chapters = data.chapters || []
  const displaySettings = data.displaySettings || {}
  const showClocks = displaySettings.showClocks ?? true
  const showArrows = displaySettings.showArrows ?? true
  const showHighlights = displaySettings.showHighlights ?? true

  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
  const [position, setPosition] = useState('')
  const [parsedMoves, setParsedMoves] = useState<ParsedMove[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [headers, setHeaders] = useState<Record<string, string>>({})
  const [chapterDropdownOpen, setChapterDropdownOpen] = useState(false)
  const [highlightedSquares, setHighlightedSquares] = useState<Record<string, string>>({})

  const movesListRef = useRef<HTMLDivElement>(null)
  const activeMoveRef = useRef<HTMLButtonElement>(null)
  const completedChaptersRef = useRef<Set<number>>(new Set())

  const currentChapter = chapters[currentChapterIndex]

  const handleSquareClick = useCallback((square: Square) => {
    const sq = String(square)
    setHighlightedSquares(prev => {
      const newHighlights = { ...prev }
      if (newHighlights[sq]) {
        delete newHighlights[sq]
      } else {
        newHighlights[sq] = 'rgba(255, 255, 0, 0.5)'
      }
      return newHighlights
    })
  }, [])

  const clearHighlights = () => setHighlightedSquares({})

  useEffect(() => {
    if (!currentChapter?.pgn) return

    const parsed = parsePgn(currentChapter.pgn)
    
    const movesWithMeta: ParsedMove[] = parsed.moves.map((move, index) => {
      const game = new Chess()
      for (let i = 0; i <= index; i++) {
        try {
          game.move(parsed.moves[i].san)
        } catch {
          break
        }
      }
      
      return {
        ...game.history({ verbose: true })[game.history().length - 1],
        moveNumber: Math.floor(index / 2) + 1,
        comment: move.comment,
        clock: move.clock,
        eval: move.eval,
        arrows: move.arrows,
        highlights: move.highlights,
        nag: move.nag,
      } as ParsedMove
    })

    setParsedMoves(movesWithMeta)
    setHeaders(parsed.headers)
    setCurrentMoveIndex(0)
    setHighlightedSquares({})
    
    const tempGame = new Chess()
    setPosition(tempGame.fen())
  }, [currentChapter?.pgn])

  useEffect(() => {
    if (!currentChapter?.pgn || parsedMoves.length === 0) return

    const tempGame = new Chess()
    try {
      for (let i = 0; i <= currentMoveIndex; i++) {
        const move = parsedMoves[i]
        if (move) {
          tempGame.move({
            from: move.from,
            to: move.to,
            promotion: move.promotion,
          })
        }
      }
      setPosition(tempGame.fen())
    } catch {
      const game = new Chess()
      setPosition(game.fen())
    }
  }, [currentMoveIndex, parsedMoves, currentChapter?.pgn])

  useEffect(() => {
    if (activeMoveRef.current) {
      activeMoveRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [currentMoveIndex])

  useEffect(() => {
    if (!isPlaying || currentMoveIndex >= parsedMoves.length - 1) {
      setIsPlaying(false)
      return
    }

    const timer = setTimeout(() => {
      setCurrentMoveIndex(prev => prev + 1)
    }, 1500)

    return () => clearTimeout(timer)
  }, [isPlaying, currentMoveIndex, parsedMoves.length])

  const handlePrev = () => {
    setCurrentMoveIndex(prev => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    if (currentMoveIndex >= parsedMoves.length - 1) {
      const idx = currentChapterIndex
      if (!completedChaptersRef.current.has(idx) && lessonId) {
        completedChaptersRef.current.add(idx)
        trackStudyChapterComplete(lessonId)
          .then(r => { if (r.pointsEarned > 0) onBlockComplete?.(r.pointsEarned, `Chapter: ${currentChapter?.name || idx + 1}`) })
          .catch(() => {})
      }
      if (currentChapterIndex < chapters.length - 1) {
        setCurrentChapterIndex(prev => prev + 1)
      } else {
        onSolved()
      }
    } else {
      setCurrentMoveIndex(prev => prev + 1)
    }
  }

  const handleStart = () => {
    setCurrentMoveIndex(0)
  }

  const handleEnd = () => {
    setCurrentMoveIndex(parsedMoves.length - 1)
  }

  const handleChapterChange = (index: number) => {
    setCurrentChapterIndex(index)
    setCurrentMoveIndex(0)
    setChapterDropdownOpen(false)
    setHighlightedSquares({})
  }

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {}

    // PGN highlights from current move
    if (showHighlights) {
      const move = parsedMoves[currentMoveIndex]
      if (move?.highlights) {
        move.highlights.forEach(h => {
          const color = HIGHLIGHT_RENDER_COLOR[h.color ?? 'G']
          for (const sq of (h.squares ?? [h.square])) styles[sq] = { backgroundColor: color }
        })
      }
    }

    // Last move highlighting
    if (currentMoveIndex > 0) {
      const lastMove = parsedMoves[currentMoveIndex]
      if (lastMove) {
        styles[lastMove.from] = { backgroundColor: 'rgba(255, 170, 0, 0.5)' }
        styles[lastMove.to] = { backgroundColor: 'rgba(255, 170, 0, 0.5)' }
      }
    }

    // User clicked squares
    Object.entries(highlightedSquares).forEach(([sq, color]) => {
      styles[sq] = { backgroundColor: color }
    })

    return styles
  }, [currentMoveIndex, parsedMoves, showHighlights, highlightedSquares])

  const customArrows = useMemo<[string, string, string][]>(() => {
    if (!showArrows) return []
    const move = parsedMoves[currentMoveIndex]
    if (!move?.arrows) return []
    return move.arrows.map(a => [a.from, a.to, ARROW_RENDER_COLOR[a.color ?? 'G']])
  }, [showArrows, parsedMoves, currentMoveIndex])

  // Build moves with text comments inline
  const moveElements: React.ReactNode[] = []
  for (let i = 0; i < parsedMoves.length; i++) {
    const move = parsedMoves[i]
    const isCurrent = i === currentMoveIndex
    const isPast = i < currentMoveIndex
    
    // Move number for white moves
    if (i % 2 === 0) {
      moveElements.push(
        <span key={`mn-${i}`} className="text-[11px] text-muted-foreground font-mono select-none">
          {move.moveNumber}.
        </span>
      )
    }
    
    // Move with NAG
    moveElements.push(
      <button
        key={`move-${i}`}
        ref={isCurrent ? activeMoveRef : undefined}
        onClick={() => setCurrentMoveIndex(i)}
        className={cn(
          "text-sm px-1 py-0.5 rounded-[2px] transition-colors font-medium leading-none",
          isCurrent
            ? "bg-amber-500 text-black"
            : isPast
            ? "text-muted-foreground"
            : "hover:bg-slate-200 dark:hover:bg-slate-700"
        )}
      >
        {move.san}{move.nag || ''}
      </button>
    )
    
    // Text comment after the move (not annotation markers)
    if (move.comment && !move.comment.includes('%clk') && !move.comment.includes('%eval') && !move.comment.includes('%cal') && !move.comment.includes('%csl')) {
      moveElements.push(
        <span key={`comment-${i}`} className="text-xs text-amber-700 dark:text-amber-300 italic px-1">
          {move.comment}
        </span>
      )
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-1 h-full overflow-hidden">
      {/* Board Section */}
      <div className="lg:w-[55%] flex flex-col min-w-0">
        <div className="flex justify-center overflow-hidden">
          <div className="w-full aspect-square max-w-full">
            <Chessboard
              position={position || 'start'}
              onSquareClick={handleSquareClick}
              arePiecesDraggable={false}
              boardOrientation={currentChapter?.orientation || 'white'}
              customBoardStyle={{
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
              customSquareStyles={customSquareStyles}
              customArrows={customArrows.length > 0 ? (customArrows as unknown as [Square, Square, string?][]) : undefined}
            />
          </div>
        </div>

        {showClocks && parsedMoves[currentMoveIndex]?.clock && (
          <div className="text-center mt-0.5">
            <Badge variant="outline" className="font-mono text-[10px]">
              {parsedMoves[currentMoveIndex].clock}
            </Badge>
          </div>
        )}

        {/* Board Controls — full width, no gaps, same pill-bar styling as PuzzleViewerBlock */}
        <div className="flex shrink-0 bg-card border border-border rounded-sm shadow-sm overflow-hidden mt-1.5">
          <button onClick={handleStart} className="flex-1 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button onClick={handlePrev} disabled={currentMoveIndex === 0} className="flex-1 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={togglePlay} className="flex-1 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button onClick={handleNext} className="flex-1 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={handleEnd} className="flex-1 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <ChevronsRight className="w-4 h-4" />
          </button>
          <button onClick={handleStart} title="Reset" className="flex-1 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
        {Object.keys(highlightedSquares).length > 0 && (
          <button onClick={clearHighlights} className="mt-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors">
            Clear highlights
          </button>
        )}
      </div>

      {/* PGN/Chapters Section */}
      <div className="lg:w-[45%] space-y-1 min-w-0">
        {/* Chapter Dropdown */}
        {chapters.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setChapterDropdownOpen(!chapterDropdownOpen)}
              className="w-full flex items-center justify-between px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border text-xs font-medium"
            >
              <span className="truncate">{currentChapter?.name || 'Select Chapter'}</span>
              <ChevronDown className={cn("w-3 h-3 transition-transform flex-shrink-0", chapterDropdownOpen && "rotate-180")} />
            </button>
            {chapterDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-0.5 bg-white dark:bg-slate-800 border rounded shadow-lg z-10 max-h-40 overflow-y-auto">
                {chapters.map((chapter, index) => (
                  <button
                    key={chapter.id}
                    onClick={() => handleChapterChange(index)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 truncate",
                      currentChapterIndex === index && "bg-slate-200 dark:bg-slate-600"
                    )}
                  >
                    {chapter.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PGN Moves Display */}
        <div className="bg-slate-100 dark:bg-slate-800 rounded p-1.5">
          {currentChapter && (
            <div className="mb-1 pb-1 border-b border-slate-200 dark:border-slate-700">
              <p className="text-[10px] text-muted-foreground truncate">
                {headers.White && headers.Black 
                  ? `${headers.White} vs ${headers.Black}${headers.Result ? ` (${headers.Result})` : ''}`
                  : currentChapter.name}
              </p>
            </div>
          )}

          <div
            ref={movesListRef}
            className="flex flex-wrap gap-x-1 gap-y-0.5 overflow-y-auto"
            style={{ maxHeight: '260px' }}
          >
            {moveElements}
          </div>
        </div>

        {/* Chapter progression — full width, no gaps, same pill-bar styling */}
        <div className="flex shrink-0 bg-card border border-border rounded-sm shadow-sm overflow-hidden">
          <button
            onClick={handlePrev}
            disabled={currentMoveIndex === 0 && currentChapterIndex === 0}
            className="flex-1 h-9 flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>
          <button
            onClick={handleNext}
            className="flex-1 h-9 flex items-center justify-center gap-1 text-sm font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            {currentChapterIndex < chapters.length - 1 ? 'Next Chapter' : 'Finish'}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
