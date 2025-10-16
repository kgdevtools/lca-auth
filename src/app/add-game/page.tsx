"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Chess } from "chess.js"
import type { Move, Square } from "chess.js"
import { Chessboard } from "react-chessboard"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Trash2,
  Upload,
  Plus,
  RefreshCcw,
  Undo2,
  FileSymlink,
  MousePointer,
} from "lucide-react"
import { fetchGames, addGameToDB, type GameData } from "./actions"

// --- TYPE DEFINITIONS ---
type UiMove = Move & { moveNumber: number }
interface GameHistory {
  moves: UiMove[]
  fenHistory: string[]
}

// --- CONSTANTS ---
const BOARD_CUSTOM_SQUARE_STYLES = {
  lastMove: { backgroundColor: "rgba(59, 130, 246, 0.4)" },
  legalMove: { background: "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)" },
  legalCapture: { background: "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)" },
  selectedPiece: { backgroundColor: "rgba(59, 130, 246, 0.4)" },
}

// --- HELPER FUNCTIONS ---
function parsePgnHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {}
  const headerRegex = /^\s*```math([^\s```]+)\s+"([^"]*)"```/gm
  let match
  while ((match = headerRegex.exec(pgn)) !== null) {
    headers[match[1]] = match[2]
  }
  return headers
}

function generateTitleFromPgn(headers: Record<string, string>): string {
  const white = headers.White || ""
  const black = headers.Black || ""
  const event = headers.Event
  const date = headers.Date
  if (!white && !black) return ""
  if (event && event !== "?" && event !== "rated blitz game") return `${event}: ${white} vs ${black}`
  if (date && date !== "????.??.??") return `${white} vs ${black} (${date})`
  return `${white} vs ${black}`
}

function validatePgn(pgn: string): { valid: boolean; error?: string } {
  if (!pgn.trim()) return { valid: false, error: "PGN cannot be empty" }
  try {
    const chess = new Chess()
    chess.loadPgn(pgn)
    return { valid: true }
  } catch (error) {
    return { valid: false, error: "Invalid PGN format" }
  }
}

function constructLichessStylePgn(
  movesText: string,
  metadata: Record<string, string>
): string {
  const orderedKeys = [
    'Event', 'Site', 'Date', 'White', 'Black', 'Result', 'GameId', 'UTCDate', 'UTCTime',
    'WhiteElo', 'BlackElo', 'WhiteRatingDiff', 'BlackRatingDiff', 'Variant', 'TimeControl',
    'ECO', 'Opening', 'Termination'
  ]
  const headerValues: Record<string, string> = {
    Event: metadata.event || "", Site: "", Date: metadata.date || "", White: metadata.white || "",
    Black: metadata.black || "", Result: metadata.result || "", GameId: "", UTCDate: "", UTCTime: "",
    WhiteElo: metadata.whiteElo || "", BlackElo: metadata.blackElo || "", AppendRatingDiff: "",
    BlackRatingDiff: "", Variant: "", TimeControl: metadata.timeControl || "", ECO: "",
    Opening: metadata.opening || "", Termination: "",
  }
  let headerString = ''
  for (const key of orderedKeys) {
    const value = headerValues[key] ?? ''
    headerString += `[${key} "${value}"]\r\n`
  }
  const moves = movesText.trim() || '*'
  return `${headerString}\r\n${moves}`
}

function useGameForm() {
  const [formState, setFormState] = useState({
    title: "", pgnText: "", event: "", date: "", white: "", black: "", result: "",
    whiteElo: "", blackElo: "", timeControl: "", opening: "",
  })
  const updateField = useCallback((field: string, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }))
  }, [])
  return { formState, updateField, setFormState }
}

// --- MAIN PAGE COMPONENT ---
export default function GameViewerPage() {
  // --- STATE MANAGEMENT ---
  const [mode, setMode] = useState<'view' | 'interactive'>('view')
  
  // Viewer Mode State
  const [games, setGames] = useState<GameData[]>([])
  const [currentGameIndex, setCurrentGameIndex] = useState(0)
  const [viewerHistory, setViewerHistory] = useState<GameHistory>({ moves: [], fenHistory: [] })
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [viewerGameHeaders, setViewerGameHeaders] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  
  // Interactive Mode State
  const interactiveGame = useRef(new Chess())
  const [interactiveFen, setInteractiveFen] = useState('start')
  const [interactiveHistory, setInteractiveHistory] = useState<GameHistory>({ moves: [], fenHistory: [] })
  const [moveFrom, setMoveFrom] = useState<Square | ''>('')
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({})

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const { formState, updateField, setFormState } = useGameForm()
  const { title, pgnText, event, date, white, black, result, whiteElo, blackElo, timeControl, opening } = formState
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formMessage, setFormMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [titleTouched, setTitleTouched] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [hasManuallyEditedTitle, setHasManuallyEditedTitle] = useState(false)
  const [hasManuallyEditedFields, setHasManuallyEditedFields] = useState(false)
  
  // Preview Mode State (for submitted PGN)
  const [previewMode, setPreviewMode] = useState(false)
  const [previewPgn, setPreviewPgn] = useState("")

  const isInteractive = useMemo(() => mode === 'interactive', [mode])

  const currentPgn = useMemo(() => {
    if (previewMode && previewPgn) return previewPgn
    return games[currentGameIndex]?.pgn || ""
  }, [games, currentGameIndex, previewMode, previewPgn])

  const currentFen = useMemo(() => isInteractive ? interactiveFen : (viewerHistory.fenHistory[currentMoveIndex + 1] || "start"), [isInteractive, interactiveFen, currentMoveIndex, viewerHistory])
  
  const currentHistory = useMemo(() => isInteractive ? interactiveHistory : viewerHistory, [isInteractive, interactiveHistory, viewerHistory])

  const lastMove = useMemo(() => {
    if (currentMoveIndex < 0 || isInteractive) return undefined
    const move = viewerHistory.moves[currentMoveIndex]
    return move ? { from: move.from, to: move.to } : undefined
  }, [currentMoveIndex, viewerHistory.moves, isInteractive])

  const customSquareStyles = useMemo(() => {
    const styles = { ...optionSquares }
    if (lastMove) {
      styles[lastMove.from] = BOARD_CUSTOM_SQUARE_STYLES.lastMove
      styles[lastMove.to] = BOARD_CUSTOM_SQUARE_STYLES.lastMove
    }
    return styles
  }, [optionSquares, lastMove])

  // --- DATA LOADING & PGN PARSING ---
  const loadGames = useCallback(async () => {
    setIsLoading(true)
    const { games: fetchedGames, error } = await fetchGames()
    if (error) console.error("Error fetching games:", error)
    else { setGames(fetchedGames); if (fetchedGames.length > 0) setCurrentGameIndex(0) }
    setIsLoading(false)
  }, [])

  useEffect(() => { loadGames() }, [loadGames])

  useEffect(() => {
    if (!currentPgn || isInteractive) {
      setViewerHistory({ moves: [], fenHistory: [] }); setViewerGameHeaders({}); return
    }
    try {
      const chess = new Chess()
      chess.loadPgn(currentPgn)
      const headers = chess.header() as Record<string, string>
      setViewerGameHeaders(headers)

      const history = chess.history({ verbose: true })
      const tempChess = new Chess()
      const fenHistory: string[] = [tempChess.fen()]
      history.forEach((move) => { try { tempChess.move(move.san); fenHistory.push(tempChess.fen()) } catch (e) {} })
      const movesWithNumbers: UiMove[] = history.map((move, index) => ({ ...(move as any), moveNumber: Math.floor(index / 2) + 1 }))
      setViewerHistory({ moves: movesWithNumbers, fenHistory })
      setCurrentMoveIndex(-1)
    } catch (error) {
      console.error("Failed to load PGN:", error)
      setViewerHistory({ moves: [], fenHistory: [] }); setViewerGameHeaders({})
    }
  }, [currentPgn, isInteractive])

  useEffect(() => {
    if (!pgnText.trim() || isInteractive) { setPreviewMode(false); setPreviewPgn(""); return }
    const validation = validatePgn(pgnText)
    if (!validation.valid) { setPreviewMode(false); setPreviewPgn(""); return }
    try {
      const headers = parsePgnHeaders(pgnText)
      if (!hasManuallyEditedTitle) updateField('title', generateTitleFromPgn(headers))
      if (!hasManuallyEditedFields) {
        setFormState(prev => ({ ...prev,
          event: headers.Event || "", date: headers.Date || headers.UTCDate || "", white: headers.White || "",
          black: headers.Black || "", result: headers.Result || "", whiteElo: headers.WhiteElo || "",
          blackElo: headers.BlackElo || "", timeControl: headers.TimeControl || "", opening: headers.Opening || "",
        }))
      }
      setPreviewMode(true); setPreviewPgn(pgnText); setShowValidation(true)
    } catch (error) {
      console.error("Failed to parse PGN:", error); setPreviewMode(false); setPreviewPgn("")
    }
  }, [pgnText, hasManuallyEditedTitle, hasManuallyEditedFields, updateField, setFormState, isInteractive])

  // --- INTERACTIVE MODE HANDLERS ---
  const updateInteractiveGameState = useCallback(() => {
    setInteractiveFen(interactiveGame.current.fen())
    const moves = interactiveGame.current.history({ verbose: true })
    const movesWithNumbers: UiMove[] = moves.map((m, i) => ({ ...(m as any), moveNumber: Math.floor(i / 2) + 1 }))
    const tempChess = new Chess()
    const fenHistory = [tempChess.fen()]
    moves.forEach(m => { tempChess.move(m.san); fenHistory.push(tempChess.fen()) })
    setInteractiveHistory({ moves: movesWithNumbers, fenHistory })
  }, [])

  const makeMove = useCallback((move: { from: Square; to: Square; promotion?: string }) => {
    try {
      const result = interactiveGame.current.move(move)
      if (result === null) return false
      updateInteractiveGameState()
      setMoveFrom('')
      setOptionSquares({})
      return true
    } catch (e) { return false }
  }, [updateInteractiveGameState])

  const onPieceDrop = useCallback((sourceSquare: Square, targetSquare: Square) => {
    return makeMove({ from: sourceSquare, to: targetSquare, promotion: 'q' })
  }, [makeMove])

  const showLegalMoves = useCallback((square: Square) => {
    const moves = interactiveGame.current.moves({ square, verbose: true })
    if (moves.length === 0) return
    const newSquares: Record<string, React.CSSProperties> = {}
    moves.forEach(move => {
      const isCapture = interactiveGame.current.get(move.to) && interactiveGame.current.get(move.to)?.color !== interactiveGame.current.get(square)?.color
      newSquares[move.to] = isCapture ? BOARD_CUSTOM_SQUARE_STYLES.legalCapture : BOARD_CUSTOM_SQUARE_STYLES.legalMove
    })
    newSquares[square] = BOARD_CUSTOM_SQUARE_STYLES.selectedPiece
    setOptionSquares(newSquares)
  }, [])

  const onSquareClick = useCallback((square: Square) => {
    if (!moveFrom) {
      const piece = interactiveGame.current.get(square)
      if (piece && piece.color === interactiveGame.current.turn()) {
        showLegalMoves(square)
        setMoveFrom(square)
      }
      return
    }
    if (!makeMove({ from: moveFrom, to: square, promotion: 'q' })) {
      setMoveFrom(''); setOptionSquares({})
    }
  }, [moveFrom, makeMove, showLegalMoves])

  const onPieceDragBegin = useCallback((piece: string, sourceSquare: Square) => {
    showLegalMoves(sourceSquare)
  }, [showLegalMoves])

  const onPieceDragEnd = useCallback(() => setOptionSquares({}), [])
  
  const handleUndo = useCallback(() => { interactiveGame.current.undo(); updateInteractiveGameState() }, [updateInteractiveGameState])
  const handleReset = useCallback(() => { interactiveGame.current.reset(); updateInteractiveGameState() }, [updateInteractiveGameState])
  const loadInteractivePgnToForm = useCallback(() => {
    updateField('pgnText', interactiveGame.current.pgn())
    setMode('view')
    setIsFormOpen(true)
  }, [updateField])
  
  const navigateToInteractiveMove = useCallback((index: number) => {
    const moves = interactiveGame.current.history()
    interactiveGame.current.reset()
    for (let i = 0; i <= index; i++) {
        if(moves[i]) interactiveGame.current.move(moves[i])
    }
    updateInteractiveGameState()
  }, [updateInteractiveGameState])

  // --- VIEWER MODE HANDLERS ---
  const handleGameSelect = useCallback((index: number) => { setCurrentGameIndex(index); setPreviewMode(false); setPreviewPgn("") }, [])
  const navigateToViewerMove = useCallback((index: number) => { setCurrentMoveIndex(Math.max(-1, Math.min(index, viewerHistory.moves.length - 1))) }, [viewerHistory.moves.length])

  // --- FORM HANDLERS ---
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (event) => updateField('pgnText', event.target?.result as string)
      reader.readAsText(file)
    }
  }, [updateField])

  const handlePgnTextChange = useCallback((value: string) => { updateField('pgnText', value); setSelectedFile(null) }, [updateField])
  const handleTitleChange = useCallback((value: string) => {
      updateField('title', value); setTitleTouched(true); setHasManuallyEditedTitle(true)
      if (showValidation && value.trim()) setShowValidation(false)
  }, [showValidation, updateField])
  const handleTitleBlur = useCallback(() => { setTitleTouched(true); if (!title.trim() && pgnText.trim()) setShowValidation(true) }, [title, pgnText])
  const handleFieldChange = useCallback((field: string, value: string) => { updateField(field, value); setHasManuallyEditedFields(true) }, [updateField])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setShowValidation(true)
    if (!title.trim()) { setFormMessage({ text: "Please enter a title for the game.", error: true }); return }
    if (!pgnText.trim()) { setFormMessage({ text: "Please provide PGN data (paste or upload a file).", error: true }); return }
    const parsedHeaders = parsePgnHeaders(pgnText)
    const movesOnly = pgnText.replace(/^(?:\s*```math[^```]+```[\r\n]*)+/i, '').trim()
    const mergedMetadata = {
      event: (event && event.trim()) || parsedHeaders.Event || "", date: (date && date.trim()) || parsedHeaders.Date || parsedHeaders.UTCDate || "",
      white: (white && white.trim()) || parsedHeaders.White || "", black: (black && black.trim()) || parsedHeaders.Black || "",
      result: (result && result.trim()) || parsedHeaders.Result || "", whiteElo: (whiteElo && whiteElo.trim()) || parsedHeaders.WhiteElo || "",
      blackElo: (blackElo && blackElo.trim()) || parsedHeaders.BlackElo || "", timeControl: (timeControl && timeControl.trim()) || parsedHeaders.TimeControl || "",
      opening: (opening && opening.trim()) || parsedHeaders.Opening || "",
    }
    const finalPgn = constructLichessStylePgn(movesOnly, mergedMetadata)
    const validation = validatePgn(finalPgn)
    if (!validation.valid) { setFormMessage({ text: `Invalid PGN: ${validation.error}`, error: true }); return }
    setIsSubmitting(true); setFormMessage(null)
    const formData = new FormData(); formData.append("title", title); formData.append("pgn", finalPgn)
    const apiResult = await addGameToDB({ message: "", error: false }, formData)
    setIsSubmitting(false); setFormMessage({ text: apiResult.message, error: apiResult.error })
    if (!apiResult.error) {
      setFormState({ title: "", pgnText: "", event: "", date: "", white: "", black: "", result: "", whiteElo: "", blackElo: "", timeControl: "", opening: "" })
      setSelectedFile(null); setTitleTouched(false); setShowValidation(false); setHasManuallyEditedTitle(false); setHasManuallyEditedFields(false)
      setPreviewMode(false); setPreviewPgn(""); setIsFormOpen(false)
      await loadGames()
    }
  }

  if (isLoading) return <LoadingSpinner />
  const isTitleInvalid = showValidation && !title.trim()

  return (
    <div className="min-h-screen bg-background text-foreground p-2 sm:p-4 font-sans">
      <div className="max-w-7xl mx-auto space-y-2">
        <header className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">Add Game to Database</h1>
          <p className="text-muted-foreground tracking-tight">Add games by pasting PGN, uploading a file, or creating one on the interactive board.</p>
        </header>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setIsFormOpen(!isFormOpen)} className="w-full flex items-center justify-between p-4 transition-colors bg-accent text-accent-foreground hover:bg-accent/90 rounded-[2px]">
            <div className="flex items-center gap-2"><Plus className="w-5 h-5" /> <h2 className="text-lg font-semibold">Add Game Form</h2></div>
            {isFormOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          <button onClick={() => setMode(isInteractive ? 'view' : 'interactive')} className={`w-full flex items-center justify-between p-4 transition-colors rounded-[2px] ${isInteractive ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground hover:bg-accent/90'}`}>
            <div className="flex items-center gap-2"><MousePointer className="w-5 h-5" /> <h2 className="text-lg font-semibold">{isInteractive ? 'Exit Interactive Mode' : 'Create Interactively'}</h2></div>
          </button>
        </div>

        {isFormOpen && (
          <div className="bg-card border border-border rounded-[2px] shadow-sm overflow-hidden p-4 sm:p-6 animate-fade-in">
            <AddGameForm
              title={title} pgnText={pgnText} selectedFile={selectedFile} isSubmitting={isSubmitting} formMessage={formMessage} isTitleInvalid={isTitleInvalid}
              event={event} date={date} white={white} black={black} result={result} whiteElo={whiteElo} blackElo={blackElo} timeControl={timeControl} opening={opening}
              onTitleChange={handleTitleChange} onTitleBlur={handleTitleBlur} onPgnTextChange={handlePgnTextChange} onFileChange={handleFileChange}
              onEventChange={(val: string) => handleFieldChange('event', val)} onDateChange={(val: string) => handleFieldChange('date', val)} onWhiteChange={(val: string) => handleFieldChange('white', val)}
              onBlackChange={(val: string) => handleFieldChange('black', val)} onResultChange={(val: string) => handleFieldChange('result', val)} onWhiteEloChange={(val: string) => handleFieldChange('whiteElo', val)}
              onBlackEloChange={(val: string) => handleFieldChange('blackElo', val)} onTimeControlChange={(val: string) => handleFieldChange('timeControl', val)} onOpeningChange={(val: string) => handleFieldChange('opening', val)}
              onSubmit={handleSubmit}
            />
          </div>
        )}

        {!isInteractive && (games.length > 0 || previewMode) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-start">
            <GameInfo headers={viewerGameHeaders} previewMode={previewMode} previewData={{ white, black, event, result }} />
            {games.length > 0 && <GameSelector games={games} currentGameIndex={currentGameIndex} onSelect={handleGameSelect} showDelete={false} />}
          </div>
        )}

        {isInteractive && (
          <div className="bg-card border-border p-4 rounded-lg shadow-md text-center">
             <h2 className="text-lg font-semibold">Interactive Mode</h2>
             <p className="text-muted-foreground text-sm">Create a game on the board below. When finished, load it into the form.</p>
          </div>
        )}
        
        {(games.length > 0 || previewMode || isInteractive) ? (
          <main className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-3">
            <div>
              <Board
                fen={currentFen}
                isInteractive={isInteractive}
                customSquareStyles={customSquareStyles}
                onPieceDrop={onPieceDrop}
                onSquareClick={onSquareClick}
                onPieceDragBegin={onPieceDragBegin}
                onPieceDragEnd={onPieceDragEnd}
              />
               <div className="mt-3">
                {isInteractive ? (
                  <InteractiveControls onUndo={handleUndo} onReset={handleReset} onLoadPgn={loadInteractivePgnToForm} canUndo={interactiveHistory.moves.length > 0} />
                ) : (
                  <Controls onStart={() => navigateToViewerMove(-1)} onPrev={() => navigateToViewerMove(currentMoveIndex - 1)}
                    onNext={() => navigateToViewerMove(currentMoveIndex + 1)} onEnd={() => navigateToViewerMove(viewerHistory.moves.length - 1)}
                    canGoBack={currentMoveIndex > -1} canGoForward={currentMoveIndex < viewerHistory.moves.length - 1}
                  />
                )}
              </div>
              {!isInteractive && viewerHistory.moves.length > 0 && (
                <div className="mt-2 text-center text-sm text-muted-foreground">Move {currentMoveIndex + 1} of {viewerHistory.moves.length}</div>
              )}
            </div>
            <MovesList moves={currentHistory.moves} currentMoveIndex={isInteractive ? interactiveHistory.moves.length -1 : currentMoveIndex} onMoveSelect={isInteractive ? navigateToInteractiveMove : navigateToViewerMove} />
          </main>
        ) : (
          !isInteractive && (
            <div className="bg-card border border-border p-8 rounded-[2px] text-center shadow-sm">
              <p className="text-muted-foreground">No games found. Add a new game to get started.</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}

// --- SUB-COMPONENTS (Memoized for performance) ---

// --- Prop Types for Sub-Components ---
type AddGameFormProps = { title: string; pgnText: string; selectedFile: File | null; isSubmitting: boolean; formMessage: { text: string; error: boolean; } | null; isTitleInvalid: boolean; event: string; date: string; white: string; black: string; result: string; whiteElo: string; blackElo: string; timeControl: string; opening: string; onTitleChange: (value: string) => void; onTitleBlur: () => void; onPgnTextChange: (value: string) => void; onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onEventChange: (value: string) => void; onDateChange: (value: string) => void; onWhiteChange: (value: string) => void; onBlackChange: (value: string) => void; onResultChange: (value: string) => void; onWhiteEloChange: (value: string) => void; onBlackEloChange: (value: string) => void; onTimeControlChange: (value: string) => void; onOpeningChange: (value: string) => void; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; };
type GameSelectorProps = { games: GameData[]; currentGameIndex: number; onSelect: (index: number) => void; onDelete?: (id: number, title: string) => void; showDelete?: boolean; };
type GameInfoProps = { headers: Record<string, string>; previewMode: boolean; previewData: { white: string; black: string; event: string; result: string; }; };
type BoardProps = { fen: string; isInteractive: boolean; customSquareStyles: Record<string, React.CSSProperties>; onPieceDrop: (source: Square, target: Square) => boolean; onSquareClick: (square: Square) => void; onPieceDragBegin: (piece: string, source: Square) => void; onPieceDragEnd: () => void; };
type ControlsProps = { onStart: () => void; onPrev: () => void; onNext: () => void; onEnd: () => void; canGoBack: boolean; canGoForward: boolean; };
type InteractiveControlsProps = { onUndo: () => void; onReset: () => void; onLoadPgn: () => void; canUndo: boolean; };
type MovesListProps = { moves: UiMove[]; currentMoveIndex: number; onMoveSelect: (index: number) => void; };
type MoveButtonProps = { move: UiMove; index: number; isCurrent: boolean; onMoveSelect: (index: number) => void; };

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-background"><div className="flex flex-col items-center gap-4">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /><div className="text-muted-foreground">Loading games...</div>
  </div></div>
)

const AddGameForm = React.memo((props: AddGameFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  return (
    <form onSubmit={props.onSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-2">Game Title <span className="text-destructive">*</span></label>
        <input type="text" id="title" name="title" value={props.title} onChange={(e) => props.onTitleChange(e.target.value)} onBlur={props.onTitleBlur} placeholder="e.g., World Championship 2024 - Game 1"
          className={`w-full px-3 py-2 bg-input border rounded-[2px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 transition-all ${props.isTitleInvalid ? "border-destructive focus:ring-destructive/20" : "border-border focus:ring-ring/20 focus:border-ring"}`}
          disabled={props.isSubmitting}
        />
        {props.isTitleInvalid && <p className="text-destructive text-xs mt-1">Title is required</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" placeholder="White Player" value={props.white} onChange={(e) => props.onWhiteChange(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-[2px]" disabled={props.isSubmitting} />
        <input type="text" placeholder="Black Player" value={props.black} onChange={(e) => props.onBlackChange(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-[2px]" disabled={props.isSubmitting} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" placeholder="Date (YYYY.MM.DD)" value={props.date} onChange={(e) => props.onDateChange(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-[2px]" disabled={props.isSubmitting} />
        <input type="text" placeholder="Result (1-0, 0-1, 1/2-1/2)" value={props.result} onChange={(e) => props.onResultChange(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-[2px]" disabled={props.isSubmitting} />
      </div>
      <input type="text" placeholder="Event Name" value={props.event} onChange={(e) => props.onEventChange(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-[2px]" disabled={props.isSubmitting} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" placeholder="White Elo" value={props.whiteElo} onChange={(e) => props.onWhiteEloChange(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-[2px]" disabled={props.isSubmitting} />
        <input type="text" placeholder="Black Elo" value={props.blackElo} onChange={(e) => props.onBlackEloChange(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-[2px]" disabled={props.isSubmitting} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" placeholder="Time Control" value={props.timeControl} onChange={(e) => props.onTimeControlChange(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-[2px]" disabled={props.isSubmitting} />
        <input type="text" placeholder="Opening" value={props.opening} onChange={(e) => props.onOpeningChange(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-[2px]" disabled={props.isSubmitting} />
      </div>
      <div>
        <label htmlFor="pgnText" className="block text-sm font-medium mb-2">PGN Data <span className="text-destructive">*</span></label>
        <textarea id="pgnText" name="pgnText" value={props.pgnText} onChange={(e) => props.onPgnTextChange(e.target.value)}
          placeholder={`[Event ""]\n[Site ""]\n...\n\n*`} rows={8}
          className="w-full px-3 py-2 bg-input border border-border rounded-[2px] font-mono text-sm resize-y" disabled={props.isSubmitting} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Or Upload PGN File</label>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" onChange={props.onFileChange} className="hidden" accept=".pgn" disabled={props.isSubmitting} />
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={props.isSubmitting} className="gap-2"><Upload className="w-4 h-4" /> Choose File</Button>
          {props.selectedFile && <span className="text-sm text-muted-foreground truncate">{props.selectedFile.name}</span>}
        </div>
      </div>
      {props.formMessage && <div className={`p-3 rounded-[2px] text-sm border ${props.formMessage.error ? "bg-destructive/10 border-destructive text-destructive" : "bg-primary/10 border-primary text-primary"}`}>{props.formMessage.text}</div>}
      <Button type="submit" disabled={props.isSubmitting} className="w-full">{props.isSubmitting ? "Adding Game..." : "Add Game"}</Button>
    </form>
  )
})
AddGameForm.displayName = "AddGameForm"

const GameSelector = React.memo(({ games, currentGameIndex, onSelect, onDelete, showDelete = true }: GameSelectorProps) => {
  if (games.length === 0) return null
  return (
    <div className="bg-card border border-border p-3 sm:p-4 rounded-lg shadow-md">
      <h2 className="text-sm sm:text-base font-semibold mb-2 text-foreground">Current Game</h2>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="outline" className="w-full flex items-center justify-between bg-transparent rounded-md text-sm">
          <span className="truncate">{games[currentGameIndex]?.title || 'Select a game'}</span>
          <ChevronDown className="ml-2 w-4 h-4 flex-shrink-0" />
        </Button></DropdownMenuTrigger>
        <DropdownMenuContent className="w-screen sm:w-[var(--radix-dropdown-menu-trigger-width)] max-h-96 overflow-y-auto rounded-md bg-card p-1 border border-border">
          {games.map((game, index) => (<DropdownMenuItem key={game.id} className={`flex justify-between items-center cursor-pointer px-2 py-1.5 rounded-md ${index % 2 === 0 ? 'bg-card' : 'bg-accent/50'}`} onSelect={() => onSelect(index)}>
            <div className="flex items-center gap-3"><span className="text-xs font-mono text-muted-foreground">{index + 1}.</span><span className="truncate flex-1 text-sm">{game.title}</span></div>
            {showDelete && onDelete && <Button variant="ghost" size="sm" className="text-destructive p-1 h-auto ml-2" onClick={(e) => { e.stopPropagation(); onDelete(game.id, game.title) }}><Trash2 className="w-4 h-4" /></Button>}
          </DropdownMenuItem>))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})
GameSelector.displayName = "GameSelector"

const GameInfo = React.memo(({ headers, previewMode, previewData }: GameInfoProps) => {
  const white = previewMode && previewData.white ? previewData.white : headers.White
  const black = previewMode && previewData.black ? previewData.black : headers.Black
  const event = previewMode && previewData.event ? previewData.event : headers.Event
  const result = previewMode && previewData.result ? previewData.result : headers.Result
  return (
    <div className="bg-card border border-border p-3 sm:p-4 rounded-lg shadow-md">
      <h2 className="text-sm sm:text-base font-semibold mb-2">Game Details {previewMode && <span className="text-xs font-normal text-muted-foreground ml-2">(Live Preview)</span>}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div><span className="font-medium">White: </span><span className="text-muted-foreground">{white || "N/A"}</span></div>
        <div><span className="font-medium">Black: </span><span className="text-muted-foreground">{black || "N/A"}</span></div>
        <div><span className="font-medium">Event: </span><span className="text-muted-foreground">{event || "N/A"}</span></div>
        <div><span className="font-medium">Result: </span><span className="text-muted-foreground">{result || "N/A"}</span></div>
      </div>
    </div>
  )
})
GameInfo.displayName = "GameInfo"

const Board = React.memo(({ fen, isInteractive, customSquareStyles, onPieceDrop, onSquareClick, onPieceDragBegin, onPieceDragEnd }: BoardProps) => {
  const boardWrapperRef = useRef<HTMLDivElement>(null)
  const [boardWidth, setBoardWidth] = useState<number>()
  useEffect(() => {
    function handleResize() { if (boardWrapperRef.current) setBoardWidth(boardWrapperRef.current.offsetWidth) }
    handleResize(); window.addEventListener("resize", handleResize); return () => window.removeEventListener("resize", handleResize)
  }, [])
  return (
    <div ref={boardWrapperRef} className="w-full max-w-lg mx-auto lg:mx-0 aspect-square shadow-lg rounded-[2px] overflow-hidden border border-border">
      {boardWidth && boardWidth > 0 ? (
        <Chessboard boardWidth={boardWidth} position={fen} arePiecesDraggable={isInteractive} customSquareStyles={customSquareStyles}
          onPieceDrop={onPieceDrop} onSquareClick={onSquareClick} onPieceDragBegin={onPieceDragBegin} onPieceDragEnd={onPieceDragEnd} />
      ) : <div className="w-full h-full bg-muted animate-pulse" />}
    </div>
  )
})
Board.displayName = "Board"

const Controls = React.memo(({ onStart, onPrev, onNext, onEnd, canGoBack, canGoForward }: ControlsProps) => (
  <div className="flex justify-center items-center gap-2 p-3 bg-card border border-border rounded-[2px] shadow-sm">
    <Button variant="outline" size="lg" onClick={onStart} disabled={!canGoBack} className="flex-1 rounded-[2px] bg-transparent"><ChevronsLeft className="w-5 h-5" /></Button>
    <Button variant="outline" size="lg" onClick={onPrev} disabled={!canGoBack} className="flex-1 rounded-[2px] bg-transparent"><ChevronLeft className="w-5 h-5" /></Button>
    <Button variant="outline" size="lg" onClick={onNext} disabled={!canGoForward} className="flex-1 rounded-[2px] bg-transparent"><ChevronRight className="w-5 h-5" /></Button>
    <Button variant="outline" size="lg" onClick={onEnd} disabled={!canGoForward} className="flex-1 rounded-[2px] bg-transparent"><ChevronsRight className="w-5 h-5" /></Button>
  </div>
))
Controls.displayName = "Controls"

const InteractiveControls = React.memo(({ onUndo, onReset, onLoadPgn, canUndo }: InteractiveControlsProps) => (
  <div className="flex justify-center items-center gap-2 p-3 bg-card border border-border rounded-[2px] shadow-sm">
    <Button variant="outline" size="lg" onClick={onUndo} disabled={!canUndo} className="flex-1 rounded-[2px] bg-transparent gap-2"><Undo2 className="w-5 h-5" /> Undo</Button>
    <Button variant="outline" size="lg" onClick={onReset} className="flex-1 rounded-[2px] bg-transparent text-destructive gap-2"><RefreshCcw className="w-5 h-5" /> Reset</Button>
    <Button size="lg" onClick={onLoadPgn} className="flex-1 rounded-[2px] gap-2"><FileSymlink className="w-5 h-5" /> Load to Form</Button>
  </div>
))
InteractiveControls.displayName = "InteractiveControls"

const MovesList = React.memo(({ moves, currentMoveIndex, onMoveSelect }: MovesListProps) => {
  const activeMoveRef = useRef<HTMLButtonElement>(null)
  const movesListRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (activeMoveRef.current && movesListRef.current) {
      const container = movesListRef.current
      const element = activeMoveRef.current
      const { top, bottom } = container.getBoundingClientRect()
      const { top: elTop, bottom: elBottom } = element.getBoundingClientRect()
      if (elTop < top || elBottom > bottom) {
        element.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }, [currentMoveIndex])
  return (
    <div className="bg-card border border-border p-3 sm:p-4 rounded-lg shadow-md flex flex-col">
      <h2 className="text-sm sm:text-base font-semibold mb-2">Moves</h2>
      <div ref={movesListRef} className="flex-1 overflow-y-auto pr-2 text-sm max-h-[60vh]">
        <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-1 items-center">
          {moves.map((move, index) => index % 2 === 0 ? (
            <React.Fragment key={index}>
              <div className="text-right text-muted-foreground font-mono pr-1 text-xs">{move.moveNumber}.</div>
              <MoveButton move={move} index={index} isCurrent={currentMoveIndex === index} onMoveSelect={onMoveSelect} ref={currentMoveIndex === index ? activeMoveRef : null} />
              {moves[index + 1] && <MoveButton move={moves[index + 1]} index={index + 1} isCurrent={currentMoveIndex === index + 1} onMoveSelect={onMoveSelect} ref={currentMoveIndex === index + 1 ? activeMoveRef : null} />}
            </React.Fragment>
          ) : null)}
        </div>
      </div>
    </div>
  )
})
MovesList.displayName = "MovesList"

const MoveButton = React.forwardRef<HTMLButtonElement, MoveButtonProps>(({ move, index, isCurrent, onMoveSelect }, ref) => (
  <button ref={ref} onClick={() => onMoveSelect(index)} className={`w-full text-left px-2 py-1 rounded-[2px] transition-colors font-mono text-sm ${isCurrent ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
    {move.san}
  </button>
))
MoveButton.displayName = "MoveButton"