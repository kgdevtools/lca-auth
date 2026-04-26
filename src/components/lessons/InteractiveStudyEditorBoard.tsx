'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Chess, type Square } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus, Trash2, RotateCcw, X, Highlighter, ArrowUp,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Target,
  Pencil, MoreHorizontal, ChevronDown, MessageSquarePlus, Eraser,
  Check, HelpCircle,
} from 'lucide-react'
import { parsePgn, type MoveAnnotation } from '@/lib/pgnParser'
import { cn } from '@/lib/utils'
import { AnalysisPanel } from '@/components/analysis/AnalysisPanel'

// ── Eval helpers ─────────────────────────────────────────────────────────────

function evalToWhitePercent(score: number | null, mate: number | null): number {
  if (mate !== null) return mate > 0 ? 96 : 4
  if (score === null) return 50
  return Math.max(4, Math.min(96, 50 + 50 * Math.tanh(score / 3)))
}

function EvalBar({ score, mate, isEnabled, height }: { score: number | null; mate: number | null; isEnabled: boolean; height: number }) {
  const pct = isEnabled ? evalToWhitePercent(score, mate) : 50
  return (
    <div className="flex-shrink-0 flex flex-col rounded-sm overflow-hidden border border-border relative" style={{ width: 16, height }}>
      <div className="w-full bg-[#1c1c1c] transition-all duration-500 ease-out" style={{ height: `${100 - pct}%` }} />
      <div className="w-full bg-[#f5f5f5] transition-all duration-500 ease-out" style={{ height: `${pct}%` }} />
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-border/50" />
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface StudyChapter {
  id: string
  name: string
  pgn: string
  orientation: 'white' | 'black'
}

export interface SolvePoint {
  moveIndex: number
  description?: string
  alternatives?: string[]
}

interface InteractiveStudyEditorBoardProps {
  // Same as StudyEditorBoard
  chapters: StudyChapter[]
  selectedChapterIndex: number | null
  onSelectChapter: (index: number | null) => void
  chapterNameInput: string
  setChapterNameInput: (value: string) => void
  chapterOrientation: 'white' | 'black'
  setChapterOrientation: (value: 'white' | 'black') => void
  pgnInput: string
  setPgnInput: (value: string) => void
  onAddChapter: () => void
  moveAnnotations: Map<string, MoveAnnotation>
  onAnnotationsChange: (annotations: Map<string, MoveAnnotation>) => void
  // Solve points
  solveMovesByChapterId: Record<string, SolvePoint[]>
  onSolveMovesByChapterIdChange: (v: Record<string, SolvePoint[]>) => void
  // Chapter management
  onDeleteChapter: (index: number) => void
  onRenameChapter: (index: number, name: string) => void
  // Live PGN sync — called whenever the user plays a move on the board
  onChapterPgnChange?: (index: number, pgn: string) => void
}

type DrawMode = 'none' | 'arrow' | 'highlight'

const ARROW_COLORS = [
  { name: 'Green',  value: 'G', color: 'green',  hex: '#22c55e' },
  { name: 'Red',    value: 'R', color: 'red',    hex: '#ef4444' },
  { name: 'Blue',   value: 'B', color: 'blue',   hex: '#3b82f6' },
  { name: 'Yellow', value: 'Y', color: 'yellow', hex: '#eab308' },
]

// ── Solve point popover ───────────────────────────────────────────────────────

function SolvePointPopoverContent({
  solvePoint,
  moveSan,
  moveNum,
  isWhite,
  onSave,
  onRemove,
}: {
  solvePoint: SolvePoint
  moveSan: string
  moveNum: number
  isWhite: boolean
  onSave: (data: { description: string; alternatives: string[] }) => void
  onRemove: () => void
}) {
  const [description,   setDescription]   = useState(solvePoint.description ?? '')
  const [alternatives,  setAlternatives]  = useState<string[]>(solvePoint.alternatives ?? [])
  const [altInput,      setAltInput]      = useState('')
  const [descError,     setDescError]     = useState(false)

  const addAlt = () => {
    const val = altInput.trim().replace(/,$/, '')
    if (!val) return
    if (!alternatives.includes(val)) setAlternatives(prev => [...prev, val])
    setAltInput('')
  }

  const handleSave = () => {
    if (!description.trim()) { setDescError(true); return }
    onSave({ description: description.trim(), alternatives })
  }

  return (
    <div className="p-3 space-y-3 w-64">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">
          {moveNum}{isWhite ? '.' : '...'} {moveSan}
        </span>
        <button
          onClick={onRemove}
          className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
        >
          Remove
        </button>
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Description / Prompt <span className="text-destructive">*</span>
        </Label>
        <Textarea
          value={description}
          onChange={e => { setDescription(e.target.value); setDescError(false) }}
          placeholder='e.g. "Find the winning move"'
          className={cn('text-xs resize-none', descError && 'border-destructive focus-visible:ring-destructive')}
          rows={2}
        />
        {descError && (
          <p className="text-[10px] text-destructive">Description is required</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Alternative Moves <span className="text-muted-foreground/50">(optional)</span>
        </Label>
        {alternatives.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {alternatives.map(alt => (
              <span
                key={alt}
                className="inline-flex items-center gap-0.5 text-[11px] bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded px-1.5 py-0.5 font-mono"
              >
                {alt}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => setAlternatives(prev => prev.filter(a => a !== alt))}
                  className="ml-0.5 cursor-pointer hover:text-destructive leading-none"
                >
                  ×
                </span>
              </span>
            ))}
          </div>
        )}
        <Input
          value={altInput}
          onChange={e => setAltInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addAlt() } }}
          placeholder="Type a move, press Enter to add"
          className="h-7 text-[11px] font-mono"
        />
      </div>

      <Button onClick={handleSave} size="sm" className="w-full h-8 text-xs">
        Add
      </Button>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InteractiveStudyEditorBoard({
  chapters,
  selectedChapterIndex,
  onSelectChapter,
  chapterNameInput,
  setChapterNameInput,
  chapterOrientation,
  setChapterOrientation,
  pgnInput,
  setPgnInput,
  onAddChapter,
  moveAnnotations,
  onAnnotationsChange,
  solveMovesByChapterId,
  onSolveMovesByChapterIdChange,
  onDeleteChapter,
  onRenameChapter,
  onChapterPgnChange,
}: InteractiveStudyEditorBoardProps) {
  const [currentMoveIndex, setCurrentMoveIndex]         = useState(-1)
  const [boardFen, setBoardFen]                         = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  const [boardOrientation, setBoardOrientation]         = useState<'white' | 'black'>('white')
  const [showAddChapter, setShowAddChapter]             = useState(false)
  const [drawMode, setDrawMode]                         = useState<DrawMode>('none')
  const [arrowColor, setArrowColor]                     = useState('G')
  const [arrowStart, setArrowStart]                     = useState<string | null>(null)
  const [openPopoverMoveIndex, setOpenPopoverMoveIndex] = useState<number | null>(null)
  const [hoveredSolveIndex,   setHoveredSolveIndex]   = useState<number | null>(null)
  const [selectedSquare,      setSelectedSquare]       = useState<Square | null>(null)
  const [isFenMode,            setIsFenMode]            = useState(false)
  const [fenInput,             setFenInput]             = useState('')
  const [fenValid,             setFenValid]             = useState<boolean | null>(null)
  // Phase 2: live continuation
  const [liveMoves,            setLiveMoves]            = useState<Array<{ san: string }>>([])
  const [liveFenHistory,       setLiveFenHistory]       = useState<string[]>([])
  const [localPgnOverride,     setLocalPgnOverride]     = useState<string | null>(null)
  // Chapter inline rename
  const [editingChapterIdx,    setEditingChapterIdx]    = useState<number | null>(null)
  const [editingChapterName,   setEditingChapterName]   = useState('')
  // UI state
  const [showTip,              setShowTip]              = useState(false)
  const [contextMenuIdx,       setContextMenuIdx]       = useState<number | null>(null)
  const [menuPos,              setMenuPos]              = useState<{x: number, y: number} | null>(null)
  const [localComments,        setLocalComments]        = useState<Map<string, string>>(new Map())
  const [editingCommentIdx,    setEditingCommentIdx]    = useState<number | null>(null)
  const [commentDraft,         setCommentDraft]         = useState('')
  // Engine eval
  const [evalScore,            setEvalScore]            = useState<number | null>(null)
  const [evalMate,             setEvalMate]             = useState<number | null>(null)
  const [engineEnabled,        setEngineEnabled]        = useState(false)

  const boardColRef = useRef<HTMLDivElement>(null)
  const activePositionRef = useRef<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  const [boardSize, setBoardSize] = useState(360)

  useEffect(() => {
    const el = boardColRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const byWidth  = Math.floor(width)  - 32 - 22   // padding + evalbar (16) + gap (6)
      const byHeight = Math.floor(height) - 130
      setBoardSize(Math.max(180, Math.min(byWidth, byHeight)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Close right-click context menu on any outside click or Escape
  useEffect(() => {
    if (contextMenuIdx === null) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return
      setContextMenuIdx(null)
      setMenuPos(null)
    }
    document.addEventListener('click', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', close)
    }
  }, [contextMenuIdx])

  // ── Annotations (identical to StudyEditorBoard) ───────────────────────────

  const selectedChapter  = selectedChapterIndex !== null ? chapters[selectedChapterIndex] : null
  const activePgn        = localPgnOverride ?? selectedChapter?.pgn ?? pgnInput
  const currentAnnoKey   = currentMoveIndex >= 0 ? `${selectedChapterIndex ?? 'new'}:${currentMoveIndex}` : null
  const currentAnno      = currentAnnoKey ? moveAnnotations.get(currentAnnoKey) : undefined
  const drawnArrows      = currentAnno?.arrows     ?? []
  const drawnHighlights  = currentAnno?.highlights ?? []

  const updateCurrentAnnotations = useCallback(
    (arrows: Array<{ from: string; to: string; color: string }>, highlights: string[]) => {
      if (!currentAnnoKey) return
      const next = new Map(moveAnnotations)
      if (arrows.length === 0 && highlights.length === 0) {
        next.delete(currentAnnoKey)
      } else {
        next.set(currentAnnoKey, { arrows, highlights })
      }
      onAnnotationsChange(next)
    },
    [currentAnnoKey, moveAnnotations, onAnnotationsChange]
  )

  const handleClearAnnotations = () => {
    if (!currentAnnoKey) return
    const next = new Map(moveAnnotations)
    next.delete(currentAnnoKey)
    onAnnotationsChange(next)
  }

  // ── PGN (identical to StudyEditorBoard) ──────────────────────────────────

  const parsedPgn = useMemo(() => {
    if (!activePgn) return null
    try { return parsePgn(activePgn) } catch { return null }
  }, [activePgn])

  const fenHistory = useMemo(() => {
    if (!parsedPgn?.moves.length) return null
    const temp = new Chess()
    const hist: string[] = [temp.fen()]
    for (const m of parsedPgn.moves) {
      try { temp.move(m.san); hist.push(temp.fen()) } catch { break }
    }
    return hist
  }, [parsedPgn])

  const pgnCount      = parsedPgn?.moves.length ?? 0
  const totalMoveCount = pgnCount + liveMoves.length

  // ── Navigation ────────────────────────────────────────────────────────────

  const goTo = (index: number) => {
    setCurrentMoveIndex(index)
    setSelectedSquare(null)
  }

  const goToStart = () => { setCurrentMoveIndex(-1); setSelectedSquare(null) }

  const goToEnd = () => {
    if (totalMoveCount > 0) goTo(totalMoveCount - 1)
  }

  // ── Board interaction ─────────────────────────────────────────────────────

  const handlePieceDrop = useCallback((source: Square, target: Square): boolean => {
    const game = new Chess(activePositionRef.current)
    let result
    try {
      result = game.move({ from: source, to: target, promotion: 'q' })
    } catch {
      return false
    }
    if (!result) return false

    const newFen = game.fen()
    const newSan = result.san
    let fullPgn = ''

    if (currentMoveIndex < pgnCount - 1 && parsedPgn) {
      // Mid-PGN: truncate and start a fresh live section
      const keepMoves = parsedPgn.moves.slice(0, currentMoveIndex + 1)
      const replay = new Chess()
      for (const m of keepMoves) { try { replay.move(m.san) } catch { break } }
      const overridePgn = replay.pgn()
      replay.move(newSan)
      fullPgn = replay.pgn()
      setLocalPgnOverride(overridePgn)
      setLiveMoves([{ san: newSan }])
      setLiveFenHistory([newFen])
    } else {
      // At or past end of PGN — append/replace in live section
      const liveInsertIdx = Math.max(0, currentMoveIndex - pgnCount + 1)
      const newLiveMoves = [...liveMoves.slice(0, liveInsertIdx), { san: newSan }]
      // basePgn must NOT use pgnInput — pgnInput is only for the add-chapter form.
      // When no chapter is selected, liveMoves is the sole source of truth.
      const basePgn = localPgnOverride ?? selectedChapter?.pgn ?? ''
      const baseGame = new Chess()
      if (basePgn) { try { baseGame.loadPgn(basePgn) } catch {} }
      for (const m of newLiveMoves) { try { baseGame.move(m.san) } catch { break } }
      fullPgn = baseGame.pgn()
      setLiveMoves(newLiveMoves)
      setLiveFenHistory(prev => [...prev.slice(0, liveInsertIdx), newFen])
    }

    setCurrentMoveIndex(currentMoveIndex + 1)
    setSelectedSquare(null)

    // Only sync to parent chapter when a chapter is active.
    // When no chapter: liveMoves is source of truth; pgnInput is populated only when "Add chapter" opens.
    if (selectedChapterIndex !== null) {
      onChapterPgnChange?.(selectedChapterIndex, fullPgn)
    }

    return true
  }, [currentMoveIndex, pgnCount, parsedPgn, liveMoves, localPgnOverride,
      selectedChapter, selectedChapterIndex, onChapterPgnChange])

  const handleSquareClick = useCallback((square: Square) => {
    // Arrow draw mode
    if (drawMode === 'arrow') {
      if (!arrowStart) {
        setArrowStart(square)
      } else {
        if (arrowStart !== square) {
          const colorName = ARROW_COLORS.find(c => c.value === arrowColor)?.color || 'green'
          updateCurrentAnnotations([...drawnArrows, { from: arrowStart, to: square, color: colorName }], drawnHighlights)
        }
        setArrowStart(null)
      }
      return
    }

    // Highlight draw mode
    if (drawMode === 'highlight') {
      if (drawnHighlights.includes(square)) {
        updateCurrentAnnotations(drawnArrows, drawnHighlights.filter(s => s !== square))
      } else {
        updateCurrentAnnotations(drawnArrows, [...drawnHighlights, square])
      }
      return
    }

    // Click-to-move
    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null)
        return
      }
      const moved = handlePieceDrop(selectedSquare, square)
      // handlePieceDrop already calls setSelectedSquare(null) on success
      if (!moved) {
        // Maybe the user is clicking a different piece of theirs — select it instead
        const g = new Chess(activePositionRef.current)
        const piece = g.get(square)
        if (piece) {
          setSelectedSquare(square)
        } else {
          setSelectedSquare(null)
        }
      }
    } else {
      const g = new Chess(activePositionRef.current)
      const piece = g.get(square)
      if (piece) setSelectedSquare(square)
    }
  }, [drawMode, arrowStart, drawnArrows, drawnHighlights, arrowColor,
      updateCurrentAnnotations, selectedSquare, handlePieceDrop])

  const handleChapterSelect = (index: number) => {
    onSelectChapter(index)
    setBoardOrientation(chapters[index].orientation)
    setCurrentMoveIndex(-1)
    setBoardFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    setArrowStart(null)
    setLiveMoves([])
    setLiveFenHistory([])
    setLocalPgnOverride(null)
    setEditingChapterIdx(null)
  }

  // ── Solve point helpers ───────────────────────────────────────────────────

  const currentChapterId = selectedChapter?.id ?? null
  const currentSolveMoves: SolvePoint[] = currentChapterId
    ? (solveMovesByChapterId[currentChapterId] ?? [])
    : []

  const isSolvePoint = (moveIndex: number) =>
    currentSolveMoves.some(sp => sp.moveIndex === moveIndex)

  const onToggleSolvePoint = (moveIndex: number) => {
    if (!currentChapterId) return
    const existing = solveMovesByChapterId[currentChapterId] ?? []
    const already = existing.some(sp => sp.moveIndex === moveIndex)
    const updated = already
      ? existing.filter(sp => sp.moveIndex !== moveIndex)
      : [...existing, { moveIndex, description: '', alternatives: [] }]
    onSolveMovesByChapterIdChange({ ...solveMovesByChapterId, [currentChapterId]: updated })
  }

  const onUpdateSolvePoint = (moveIndex: number, patch: Partial<SolvePoint>) => {
    if (!currentChapterId) return
    const existing = solveMovesByChapterId[currentChapterId] ?? []
    const updated = existing.map(sp =>
      sp.moveIndex === moveIndex ? { ...sp, ...patch } : sp
    )
    onSolveMovesByChapterIdChange({ ...solveMovesByChapterId, [currentChapterId]: updated })
  }

  const handleRemoveMove = useCallback((moveIndex: number) => {
    if (moveIndex < pgnCount && parsedPgn) {
      const keepMoves = parsedPgn.moves.slice(0, moveIndex)
      const replay = new Chess()
      for (const m of keepMoves) { try { replay.move(m.san) } catch { break } }
      const newPgn = replay.pgn()
      setLocalPgnOverride(newPgn || null)
      setLiveMoves([])
      setLiveFenHistory([])
      setCurrentMoveIndex(prev => Math.min(prev, moveIndex - 1))
      if (selectedChapterIndex !== null) onChapterPgnChange?.(selectedChapterIndex, newPgn)
    } else {
      const liveIdx = moveIndex - pgnCount
      const newLiveMoves = liveMoves.slice(0, liveIdx)
      setLiveMoves(newLiveMoves)
      setLiveFenHistory(prev => prev.slice(0, liveIdx))
      setCurrentMoveIndex(prev => Math.min(prev, moveIndex - 1))
      const basePgn = localPgnOverride ?? selectedChapter?.pgn ?? ''
      const baseGame = new Chess()
      if (basePgn) { try { baseGame.loadPgn(basePgn) } catch {} }
      for (const m of newLiveMoves) { try { baseGame.move(m.san) } catch { break } }
      if (selectedChapterIndex !== null) onChapterPgnChange?.(selectedChapterIndex, baseGame.pgn())
    }
    setContextMenuIdx(null)
  }, [pgnCount, parsedPgn, liveMoves, localPgnOverride, selectedChapter, selectedChapterIndex, onChapterPgnChange])

  const handleClearAllMoves = () => {
    setLocalPgnOverride(null)
    setLiveMoves([])
    setLiveFenHistory([])
    setCurrentMoveIndex(-1)
    setSelectedSquare(null)
    if (selectedChapterIndex !== null) onChapterPgnChange?.(selectedChapterIndex, '')
  }

  const commentKey = (idx: number) => `${selectedChapterIndex ?? 'new'}:${idx}`

  const saveComment = (idx: number, text: string) => {
    const key = commentKey(idx)
    setLocalComments(prev => {
      const next = new Map(prev)
      if (text.trim()) next.set(key, text.trim()); else next.delete(key)
      return next
    })
    setEditingCommentIdx(null)
    setCommentDraft('')
  }

  // ── Visuals ───────────────────────────────────────────────────────────────

  // activePosition must be computed first — customSquareStyles depends on it
  const activePosition = (() => {
    if (currentMoveIndex < 0) return fenHistory?.[0] ?? boardFen
    if (fenHistory && currentMoveIndex < pgnCount)
      return fenHistory[currentMoveIndex + 1] ?? fenHistory[fenHistory.length - 1]
    const liveIdx = currentMoveIndex - pgnCount
    return liveFenHistory[liveIdx] ?? fenHistory?.[fenHistory.length - 1] ?? boardFen
  })()
  activePositionRef.current = activePosition

  const legalTargets: Square[] = useMemo(() => {
    if (!selectedSquare || drawMode !== 'none') return []
    try {
      const g = new Chess(activePosition)
      return g.moves({ square: selectedSquare, verbose: true }).map((m: any) => m.to as Square)
    } catch { return [] }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSquare, activePosition, drawMode])

  const customSquareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    const styles: Record<string, React.CSSProperties> = {}
    drawnHighlights.forEach(sq => { styles[sq] = { backgroundColor: 'rgba(234,179,8,0.45)' } })
    if (arrowStart) styles[arrowStart] = { backgroundColor: 'rgba(59,130,246,0.35)' }
    if (selectedSquare && drawMode === 'none') {
      styles[selectedSquare] = { backgroundColor: 'rgba(255,255,0,0.5)' }
      legalTargets.forEach(sq => {
        styles[sq] = {
          background: 'radial-gradient(circle, rgba(0,0,0,0.18) 28%, transparent 28%)',
        }
      })
    }
    return styles
  }, [drawnHighlights, arrowStart, selectedSquare, legalTargets, drawMode])

  const customArrows = useMemo(() =>
    drawnArrows.map(a => {
      const hex = ARROW_COLORS.find(c => c.color === a.color)?.hex || '#22c55e'
      return [a.from, a.to, hex] as [string, string, string]
    })
  , [drawnArrows])

  // ── Small reusable buttons ────────────────────────────────────────────────

  const NavBtn = ({ onClick, disabled, children }: {
    onClick: () => void; disabled?: boolean; children: React.ReactNode
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-1 flex items-center justify-center h-9 text-foreground/80 hover:text-foreground hover:bg-muted/60 disabled:opacity-25 transition-colors"
    >
      {children}
    </button>
  )

  // ── Hover info ────────────────────────────────────────────────────────────

  const hoveredSp = hoveredSolveIndex !== null
    ? currentSolveMoves.find(s => s.moveIndex === hoveredSolveIndex) ?? null
    : null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
    <div
      className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] overflow-hidden"
      style={{ height: 'calc(100vh - 50px)', minHeight: '500px', gap: '0', padding: '0' }}
    >

      {/* ══ LEFT: Board only ═══════════════════════════════════════════════════ */}
      <div ref={boardColRef} className="flex flex-col min-w-0 overflow-hidden">

        {/* Board + EvalBar */}
        <div className="flex items-center justify-center p-4 flex-shrink-0">
          <div className="flex gap-1.5 items-end">
            <EvalBar score={evalScore} mate={evalMate} isEnabled={engineEnabled} height={boardSize} />
            <div className="rounded-sm overflow-hidden border border-border shadow-md flex-shrink-0">
              <Chessboard
                position={activePosition}
                boardWidth={boardSize}
                onSquareClick={handleSquareClick}
                onPieceDrop={handlePieceDrop}
                arePiecesDraggable={true}
                areArrowsAllowed={false}
                animationDuration={150}
                boardOrientation={selectedChapter?.orientation || boardOrientation}
                customSquareStyles={customSquareStyles}
                customArrows={customArrows.length > 0 ? customArrows as any : undefined}
              />
            </div>
          </div>
        </div>

      </div>

      {/* ══ RIGHT: Chapters + Move list + Solve points ═════════════════════════ */}
      <div className="flex flex-col min-w-0 overflow-hidden bg-muted/10 border border-border rounded-lg">

        {/* Header */}
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-border bg-card">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex-shrink-0">
            Chapters
            {chapters.length > 0 && (
              <span className="ml-1.5 font-normal normal-case opacity-60">({chapters.length})</span>
            )}
          </span>
          {chapters.length === 0 && (
            <span className="flex-1 text-xs font-semibold text-muted-foreground truncate">
              Add your first chapter to get started
            </span>
          )}
          <button
            onClick={() => {
              if (!showAddChapter && selectedChapterIndex === null && liveMoves.length > 0) {
                // Pre-fill PGN textarea with whatever was played on the board
                const g = new Chess()
                for (const m of liveMoves) { try { g.move(m.san) } catch { break } }
                setPgnInput(g.pgn())
              }
              setShowAddChapter(v => !v)
            }}
            className={cn(
              'ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold border-2 transition-colors',
              showAddChapter
                ? 'bg-foreground text-background border-foreground animate-none'
                : 'border-amber-500 text-amber-500 hover:bg-amber-500/10 animate-pulse'
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            {showAddChapter ? 'Cancel' : 'Add Chapter'}
          </button>
        </div>

        {/* Engine Analysis */}
        <div className="flex-shrink-0 border-b border-border">
          <AnalysisPanel
            fen={activePosition}
            onToggle={enabled => { setEngineEnabled(enabled); if (!enabled) { setEvalScore(null); setEvalMate(null) } }}
            onEvalUpdate={(score, mate) => { setEvalScore(score); setEvalMate(mate) }}
            className="rounded-none border-0 shadow-none"
          />
        </div>

        {/* Nav + tools toolbar */}
        <div className="flex-shrink-0 flex items-center border-b border-border bg-muted/20">
          {/* Nav buttons — stretch full width, no gaps */}
          <div className="flex flex-1">
            <NavBtn onClick={goToStart} disabled={currentMoveIndex < 0}><ChevronsLeft className="w-5 h-5 stroke-[1.75]" /></NavBtn>
            <NavBtn onClick={() => currentMoveIndex > 0 ? goTo(currentMoveIndex - 1) : goToStart()} disabled={currentMoveIndex < 0}>
              <ChevronLeft className="w-5 h-5 stroke-[1.75]" />
            </NavBtn>
            <NavBtn onClick={() => goTo(currentMoveIndex + 1)} disabled={currentMoveIndex >= totalMoveCount - 1}>
              <ChevronRight className="w-5 h-5 stroke-[1.75]" />
            </NavBtn>
            <NavBtn onClick={goToEnd} disabled={totalMoveCount === 0}><ChevronsRight className="w-5 h-5 stroke-[1.75]" /></NavBtn>
          </div>

          {/* Arrow color dots — shown inline when arrow mode active */}
          {drawMode === 'arrow' && (
            <div className="flex items-center gap-1 px-2">
              {ARROW_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={e => { e.stopPropagation(); setArrowColor(c.value) }}
                  title={c.name}
                  className={cn(
                    'w-3.5 h-3.5 rounded-full border-2 transition-all',
                    arrowColor === c.value ? 'border-foreground scale-125' : 'border-transparent opacity-50 hover:opacity-80'
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          )}

          {/* ⋯ dropdown for board tools */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 px-3 flex items-center text-muted-foreground hover:text-foreground border-l border-border transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end" className="w-44">
              <DropdownMenuItem onClick={() => setDrawMode(drawMode === 'arrow' ? 'none' : 'arrow')} className={cn(drawMode === 'arrow' && 'text-blue-500 focus:text-blue-500')}>
                <ArrowUp className="w-3.5 h-3.5 mr-2" /> Arrow
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDrawMode(drawMode === 'highlight' ? 'none' : 'highlight')} className={cn(drawMode === 'highlight' && 'text-blue-500 focus:text-blue-500')}>
                <Highlighter className="w-3.5 h-3.5 mr-2" /> Highlight
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBoardOrientation(p => p === 'white' ? 'black' : 'white')}>
                <RotateCcw className="w-3.5 h-3.5 mr-2" /> Flip board
              </DropdownMenuItem>
              {(drawnArrows.length > 0 || drawnHighlights.length > 0) && (
                <DropdownMenuItem onClick={handleClearAnnotations} className="text-destructive focus:text-destructive">
                  <X className="w-3.5 h-3.5 mr-2" /> Clear annotations
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleClearAllMoves} className="text-destructive focus:text-destructive">
                <Eraser className="w-3.5 h-3.5 mr-2" /> Clear all moves
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Add-chapter form */}
        {showAddChapter && (
          <div className="flex-shrink-0 border-b border-border bg-card px-3 py-3 space-y-2.5">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Chapter title</Label>
              <Input
                value={chapterNameInput}
                onChange={e => setChapterNameInput(e.target.value)}
                placeholder="e.g. Sicilian Defense"
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {isFenMode ? 'FEN' : 'PGN'}
                  </Label>
                  <label className="flex items-center gap-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isFenMode}
                      onChange={e => {
                        setIsFenMode(e.target.checked)
                        setFenInput('')
                        setFenValid(null)
                        if (!e.target.checked) setPgnInput('')
                      }}
                      className="w-3 h-3 accent-foreground"
                    />
                    <span className="text-[10px] text-muted-foreground">FEN</span>
                  </label>
                </div>
                <Select value={chapterOrientation} onValueChange={v => setChapterOrientation(v as 'white' | 'black')}>
                  <SelectTrigger className="h-6 w-[80px] text-[11px] px-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="white">White</SelectItem>
                    <SelectItem value="black">Black</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isFenMode ? (
                <div className="space-y-1">
                  <Textarea
                    value={fenInput}
                    onChange={e => {
                      const val = e.target.value
                      setFenInput(val)
                      if (!val.trim()) { setFenValid(null); return }
                      try {
                        new Chess(val.trim())
                        setFenValid(true)
                        setPgnInput(`[SetUp "1"]\n[FEN "${val.trim()}"]\n\n*`)
                      } catch {
                        setFenValid(false)
                        setPgnInput('')
                      }
                    }}
                    placeholder="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
                    className={cn(
                      'font-mono text-[11px] resize-none',
                      fenValid === true && 'border-green-500 focus-visible:ring-green-500',
                      fenValid === false && 'border-destructive focus-visible:ring-destructive'
                    )}
                    rows={3}
                  />
                  {fenValid === true && (
                    <p className="text-[10px] text-green-600 dark:text-green-400">Valid FEN position</p>
                  )}
                  {fenValid === false && (
                    <p className="text-[10px] text-destructive">Invalid FEN string</p>
                  )}
                </div>
              ) : (
                <Textarea
                  value={pgnInput}
                  onChange={e => setPgnInput(e.target.value)}
                  placeholder={'[Event "Game"]\n1. e4 e5 2. Nf3'}
                  className="font-mono text-[11px] resize-none"
                  rows={5}
                />
              )}
            </div>
            <Button
              onClick={() => {
                onAddChapter()
                setShowAddChapter(false)
                setIsFenMode(false)
                setFenInput('')
                setFenValid(null)
              }}
              size="sm"
              className="w-full h-8 text-xs"
              disabled={!chapterNameInput.trim() || (isFenMode ? fenValid !== true : !pgnInput.trim())}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Parse PGN/FEN
            </Button>
          </div>
        )}

        {/* Chapter list — hidden when parse form is open so moves get full height */}
        {chapters.length > 0 && !showAddChapter && (
        <div className="overflow-y-auto border-b border-border/60 flex-shrink-0" style={{ maxHeight: '180px' }}>
          {chapters.map((chapter, index) => {
              const chapterSolveCount = (solveMovesByChapterId[chapter.id] ?? []).length
              return (
                <div
                  key={chapter.id}
                  onClick={() => handleChapterSelect(index)}
                  className={cn(
                    'group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors border-b border-border/40 last:border-0',
                    selectedChapterIndex === index
                      ? 'bg-foreground/[0.06] border-l-2 border-l-foreground'
                      : 'hover:bg-muted/40 border-l-2 border-l-transparent'
                  )}
                >
                  <span className="text-[11px] text-muted-foreground/40 w-5 flex-shrink-0 text-right tabular-nums">
                    {index + 1}.
                  </span>
                  {editingChapterIdx === index ? (
                    <input
                      autoFocus
                      value={editingChapterName}
                      onChange={e => setEditingChapterName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          onRenameChapter(index, editingChapterName)
                          setEditingChapterIdx(null)
                        } else if (e.key === 'Escape') {
                          setEditingChapterIdx(null)
                        }
                      }}
                      onBlur={() => {
                        if (editingChapterName.trim()) onRenameChapter(index, editingChapterName.trim())
                        setEditingChapterIdx(null)
                      }}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 bg-transparent border-b border-foreground/30 text-sm outline-none px-0"
                    />
                  ) : (
                    <span className={cn(
                      'flex-1 text-sm truncate',
                      selectedChapterIndex === index ? 'font-medium' : 'text-foreground/80'
                    )}>
                      {chapter.name}
                    </span>
                  )}
                  {chapterSolveCount > 0 && editingChapterIdx !== index && (
                    <span className="text-[10px] text-amber-500 flex-shrink-0 flex items-center gap-0.5">
                      <Target className="w-2.5 h-2.5" />{chapterSolveCount}
                    </span>
                  )}
                  {editingChapterIdx !== index && (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); setEditingChapterIdx(index); setEditingChapterName(chapter.name) }}
                        className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); onDeleteChapter(index) }}
                        className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              )
            })}
        </div>
        )}

        {/* Move list + solve toggles + nav — always rendered */}
        <div className="flex flex-col flex-1 min-h-0">

          {/* Solve points instruction banner — collapsible */}
          <div className="flex-shrink-0 border-b border-border">
            <button
              onClick={() => setShowTip(v => !v)}
              className="flex items-center gap-2 w-full rounded-t bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 px-2.5 py-1.5 text-left transition-colors hover:bg-blue-100 dark:hover:bg-blue-950/60"
              style={{ borderRadius: showTip ? '4px 4px 0 0' : '4px' }}
            >
              <HelpCircle className={cn('w-3.5 h-3.5 text-blue-500 flex-shrink-0', !showTip && 'animate-pulse')} />
              <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300 flex-1">Add challenge points or solve points for students</span>
              <ChevronDown className={cn('w-3 h-3 text-blue-500 transition-transform', showTip && 'rotate-180')} />
            </button>
            {showTip && (
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-t-0 border-blue-200 dark:border-blue-800/60 px-2.5 py-2 rounded-b">
                <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
                  Click the <span className="font-semibold">target icon</span> next to any move to mark it as a student challenge — they must find that move to continue.
                </p>
              </div>
            )}
          </div>

          {/* Scrollable move tokens + inline comments */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-muted/10 p-2">
            {pgnCount === 0 && liveMoves.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-16 gap-1 text-center">
                <p className="text-[11px] text-muted-foreground">Play a move on the board to start building this chapter.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-baseline gap-x-0.5 gap-y-1">
                  {(() => {
                    const els: React.ReactNode[] = []
                    parsedPgn?.moves.forEach((move, i) => {
                      const isCurrent = i === currentMoveIndex
                      const isPast    = i < currentMoveIndex
                      const isMarked  = isSolvePoint(i)
                      const sp        = currentSolveMoves.find(s => s.moveIndex === i)
                        ?? { moveIndex: i, description: '', alternatives: [] }

                      if (i % 2 === 0) {
                        els.push(
                          <span key={`mn-${i}`} className="text-[11px] text-muted-foreground/40 font-mono select-none">
                            {Math.floor(i / 2) + 1}.
                          </span>
                        )
                      }

                      const cKey = commentKey(i)
                      const localComment = localComments.get(cKey)

                      els.push(
                        <div key={`m-${i}`} className="inline-flex items-center gap-0.5 relative">
                          <button
                            onClick={() => goTo(i)}
                            onContextMenu={e => {
                              e.preventDefault()
                              e.stopPropagation()
                              setContextMenuIdx(i)
                              setMenuPos({ x: e.clientX, y: e.clientY })
                            }}
                            onMouseEnter={() => setHoveredSolveIndex(i)}
                            onMouseLeave={() => setHoveredSolveIndex(null)}
                            className={cn(
                              'px-1.5 py-0.5 rounded text-xs transition-colors leading-none font-medium select-none',
                              isMarked
                                ? 'bg-blue-500 text-white'
                                : isCurrent
                                ? 'bg-amber-500 text-black'
                                : isPast
                                ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                : 'text-foreground/80 hover:bg-muted'
                            )}
                          >
                            {move.san}{move.nag ? <span className="ml-0.5 text-[10px]">{move.nag}</span> : null}
                          </button>

                          <Popover
                            open={openPopoverMoveIndex === i}
                            onOpenChange={open => {
                              if (open) {
                                if (!isMarked) onToggleSolvePoint(i)
                                setOpenPopoverMoveIndex(i)
                              } else {
                                if (isMarked && !sp.description?.trim()) onToggleSolvePoint(i)
                                setOpenPopoverMoveIndex(null)
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <button
                                title={isMarked ? 'Edit solve point' : 'Set as student challenge (solve point)'}
                                className={cn(
                                  'flex-shrink-0 rounded transition-all w-5 h-5 flex items-center justify-center',
                                  isMarked
                                    ? 'text-blue-500 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-800/60'
                                    : 'text-muted-foreground/40 hover:text-blue-400 hover:bg-muted'
                                )}
                              >
                                <Target className="w-3 h-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent side="bottom" align="start" className="p-0 w-64">
                              <SolvePointPopoverContent
                                solvePoint={sp}
                                moveSan={move.san}
                                moveNum={Math.floor(i / 2) + 1}
                                isWhite={i % 2 === 0}
                                onSave={({ description, alternatives }) => {
                                  onUpdateSolvePoint(i, { description, alternatives })
                                  setOpenPopoverMoveIndex(null)
                                }}
                                onRemove={() => { onToggleSolvePoint(i); setOpenPopoverMoveIndex(null) }}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      )

                      if (editingCommentIdx === i) {
                        els.push(
                          <div key={`ce-${i}`} className="w-full basis-full mt-0.5 mb-1">
                            <input
                              autoFocus
                              value={commentDraft}
                              onChange={e => setCommentDraft(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveComment(i, commentDraft)
                                if (e.key === 'Escape') { setEditingCommentIdx(null); setCommentDraft('') }
                              }}
                              onBlur={() => saveComment(i, commentDraft)}
                              placeholder="Add comment… (Enter to save, Esc to cancel)"
                              className="w-full bg-transparent border-b border-amber-500/50 text-xs text-amber-700 dark:text-amber-400 outline-none py-0.5 px-1"
                            />
                          </div>
                        )
                      }

                      const pgnComment = move.comment
                      const displayComment = localComment ?? (
                        pgnComment && !pgnComment.includes('%clk') && !pgnComment.includes('%eval') && !pgnComment.includes('%cal') && !pgnComment.includes('%csl')
                          ? pgnComment : null
                      )
                      if (displayComment && editingCommentIdx !== i) {
                        els.push(
                          <span key={`c-${i}`} className="text-xs text-amber-600 dark:text-amber-400 italic px-0.5 leading-relaxed">
                            {displayComment}
                          </span>
                        )
                      }
                    })
                    return els
                  })()}
                </div>

                {/* Live continuation */}
                {liveMoves.length > 0 && (
                  <>
                    <div className="w-full flex items-center gap-1 my-1.5">
                      <div className="flex-1 h-px bg-border/60" />
                      <span className="text-[9px] text-muted-foreground/50 uppercase tracking-widest whitespace-nowrap">continued</span>
                      <div className="flex-1 h-px bg-border/60" />
                    </div>
                    {liveMoves.map((move, i) => {
                      const globalIdx = pgnCount + i
                      const isCurrent = globalIdx === currentMoveIndex
                      const isPast    = globalIdx < currentMoveIndex
                      return (
                        <div key={`live-${i}`} className="inline-flex items-center">
                          {(pgnCount + i) % 2 === 0 && (
                            <span className="text-muted-foreground/40 mr-0.5 text-[10px] font-mono select-none">
                              {Math.floor((pgnCount + i) / 2) + 1}.
                            </span>
                          )}
                          <button
                            onClick={() => goTo(globalIdx)}
                            className={cn(
                              'px-1.5 py-0.5 rounded text-xs italic transition-colors leading-none',
                              isCurrent ? 'bg-foreground text-background font-semibold'
                              : isPast   ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
                              :            'text-foreground/60 hover:bg-muted'
                            )}
                          >
                            {move.san}
                          </button>
                        </div>
                      )
                    })}
                  </>
                )}
              </>
            )}
          </div>

          {/* Hovered solve point info */}
          {hoveredSp && (
            <div className="flex-shrink-0 border-t border-border px-3 py-2 space-y-1 bg-blue-50/50 dark:bg-blue-900/10">
              <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-400">
                {Math.floor(hoveredSolveIndex! / 2) + 1}{hoveredSolveIndex! % 2 === 0 ? '.' : '...'}{' '}
                {parsedPgn?.moves[hoveredSolveIndex!]?.san ?? ''}
              </p>
              <p className="text-xs text-foreground leading-snug">
                {hoveredSp.description || <span className="italic text-muted-foreground">No description yet</span>}
              </p>
              {(hoveredSp.alternatives ?? []).length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Alt: <span className="font-mono">{hoveredSp.alternatives!.join(', ')}</span>
                </p>
              )}
            </div>
          )}

        </div>

        {/* Active chapter footer */}
        {selectedChapter && (
          <div className="flex-shrink-0 border-t border-border bg-card px-3 py-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium">
                Editing: <span className="text-foreground/70">{selectedChapter.name}</span>
              </span>
              <button
                onClick={() => {
                  onSelectChapter(null)
                  setShowAddChapter(false)
                  setCurrentMoveIndex(-1)
                  setBoardFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
                  setLiveMoves([])
                  setLiveFenHistory([])
                  setLocalPgnOverride(null)
                  setSelectedSquare(null)
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-green-600 hover:bg-green-500 text-white transition-colors"
              >
                <Check className="w-3 h-3" /> Done
              </button>
            </div>
            {currentSolveMoves.length > 0 && (
              <p className="text-[10px] text-amber-500">
                {currentSolveMoves.length} solve {currentSolveMoves.length === 1 ? 'point' : 'points'} marked
              </p>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Right-click context menu — fixed position, escapes all overflow clipping */}
    {contextMenuIdx !== null && menuPos !== null && (() => {
      const idx = contextMenuIdx
      const pos = menuPos
      return (
        <div
          style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999 }}
          className="bg-popover border border-border rounded-md shadow-lg py-1 min-w-[164px] text-sm"
          onClick={e => e.stopPropagation()}
          onContextMenu={e => e.preventDefault()}
        >
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted transition-colors text-left"
            onClick={() => {
              setContextMenuIdx(null)
              setMenuPos(null)
              if (!isSolvePoint(idx)) onToggleSolvePoint(idx)
              setOpenPopoverMoveIndex(idx)
            }}
          >
            <Target className="w-3.5 h-3.5 flex-shrink-0" /> Challenge point
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted text-destructive transition-colors text-left"
            onClick={() => handleRemoveMove(idx)}
          >
            <Trash2 className="w-3.5 h-3.5 flex-shrink-0" /> Remove move
          </button>
          <div className="my-1 h-px bg-border" />
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted transition-colors text-left"
            onClick={() => {
              const key = commentKey(idx)
              setContextMenuIdx(null)
              setMenuPos(null)
              setEditingCommentIdx(idx)
              setCommentDraft(localComments.get(key) ?? '')
            }}
          >
            <MessageSquarePlus className="w-3.5 h-3.5 flex-shrink-0" /> Add comment
          </button>
        </div>
      )
    })()}
    </>
  )
}
