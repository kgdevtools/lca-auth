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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Plus, Trash2, RotateCcw, X, Link2, FileText,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Target,
  Pencil, ChevronDown, MessageSquarePlus,
  Check, HelpCircle, Cpu, Eye, Loader2, ArrowRight,
} from 'lucide-react'
import { parsePgn, type MoveAnnotation } from '@/lib/pgnParser'
import { DecorationMenu, type DecorationCommit, type EditingKind } from '@/components/lessons/DecorationMenu'
import { ARROW_RENDER_COLOR, HIGHLIGHT_RENDER_COLOR, type AnimationEffect, type DecorationColor } from '@/lib/decorations'
import { BoardEditor } from '@/components/lessons/BoardEditor'
import { cn } from '@/lib/utils'
import { AnalysisPanel } from '@/components/analysis/AnalysisPanel'

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
  // Live PGN sync — called whenever the user plays a move on the board, or
  // edits the PGN/FEN directly in the Edit tab
  onChapterPgnChange?: (index: number, pgn: string) => void
  // Import triggers — the modal/file-input themselves stay owned by the parent
  // (LessonBuilderClient); this component only renders the buttons that open them.
  onOpenLichessImport?: () => void
  onUploadPgnClick?: () => void
  // Submit — rendered inside the Chapters tab instead of full-width on the page
  onSubmit?: () => void
  submitLabel?: string
  isSubmitting?: boolean
  isCompleted?: boolean
  savedLessonId?: string | null
  mode?: 'create' | 'edit'
  onCreateAnother?: () => void
}

const BOARD_MAX = 480
const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

// Right-click a square to open the decoration menu (Arrow / Highlight /
// Animate) — same engine as blunderbored's board (lib/decorations.ts +
// DecorationMenu.tsx). "Armed" tools commit on the next left click: an arrow
// only needs one more square (the right-clicked square was already the
// `from`); a zone highlight accumulates squares until "Done".
type ArmedTool =
  | { kind: 'arrow'; from: string; color: DecorationColor }
  | { kind: 'zone-highlight'; color: DecorationColor }

type PanelTab = 'chapters' | 'moves' | 'edit'
type BoardMode = 'setup' | 'solution'

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

// Small bordered toggle — for contextual/secondary controls (Clear
// annotations, the in-progress zone-highlight "Done" button).
function ToolBtn({ onClick, active, danger, children }: {
  onClick: () => void; active?: boolean; danger?: boolean; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] font-medium border transition-colors select-none',
        active ? 'bg-foreground text-background border-foreground'
        : danger ? 'border-border text-muted-foreground hover:text-destructive hover:border-destructive/40'
        : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'
      )}
    >
      {children}
    </button>
  )
}

// Board Controls — blunderbored BoardTransport styling: flex-1, no per-button
// borders/dividers, separation is purely the parent's gap-0.5 + each button's
// own background.
function TransportBtn({ onClick, disabled, active, title, children }: {
  onClick: () => void; disabled?: boolean; active?: boolean; title?: string; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex-1 py-1.5 rounded-sm text-sm transition-colors grid place-items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed',
        active ? 'bg-foreground text-background' : 'bg-muted hover:bg-accent text-foreground'
      )}
      style={{ gridAutoFlow: 'column' }}
    >
      {children}
    </button>
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
  onOpenLichessImport,
  onUploadPgnClick,
  onSubmit,
  submitLabel = 'Save',
  isSubmitting = false,
  isCompleted = false,
  savedLessonId,
  mode = 'create',
  onCreateAnother,
}: InteractiveStudyEditorBoardProps) {
  const [currentMoveIndex, setCurrentMoveIndex]         = useState(-1)
  const [boardFen, setBoardFen]                         = useState(STARTING_FEN)
  const [boardOrientation, setBoardOrientation]         = useState<'white' | 'black'>('white')
  const [activeTab, setActiveTab]                       = useState<PanelTab>('chapters')
  const [openPopoverMoveIndex, setOpenPopoverMoveIndex] = useState<number | null>(null)
  const [hoveredSolveIndex,   setHoveredSolveIndex]   = useState<number | null>(null)
  const [selectedSquare,      setSelectedSquare]       = useState<Square | null>(null)
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
  // Engine — icon-gated, no space reserved until switched on
  const [showEngine,           setShowEngine]           = useState(false)
  // Decorations (right-click menu)
  const [armedTool,            setArmedTool]            = useState<ArmedTool | null>(null)
  const [pendingZoneSquares,   setPendingZoneSquares]   = useState<string[]>([])
  const [decoMenuSquare,       setDecoMenuSquare]       = useState<string | null>(null)
  const [decoMenuPos,          setDecoMenuPos]          = useState<{ x: number; y: number } | null>(null)
  const pointerPosRef = useRef({ x: 0, y: 0 })
  // One-shot Animate flourish — same lifecycle as blunderbored's BoardShell
  // (a class present for ~700ms via a customSquare wrapper, then removed).
  // Not persisted, matching last round's scoping.
  const [activeAnimation, setActiveAnimation] = useState<{ square: string; effect: AnimationEffect } | null>(null)
  // Preview modal
  const [previewOpen,          setPreviewOpen]          = useState(false)
  const [previewMoveIndex,     setPreviewMoveIndex]     = useState(-1)

  // Setup ⇄ Solution — first pass, ported from blunderbored's CreatePuzzleShell.
  // Setup uses the shared BoardEditor (free piece placement); Solution is the
  // existing legal-move chapter-building board. `setupFen` is a draft snapshot,
  // deliberately decoupled from the live chapter content until you flip back.
  const [boardMode, setBoardMode]     = useState<BoardMode>('solution')
  const [setupFen, setSetupFen]       = useState(STARTING_FEN)
  const [setupSelectedPiece, setSetupSelectedPiece] = useState<string | null>(null)
  // FEN field in the Edit tab — local buffer + "last seen" so it resyncs from
  // board-driven changes during render without clobbering an in-progress edit
  // (same idiom blunderbored's PuzzleEditTab uses for its FEN/Solution fields).
  const [fenDraft, setFenDraft] = useState(setupFen)
  const [seenSetupFen, setSeenSetupFen] = useState(setupFen)
  if (setupFen !== seenSetupFen) { setSeenSetupFen(setupFen); setFenDraft(setupFen) }
  const [fenError, setFenError] = useState<string | null>(null)

  const columnRef = useRef<HTMLDivElement>(null)
  const [boardWidth, setBoardWidth] = useState(0)
  useEffect(() => {
    const el = columnRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setBoardWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const activePositionRef = useRef<string>(STARTING_FEN)

  // Close right-click move-context menu on any outside click or Escape
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

  // Escape cancels an armed decoration tool / in-progress zone
  useEffect(() => {
    if (!armedTool) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setArmedTool(null)
      setPendingZoneSquares([])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [armedTool])

  // ── Annotations ────────────────────────────────────────────────────────────

  const selectedChapter  = selectedChapterIndex !== null ? chapters[selectedChapterIndex] : null
  const activePgn        = localPgnOverride ?? selectedChapter?.pgn ?? pgnInput
  const currentAnnoKey   = currentMoveIndex >= 0 ? `${selectedChapterIndex ?? 'new'}:${currentMoveIndex}` : null
  const currentAnno      = currentAnnoKey ? moveAnnotations.get(currentAnnoKey) : undefined
  const drawnArrows      = currentAnno?.arrows     ?? []
  const drawnHighlights  = currentAnno?.highlights ?? []

  const updateCurrentAnnotations = useCallback(
    (arrows: MoveAnnotation['arrows'], highlights: MoveAnnotation['highlights']) => {
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

  const findDecorationAt = useCallback((square: string): EditingKind => {
    if (drawnArrows.some(a => a.from === square || a.to === square)) return 'arrow'
    if (drawnHighlights.some(h => (h.squares ?? [h.square]).includes(square))) return 'highlight'
    return null
  }, [drawnArrows, drawnHighlights])

  const handleSquareRightClick = useCallback((square: string) => {
    setArmedTool(null)
    setPendingZoneSquares([])
    setDecoMenuSquare(square)
    setDecoMenuPos(pointerPosRef.current)
  }, [])

  const handleMenuCommit = useCallback((commit: DecorationCommit) => {
    const square = decoMenuSquare
    if (!square) return
    switch (commit.kind) {
      case 'recolor':
        if (drawnArrows.some(a => a.from === square || a.to === square)) {
          updateCurrentAnnotations(
            drawnArrows.map(a => (a.from === square || a.to === square) ? { ...a, color: commit.color } : a),
            drawnHighlights,
          )
        } else {
          updateCurrentAnnotations(
            drawnArrows,
            drawnHighlights.map(h => (h.squares ?? [h.square]).includes(square) ? { ...h, color: commit.color } : h),
          )
        }
        break
      case 'delete':
        updateCurrentAnnotations(
          drawnArrows.filter(a => a.from !== square && a.to !== square),
          drawnHighlights.filter(h => !(h.squares ?? [h.square]).includes(square)),
        )
        break
      case 'arrow':
        setArmedTool({ kind: 'arrow', from: square, color: commit.color })
        break
      case 'highlight':
        if (commit.target === 'square') {
          updateCurrentAnnotations(drawnArrows, [...drawnHighlights.filter(h => h.square !== square), { square, color: commit.color }])
        } else {
          setArmedTool({ kind: 'zone-highlight', color: commit.color })
          setPendingZoneSquares([square])
        }
        break
      case 'animate':
        setActiveAnimation({ square, effect: commit.effect })
        setTimeout(() => setActiveAnimation((prev) => (prev?.square === square ? null : prev)), 700)
        break
      case 'replay':
        break // no persisted animation decoration exists yet to replay
    }
  }, [decoMenuSquare, drawnArrows, drawnHighlights, updateCurrentAnnotations])

  const commitZone = useCallback(() => {
    if (armedTool?.kind !== 'zone-highlight' || pendingZoneSquares.length === 0) return
    updateCurrentAnnotations(drawnArrows, [
      ...drawnHighlights.filter(h => !pendingZoneSquares.includes(h.square)),
      { square: pendingZoneSquares[0], color: armedTool.color, squares: pendingZoneSquares },
    ])
    setArmedTool(null)
    setPendingZoneSquares([])
  }, [armedTool, pendingZoneSquares, drawnArrows, drawnHighlights, updateCurrentAnnotations])

  // ── PGN ───────────────────────────────────────────────────────────────────

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

    if (selectedChapterIndex !== null) {
      onChapterPgnChange?.(selectedChapterIndex, fullPgn)
    }

    return true
  }, [currentMoveIndex, pgnCount, parsedPgn, liveMoves, localPgnOverride,
      selectedChapter, selectedChapterIndex, onChapterPgnChange])

  const handleSquareClick = useCallback((square: Square) => {
    // Decoration commit takes priority over click-to-move
    if (armedTool) {
      if (armedTool.kind === 'arrow') {
        if (square !== armedTool.from) {
          updateCurrentAnnotations([...drawnArrows, { from: armedTool.from, to: square, color: armedTool.color }], drawnHighlights)
        }
        setArmedTool(null)
      } else {
        setPendingZoneSquares(prev => prev.includes(square) ? prev.filter(s => s !== square) : [...prev, square])
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
      if (!moved) {
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
  }, [armedTool, drawnArrows, drawnHighlights, updateCurrentAnnotations, selectedSquare, handlePieceDrop])

  const resetDraft = useCallback(() => {
    setLiveMoves([])
    setLiveFenHistory([])
    setLocalPgnOverride(null)
    setCurrentMoveIndex(-1)
    setSelectedSquare(null)
    setBoardFen(STARTING_FEN)
  }, [])

  const handleChapterSelect = (index: number) => {
    onSelectChapter(index)
    setBoardOrientation(chapters[index].orientation)
    setEditingChapterIdx(null)
    resetDraft()
  }

  const handleNewChapter = useCallback(() => {
    onSelectChapter(null)
    setChapterNameInput('')
    setPgnInput('')
    resetDraft()
    setSetupFen(STARTING_FEN)
    setBoardMode('solution')
    setActiveTab('edit')
  }, [onSelectChapter, setChapterNameInput, setPgnInput, resetDraft])

  // ── Setup ⇄ Solution ──────────────────────────────────────────────────────
  // Ported from blunderbored's CreatePuzzleShell: Setup snapshots the current
  // starting position into a decoupled draft (setupFen); Solution only
  // re-applies it if it actually changed, so glancing at Setup and flipping
  // straight back doesn't wipe an in-progress line.
  const switchToSetup = useCallback(() => {
    setSetupFen(fenHistory?.[0] ?? boardFen)
    setSetupSelectedPiece(null)
    setBoardMode('setup')
  }, [fenHistory, boardFen])

  const switchToSolution = useCallback(() => {
    const currentRoot = fenHistory?.[0] ?? boardFen
    if (setupFen !== currentRoot) {
      // The position was actually edited — this becomes a fresh starting
      // point for whichever chapter is being drafted.
      const syntheticPgn = `[SetUp "1"]\n[FEN "${setupFen}"]\n\n*`
      if (selectedChapterIndex !== null) {
        onChapterPgnChange?.(selectedChapterIndex, syntheticPgn)
      } else {
        setPgnInput(syntheticPgn)
      }
      setLocalPgnOverride(syntheticPgn)
      setLiveMoves([])
      setLiveFenHistory([])
      setCurrentMoveIndex(-1)
    }
    setBoardMode('solution')
    setActiveTab('edit')
  }, [setupFen, fenHistory, boardFen, selectedChapterIndex, onChapterPgnChange, setPgnInput])

  const handleSetupSquareClick = useCallback((square: Square) => {
    if (!setupSelectedPiece) return
    const g = new Chess()
    g.load(setupFen, { skipValidation: true } as any)
    if (setupSelectedPiece === 'clear') {
      g.remove(square)
    } else {
      g.remove(square)
      g.put(
        { type: setupSelectedPiece.toLowerCase() as any, color: setupSelectedPiece === setupSelectedPiece.toUpperCase() ? 'w' : 'b' },
        square
      )
    }
    setSetupFen(g.fen())
  }, [setupFen, setupSelectedPiece])

  const handleSetupPieceDrop = useCallback((source: Square, target: Square): boolean => {
    const g = new Chess()
    g.load(setupFen, { skipValidation: true } as any)
    const piece = g.get(source)
    if (!piece) return false
    g.remove(source)
    g.put(piece, target)
    setSetupFen(g.fen())
    return true
  }, [setupFen])

  // Apply a FEN typed/pasted into the Edit tab — blur/Enter commit (matching
  // blunderbored's PuzzleEditTab exactly: not live-per-keystroke), updates
  // both the draft and the actual board immediately.
  const applyFenDraft = useCallback((raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) { setFenError('FEN cannot be empty.'); return }
    try {
      new Chess(trimmed)
    } catch {
      setFenError("That FEN isn't valid.")
      return
    }
    setFenError(null)
    setSetupFen(trimmed)
    setBoardMode('setup')
  }, [])

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

  // Live PGN paste in the Edit tab — commits on blur/Enter, not per-keystroke
  // (matches blunderbored's PuzzleEditTab "Go" trigger). Updates whichever
  // chapter is selected directly, or the fresh-draft pgnInput otherwise —
  // either way the board reflects it immediately via activePgn.
  const applyPgnDraft = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (selectedChapterIndex !== null) {
      onChapterPgnChange?.(selectedChapterIndex, trimmed)
      setLocalPgnOverride(trimmed)
    } else {
      setPgnInput(trimmed)
    }
    setLiveMoves([])
    setLiveFenHistory([])
    setCurrentMoveIndex(-1)
    setBoardMode('solution')
  }, [selectedChapterIndex, onChapterPgnChange, setPgnInput])

  // ── Visuals ───────────────────────────────────────────────────────────────

  const activePosition = (() => {
    if (currentMoveIndex < 0) return fenHistory?.[0] ?? boardFen
    if (fenHistory && currentMoveIndex < pgnCount)
      return fenHistory[currentMoveIndex + 1] ?? fenHistory[fenHistory.length - 1]
    const liveIdx = currentMoveIndex - pgnCount
    return liveFenHistory[liveIdx] ?? fenHistory?.[fenHistory.length - 1] ?? boardFen
  })()
  activePositionRef.current = activePosition

  const legalTargets: Square[] = useMemo(() => {
    if (!selectedSquare || armedTool) return []
    try {
      const g = new Chess(activePosition)
      return g.moves({ square: selectedSquare, verbose: true }).map((m: any) => m.to as Square)
    } catch { return [] }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSquare, activePosition, armedTool])

  const customSquareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    const styles: Record<string, React.CSSProperties> = {}
    drawnHighlights.forEach(h => {
      const color = HIGHLIGHT_RENDER_COLOR[h.color ?? 'G']
      for (const sq of (h.squares ?? [h.square])) styles[sq] = { backgroundColor: color }
    })
    pendingZoneSquares.forEach(sq => { styles[sq] = { backgroundColor: 'rgba(59,130,246,0.35)' } })
    if (armedTool?.kind === 'arrow') styles[armedTool.from] = { backgroundColor: 'rgba(59,130,246,0.35)' }
    if (selectedSquare && !armedTool) {
      styles[selectedSquare] = { backgroundColor: 'rgba(255,255,0,0.5)' }
      legalTargets.forEach(sq => {
        styles[sq] = { background: 'radial-gradient(circle, rgba(0,0,0,0.18) 28%, transparent 28%)' }
      })
    }
    return styles
  }, [drawnHighlights, pendingZoneSquares, armedTool, selectedSquare, legalTargets])

  const customArrows = useMemo(() =>
    drawnArrows.map(a => [a.from, a.to, ARROW_RENDER_COLOR[a.color ?? 'G']] as [string, string, string])
  , [drawnArrows])

  // Wraps the piece on the animating square in a decoration-{effect} class
  // for ~700ms — same mechanism as blunderbored's BoardShell (a customSquare
  // render-prop, not a separate overlay).
  const customSquareRenderer = useMemo(() => {
    if (!activeAnimation) return undefined
    const { square: animSquare, effect } = activeAnimation
    return function DecoratedSquare({ children, square, style }: { children: React.ReactNode; square: string; style: Record<string, string | number> }) {
      const isAnimating = square === animSquare
      return (
        <div style={{ ...style, position: 'relative' }}>
          <div className={isAnimating ? `decoration-${effect}` : undefined} style={{ width: '100%', height: '100%', position: 'relative' }}>
            {children}
          </div>
        </div>
      )
    }
  }, [activeAnimation])

  // ── Hover info ────────────────────────────────────────────────────────────

  const hoveredSp = hoveredSolveIndex !== null
    ? currentSolveMoves.find(s => s.moveIndex === hoveredSolveIndex) ?? null
    : null

  // Now that Flip/Engine live in the Moves tab instead of the board column,
  // the column really is just the mode toggle + the square board again, so
  // boardWidth == column height holds — plus a floor for the first-paint
  // zero-width race (ResizeObserver doesn't fire synchronously on mount).
  const panelHeight = Math.max(boardWidth, 360) || undefined

  // ── Preview modal helpers ─────────────────────────────────────────────────

  const openPreview = useCallback(() => {
    setPreviewMoveIndex(Math.max(0, currentMoveIndex))
    setPreviewOpen(true)
  }, [currentMoveIndex])

  const previewFen = (() => {
    if (previewMoveIndex < 0) return fenHistory?.[0] ?? boardFen
    if (fenHistory && previewMoveIndex < pgnCount)
      return fenHistory[previewMoveIndex + 1] ?? fenHistory[fenHistory.length - 1]
    const liveIdx = previewMoveIndex - pgnCount
    return liveFenHistory[liveIdx] ?? fenHistory?.[fenHistory.length - 1] ?? boardFen
  })()

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:items-start">
      {/* Board column */}
      <div ref={columnRef} className="shrink-0 w-full min-w-0" style={{ width: `min(100%, ${BOARD_MAX}px)`, maxWidth: '100%' }}>
        {/* Setup ⇄ Solution */}
        <div className="flex gap-1 p-1 mb-1.5 bg-muted rounded-md">
          <button
            onClick={switchToSetup}
            className={cn('flex-1 py-1.5 rounded-sm text-xs font-bold transition-colors', boardMode === 'setup' ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:text-foreground')}
          >
            Setup
          </button>
          <button
            onClick={switchToSolution}
            className={cn('flex-1 py-1.5 rounded-sm text-xs font-bold transition-colors', boardMode === 'solution' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground')}
          >
            Solution
          </button>
        </div>

        {boardMode === 'setup' ? (
          <BoardEditor
            fen={setupFen}
            orientation={boardOrientation}
            selectedPiece={setupSelectedPiece}
            onSelectPiece={setSetupSelectedPiece}
            onSquareClick={handleSetupSquareClick}
            onPieceDrop={handleSetupPieceDrop}
          />
        ) : (
          <div className="w-full" style={{ aspectRatio: '1 / 1' }} onContextMenuCapture={e => { pointerPosRef.current = { x: e.clientX, y: e.clientY } }}>
            <Chessboard
              position={activePosition}
              onSquareClick={handleSquareClick}
              onSquareRightClick={handleSquareRightClick}
              onPieceDrop={handlePieceDrop}
              arePiecesDraggable={true}
              areArrowsAllowed={false}
              animationDuration={150}
              boardOrientation={selectedChapter?.orientation || boardOrientation}
              customSquareStyles={customSquareStyles}
              customArrows={customArrows.length > 0 ? (customArrows as any) : undefined}
              customSquare={customSquareRenderer as any}
              customBoardStyle={{ borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            />
          </div>
        )}

        {/* Secondary, board-content-specific controls — kept near the board
            since they act on what's currently drawn on it. Flip/Engine and
            the Start/Prev/Next/End scrubber live in the Moves tab now. */}
        {(armedTool?.kind === 'zone-highlight' || drawnArrows.length > 0 || drawnHighlights.length > 0) && (
          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            {armedTool?.kind === 'zone-highlight' && (
              <ToolBtn onClick={commitZone}>Done ({pendingZoneSquares.length})</ToolBtn>
            )}
            {(drawnArrows.length > 0 || drawnHighlights.length > 0) && (
              <ToolBtn danger onClick={handleClearAnnotations}>
                <X className="w-3 h-3" /> Clear
              </ToolBtn>
            )}
          </div>
        )}
      </div>

      {/* Panel */}
      <div
        className="w-full lg:flex-1 lg:min-w-0 min-w-0 bg-card border border-border rounded-md p-3 flex flex-col overflow-hidden"
        style={{ height: panelHeight, minHeight: 360, maxHeight: 'calc(100dvh - 6.5rem)' }}
      >
        <div className="flex items-center gap-1 border-b border-border pb-2 shrink-0">
          <button onClick={() => setActiveTab('chapters')} className={cn('flex-1 py-1.5 rounded-sm text-xs font-bold transition-colors', activeTab === 'chapters' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            Chapters ({chapters.length})
          </button>
          <button onClick={() => setActiveTab('moves')} className={cn('flex-1 py-1.5 rounded-sm text-xs font-bold transition-colors', activeTab === 'moves' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            Moves
          </button>
          <button onClick={() => setActiveTab('edit')} className={cn('flex-1 py-1.5 rounded-sm text-xs font-bold transition-colors', activeTab === 'edit' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            Edit
          </button>
          <button
            onClick={openPreview}
            disabled={totalMoveCount === 0}
            title="Preview as student"
            className="flex-none w-8 h-8 grid place-items-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden py-2">
          {activeTab === 'chapters' && (
            <div className="space-y-2">
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={onOpenLichessImport}>
                  <Link2 className="w-3.5 h-3.5 mr-1" /> Lichess
                </Button>
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={onUploadPgnClick}>
                  <FileText className="w-3.5 h-3.5 mr-1" /> Upload PGN
                </Button>
                <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleNewChapter}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> New
                </Button>
              </div>

              {chapters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  No chapters yet — import from Lichess, upload a PGN, or click New.
                </div>
              ) : (
                <div className="space-y-1">
                  {chapters.map((chapter, index) => {
                    const chapterSolveCount = (solveMovesByChapterId[chapter.id] ?? []).length
                    return (
                      <div
                        key={chapter.id}
                        onClick={() => handleChapterSelect(index)}
                        className={cn(
                          'group flex items-center gap-2 rounded-sm border px-2 py-1.5 cursor-pointer transition-colors',
                          selectedChapterIndex === index ? 'border-foreground bg-foreground/5' : 'border-border hover:border-foreground/30 hover:bg-muted/40'
                        )}
                      >
                        <span className="text-[11px] text-muted-foreground/40 w-5 shrink-0 text-right tabular-nums">{index + 1}.</span>
                        {editingChapterIdx === index ? (
                          <input
                            autoFocus
                            value={editingChapterName}
                            onChange={e => setEditingChapterName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { onRenameChapter(index, editingChapterName); setEditingChapterIdx(null) }
                              else if (e.key === 'Escape') { setEditingChapterIdx(null) }
                            }}
                            onBlur={() => {
                              if (editingChapterName.trim()) onRenameChapter(index, editingChapterName.trim())
                              setEditingChapterIdx(null)
                            }}
                            onClick={e => e.stopPropagation()}
                            className="flex-1 bg-transparent border-b border-foreground/30 text-sm outline-none px-0"
                          />
                        ) : (
                          <span className={cn('flex-1 text-sm truncate', selectedChapterIndex === index ? 'font-medium' : 'text-foreground/80')}>
                            {chapter.name}
                          </span>
                        )}
                        {chapterSolveCount > 0 && editingChapterIdx !== index && (
                          <span className="text-[10px] text-amber-500 shrink-0 flex items-center gap-0.5">
                            <Target className="w-2.5 h-2.5" />{chapterSolveCount}
                          </span>
                        )}
                        {editingChapterIdx !== index && (
                          <>
                            <button onClick={e => { e.stopPropagation(); setEditingChapterIdx(index); setEditingChapterName(chapter.name) }} className="shrink-0 p-1 rounded-sm opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all">
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button onClick={e => { e.stopPropagation(); onDeleteChapter(index) }} className="shrink-0 p-1 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Submit — compact, not full-width */}
              {onSubmit && (
                <div className="pt-1">
                  {isCompleted && savedLessonId ? (
                    <div className="flex items-center gap-2 flex-wrap rounded-sm border border-border bg-muted/20 px-2.5 py-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-xs text-foreground flex-1 min-w-0">
                        {mode === 'edit' ? 'Lesson updated' : 'Lesson created'}
                      </span>
                      <div className="flex gap-1.5 shrink-0">
                        {mode === 'create' && onCreateAnother && (
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onCreateAnother}>Create another</Button>
                        )}
                        <a href={`/academy/lesson/${savedLessonId}`}>
                          <Button size="sm" className="h-7 text-xs">View <ArrowRight className="w-3 h-3 ml-1" /></Button>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <Button size="sm" onClick={onSubmit} disabled={isSubmitting} className="h-8 text-xs">
                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                        {submitLabel}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'edit' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                  {selectedChapter ? `Editing: ${selectedChapter.name}` : 'New chapter draft'}
                </span>
                {selectedChapter && (
                  <button
                    onClick={() => { onSelectChapter(null); resetDraft(); setActiveTab('chapters') }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shrink-0"
                  >
                    <Check className="w-3 h-3" /> Done
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Chapter title</Label>
                <Input
                  value={chapterNameInput}
                  onChange={e => setChapterNameInput(e.target.value)}
                  placeholder="e.g. Sicilian Defense"
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Orientation</Label>
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
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Starting FEN</Label>
                <Input
                  value={fenDraft}
                  onChange={e => setFenDraft(e.target.value)}
                  onBlur={() => applyFenDraft(fenDraft)}
                  onKeyDown={e => { if (e.key === 'Enter') { applyFenDraft(fenDraft); (e.target as HTMLInputElement).blur() } }}
                  placeholder={STARTING_FEN}
                  className={cn('h-8 text-xs font-mono', fenError && 'border-destructive focus-visible:ring-destructive')}
                />
                {fenError && <p className="text-[10px] text-destructive">{fenError}</p>}
                <p className="text-[10px] text-muted-foreground/70">Editable — Enter (or click away) applies it and switches to Setup.</p>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">PGN</Label>
                <Textarea
                  value={pgnInput}
                  onChange={e => setPgnInput(e.target.value)}
                  onBlur={() => applyPgnDraft(pgnInput)}
                  placeholder={'[Event "Game"]\n1. e4 e5 2. Nf3'}
                  className="font-mono text-[11px] resize-none"
                  rows={5}
                />
                <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => applyPgnDraft(pgnInput)} disabled={!pgnInput.trim()}>
                  Parse PGN
                </Button>
                <p className="text-[10px] text-muted-foreground/70">Editable — updates the board &amp; Moves tab, and vice versa.</p>
              </div>

              {!selectedChapter && (
                <Button
                  onClick={() => { onAddChapter(); setActiveTab('chapters') }}
                  size="sm"
                  className="w-full h-8 text-xs"
                  disabled={!chapterNameInput.trim() || !pgnInput.trim()}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add chapter
                </Button>
              )}
            </div>
          )}

          {activeTab === 'moves' && (
            <div className="flex flex-col h-full min-h-0">
              {/* Board Controls — full width, no gaps beyond the shared 0.5
                  gap, same styling as blunderbored's BoardTransport. Flip and
                  the icon-gated Engine now live here too. */}
              <div className="flex gap-0.5 shrink-0 mb-1.5">
                <TransportBtn onClick={goToStart} disabled={currentMoveIndex < 0} title="Start"><ChevronsLeft className="w-4 h-4" /></TransportBtn>
                <TransportBtn onClick={() => currentMoveIndex > 0 ? goTo(currentMoveIndex - 1) : goToStart()} disabled={currentMoveIndex < 0} title="Previous"><ChevronLeft className="w-4 h-4" /></TransportBtn>
                <TransportBtn onClick={() => goTo(currentMoveIndex + 1)} disabled={currentMoveIndex >= totalMoveCount - 1} title="Next"><ChevronRight className="w-4 h-4" /></TransportBtn>
                <TransportBtn onClick={goToEnd} disabled={totalMoveCount === 0} title="End"><ChevronsRight className="w-4 h-4" /></TransportBtn>
                <TransportBtn onClick={() => setBoardOrientation(p => p === 'white' ? 'black' : 'white')} title="Flip board"><RotateCcw className="w-4 h-4" /></TransportBtn>
                <TransportBtn onClick={() => setShowEngine(v => !v)} active={showEngine} title="Engine"><Cpu className="w-4 h-4" /></TransportBtn>
              </div>

              {showEngine && (
                <div className="shrink-0 mb-1.5">
                  <AnalysisPanel fen={activePosition} />
                </div>
              )}

              <div className="shrink-0 mb-1.5">
                <button
                  onClick={() => setShowTip(v => !v)}
                  className="flex items-center gap-2 w-full rounded-sm bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 px-2.5 py-1.5 text-left transition-colors hover:bg-blue-100 dark:hover:bg-blue-950/60"
                >
                  <HelpCircle className={cn('w-3.5 h-3.5 text-blue-500 shrink-0', !showTip && 'animate-pulse')} />
                  <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300 flex-1">Add challenge points for students</span>
                  <ChevronDown className={cn('w-3 h-3 text-blue-500 transition-transform', showTip && 'rotate-180')} />
                </button>
                {showTip && (
                  <div className="bg-blue-50 dark:bg-blue-950/40 border border-t-0 border-blue-200 dark:border-blue-800/60 px-2.5 py-2 rounded-b-sm">
                    <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed">
                      Click the <span className="font-semibold">target icon</span> next to any move to mark it as a student challenge — they must find that move to continue.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto rounded-sm border border-border bg-muted/10 p-2">
                {pgnCount === 0 && liveMoves.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-6">Select a chapter, or play a move on the board to start building one.</p>
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
                                  'px-1.5 py-0.5 rounded-sm text-xs transition-colors leading-none font-medium select-none',
                                  isMarked ? 'bg-blue-500 text-white'
                                  : isCurrent ? 'bg-amber-500 text-black'
                                  : isPast ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
                                      'shrink-0 rounded-sm transition-all w-5 h-5 flex items-center justify-center',
                                      isMarked ? 'text-blue-500 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-800/60' : 'text-muted-foreground/40 hover:text-blue-400 hover:bg-muted'
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
                                  'px-1.5 py-0.5 rounded-sm text-xs italic transition-colors leading-none',
                                  isCurrent ? 'bg-foreground text-background font-semibold'
                                  : isPast ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                  : 'text-foreground/60 hover:bg-muted'
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

              {hoveredSp && (
                <div className="shrink-0 border-t border-border px-2.5 py-2 space-y-1 bg-blue-50/50 dark:bg-blue-900/10 mt-1.5 rounded-sm">
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

              <div className="shrink-0 flex items-center justify-between mt-1.5">
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {currentMoveIndex >= 0 ? currentMoveIndex + 1 : 0} / {totalMoveCount}
                </span>
                {(pgnCount > 0 || liveMoves.length > 0) && (
                  <button onClick={handleClearAllMoves} title="Clear all moves" className="p-1.5 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right-click context menu on move tokens — challenge/remove/comment */}
      {contextMenuIdx !== null && menuPos !== null && (() => {
        const idx = contextMenuIdx
        const pos = menuPos
        return (
          <div
            style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 150 }}
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
              <Target className="w-3.5 h-3.5 shrink-0" /> Challenge point
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted text-destructive transition-colors text-left"
              onClick={() => handleRemoveMove(idx)}
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" /> Remove move
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
              <MessageSquarePlus className="w-3.5 h-3.5 shrink-0" /> Add comment
            </button>
          </div>
        )
      })()}

      {/* Board decoration menu — right-click a square */}
      {decoMenuSquare && decoMenuPos && (
        <DecorationMenu
          x={decoMenuPos.x}
          y={decoMenuPos.y}
          editing={findDecorationAt(decoMenuSquare)}
          onCommit={handleMenuCommit}
          onClose={() => setDecoMenuSquare(null)}
        />
      )}

      {/* Preview modal — clean, read-only student view of the current chapter */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedChapter?.name ?? 'Preview'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="w-full max-w-sm mx-auto" style={{ aspectRatio: '1 / 1' }}>
              <Chessboard
                position={previewFen}
                boardOrientation={selectedChapter?.orientation || boardOrientation}
                arePiecesDraggable={false}
                areArrowsAllowed={false}
                customBoardStyle={{ borderRadius: '4px' }}
              />
            </div>
            <div className="flex gap-0.5">
              <TransportBtn onClick={() => setPreviewMoveIndex(-1)} disabled={previewMoveIndex < 0} title="Start"><ChevronsLeft className="w-4 h-4" /></TransportBtn>
              <TransportBtn onClick={() => setPreviewMoveIndex(p => Math.max(-1, p - 1))} disabled={previewMoveIndex < 0} title="Previous"><ChevronLeft className="w-4 h-4" /></TransportBtn>
              <TransportBtn onClick={() => setPreviewMoveIndex(p => Math.min(totalMoveCount - 1, p + 1))} disabled={previewMoveIndex >= totalMoveCount - 1} title="Next"><ChevronRight className="w-4 h-4" /></TransportBtn>
              <TransportBtn onClick={() => setPreviewMoveIndex(totalMoveCount - 1)} disabled={previewMoveIndex >= totalMoveCount - 1} title="End"><ChevronsRight className="w-4 h-4" /></TransportBtn>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
