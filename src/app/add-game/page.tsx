"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Chess } from "chess.js"
import type { Move } from "chess.js"
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
} from "lucide-react"
import { fetchGames, deleteGame, addGameToDB, type GameData } from "./actions"

// --- TYPE DEFINITIONS ---
// This is the correct type. We will construct an object that satisfies
// the `Move` type from chess.js and add our own `moveNumber`.
type UiMove = Move & { moveNumber: number }
interface GameHistory {
  moves: UiMove[]
  fenHistory: string[]
}

// --- HELPER FUNCTIONS ---
function parsePgnHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {}
  const headerRegex = /```math(\w+)\s+"([^"]*)"```/g
  let match

  while ((match = headerRegex.exec(pgn)) !== null) {
    headers[match[1]] = match[2]
  }

  return headers
}

function generateTitleFromPgn(headers: Record<string, string>): string {
  const white = headers.White || "Unknown"
  const black = headers.Black || "Unknown"
  const event = headers.Event
  const date = headers.Date

  if (event && event !== "?" && event !== "rated blitz game") {
    return `${event}: ${white} vs ${black}`
  } else if (date && date !== "????.??.??") {
    return `${white} vs ${black} (${date})`
  }

  return `${white} vs ${black}`
}

function validatePgn(pgn: string): { valid: boolean; error?: string } {
  if (!pgn.trim()) {
    return { valid: false, error: "PGN cannot be empty" }
  }

  try {
    const chess = new Chess()
    chess.loadPgn(pgn)
    return { valid: true }
  } catch (error) {
    return { valid: false, error: "Invalid PGN format" }
  }
}

// --- MAIN PAGE COMPONENT ---
export default function GameViewerPage() {
  const [games, setGames] = useState<GameData[]>([])
  const [currentGameIndex, setCurrentGameIndex] = useState(0)
  const [gameHistory, setGameHistory] = useState<GameHistory>({ moves: [], fenHistory: [] })
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [gameHeaders, setGameHeaders] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)

  const [isFormOpen, setIsFormOpen] = useState(false)

  // Form state
  const [title, setTitle] = useState("")
  const [pgnText, setPgnText] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formMessage, setFormMessage] = useState<{ text: string; error: boolean } | null>(null)

  // Validation state
  const [titleTouched, setTitleTouched] = useState(false)
  const [showValidation, setShowValidation] = useState(false)

  const currentPgn = useMemo(() => games[currentGameIndex]?.pgn || "", [games, currentGameIndex])
  const currentFen = useMemo(
    () => gameHistory.fenHistory[currentMoveIndex + 1] || "start",
    [currentMoveIndex, gameHistory],
  )
  const lastMove = useMemo(() => {
    if (currentMoveIndex < 0) return undefined
    const move = gameHistory.moves[currentMoveIndex]
    return move ? { from: move.from, to: move.to } : undefined
  }, [currentMoveIndex, gameHistory.moves])

  // --- EFFECTS ---
  useEffect(() => {
    loadGames()
  }, [])

  async function loadGames() {
    setIsLoading(true)
    const { games: fetchedGames, error } = await fetchGames()
    if (error) {
      console.error("Error fetching games:", error)
    } else {
      setGames(fetchedGames)
      if (fetchedGames.length > 0) {
        setCurrentGameIndex(0)
      }
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (!currentPgn) {
      setGameHistory({ moves: [], fenHistory: [] })
      setGameHeaders({})
      return
    }

    try {
      const chess = new Chess()
      chess.loadPgn(currentPgn)
      const headers = chess.header() as Record<string, string>
      setGameHeaders(headers)

      const history = chess.history({ verbose: true })
      const startingFen =
        headers?.SetUp === "1" && headers?.FEN && headers.FEN.trim().length > 0 ? headers.FEN : undefined

      const tempChess = new Chess(startingFen)
      const fenHistory: string[] = [tempChess.fen()]
      history.forEach((move) => {
        try {
          tempChess.move(move.san)
          fenHistory.push(tempChess.fen())
        } catch (e) {
          /* ignore invalid moves in history */
        }
      })

      // THE FIX IS HERE: We manually construct the full Move object
      // by adding the missing boolean properties based on the `flags` string.
      const movesWithNumbers: UiMove[] = history.map((move, index) => ({
        ...(move as any), // Spread the partial move object we get from history()
        // Manually add the boolean properties required by the `Move` type
        isCapture: move.flags.includes("c") || move.flags.includes("e"),
        isPromotion: move.flags.includes("p"),
        isEnPassant: move.flags.includes("e"),
        isKingsideCastle: move.flags.includes("k"),
        isQueensideCastle: move.flags.includes("q"),
        isBigPawn: move.flags.includes("b"),
        // Add our custom property
        moveNumber: Math.floor(index / 2) + 1,
      }))

      setGameHistory({ moves: movesWithNumbers, fenHistory })
      setCurrentMoveIndex(-1)
    } catch (error) {
      console.error("Failed to load PGN:", error)
      setGameHistory({ moves: [], fenHistory: [] })
      setGameHeaders({})
    }
  }, [currentPgn])

  useEffect(() => {
    if (!pgnText.trim()) return

    const validation = validatePgn(pgnText)
    if (!validation.valid) return

    try {
      const headers = parsePgnHeaders(pgnText)
      if (!title.trim() || !titleTouched) {
        const suggestedTitle = generateTitleFromPgn(headers)
        setTitle(suggestedTitle)
      }
      setShowValidation(true)
    } catch (error) {
      console.error("Failed to parse PGN:", error)
    }
  }, [pgnText, title, titleTouched])

  // --- HANDLERS ---
  const handleGameSelect = useCallback((index: number) => setCurrentGameIndex(index), [])

  const handleDeleteGame = useCallback(
    async (gameId: number, gameTitle: string) => {
      if (!window.confirm(`Are you sure you want to delete "${gameTitle}"?`)) return
      const { success, error } = await deleteGame(gameId)
      if (success) {
        console.log(`Game "${gameTitle}" deleted.`)
        setGames((prev) => {
          const newGames = prev.filter((game) => game.id !== gameId)
          if (currentGameIndex >= newGames.length && newGames.length > 0) {
            setCurrentGameIndex(newGames.length - 1)
          } else if (newGames.length === 0) {
            setCurrentGameIndex(0)
          }
          return newGames
        })
      } else {
        console.error("Error deleting game:", error)
        alert(`Failed to delete game: ${error}`)
      }
    },
    [currentGameIndex],
  )

  const navigateToMove = useCallback(
    (index: number) => {
      setCurrentMoveIndex(Math.max(-1, Math.min(index, gameHistory.moves.length - 1)))
    },
    [gameHistory.moves.length],
  )

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        setPgnText(content)
      }
      reader.readAsText(file)
    }
  }, [])

  const handlePgnTextChange = useCallback((value: string) => {
    setPgnText(value)
    setSelectedFile(null)
  }, [])

  const handleTitleChange = useCallback(
    (value: string) => {
      setTitle(value)
      setTitleTouched(true)
      if (showValidation && value.trim()) {
        setShowValidation(false)
      }
    },
    [showValidation],
  )

  const handleTitleBlur = useCallback(() => {
    setTitleTouched(true)
    if (!title.trim() && pgnText.trim()) {
      setShowValidation(true)
    }
  }, [title, pgnText])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setShowValidation(true)

    if (!title.trim()) {
      setFormMessage({ text: "Please enter a title for the game.", error: true })
      return
    }

    if (!pgnText.trim()) {
      setFormMessage({ text: "Please provide PGN data (paste or upload a file).", error: true })
      return
    }

    const validation = validatePgn(pgnText)
    if (!validation.valid) {
      setFormMessage({ text: `Invalid PGN: ${validation.error}`, error: true })
      return
    }

    setIsSubmitting(true)
    setFormMessage(null)

    const formData = new FormData()
    formData.append("title", title)
    formData.append("pgn", pgnText)

    const result = await addGameToDB({ message: "", error: false }, formData)

    setIsSubmitting(false)
    setFormMessage({ text: result.message, error: result.error })

    if (!result.error) {
      setTitle("")
      setPgnText("")
      setSelectedFile(null)
      setTitleTouched(false)
      setShowValidation(false)
      setIsFormOpen(false)
      await loadGames()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-muted-foreground">Loading games...</div>
      </div>
    )
  }

  const isTitleInvalid = showValidation && !title.trim()

  return (
    <div className="min-h-screen bg-background text-foreground p-2 sm:p-4 font-sans">
      <div className="max-w-7xl mx-auto space-y-2">
        <header className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">Add PGN to LCA Tournament Games</h1>
          <p className="text-muted-foreground tracking-tight">Upload or paste PGN files to add games to the LCA tournament collection. Use the form below to submit new games.</p>
        </header>

        <div className="bg-card border border-border rounded-[2px] shadow-sm overflow-hidden">
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="w-full flex items-center justify-between p-4 transition-colors bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-accent-foreground" />
              <h2 className="text-lg font-semibold">Add New Game</h2>
            </div>
            {isFormOpen ? (
              <ChevronUp className="w-5 h-5 text-accent-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-accent-foreground" />
            )}
          </button>

          {isFormOpen && (
            <div className="p-4 sm:p-6 border-t border-border animate-fade-in">
              <AddGameForm
                title={title}
                pgnText={pgnText}
                selectedFile={selectedFile}
                isSubmitting={isSubmitting}
                formMessage={formMessage}
                isTitleInvalid={isTitleInvalid}
                onTitleChange={handleTitleChange}
                onTitleBlur={handleTitleBlur}
                onPgnTextChange={handlePgnTextChange}
                onFileChange={handleFileChange}
                onSubmit={handleSubmit}
              />
            </div>
          )}
        </div>

        {games.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-start">
            <GameInfo headers={gameHeaders} />
            <GameSelector
              games={games}
              currentGameIndex={currentGameIndex}
              onSelect={handleGameSelect}
              onDelete={handleDeleteGame}
            />
          </div>
        )}

        {games.length > 0 ? (
          <main className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-3">
            <BoardDisplay
              fen={currentFen}
              lastMove={lastMove}
              gameHistory={gameHistory}
              currentMoveIndex={currentMoveIndex}
              onNavigate={navigateToMove}
            />
            <MovesList moves={gameHistory.moves} currentMoveIndex={currentMoveIndex} onMoveSelect={navigateToMove} />
          </main>
        ) : (
          <div className="bg-card border border-border p-8 rounded-[2px] text-center shadow-sm">
            <p className="text-muted-foreground">No games found. Add a new game to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// --- SUB-COMPONENTS ---

type AddGameFormProps = {
  title: string
  pgnText: string
  selectedFile: File | null
  isSubmitting: boolean
  formMessage: { text: string; error: boolean } | null
  isTitleInvalid: boolean
  onTitleChange: (value: string) => void
  onTitleBlur: () => void
  onPgnTextChange: (value: string) => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

const AddGameForm = ({
  title,
  pgnText,
  selectedFile,
  isSubmitting,
  formMessage,
  isTitleInvalid,
  onTitleChange,
  onTitleBlur,
  onPgnTextChange,
  onFileChange,
  onSubmit,
}: AddGameFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-2">
          Game Title <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onTitleBlur}
          placeholder="e.g., World Championship 2024 - Game 1"
          className={`w-full px-3 py-2 bg-input border rounded-[2px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 transition-all ${
            isTitleInvalid
              ? "border-destructive focus:ring-destructive/20"
              : "border-border focus:ring-ring/20 focus:border-ring"
          }`}
          disabled={isSubmitting}
        />
        {isTitleInvalid && <p className="text-destructive text-xs mt-1">Title is required</p>}
      </div>
      <div>
        <label htmlFor="pgnText" className="block text-sm font-medium mb-2">
          PGN Data <span className="text-destructive">*</span>
        </label>
        <textarea
          id="pgnText"
          name="pgnText"
          value={pgnText}
          onChange={(e) => onPgnTextChange(e.target.value)}
          placeholder="Paste PGN data here or upload a file below..."
          rows={8}
          className="w-full px-3 py-2 bg-input border border-border rounded-[2px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring font-mono text-sm resize-y"
          disabled={isSubmitting}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Or Upload PGN File</label>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pgn,.txt,text/plain"
            onChange={onFileChange}
            className="hidden"
            disabled={isSubmitting}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Choose File
          </Button>
          {selectedFile && <span className="text-sm text-muted-foreground truncate">{selectedFile.name}</span>}
        </div>
      </div>
      {formMessage && (
        <div
          className={`p-3 rounded-[2px] text-sm border ${
            formMessage.error
              ? "bg-destructive/10 border-destructive text-destructive"
              : "bg-primary/10 border-primary text-primary"
          }`}
        >
          {formMessage.text}
        </div>
      )}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Adding Game..." : "Add Game"}
      </Button>
    </form>
  )
}

type GameSelectorProps = {
  games: GameData[]
  currentGameIndex: number
  onSelect: (index: number) => void
  onDelete: (id: number, title: string) => void
}

const GameSelector = ({ games, currentGameIndex, onSelect, onDelete }: GameSelectorProps) => {
  if (games.length === 0) return null
  return (
        <div className="bg-card border border-border p-3 sm:p-4 rounded-lg shadow-md">
      <h2 className="text-sm sm:text-base font-semibold mb-2 text-foreground">Current Game</h2>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full flex items-center justify-between bg-transparent rounded-md text-sm">
            <span className="truncate text-slate-200">{games[currentGameIndex]?.title || 'Select a game'}</span>
            <ChevronDown className="ml-2 w-4 h-4 text-slate-400 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-60 overflow-y-auto rounded-md bg-card p-1 border border-border">
          {games.map((game, index) => (
            <DropdownMenuItem
              key={game.id}
              className="flex justify-between items-center cursor-pointer px-2 py-1 rounded-md hover:bg-slate-700"
              onSelect={() => onSelect(index)}
            >
              <span className="truncate flex-1 text-foreground text-sm">{game.title}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive p-1 h-auto ml-2 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(game.id, game.title)
                }}
                aria-label={`Delete ${game.title}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

type GameInfoProps = { headers: Record<string, string> }
const GameInfo = ({ headers }: GameInfoProps) => {
  const { White, Black, Event, Result } = headers
  return (
    <div className="bg-card border border-border p-3 sm:p-4 rounded-lg shadow-md">
      <h2 className="text-sm sm:text-base font-semibold mb-2 text-foreground">Game Details</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <InfoPair label="White" value={White} />
        <InfoPair label="Black" value={Black} />
        <InfoPair label="Event" value={Event} />
        <InfoPair label="Result" value={Result} />
      </div>
    </div>
  )
}

type InfoPairProps = { label: string; value?: string }
const InfoPair = ({ label, value }: InfoPairProps) => (
  <div>
    <span className="font-medium text-foreground">{label}: </span>
    <span className="text-muted-foreground">{value || "N/A"}</span>
  </div>
)

type BoardDisplayProps = {
  fen: string
  lastMove?: { from: string; to: string }
  gameHistory: GameHistory
  currentMoveIndex: number
  onNavigate: (index: number) => void
}

const BoardDisplay = ({ fen, lastMove, gameHistory, currentMoveIndex, onNavigate }: BoardDisplayProps) => {
  const boardWrapperRef = useRef<HTMLDivElement>(null)
  const [boardWidth, setBoardWidth] = useState<number>()
  useEffect(() => {
    function handleResize() {
      if (boardWrapperRef.current) setBoardWidth(boardWrapperRef.current.offsetWidth)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])
  const goToStart = useCallback(() => onNavigate(-1), [onNavigate])
  const goToEnd = useCallback(() => onNavigate(gameHistory.moves.length - 1), [onNavigate, gameHistory.moves.length])
  const goToPrevious = useCallback(() => onNavigate(currentMoveIndex - 1), [onNavigate, currentMoveIndex])
  const goToNext = useCallback(() => onNavigate(currentMoveIndex + 1), [onNavigate, currentMoveIndex])

  return (
    <div className="flex flex-col max-w-lg mx-auto lg:mx-0 w-full">
      <div ref={boardWrapperRef} className="w-full aspect-square shadow-lg rounded-[2px] overflow-hidden border border-border">
        {boardWidth && boardWidth > 0 ? (
          <Chessboard
            boardWidth={boardWidth}
            position={fen}
            arePiecesDraggable={false}
            customSquareStyles={
              lastMove
                ? {
                    [lastMove.from]: { backgroundColor: "rgba(59, 130, 246, 0.4)" },
                    [lastMove.to]: { backgroundColor: "rgba(59, 130, 246, 0.4)" },
                  }
                : {}
            }
          />
        ) : (
          <div className="w-full h-full bg-muted animate-pulse" />
        )}
      </div>
      <div className="mt-3">
        <Controls
          onStart={goToStart}
          onPrev={goToPrevious}
          onNext={goToNext}
          onEnd={goToEnd}
          canGoBack={currentMoveIndex > -1}
          canGoForward={currentMoveIndex < gameHistory.moves.length - 1}
        />
      </div>
      {gameHistory.moves.length > 0 && (
        <div className="mt-2 text-center text-sm text-muted-foreground">
          Move {currentMoveIndex + 1} of {gameHistory.moves.length}
        </div>
      )}
    </div>
  )
}

type ControlsProps = {
  onStart: () => void; onPrev: () => void; onNext: () => void; onEnd: () => void; canGoBack: boolean; canGoForward: boolean
}

const Controls = React.memo(({ onStart, onPrev, onNext, onEnd, canGoBack, canGoForward }: ControlsProps) => (
  <div className="flex justify-center items-center gap-2 p-3 bg-card border border-border rounded-[2px] shadow-sm">
    <Button variant="outline" size="lg" onClick={onStart} disabled={!canGoBack} aria-label="Go to start" className="flex-1 rounded-[2px] bg-transparent"><ChevronsLeft className="w-5 h-5" /></Button>
    <Button variant="outline" size="lg" onClick={onPrev} disabled={!canGoBack} aria-label="Previous move" className="flex-1 rounded-[2px] bg-transparent"><ChevronLeft className="w-5 h-5" /></Button>
    <Button variant="outline" size="lg" onClick={onNext} disabled={!canGoForward} aria-label="Next move" className="flex-1 rounded-[2px] bg-transparent"><ChevronRight className="w-5 h-5" /></Button>
    <Button variant="outline" size="lg" onClick={onEnd} disabled={!canGoForward} aria-label="Go to end" className="flex-1 rounded-[2px] bg-transparent"><ChevronsRight className="w-5 h-5" /></Button>
  </div>
))
Controls.displayName = "Controls"

type MovesListProps = {
  moves: UiMove[]; currentMoveIndex: number; onMoveSelect: (index: number) => void
}

const MovesList = ({ moves, currentMoveIndex, onMoveSelect }: MovesListProps) => {
  return (
    <div className="bg-card border border-border p-3 sm:p-4 rounded-lg shadow-md lg:col-span-1 flex flex-col">
        <h2 className="text-sm sm:text-base font-semibold mb-2 text-foreground">Moves</h2>
        <div className="flex-1 overflow-y-auto pr-2 text-sm max-h-[60vh]">
          <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-1 items-center">
            {moves.map((move, index) =>
              index % 2 === 0 ? (
                <React.Fragment key={index}>
                  <div className="text-right text-muted-foreground font-mono pr-1 text-xs">{move.moveNumber}.</div>
                  <MoveButton move={move} index={index} isCurrent={currentMoveIndex === index} onMoveSelect={onMoveSelect} />
                  {moves[index + 1] && (
                    <MoveButton
                      move={moves[index + 1]}
                      index={index + 1}
                      isCurrent={currentMoveIndex === index + 1}
                      onMoveSelect={onMoveSelect}
                    />
                  )}
                </React.Fragment>
              ) : null,
            )}
          </div>
        </div>
      </div>
  )
}

type MoveButtonProps = {
  move: UiMove; index: number; isCurrent: boolean; onMoveSelect: (index: number) => void
}

const MoveButton = ({ move, index, isCurrent, onMoveSelect }: MoveButtonProps) => (
  <button onClick={() => onMoveSelect(index)} className={`w-full text-left px-2 py-1 rounded-[2px] transition-colors font-mono text-sm ${isCurrent ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground"}`}>
    {move.san}
  </button>
)
MoveButton.displayName = "MoveButton"