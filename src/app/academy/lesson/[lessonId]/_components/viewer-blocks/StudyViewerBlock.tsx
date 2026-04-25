'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Chess, type Move, type Square } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Button } from '@/components/ui/button'
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
  arrows?: Array<{ from: string; to: string; color: string }>
  highlights?: string[]
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
        move.highlights.forEach(sq => {
          styles[sq] = { backgroundColor: 'rgba(255, 255, 0, 0.5)' }
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
      <div className="lg:w-[45%] flex flex-col min-w-0">
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

        <div className="flex justify-center gap-0.5 flex-wrap mt-1">
          <Button variant="outline" size="sm" onClick={handleStart} className="h-6 px-1.5">
            <ChevronsLeft className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrev} disabled={currentMoveIndex === 0} className="h-6 px-1.5">
            <ChevronLeft className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={togglePlay} className="h-6 px-1.5">
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext} className="h-6 px-1.5">
            <ChevronRight className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleEnd} className="h-6 px-1.5">
            <ChevronsRight className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleStart} className="h-6 px-1.5">
            <RotateCcw className="w-3 h-3" />
          </Button>
          {Object.keys(highlightedSquares).length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearHighlights} className="h-6 px-1.5 text-xs">
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* PGN/Chapters Section */}
      <div className="lg:w-[37%] space-y-1 min-w-0">
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

        {/* Navigation Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handlePrev}
            variant="outline"
            size="sm"
            disabled={currentMoveIndex === 0 && currentChapterIndex === 0}
            className="h-8"
          >
            <ChevronLeft className="w-3 h-3 mr-1" />
            Previous
          </Button>
          <Button 
            onClick={handleNext} 
            className="h-8 flex-1"
          >
            {currentChapterIndex < chapters.length - 1 ? (
              <>
                Next Chapter
                <ChevronRight className="w-3 h-3 ml-1" />
              </>
            ) : (
              <>
                Finish
                <ChevronRight className="w-3 h-3 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
