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
  Plus, Trash2, RotateCcw, X, Highlighter, ArrowUp,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Target,
  Pencil,
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
    // activePosition is derived from index + histories — no need to set boardFen
  }

  const goToStart = () => setCurrentMoveIndex(-1)

  const goToEnd = () => {
    if (totalMoveCount > 0) goTo(totalMoveCount - 1)
  }

  // ── Board interaction (identical to StudyEditorBoard) ─────────────────────

  const handleSquareClick = useCallback((square: Square) => {
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
    } else if (drawMode === 'highlight') {
      if (drawnHighlights.includes(square)) {
        updateCurrentAnnotations(drawnArrows, drawnHighlights.filter(s => s !== square))
      } else {
        updateCurrentAnnotations(drawnArrows, [...drawnHighlights, square])
      }
    }
  }, [drawMode, arrowStart, drawnArrows, drawnHighlights, arrowColor, updateCurrentAnnotations])

  const handlePieceDrop = useCallback((source: Square, target: Square): boolean => {
    const game = new Chess(activePositionRef.current)
    const result = game.move({ from: source, to: target, promotion: 'q' })
    if (!result) return false

    const newFen = game.fen()
    const newSan = result.san

    if (currentMoveIndex < pgnCount - 1 && parsedPgn) {
      // Mid-PGN: truncate visually and start a fresh live section
      const keepMoves = parsedPgn.moves.slice(0, currentMoveIndex + 1)
      const replay = new Chess()
      for (const m of keepMoves) { try { replay.move(m.san) } catch { break } }
      setLocalPgnOverride(replay.pgn())
      setLiveMoves([{ san: newSan }])
      setLiveFenHistory([newFen])
    } else {
      // At or past end of PGN — append/replace in live section
      const liveInsertIdx = Math.max(0, currentMoveIndex - pgnCount + 1)
      setLiveMoves(prev => [...prev.slice(0, liveInsertIdx), { san: newSan }])
      setLiveFenHistory(prev => [...prev.slice(0, liveInsertIdx), newFen])
    }

    setCurrentMoveIndex(currentMoveIndex + 1)
    return true
  }, [currentMoveIndex, pgnCount, parsedPgn])

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

  // ── Visuals (identical to StudyEditorBoard) ───────────────────────────────

  const customSquareStyles: Record<string, React.CSSProperties> = {}
  drawnHighlights.forEach(sq => { customSquareStyles[sq] = { backgroundColor: 'rgba(234,179,8,0.45)' } })
  if (arrowStart) customSquareStyles[arrowStart] = { backgroundColor: 'rgba(59,130,246,0.35)' }

  const customArrows = drawnArrows.map(a => {
    const hex = ARROW_COLORS.find(c => c.color === a.color)?.hex || '#22c55e'
    return [a.from, a.to, hex] as [string, string, string]
  })

  const activePosition = (() => {
    if (!fenHistory) return boardFen
    if (currentMoveIndex < 0) return fenHistory[0]
    if (currentMoveIndex < pgnCount)
      return fenHistory[currentMoveIndex + 1] ?? fenHistory[fenHistory.length - 1]
    const liveIdx = currentMoveIndex - pgnCount
    return liveFenHistory[liveIdx] ?? fenHistory[fenHistory.length - 1] ?? boardFen
  })()
  activePositionRef.current = activePosition

  // ── Small reusable buttons (identical to StudyEditorBoard) ────────────────

  const ToolBtn = ({ active, danger, onClick, children }: {
    active?: boolean; danger?: boolean; onClick: () => void; children: React.ReactNode
  }) => (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors select-none',
        active  ? 'bg-foreground text-background border-foreground'
        : danger ? 'border-border text-muted-foreground hover:text-destructive hover:border-destructive/40'
        :          'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
      )}
    >
      {children}
    </button>
  )

  const NavBtn = ({ onClick, disabled, children }: {
    onClick: () => void; disabled?: boolean; children: React.ReactNode
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center w-7 h-7 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-25 transition-colors"
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
    <div
      className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] overflow-hidden"
      style={{ height: 'calc(100vh - 50px)', minHeight: '500px', gap: '0', padding: '0' }}
    >

      {/* ══ LEFT: Board + toolbar only ═════════════════════════════════════════ */}
      <div ref={boardColRef} className="flex flex-col min-w-0 overflow-hidden">

        {/* Board + EvalBar */}
        <div className="flex items-center justify-center p-4 flex-shrink-0">
          <div className="flex gap-1.5 items-end">
            <EvalBar score={evalScore} mate={evalMate} isEnabled={engineEnabled} height={boardSize} />
            <Chessboard
              position={activePosition}
              boardWidth={boardSize}
              onSquareClick={handleSquareClick}
              onPieceDrop={handlePieceDrop}
              arePiecesDraggable={true}
              areArrowsAllowed={false}
              boardOrientation={selectedChapter?.orientation || boardOrientation}
              customSquareStyles={customSquareStyles}
              customArrows={customArrows.length > 0 ? customArrows as any : undefined}
              customBoardStyle={{ borderRadius: '5px' }}
            />
          </div>
        </div>

        {/* Annotation toolbar */}
        <div className="flex-shrink-0 flex items-center gap-1.5 flex-wrap px-4 py-2 border-t border-border bg-muted/20">
          <ToolBtn active={drawMode === 'arrow'} onClick={() => setDrawMode(drawMode === 'arrow' ? 'none' : 'arrow')}>
            <ArrowUp className="w-3 h-3" /> Arrow
          </ToolBtn>

          {drawMode === 'arrow' && (
            <div className="flex items-center gap-1">
              {ARROW_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={e => { e.stopPropagation(); setArrowColor(c.value); }}
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

          <ToolBtn active={drawMode === 'highlight'} onClick={() => setDrawMode(drawMode === 'highlight' ? 'none' : 'highlight')}>
            <Highlighter className="w-3 h-3" /> Highlight
          </ToolBtn>

          <ToolBtn onClick={() => setBoardOrientation(p => p === 'white' ? 'black' : 'white')}>
            <RotateCcw className="w-3 h-3" /> Flip
          </ToolBtn>

          {(drawnArrows.length > 0 || drawnHighlights.length > 0) && (
            <ToolBtn danger onClick={handleClearAnnotations}>
              <X className="w-3 h-3" /> Clear
            </ToolBtn>
          )}
        </div>

      </div>

      {/* ══ RIGHT: Chapters + Move list + Solve points ═════════════════════════ */}
      <div className="flex flex-col min-w-0 overflow-hidden bg-muted/10 border border-border rounded-lg">

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-border bg-card">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Chapters
            {chapters.length > 0 && (
              <span className="ml-1.5 font-normal normal-case opacity-60">({chapters.length})</span>
            )}
          </span>
          <button
            onClick={() => setShowAddChapter(v => !v)}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors',
              showAddChapter
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
            )}
          >
            <Plus className="w-3 h-3" />
            {showAddChapter ? 'Cancel' : 'Add'}
          </button>
        </div>

        {/* Engine Analysis — nestled between header and chapters */}
        <div className="flex-shrink-0 border-b border-border">
          <AnalysisPanel
            fen={activePosition}
            onToggle={enabled => { setEngineEnabled(enabled); if (!enabled) { setEvalScore(null); setEvalMate(null) } }}
            onEvalUpdate={(score, mate) => { setEvalScore(score); setEvalMate(mate) }}
            className="rounded-none border-0 shadow-none"
          />
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
              <Plus className="w-3.5 h-3.5 mr-1" /> Add chapter
            </Button>
          </div>
        )}

        {/* Chapter list — capped so move list always has room */}
        <div className="overflow-y-auto border-b border-border/60 flex-shrink-0" style={{ maxHeight: '180px' }}>
          {chapters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 gap-1.5 px-4 text-center">
              <p className="text-xs text-muted-foreground leading-relaxed">
                No chapters yet.<br />
                Click <strong>Add</strong> to get started.
              </p>
            </div>
          ) : (
            chapters.map((chapter, index) => {
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
            })
          )}
        </div>

        {/* Move list + solve toggles + nav */}
        {parsedPgn && parsedPgn.moves.length > 0 ? (
          <div className="flex flex-col flex-1 min-h-0 px-3 py-2 gap-2">

            {/* Solve points hint */}
            {selectedChapter && (
              <p className="flex-shrink-0 text-[10px] text-muted-foreground/60 flex items-center gap-1">
                <Target className="w-3 h-3" />
                Hover a move and click ◎ to mark as a solve point
              </p>
            )}

            {/* Scrollable move tokens + inline comments */}
            <div className="flex-1 min-h-0 overflow-y-auto rounded border border-border bg-muted/20 p-2">
              <div className="flex flex-wrap items-baseline gap-x-0.5 gap-y-1">
                {(() => {
                  const els: React.ReactNode[] = []
                  parsedPgn.moves.forEach((move, i) => {
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

                    els.push(
                      <div key={`m-${i}`} className="group/move relative inline-flex items-center">
                        <button
                          onClick={() => goTo(i)}
                          onMouseEnter={() => setHoveredSolveIndex(i)}
                          onMouseLeave={() => setHoveredSolveIndex(null)}
                          className={cn(
                            'px-1.5 py-0.5 rounded text-xs transition-colors leading-none font-medium',
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
                              title={isMarked ? 'Edit solve point' : 'Mark as solve point'}
                              className={cn(
                                'ml-0.5 flex-shrink-0 rounded transition-all text-[10px] w-4 h-4 flex items-center justify-center',
                                isMarked
                                  ? 'text-blue-400 opacity-100'
                                  : 'text-muted-foreground/30 opacity-0 group-hover/move:opacity-100 hover:text-blue-400'
                              )}
                            >
                              ◎
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

                    const comment = move.comment
                    if (comment && !comment.includes('%clk') && !comment.includes('%eval') && !comment.includes('%cal') && !comment.includes('%csl')) {
                      els.push(
                        <span key={`c-${i}`} className="text-xs text-amber-600 dark:text-amber-400 italic px-0.5 leading-relaxed">
                          {comment}
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
            </div>

            {/* Hovered solve point info */}
            {hoveredSp && (
              <div className="flex-shrink-0 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-2 space-y-1">
                <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-400">
                  {Math.floor(hoveredSolveIndex! / 2) + 1}{hoveredSolveIndex! % 2 === 0 ? '.' : '...'}{' '}
                  {parsedPgn.moves[hoveredSolveIndex!]?.san ?? ''}
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

            {/* Nav row */}
            <div className="flex-shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <NavBtn onClick={goToStart}><ChevronsLeft className="w-3.5 h-3.5" /></NavBtn>
                <NavBtn onClick={() => currentMoveIndex > 0 ? goTo(currentMoveIndex - 1) : goToStart()} disabled={currentMoveIndex < 0}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </NavBtn>
                <NavBtn onClick={() => goTo(currentMoveIndex + 1)} disabled={currentMoveIndex >= totalMoveCount - 1}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </NavBtn>
                <NavBtn onClick={goToEnd}><ChevronsRight className="w-3.5 h-3.5" /></NavBtn>
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {currentMoveIndex >= 0 ? `${currentMoveIndex + 1}` : '0'} / {totalMoveCount}
                {currentSolveMoves.length > 0 && (
                  <span className="ml-2 text-amber-500">· {currentSolveMoves.length} solve {currentSolveMoves.length === 1 ? 'point' : 'points'}</span>
                )}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Select a chapter to see moves</p>
          </div>
        )}

        {/* Active chapter footer */}
        {selectedChapter && (
          <div className="flex-shrink-0 border-t border-border bg-card px-3 py-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium">Active chapter</span>
              <span className="text-[10px] text-muted-foreground/40 capitalize">{selectedChapter.orientation}</span>
            </div>
            <p className="text-xs font-medium truncate">{selectedChapter.name}</p>
            {currentSolveMoves.length > 0 && (
              <p className="text-[10px] text-amber-500 mt-0.5">
                {currentSolveMoves.length} solve {currentSolveMoves.length === 1 ? 'point' : 'points'} marked
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
