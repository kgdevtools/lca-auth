'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Chess, type Square } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import {
  Loader2, RotateCcw, Trash2, MoreVertical,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Play, Pause,
  AlignLeft, Rows3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { parsePgn, type ParsedPgnMove, type ParsedPgnChapter } from '@/lib/pgnParser'
import { newDecorationId, type StoredAnnotationSet } from '@/lib/decorations'
import { useBoardDecorations } from '@/hooks/useBoardDecorations'
import {
  createGameLogEntryAction, updateGameLogEntryAction, getLichessGamePgnAction,
  getAssessmentCriteriaAction, getGameLogEntryDetailAction, getGameCriteriaScoresAction, upsertGameCriteriaScoreAction,
  type LichessGamePickOption,
} from '@/actions/academy/gameLogActions'
import { PHASES, type GamePhase, type GameResult, type AssessmentCriterion } from '@/lib/gameAssessment'
import LichessGamePicker from './LichessGamePicker'

// Add/Edit Game — one modal for everything: a board (drag/click-to-move,
// right-click decorations — read+write, same mechanics as StudyEditorBoard.
// tsx/InteractiveStudyEditorBoard.tsx) sitting beside a tabbed panel (Details/
// Moves/Preview), heights matched to the board's measured pixel size the
// same way blunderbored's BoardShell.tsx does it. Board transport row
// (start/prev/play·pause/next/end + a 3-dot menu) ported from blunderbored's
// BoardControls.tsx/BoardTransport. Scoring (the old separate GameScoreView
// modal) is now the Details tab's "Rate" section — all buffered locally and
// saved together with the rest of the game on Save/Update.

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const BOARD_MAX_PX = 480

const RESULT_LABEL: Record<GameResult, string> = { win: 'Win', draw: 'Draw', loss: 'Loss' }
const RESULT_COLOR: Record<GameResult, string> = {
  win: 'text-emerald-600 dark:text-emerald-400',
  draw: 'text-amber-600 dark:text-amber-400',
  loss: 'text-red-600 dark:text-red-400',
}
const PHASE_LABEL: Record<GamePhase, string> = {
  opening: 'Opening', middlegame: 'Middlegame', endgame: 'Endgame',
  tactics: 'Tactics', strategy: 'Strategy', psychology: 'Psychology',
}
// One distinct hue per phase — used for the Preview tab's phase cards.
// Spread across the wheel (blue/violet/amber/red/emerald/pink) so all 6 stay
// visually distinguishable at a glance, light and dark alike.
const PHASE_COLOR: Record<GamePhase, { text: string; bg: string; dot: string }> = {
  opening:    { text: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-950/30',       dot: 'bg-blue-500' },
  middlegame: { text: 'text-violet-600 dark:text-violet-400',   bg: 'bg-violet-50 dark:bg-violet-950/30',   dot: 'bg-violet-500' },
  endgame:    { text: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/30',     dot: 'bg-amber-500' },
  tactics:    { text: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-950/30',         dot: 'bg-red-500' },
  strategy:   { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', dot: 'bg-emerald-500' },
  psychology: { text: 'text-pink-600 dark:text-pink-400',       bg: 'bg-pink-50 dark:bg-pink-950/30',       dot: 'bg-pink-500' },
}

type EntryMode = 'manual' | 'lichess' | 'import'
type Tab = 'details' | 'moves' | 'preview'

// Converts a parsed PGN's per-move %cal/%csl arrows/highlights into the
// editor's interactive annotations Map, keyed by ply index — so a coach
// sees (and can edit) decorations already baked into an imported/Lichess
// game, not just ones drawn fresh. Assigns real ids since the source PGN
// tokens carry none.
function seedAnnotationsFromParsedMoves(moves: ParsedPgnMove[]): Map<string, StoredAnnotationSet> {
  const map = new Map<string, StoredAnnotationSet>()
  moves.forEach((move, i) => {
    const arrows = move.arrows ?? []
    const highlights = move.highlights ?? []
    if (arrows.length === 0 && highlights.length === 0) return
    let order = 0
    map.set(String(i), {
      arrows: arrows.map(a => ({ id: newDecorationId(), order: order++, from: a.from, to: a.to, color: a.color })),
      highlights: highlights.map(h => ({ id: newDecorationId(), order: order++, square: h.square, squares: h.squares, color: h.color })),
      animations: [],
    })
  })
  return map
}

// Best-effort: which side (if any) is the student, from a PGN's own
// White/Black header tags — a name match either way, substring both
// directions. Returns nulls (leave the coach to fill in by hand) rather
// than guessing wrong when unclear.
function deriveDetailsFromHeaders(headers: Record<string, string>, studentName: string) {
  const studentLower = studentName.trim().toLowerCase()
  const matches = (name: string) => {
    const n = name.trim().toLowerCase()
    return !!n && !!studentLower && (n.includes(studentLower) || studentLower.includes(n))
  }
  const white = headers['White'] ?? ''
  const black = headers['Black'] ?? ''
  const pgnResult = headers['Result']

  let opponent: string | null = null
  let result: GameResult | null = null
  if (matches(white)) {
    opponent = black || null
    result = pgnResult === '1-0' ? 'win' : pgnResult === '0-1' ? 'loss' : pgnResult === '1/2-1/2' ? 'draw' : null
  } else if (matches(black)) {
    opponent = white || null
    result = pgnResult === '0-1' ? 'win' : pgnResult === '1-0' ? 'loss' : pgnResult === '1/2-1/2' ? 'draw' : null
  }

  const rawDate = headers['Date'] || headers['UTCDate']
  const date = rawDate && /^\d{4}\.\d{2}\.\d{2}$/.test(rawDate) ? rawDate.replace(/\./g, '-') : null

  return {
    opponent, result,
    event: headers['Event'] || null,
    eco: headers['ECO'] || null,
    opening: headers['Opening'] || null,
    date,
  }
}

// Same rollup math as gameLogRepository.ts's rollupPhaseScores — duplicated
// client-side (small, pure) so Preview/the value shown next to Rate update
// instantly from locally-buffered scores, not a round-trip.
function computeOverall(criteria: AssessmentCriterion[], scores: Record<string, number>): number | null {
  const byPhase = new Map<GamePhase, number[]>()
  criteria.forEach(c => {
    const s = scores[c.id]
    if (s == null) return
    const list = byPhase.get(c.phase) ?? []
    list.push(s)
    byPhase.set(c.phase, list)
  })
  const phaseAvgs = PHASES.map(p => byPhase.get(p)).filter((v): v is number[] => !!v && v.length > 0)
    .map(v => v.reduce((a, b) => a + b, 0) / v.length)
  if (phaseAvgs.length === 0) return null
  return Math.round((phaseAvgs.reduce((a, b) => a + b, 0) / phaseAvgs.length) * 20)
}

interface GameLogBoardEditorProps {
  studentId: string
  studentName: string
  open: boolean
  onClose: () => void
  onSaved: () => void
  /** Set to edit an existing game instead of creating one — Preview tab
   *  becomes the default (viewing/editing, not composing fresh) and the
   *  footer button reads "Update game". Same modal either way. */
  existingGameId?: string
}

export default function GameLogBoardEditor({ studentId, studentName, open, onClose, onSaved, existingGameId }: GameLogBoardEditorProps) {
  const isEditing = !!existingGameId
  const [activeTab, setActiveTab] = useState<Tab>(isEditing ? 'preview' : 'details')
  const [mode, setMode] = useState<EntryMode>('manual')

  // ── Board/PGN state ──────────────────────────────────────────────────────
  const [pgn, setPgn] = useState('')
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white')
  const [annotations, setAnnotations] = useState<Map<string, StoredAnnotationSet>>(new Map())
  const [showBoardMenu, setShowBoardMenu] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  // ── Details fields ───────────────────────────────────────────────────────
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [opponent, setOpponent] = useState('')
  const [event, setEvent] = useState('')
  const [result, setResult] = useState<GameResult>('win')
  const [notes, setNotes] = useState('')
  const [eco, setEco] = useState<string | null>(null)
  const [opening, setOpening] = useState<string | null>(null)
  const [lichessGameId, setLichessGameId] = useState<string | null>(null)
  const [source, setSource] = useState<'manual' | 'lichess'>('manual')

  const [pgnPasteInput, setPgnPasteInput] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [lichessPgnLoading, setLichessPgnLoading] = useState(false)

  // ── Rate (Criteria Detail) — buffered locally, saved together with the
  // game on Save/Update, not per-star. Lets Add and Edit share one flow
  // instead of needing the game to exist first. ────────────────────────────
  const [criteria, setCriteria] = useState<AssessmentCriterion[] | null>(null)
  const [scores, setScores] = useState<Record<string, number>>({})

  const [loadingExisting, setLoadingExisting] = useState(isEditing)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Fixed rubric — same 27 rows regardless of create/edit.
  useEffect(() => {
    getAssessmentCriteriaAction().then(setCriteria).catch(() => setCriteria([]))
  }, [])

  // Edit mode: load the existing game's data + any scores already given.
  useEffect(() => {
    if (!existingGameId) return
    let cancelled = false
    setLoadingExisting(true)
    Promise.all([
      getGameLogEntryDetailAction(studentId, existingGameId),
      getGameCriteriaScoresAction(studentId, existingGameId),
    ])
      .then(([detail, scored]) => {
        if (cancelled) return
        setDate(detail.date)
        setOpponent(detail.opponent ?? '')
        setEvent(detail.event ?? '')
        setResult(detail.result)
        setNotes(detail.notes ?? '')
        setEco(detail.eco)
        setOpening(detail.opening)
        setLichessGameId(detail.lichess_game_id)
        setSource(detail.source === 'lichess' ? 'lichess' : 'manual')
        setMode(detail.source === 'lichess' ? 'lichess' : 'manual')
        setPgn(detail.pgn ?? '')
        setAnnotations(new Map(Object.entries(detail.annotations ?? {})))
        if (detail.pgn) {
          try { setCurrentMoveIndex(parsePgn(detail.pgn).moves.length - 1) } catch {}
        }
        const scoreMap: Record<string, number> = {}
        scored.forEach(c => { if (c.score != null) scoreMap[c.id] = c.score })
        setScores(scoreMap)
      })
      .catch(e => { if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load this game') })
      .finally(() => { if (!cancelled) setLoadingExisting(false) })
    return () => { cancelled = true }
  }, [existingGameId, studentId])

  // ── PGN parsing ──────────────────────────────────────────────────────────
  const parsedPgn = useMemo<ParsedPgnChapter | null>(() => {
    if (!pgn.trim()) return null
    try { return parsePgn(pgn) } catch { return null }
  }, [pgn])

  const fenHistory = useMemo(() => {
    if (!parsedPgn?.moves.length) return null
    const temp = new Chess()
    const hist: string[] = [temp.fen()]
    for (const m of parsedPgn.moves) {
      try { temp.move(m.san); hist.push(temp.fen()) } catch { break }
    }
    return hist
  }, [parsedPgn])

  const activePosition = fenHistory ? (fenHistory[currentMoveIndex + 1] ?? fenHistory[fenHistory.length - 1]) : START_FEN
  const canPrev = currentMoveIndex >= 0
  const canNext = !!parsedPgn && currentMoveIndex < parsedPgn.moves.length - 1

  // ── Navigation ───────────────────────────────────────────────────────────
  const goTo = useCallback((index: number) => { setCurrentMoveIndex(index); setSelectedSquare(null) }, [])
  const goToStart = useCallback(() => goTo(-1), [goTo])
  const goToEnd = useCallback(() => { if (parsedPgn) goTo(parsedPgn.moves.length - 1) }, [parsedPgn, goTo])
  const goToPrev = useCallback(() => goTo(Math.max(-1, currentMoveIndex - 1)), [goTo, currentMoveIndex])
  const goToNext = useCallback(() => goTo(currentMoveIndex + 1), [goTo, currentMoveIndex])

  // Play/pause — steps once per second, same interval-with-refs pattern as
  // blunderbored's BoardTransport (reads latest canNext/goToNext through
  // refs so the interval doesn't need to be torn down/rebuilt every move).
  const canNextRef = useRef(canNext)
  const goToNextRef = useRef(goToNext)
  useEffect(() => { canNextRef.current = canNext; goToNextRef.current = goToNext })
  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => {
      if (!canNextRef.current) { setIsPlaying(false); return }
      goToNextRef.current()
    }, 1000)
    return () => clearInterval(id)
  }, [isPlaying])
  const togglePlay = useCallback(() => {
    if (isPlaying) { setIsPlaying(false); return }
    if (!canNext) goToStart()
    setIsPlaying(true)
  }, [isPlaying, canNext, goToStart])

  // ── Decorations — read+write, keyed by ply ──────────────────────────────
  const boardContainerRef = useRef<HTMLDivElement>(null)
  const decorations = useBoardDecorations({
    currentKey: String(currentMoveIndex),
    annotations,
    onAnnotationsChange: setAnnotations,
    boardContainerRef,
  })

  // ── Board interaction — drag AND click-to-move, decoration-focus on an
  // inert click (adapted from InteractiveStudyEditorBoard.tsx) ────────────
  const handlePieceDrop = useCallback((sourceSq: Square, targetSq: Square): boolean => {
    const game = new Chess(activePosition)
    let moveResult
    try { moveResult = game.move({ from: sourceSq, to: targetSq, promotion: 'q' }) } catch { return false }
    if (!moveResult) return false

    const keepMoves = parsedPgn ? parsedPgn.moves.slice(0, currentMoveIndex + 1) : []
    const replay = new Chess()
    for (const m of keepMoves) { try { replay.move(m.san) } catch { break } }
    replay.move(moveResult.san)

    setPgn(replay.pgn())
    setCurrentMoveIndex(currentMoveIndex + 1)
    setSelectedSquare(null)
    return true
  }, [activePosition, parsedPgn, currentMoveIndex])

  const legalTargets = useMemo(() => {
    if (!selectedSquare) return [] as Square[]
    try {
      const g = new Chess(activePosition)
      return g.moves({ square: selectedSquare, verbose: true }).map((m: any) => m.to as Square)
    } catch { return [] }
  }, [selectedSquare, activePosition])

  const handleSquareClick = useCallback((square: Square) => {
    if (selectedSquare) {
      if (selectedSquare === square) { setSelectedSquare(null); return }
      const moved = handlePieceDrop(selectedSquare, square)
      if (!moved) {
        const g = new Chess(activePosition)
        const piece = g.get(square)
        if (piece) setSelectedSquare(square)
        else { setSelectedSquare(null); decorations.focusSquare(square) }
      }
    } else {
      const g = new Chess(activePosition)
      const piece = g.get(square)
      if (piece) setSelectedSquare(square)
      else decorations.focusSquare(square)
    }
  }, [selectedSquare, activePosition, handlePieceDrop, decorations])

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {}
    if (selectedSquare) {
      styles[selectedSquare] = { backgroundColor: 'rgba(255,255,0,0.5)' }
      legalTargets.forEach(sq => { styles[sq] = { backgroundColor: 'rgba(0,255,0,0.3)' } })
    }
    return styles
  }, [selectedSquare, legalTargets])

  // ── Board pixel size — measured, so the right panel can match its height
  // exactly (blunderbored's BoardShell.tsx technique). ─────────────────────
  const boardOuterRef = useRef<HTMLDivElement>(null)
  const [boardPx, setBoardPx] = useState(0)
  const [isDesktop, setIsDesktop] = useState(true)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  // Depends on `loadingExisting`, not just `[]`: in edit mode the board div
  // doesn't exist in the DOM at all until the fetch resolves (it's behind
  // the loadingExisting ? spinner : board ternary below), so a mount-only
  // effect would find boardOuterRef.current still null and never attach the
  // observer — leaving boardPx stuck at 0 and the board permanently blank.
  // Re-running once loading flips to false re-attempts against the real node.
  useEffect(() => {
    const el = boardOuterRef.current
    if (!el) return
    const apply = (w: number) => { if (w > 0) setBoardPx(Math.min(Math.floor(w), BOARD_MAX_PX)) }
    apply(el.getBoundingClientRect().width)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(entries => apply(entries[0]?.contentRect.width ?? 0))
    ro.observe(el)
    return () => ro.disconnect()
  }, [loadingExisting])

  // ── Entry mode switching — mutually exclusive PGN sources; switching
  // resets the board/moves. ─────────────────────────────────────────────────
  const resetBoard = useCallback(() => {
    setPgn(''); setCurrentMoveIndex(-1); setSelectedSquare(null); setAnnotations(new Map())
  }, [])

  const handleModeChange = (next: EntryMode) => {
    setMode(next)
    resetBoard()
    setImportError(null)
    if (next !== 'lichess') setLichessGameId(null)
    setSource(next === 'lichess' ? 'lichess' : 'manual')
  }

  const applyParsedGame = (fullPgn: string, headers: Record<string, string>) => {
    setPgn(fullPgn)
    const derived = deriveDetailsFromHeaders(headers, studentName)
    if (derived.opponent) setOpponent(derived.opponent)
    if (derived.result) setResult(derived.result)
    if (derived.event) setEvent(derived.event)
    if (derived.eco) setEco(derived.eco)
    if (derived.opening) setOpening(derived.opening)
    if (derived.date) setDate(derived.date)
    try {
      const parsed = parsePgn(fullPgn)
      setAnnotations(seedAnnotationsFromParsedMoves(parsed.moves))
      setCurrentMoveIndex(parsed.moves.length - 1)
    } catch { /* leave at start position */ }
  }

  const handleImportPgn = () => {
    setImportError(null)
    if (!pgnPasteInput.trim()) { setImportError('Paste a PGN first.'); return }
    let parsed
    try { parsed = parsePgn(pgnPasteInput) } catch { setImportError("That doesn't look like a valid PGN."); return }
    if (parsed.moves.length === 0) { setImportError('No moves found in that PGN.'); return }
    applyParsedGame(pgnPasteInput, parsed.headers)
  }

  const handleLichessPick = async (game: LichessGamePickOption) => {
    setLichessGameId(game.lichessGameId)
    setOpponent(game.opponent)
    setResult(game.result)
    setDate(game.date)
    setEco(game.eco)
    setOpening(game.opening)
    setSource('lichess')

    setLichessPgnLoading(true)
    setImportError(null)
    try {
      const rich = await getLichessGamePgnAction(studentId, game.lichessGameId)
      setPgn(rich)
      const parsed = parsePgn(rich)
      setAnnotations(seedAnnotationsFromParsedMoves(parsed.moves))
      setCurrentMoveIndex(parsed.moves.length - 1)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Failed to fetch this game’s moves — the fields above are still filled in and can be saved without them.')
    } finally {
      setLichessPgnLoading(false)
    }
  }

  // ── Save/Update — game fields + every buffered Rate score, together ─────
  const handleSave = async () => {
    setSaveError(null)
    setSaving(true)
    try {
      const payload = {
        studentId, date,
        opponent: opponent.trim() || null,
        event: event.trim() || null,
        result, notes: notes.trim() || null,
        source, lichessGameId, eco, opening,
        pgn: pgn || null,
        annotations: annotations.size > 0 ? Object.fromEntries(annotations) : undefined,
      }

      let entryId: string
      if (isEditing && existingGameId) {
        await updateGameLogEntryAction(studentId, existingGameId, payload)
        entryId = existingGameId
      } else {
        entryId = (await createGameLogEntryAction(payload)).id
      }

      await Promise.all(
        Object.entries(scores).map(([criterionId, score]) =>
          upsertGameCriteriaScoreAction(studentId, entryId, criterionId, score)
        )
      )
      onSaved()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save game')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent size="wide" className="sm:max-w-5xl rounded-sm p-4 gap-2.5">
        <DialogHeader>
          <DialogTitle>Log a game for {studentName}</DialogTitle>
        </DialogHeader>

        {loadingExisting ? (
          <div className="py-16 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : loadError ? (
          <p className="text-sm text-destructive py-8 text-center">{loadError}</p>
        ) : (
          <div className="flex flex-col lg:flex-row gap-3">
            {/* ══ LEFT: board + transport ═════════════════════════════════════ */}
            <div ref={boardOuterRef} className="shrink-0 flex flex-col mx-auto lg:mx-0" style={{ width: `min(100%, ${BOARD_MAX_PX}px)` }}>
              <div
                ref={boardContainerRef}
                className="relative w-full"
                style={{ aspectRatio: '1 / 1' }}
                onPointerDown={decorations.onBoardPointerDown}
                onContextMenu={decorations.onBoardContextMenu}
                onTouchStart={decorations.onBoardTouchStart}
                onTouchEnd={decorations.onBoardTouchEnd}
                onTouchMove={decorations.onBoardTouchEnd}
              >
                {boardPx > 0 && (
                  <Chessboard
                    position={activePosition}
                    boardWidth={boardPx}
                    onPieceDrop={handlePieceDrop}
                    onSquareClick={handleSquareClick}
                    arePiecesDraggable
                    boardOrientation={boardOrientation}
                    areArrowsAllowed={false}
                    customArrows={decorations.customArrows.length > 0 ? (decorations.customArrows as unknown as [Square, Square, string?][]) : undefined}
                    customSquare={decorations.customSquare as any}
                    customSquareStyles={customSquareStyles}
                    customBoardStyle={{ borderRadius: '5px' }}
                  />
                )}
                {decorations.overlay}
              </div>

              {/* Transport row — start/prev/play·pause/next/end + 3-dot menu,
                  ported from blunderbored's BoardControls/BoardTransport. */}
              <div className="relative flex gap-0.5 mt-1.5">
                <button
                  onClick={() => setShowBoardMenu(v => !v)}
                  title="More"
                  aria-label="More board options"
                  className="flex-none grid place-items-center px-2 py-1.5 rounded-sm bg-muted hover:bg-accent text-foreground transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                <TransportBtn onClick={goToStart} disabled={!canPrev} title="Start"><ChevronsLeft className="w-4 h-4" /></TransportBtn>
                <TransportBtn onClick={goToPrev} disabled={!canPrev} title="Previous"><ChevronLeft className="w-4 h-4" /></TransportBtn>
                <TransportBtn onClick={togglePlay} disabled={!canPrev && !canNext} title={isPlaying ? 'Pause' : 'Play'}>
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </TransportBtn>
                <TransportBtn onClick={goToNext} disabled={!canNext} title="Next"><ChevronRight className="w-4 h-4" /></TransportBtn>
                <TransportBtn onClick={goToEnd} disabled={!canNext} title="End"><ChevronsRight className="w-4 h-4" /></TransportBtn>

                {showBoardMenu && (
                  <div className="absolute bottom-full left-0 mb-1 z-50 bg-card border border-border rounded-sm shadow-xl py-1 min-w-[170px] text-xs">
                    <button
                      onClick={() => { setBoardOrientation(p => p === 'white' ? 'black' : 'white'); setShowBoardMenu(false) }}
                      className="flex items-center gap-2 w-full text-left px-3 py-1.5 hover:bg-muted text-foreground"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Flip board
                    </button>
                    {decorations.hasDecorations && (
                      <button
                        onClick={() => { decorations.clearAll(); setShowBoardMenu(false) }}
                        className="flex items-center gap-2 w-full text-left px-3 py-1.5 hover:bg-muted text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Clear decorations
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ══ RIGHT: Details / Moves / Preview ════════════════════════════ */}
            <div
              className="flex-1 min-w-0 lg:min-w-[260px] flex flex-col rounded-sm overflow-hidden bg-muted/20"
              style={isDesktop && boardPx > 0 ? { height: boardPx } : undefined}
            >
              <div className="flex-shrink-0 flex border-b border-border/60">
                {(['details', 'moves', 'preview'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'flex-1 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors border-b-2 -mb-px',
                      activeTab === tab ? 'border-foreground text-foreground bg-card' : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {tab === 'details' ? 'Details' : tab === 'moves' ? `Moves${parsedPgn ? ` (${parsedPgn.moves.length})` : ''}` : 'Preview'}
                  </button>
                ))}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto">
                {activeTab === 'details' ? (
                  <div className="p-2.5 space-y-2.5">
                    <div className="inline-flex rounded-sm bg-muted overflow-hidden text-xs font-medium w-full p-0.5 gap-0.5">
                      {(['manual', 'lichess', 'import'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => handleModeChange(m)}
                          className={cn(
                            'flex-1 px-2 py-1 rounded-sm transition-colors',
                            mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {m === 'manual' ? 'Manual' : m === 'lichess' ? 'Lichess' : 'Import PGN'}
                        </button>
                      ))}
                    </div>

                    {mode === 'lichess' && (
                      <div className="space-y-1.5">
                        <LichessGamePicker studentId={studentId} selectedGameId={lichessGameId} onPick={handleLichessPick} />
                        {lichessPgnLoading && (
                          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" /> Fetching moves…
                          </p>
                        )}
                      </div>
                    )}

                    {mode === 'import' && (
                      <div className="space-y-1.5">
                        <textarea
                          value={pgnPasteInput}
                          onChange={e => setPgnPasteInput(e.target.value)}
                          rows={4}
                          placeholder={'[Event "Game"]\n[White "..."]\n[Black "..."]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 ...'}
                          className="w-full px-3 py-2 rounded-sm border border-border/70 bg-background text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-foreground/20 placeholder:text-muted-foreground"
                        />
                        <button
                          onClick={handleImportPgn}
                          className="w-full px-3 py-1.5 rounded text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
                        >
                          Parse PGN
                        </button>
                      </div>
                    )}

                    {importError && <p className="text-xs text-destructive">{importError}</p>}

                    {/* Result / Event, Date / Opponent — matches the sketch's field order */}
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Result">
                        <select
                          value={result}
                          onChange={e => setResult(e.target.value as GameResult)}
                          className="w-full h-8 px-3 rounded-sm border border-border/70 bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 appearance-none"
                        >
                          {(['win', 'draw', 'loss'] as const).map(r => <option key={r} value={r}>{RESULT_LABEL[r]}</option>)}
                        </select>
                      </Field>
                      <Field label="Event">
                        <input
                          type="text" value={event} onChange={e => setEvent(e.target.value)}
                          placeholder="e.g. Rapid Tournament"
                          className="w-full h-8 px-3 rounded-sm border border-border/70 bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 placeholder:text-muted-foreground"
                        />
                      </Field>
                      <Field label="Date">
                        <input
                          type="date" value={date} onChange={e => setDate(e.target.value)}
                          className="w-full h-8 px-3 rounded-sm border border-border/70 bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                        />
                      </Field>
                      <Field label="Opponent">
                        <input
                          type="text" value={opponent} onChange={e => setOpponent(e.target.value)}
                          placeholder="e.g. Lwazi"
                          className="w-full h-8 px-3 rounded-sm border border-border/70 bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 placeholder:text-muted-foreground"
                        />
                      </Field>
                    </div>

                    <Field label="Notes">
                      <textarea
                        value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                        placeholder="Observations to remember when scoring this game…"
                        className="w-full px-3 py-2 rounded-sm border border-border/70 bg-background text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-foreground/20 placeholder:text-muted-foreground"
                      />
                    </Field>

                    {criteria && (
                      <RateSection
                        criteria={criteria}
                        scores={scores}
                        onScoreChange={(criterionId, score) => setScores(prev => {
                          if (score == null) {
                            const { [criterionId]: _omit, ...rest } = prev
                            return rest
                          }
                          return { ...prev, [criterionId]: score }
                        })}
                      />
                    )}
                  </div>
                ) : activeTab === 'moves' ? (
                  <MovesTab parsedPgn={parsedPgn} currentMoveIndex={currentMoveIndex} onGoTo={goTo} />
                ) : (
                  <PreviewTab date={date} opponent={opponent} event={event} result={result} criteria={criteria ?? []} scores={scores} />
                )}
              </div>
            </div>
          </div>
        )}

        {saveError && <p className="text-xs text-destructive">{saveError}</p>}

        <DialogFooter>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !date || loadingExisting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 transition-colors"
          >
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            {isEditing ? 'Update game' : 'Save game'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Small shared bits ────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</label>
      {children}
    </div>
  )
}

function TransportBtn({ onClick, disabled, title, children }: { onClick: () => void; disabled?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex-1 py-1.5 rounded-sm text-sm transition-colors grid place-items-center bg-muted hover:bg-accent text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  )
}

// ── Rate — dropdown over the 27 criteria (grouped by phase) + a smooth
// horizontal 1-5 scroll-snap picker, with a leading "—" slot for "don't rate
// this one". Buffered in `scores` (parent state), not saved per-change —
// Save/Update persists all of it together. ──────────────────────────────────

function RateSection({
  criteria, scores, onScoreChange,
}: {
  criteria: AssessmentCriterion[]
  scores: Record<string, number>
  onScoreChange: (criterionId: string, score: number | null) => void
}) {
  const [selectedId, setSelectedId] = useState(criteria[0]?.id ?? '')
  useEffect(() => { if (!selectedId && criteria.length > 0) setSelectedId(criteria[0].id) }, [criteria, selectedId])

  const selected = criteria.find(c => c.id === selectedId)
  const currentValue = selected ? scores[selected.id] ?? null : null
  // Live, continuously-updating position while dragging the scroller —
  // decimals are the real value now, not a transient display only.
  const [liveValue, setLiveValue] = useState<number | null>(currentValue)
  useEffect(() => { setLiveValue(currentValue) }, [currentValue])

  return (
    <Field label="Rate">
      <div className="flex items-center gap-1.5">
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger size="sm" className="w-[32%] shrink-0 rounded-sm text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PHASES.map(phase => (
              <SelectGroup key={phase}>
                <SelectLabel className={PHASE_COLOR[phase].text}>{PHASE_LABEL[phase]}</SelectLabel>
                {criteria.filter(c => c.phase === phase).map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{scores[c.id] != null ? ` (${scores[c.id]})` : ''}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        <span className="w-8 shrink-0 text-center text-sm font-bold tabular-nums text-foreground">
          {liveValue != null ? (Number.isInteger(liveValue) ? liveValue : liveValue.toFixed(1)) : '—'}
        </span>
        {selected && (
          <ScoreScroller
            key={selected.id}
            value={currentValue}
            onLiveChange={setLiveValue}
            onChange={v => onScoreChange(selected.id, v)}
            className="flex-1 min-w-0"
          />
        )}
      </div>
    </Field>
  )
}

// "—" (N/A) occupies unit 0; 1-5 occupy units 1-5, evenly spread across
// whatever width the track actually renders at (flex-1 per slot) — so all
// 6 labels are always fully in view, never wider than their container.
// Dragging anywhere on the track computes a continuous position, so any 0.1
// in-between value is a real, savable score, not just a whole number; each
// label is also directly clickable for a one-tap exact pick.
const SCORE_SLOTS: Array<number | null> = [null, 1, 2, 3, 4, 5]

function ScoreScroller({
  value, onChange, onLiveChange, className,
}: {
  value: number | null
  onChange: (v: number | null) => void
  onLiveChange: (v: number | null) => void
  className?: string
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  // Current thumb position in "units" (0 = the "—" slot, 5 = the "5" slot) —
  // drives the fill bar + per-label size/opacity. Synced from `value` when
  // not actively dragging; updated locally (not via the value prop) while
  // dragging so the UI stays perfectly smooth.
  const [pos, setPos] = useState(() => value ?? 0)
  const draggingRef = useRef(false)
  useEffect(() => { if (!draggingRef.current) setPos(value ?? 0) }, [value])

  // Raw continuous position → the real value: <0.5 units = N/A, otherwise
  // clamped to [1, 5] and rounded to the nearest 0.1 (matches the DB's
  // precision — see the migration adding this column).
  const unitsToValue = (units: number): number | null =>
    units < 0.5 ? null : Math.round(Math.max(1, Math.min(5, units)) * 10) / 10

  const updateFromClientX = (clientX: number, commit: boolean) => {
    const el = trackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const frac = rect.width > 0 ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) : 0
    const units = frac * (SCORE_SLOTS.length - 1)
    setPos(units)
    const v = unitsToValue(units)
    onLiveChange(v)
    if (commit) onChange(v)
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    updateFromClientX(e.clientX, false)
  }
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    updateFromClientX(e.clientX, false)
  }
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    updateFromClientX(e.clientX, true)
  }

  const handlePick = (n: number | null) => {
    setPos(n ?? 0)
    onLiveChange(n)
    onChange(n)
  }

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn('relative flex items-stretch h-8 rounded-sm bg-muted cursor-pointer touch-none select-none overflow-hidden', className)}
    >
      {/* Fill bar — purely visual progress up to the current position */}
      <div
        className="absolute inset-y-0 left-0 bg-foreground/10 pointer-events-none transition-[width] duration-75"
        style={{ width: `${(pos / (SCORE_SLOTS.length - 1)) * 100}%` }}
      />
      {SCORE_SLOTS.map((n, i) => {
        const closeness = Math.max(0, 1 - Math.abs(i - pos))
        return (
          <button
            key={n ?? 'na'}
            type="button"
            onClick={() => handlePick(n)}
            className="relative z-10 flex-1 min-w-0 flex items-center justify-center"
          >
            <span
              className={cn('font-bold tabular-nums transition-[opacity] duration-75', n == null ? 'text-muted-foreground' : 'text-foreground')}
              style={{ fontSize: 11 + closeness * 6, opacity: 0.4 + closeness * 0.6 }}
            >
              {n ?? '—'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Preview — the Chess Performance Log table row this game corresponds to,
// read-only (matches GameLogTable's columns in GamePerformancePanel.tsx). ──

function PreviewTab({
  date, opponent, event, result, criteria, scores,
}: {
  date: string
  opponent: string
  event: string
  result: GameResult
  criteria: AssessmentCriterion[]
  scores: Record<string, number>
}) {
  const scoredCount = Object.keys(scores).length
  const overall = computeOverall(criteria, scores)

  return (
    <div className="p-2.5 space-y-2.5">
      {/* Compact 1-row summary — matches the Game Log table's own columns */}
      <div className="rounded-sm bg-card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50">
              {['Date', 'Opponent', 'Event', 'Result'].map(h => (
                <th key={h} className="text-left font-medium text-[10px] uppercase tracking-wide text-muted-foreground px-2 py-1.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-2 py-1.5 text-foreground whitespace-nowrap">
                {date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </td>
              <td className="px-2 py-1.5 text-foreground">{opponent || '—'}</td>
              <td className="px-2 py-1.5 text-foreground">{event || '—'}</td>
              <td className={cn('px-2 py-1.5 font-medium', RESULT_COLOR[result])}>{RESULT_LABEL[result]}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{scoredCount}/27 criteria scored</span>
        <span className="text-xs font-bold tabular-nums text-foreground">{overall != null ? `${overall}/100` : '—'}</span>
      </div>

      {/* One card per phase, colour-coded, listing its criteria + scores */}
      <div className="grid grid-cols-3 gap-1.5">
        {PHASES.map(phase => {
          const color = PHASE_COLOR[phase]
          const phaseCriteria = criteria.filter(c => c.phase === phase)
          const phaseScores = phaseCriteria.map(c => scores[c.id]).filter((v): v is number => v != null)
          const avg = phaseScores.length > 0 ? phaseScores.reduce((a, b) => a + b, 0) / phaseScores.length : null

          return (
            <div key={phase} className={cn('rounded-sm p-1.5', color.bg)}>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className={cn('flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide', color.text)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', color.dot)} />
                  {PHASE_LABEL[phase]}
                </span>
                <span className={cn('text-[10px] font-bold tabular-nums', color.text)}>{avg != null ? avg.toFixed(1) : '—'}</span>
              </div>
              <ul className="space-y-0.5">
                {phaseCriteria.map(c => (
                  <li key={c.id} className="flex items-center justify-between gap-1 text-[10px] text-foreground/70">
                    <span className="truncate">{c.name}</span>
                    <span className="tabular-nums font-medium shrink-0">{scores[c.id] ?? '—'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Moves tab — clickable SAN chip list, synced to the board's current ply ──

type MovesView = 'inline' | 'list'

function MovesTab({
  parsedPgn, currentMoveIndex, onGoTo,
}: {
  parsedPgn: ParsedPgnChapter | null
  currentMoveIndex: number
  onGoTo: (index: number) => void
}) {
  const [view, setView] = useState<MovesView>('inline')

  if (!parsedPgn || parsedPgn.moves.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">
          Play a move, import a PGN, or pick a Lichess game to see moves here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-2.5 gap-1.5">
      <div className="flex-shrink-0 flex items-center justify-end">
        <span className="inline-flex rounded-sm bg-muted p-0.5 gap-0.5" role="group" aria-label="Moves view">
          <button
            onClick={() => setView('inline')}
            title="Inline — flowing scoresheet"
            aria-pressed={view === 'inline'}
            className={cn('grid place-items-center h-5 w-6 rounded-sm transition-colors', view === 'inline' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            <AlignLeft className="w-3 h-3" />
          </button>
          <button
            onClick={() => setView('list')}
            title="List — one move pair per row"
            aria-pressed={view === 'list'}
            className={cn('grid place-items-center h-5 w-6 rounded-sm transition-colors', view === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            <Rows3 className="w-3 h-3" />
          </button>
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto rounded-sm bg-muted/30 p-2">
        {view === 'inline' ? (
          <div className="flex flex-wrap items-baseline gap-x-0.5 gap-y-1">
            {parsedPgn.moves.map((move, i) => {
              const isCurrent = i === currentMoveIndex
              const isPast = i < currentMoveIndex
              return (
                <span key={`m-wrap-${i}`}>
                  {i % 2 === 0 && (
                    <span className="text-[11px] text-muted-foreground/40 font-mono select-none mr-0.5">
                      {Math.floor(i / 2) + 1}.
                    </span>
                  )}
                  <button
                    onClick={() => onGoTo(i)}
                    className={cn(
                      'px-1.5 py-0.5 rounded-sm text-xs transition-colors leading-none font-medium',
                      isCurrent ? 'bg-amber-500 text-black'
                        : isPast ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          : 'text-foreground/80 hover:bg-muted'
                    )}
                  >
                    {move.san}{move.nag ? <span className="ml-0.5 text-[10px]">{move.nag}</span> : null}
                  </button>
                </span>
              )
            })}
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {parsedPgn.moves.filter((_, i) => i % 2 === 0).map((whiteMove, pairIdx) => {
              const whiteI = pairIdx * 2
              const blackI = whiteI + 1
              const blackMove = parsedPgn.moves[blackI]
              return (
                <div key={pairIdx} className="flex items-center gap-1 py-1 text-xs">
                  <span className="w-6 text-muted-foreground/40 font-mono shrink-0">{pairIdx + 1}.</span>
                  <MoveCell san={whiteMove.san} nag={whiteMove.nag} active={whiteI === currentMoveIndex} onClick={() => onGoTo(whiteI)} />
                  {blackMove ? (
                    <MoveCell san={blackMove.san} nag={blackMove.nag} active={blackI === currentMoveIndex} onClick={() => onGoTo(blackI)} />
                  ) : <span className="flex-1" />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function MoveCell({ san, nag, active, onClick }: { san: string; nag?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 text-left px-1.5 py-0.5 rounded-sm font-medium transition-colors',
        active ? 'bg-amber-500 text-black' : 'text-foreground/80 hover:bg-muted'
      )}
    >
      {san}{nag ? <span className="ml-0.5 text-[10px]">{nag}</span> : null}
    </button>
  )
}
