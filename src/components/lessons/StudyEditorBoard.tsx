'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Chess, type Square } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  Plus, Trash2, Pencil, RotateCcw, X, Highlighter, ArrowUp,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react'
import { parsePgn, type MoveAnnotation } from '@/lib/pgnParser'
import { cn } from '@/lib/utils'
import { AnalysisPanel } from '@/components/analysis/AnalysisPanel'

interface StudyChapter {
  id: string
  name: string
  pgn: string
  orientation: 'white' | 'black'
}

interface StudyEditorBoardProps {
  chapters: StudyChapter[]
  selectedChapterIndex: number | null
  onSelectChapter: (index: number | null) => void
  onDeleteChapter: (index: number) => void
  onRenameChapter: (index: number, name: string) => void
  chapterNameInput: string
  setChapterNameInput: (value: string) => void
  chapterOrientation: 'white' | 'black'
  setChapterOrientation: (value: 'white' | 'black') => void
  pgnInput: string
  setPgnInput: (value: string) => void
  onAddChapter: () => void
  moveAnnotations: Map<string, MoveAnnotation>
  onAnnotationsChange: (annotations: Map<string, MoveAnnotation>) => void
}

type DrawMode = 'none' | 'arrow' | 'highlight'

const ARROW_COLORS = [
  { name: 'Green',  value: 'G', color: 'green',  hex: '#22c55e' },
  { name: 'Red',    value: 'R', color: 'red',    hex: '#ef4444' },
  { name: 'Blue',   value: 'B', color: 'blue',   hex: '#3b82f6' },
  { name: 'Yellow', value: 'Y', color: 'yellow', hex: '#eab308' },
]

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

export default function StudyEditorBoard({
  chapters,
  selectedChapterIndex,
  onSelectChapter,
  onDeleteChapter,
  onRenameChapter,
  chapterNameInput,
  setChapterNameInput,
  chapterOrientation,
  setChapterOrientation,
  pgnInput,
  setPgnInput,
  onAddChapter,
  moveAnnotations,
  onAnnotationsChange,
}: StudyEditorBoardProps) {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [boardFen, setBoardFen]                 = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white')
  const [showAddChapter, setShowAddChapter]     = useState(false)
  const [drawMode, setDrawMode]                 = useState<DrawMode>('none')
  const [arrowColor, setArrowColor]             = useState('G')
  const [arrowStart, setArrowStart]             = useState<string | null>(null)
  const [evalScore, setEvalScore]               = useState<number | null>(null)
  const [evalMate, setEvalMate]                 = useState<number | null>(null)
  const [engineEnabled, setEngineEnabled]       = useState(false)
  const [editingChapterIdx, setEditingChapterIdx]     = useState<number | null>(null)
  const [editingChapterName, setEditingChapterName]   = useState('')

  // Responsive board sizing — constrained by whichever is smaller: column width or available height
  // Available height = column height minus toolbar (44px) + nav row (44px) + padding (32px) = ~120px reserved
  const boardColRef = useRef<HTMLDivElement>(null)
  const [boardSize, setBoardSize] = useState(360)

  useEffect(() => {
    const el = boardColRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const byWidth  = Math.floor(width)  - 32 - 22   // padding + evalbar (16) + gap (6)
      const byHeight = Math.floor(height) - 130       // toolbar + nav + padding reserved
      setBoardSize(Math.max(180, Math.min(byWidth, byHeight)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Annotations ─────────────────────────────────────────────────────────────

  const selectedChapter  = selectedChapterIndex !== null ? chapters[selectedChapterIndex] : null
  const activePgn        = selectedChapter?.pgn || pgnInput
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

  // ── PGN ─────────────────────────────────────────────────────────────────────

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

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goTo = (index: number) => {
    setCurrentMoveIndex(index)
    if (fenHistory) setBoardFen(fenHistory[index + 1] ?? fenHistory[fenHistory.length - 1])
  }

  const goToStart = () => {
    setCurrentMoveIndex(-1)
    if (fenHistory) setBoardFen(fenHistory[0])
  }

  const goToEnd = () => {
    if (!parsedPgn) return
    goTo(parsedPgn.moves.length - 1)
  }

  // ── Board interaction ────────────────────────────────────────────────────────

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
    const g = new Chess(boardFen)
    const piece = g.get(source)
    if (!piece) return false
    g.remove(source)
    g.put(piece, target)
    setBoardFen(g.fen())
    return true
  }, [boardFen])

  const handleChapterSelect = (index: number) => {
    onSelectChapter(index)
    setBoardOrientation(chapters[index].orientation)
    setCurrentMoveIndex(-1)
    setBoardFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    setArrowStart(null)
  }

  // ── Visuals ──────────────────────────────────────────────────────────────────

  const customSquareStyles: Record<string, React.CSSProperties> = {}
  drawnHighlights.forEach(sq => { customSquareStyles[sq] = { backgroundColor: 'rgba(234,179,8,0.45)' } })
  if (arrowStart) customSquareStyles[arrowStart] = { backgroundColor: 'rgba(59,130,246,0.35)' }

  const customArrows = drawnArrows.map(a => {
    const hex = ARROW_COLORS.find(c => c.color === a.color)?.hex || '#22c55e'
    return [a.from, a.to, hex] as [string, string, string]
  })

  const activePosition = fenHistory
    ? (fenHistory[currentMoveIndex + 1] ?? fenHistory[0])
    : boardFen

  // ── Small reusable buttons ───────────────────────────────────────────────────

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

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] overflow-hidden"
      style={{ height: 'calc(100vh - 50px)', minHeight: '500px', marginRight: '0px', gap: '0', padding: '0' }}
    >

      {/* ══ LEFT: Board + toolbar + move list ══════════════════════════════════ */}
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
              boardOrientation={selectedChapter?.orientation || boardOrientation}
              customSquareStyles={customSquareStyles}
              customArrows={customArrows.length > 0 ? (customArrows as unknown as [Square, Square, string?][]) : undefined}
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
                  onClick={() => setArrowColor(c.value)}
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

      {/* ══ RIGHT: Chapters panel ═══════════════════════════════════════════════ */}
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

        {/* Inline add-chapter form — drops down immediately below the header */}
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
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">PGN</Label>
                <Select
                  value={chapterOrientation}
                  onValueChange={v => setChapterOrientation(v as 'white' | 'black')}
                >
                  <SelectTrigger className="h-6 w-[80px] text-[11px] px-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="white">White</SelectItem>
                    <SelectItem value="black">Black</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={pgnInput}
                onChange={e => setPgnInput(e.target.value)}
                placeholder={'[Event "Game"]\n1. e4 e5 2. Nf3'}
                className="font-mono text-[11px] resize-none"
                rows={5}
              />
            </div>

            <Button
              onClick={() => { onAddChapter(); setShowAddChapter(false) }}
              size="sm"
              className="w-full h-8 text-xs"
              disabled={!pgnInput.trim() || !chapterNameInput.trim()}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add chapter
            </Button>
          </div>
        )}

        {/* Chapter list — capped so move list always has room */}
        <div className="overflow-y-auto border-b border-border/60 flex-shrink-0" style={{ maxHeight: '180px' }}>
          {chapters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 gap-1.5 px-4 text-center">
              <p className="text-xs text-muted-foreground leading-relaxed">
                No chapters yet.<br />
                Use <strong>Import</strong> above or click <strong>Add</strong>.
              </p>
            </div>
          ) : (
            chapters.map((chapter, index) => (
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
                  <span className={cn(
                    'flex-1 text-sm truncate',
                    selectedChapterIndex === index ? 'font-medium' : 'text-foreground/80'
                  )}>
                    {chapter.name}
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
            ))
          )}
        </div>

        {/* Move list + nav — in right panel, same as InteractiveStudy */}
        {parsedPgn && parsedPgn.moves.length > 0 ? (
          <div className="flex flex-col flex-1 min-h-0 px-3 py-2 gap-2">
            <div className="flex-1 min-h-0 overflow-y-auto rounded border border-border bg-muted/20 p-2">
              <div className="flex flex-wrap items-baseline gap-x-0.5 gap-y-1">
                {(() => {
                  const els: React.ReactNode[] = []
                  parsedPgn.moves.forEach((move, i) => {
                    const isCurrent = i === currentMoveIndex
                    const isPast    = i < currentMoveIndex
                    if (i % 2 === 0) {
                      els.push(
                        <span key={`mn-${i}`} className="text-[11px] text-muted-foreground/40 font-mono select-none">
                          {Math.floor(i / 2) + 1}.
                        </span>
                      )
                    }
                    els.push(
                      <button
                        key={`m-${i}`}
                        onClick={() => goTo(i)}
                        className={cn(
                          'px-1.5 py-0.5 rounded text-xs transition-colors leading-none font-medium',
                          isCurrent ? 'bg-amber-500 text-black'
                          : isPast  ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          :           'text-foreground/80 hover:bg-muted'
                        )}
                      >
                        {move.san}{move.nag ? <span className="ml-0.5 text-[10px]">{move.nag}</span> : null}
                      </button>
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
            </div>
            <div className="flex-shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <NavBtn onClick={goToStart}><ChevronsLeft className="w-3.5 h-3.5" /></NavBtn>
                <NavBtn onClick={() => goTo(Math.max(0, currentMoveIndex - 1))} disabled={currentMoveIndex < 0}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </NavBtn>
                <NavBtn onClick={() => goTo(currentMoveIndex + 1)} disabled={currentMoveIndex >= parsedPgn.moves.length - 1}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </NavBtn>
                <NavBtn onClick={goToEnd}><ChevronsRight className="w-3.5 h-3.5" /></NavBtn>
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {currentMoveIndex >= 0 ? `${currentMoveIndex + 1}` : '0'} / {parsedPgn.moves.length}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Select a chapter to see moves</p>
          </div>
        )}

        {/* Selected chapter footer */}
        {selectedChapter && (
          <div className="flex-shrink-0 border-t border-border bg-card px-3 py-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60 font-medium">
                Active chapter
              </span>
              <span className="text-[10px] text-muted-foreground/40 capitalize">
                {selectedChapter.orientation}
              </span>
            </div>
            <p className="text-xs font-medium truncate">{selectedChapter.name}</p>
          </div>
        )}
      </div>
    </div>
  )
}
