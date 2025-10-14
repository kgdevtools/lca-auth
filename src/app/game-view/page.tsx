"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Chess } from "chess.js"
// Import types needed for the custom VerboseMove interface
import type { Square, PieceSymbol, Color } from "chess.js"
import { Chessboard } from "react-chessboard"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Trash2, ChevronDown } from "lucide-react"
// Import the server action to fetch games
import { fetchGames, type GameData } from "./actions"

// --- TYPE DEFINITIONS ---

// This is the correct interface from your production file that accurately
// describes the object from game.history({ verbose: true }), solving the TS error.
interface VerboseMove {
  from: Square
  to: Square
  piece: PieceSymbol
  color: Color
  san: string
  flags: string
  lan: string
  before: string
  after: string
  captured?: PieceSymbol
  promotion?: PieceSymbol
}

interface GameHistory {
  // Use the new VerboseMove type
  moves: (VerboseMove & { moveNumber: number })[]
  fenHistory: string[]
}

// --- SVG ICONS for Controls ---
const StartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18.375 3.094a.75.75 0 0 0-1.06 0L9.81 10.59a2.25 2.25 0 0 0 0 3.182l7.505 7.504a.75.75 0 0 0 1.06-1.06L10.87 12.182a.75.75 0 0 1 0-1.06l7.505-7.504a.75.75 0 0 0 0-1.06Z" />
    <path d="M6 3a.75.75 0 0 0-.75.75v16.5a.75.75 0 0 0 1.5 0V3.75A.75.75 0 0 0 6 3Z" />
  </svg>
)
const PrevIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path
      fillRule="evenodd"
      d="M14.78 6.22a.75.75 0 0 1 0 1.06L9.56 12l5.22 5.22a.75.75 0 1 1-1.06 1.06l-5.75-5.75a.75.75 0 0 1 0-1.06l5.75-5.75a.75.75 0 0 1 1.06 0Z"
      clipRule="evenodd"
    />
  </svg>
)
const NextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path
      fillRule="evenodd"
      d="M9.22 6.22a.75.75 0 0 1 1.06 0l5.75 5.75a.75.75 0 0 1 0 1.06l-5.75 5.75a.75.75 0 0 1-1.06-1.06L14.44 12 9.22 6.78a.75.75 0 0 1 0-1.06Z"
      clipRule="evenodd"
    />
  </svg>
)
const EndIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M5.625 3.094a.75.75 0 0 1 1.06 0L14.19 10.59a2.25 2.25 0 0 1 0 3.182l-7.505 7.504a.75.75 0 0 1-1.06-1.06l7.505-7.505a.75.75 0 0 0 0-1.06L5.625 4.154a.75.75 0 0 1 0-1.06Z" />
    <path d="M18 3a.75.75 0 0 1 .75.75v16.5a.75.75 0 0 1-1.5 0V3.75A.75.75 0 0 1 18 3Z" />
  </svg>
)

export default function ViewGamePage() {
  const [games, setGames] = useState<GameData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentGameIndex, setCurrentGameIndex] = useState(0)
  const [gameHistory, setGameHistory] = useState<GameHistory>({ moves: [], fenHistory: [] })
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [gameHeaders, setGameHeaders] = useState<Record<string, string>>({})
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | undefined>(undefined)

  const boardWrapperRef = useRef<HTMLDivElement>(null)
  // Provide a sensible initial width so the chessboard can render on first paint
  const [boardWidth, setBoardWidth] = useState<number | undefined>(400)

  useEffect(() => {
    async function loadGames() {
      setIsLoading(true)
      const { games: fetchedGames, error } = await fetchGames()
      if (error) {
        console.error("Error fetching games:", error)
      } else {
        setGames(fetchedGames)
      }
      setIsLoading(false)
    }
    loadGames()
  }, [])

  const currentPgn = useMemo(() => games[currentGameIndex]?.pgn || "", [games, currentGameIndex])
  const fen = useMemo(
    () => gameHistory.fenHistory[currentMoveIndex + 1] || "start",
    [currentMoveIndex, gameHistory.fenHistory],
  )

  useEffect(() => {
    // Return early if there are no games or PGN to process.
    if (!currentPgn) {
      setGameHistory({ moves: [], fenHistory: [] })
      setGameHeaders({})
      setCurrentMoveIndex(-1)
      return
    }

    const game = new Chess()
    try {
      game.loadPgn(currentPgn)

      const headers = game.header()
      const cleanedHeaders: Record<string, string> = {}
      for (const key in headers) {
        if (headers[key]) {
          cleanedHeaders[key] = headers[key] as string
        }
      }
      setGameHeaders(cleanedHeaders)

      const tempGame = new Chess()
      const fenHistory: string[] = [tempGame.fen()]
      const movesWithNumbers: (VerboseMove & { moveNumber: number })[] = []

      // Cast the history to our correct VerboseMove type
      const history = game.history({ verbose: true }) as VerboseMove[]
      history.forEach((move, index) => {
        tempGame.move(move.san)
        fenHistory.push(tempGame.fen())
        movesWithNumbers.push({
          ...move,
          moveNumber: Math.floor(index / 2 + 1),
        })
      })

      setGameHistory({ moves: movesWithNumbers, fenHistory })
      setCurrentMoveIndex(-1)
    } catch (error) {
      console.error("Failed to load PGN:", error)
      setGameHeaders({})
      setGameHistory({ moves: [], fenHistory: ["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"] })
      setCurrentMoveIndex(-1)
    }
  }, [currentPgn])

  useEffect(() => {
    function handleResize() {
      if (boardWrapperRef.current) {
        setBoardWidth(boardWrapperRef.current.offsetWidth)
      }
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    if (currentMoveIndex >= 0 && gameHistory.moves[currentMoveIndex]) {
      const move = gameHistory.moves[currentMoveIndex]
      setLastMove({ from: move.from, to: move.to })
    } else {
      setLastMove(undefined)
    }
  }, [currentMoveIndex, gameHistory.moves])

  const navigateTo = useCallback(
    (index: number) => {
      const newIndex = Math.max(-1, Math.min(index, gameHistory.moves.length - 1))
      setCurrentMoveIndex(newIndex)
    },
    [gameHistory.moves.length],
  )

  const goToStart = useCallback(() => navigateTo(-1), [navigateTo])
  const goToEnd = useCallback(() => navigateTo(gameHistory.moves.length - 1), [navigateTo, gameHistory.moves.length])
  const goToPrevious = useCallback(() => navigateTo(currentMoveIndex - 1), [navigateTo, currentMoveIndex])
  const goToNext = useCallback(() => navigateTo(currentMoveIndex + 1), [navigateTo, currentMoveIndex])

  const handleGameSelect = useCallback((index: number) => {
    setCurrentGameIndex(index)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Loading games...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-3">
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">View LCA Tournament Games</h1>
          <p className="text-muted-foreground">Browse and study PGNs from the LCA tournament collection — view moves, navigate positions, and analyze games.</p>
        </header>

        {games.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <GameInfo headers={gameHeaders} />
            <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Current Game</h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full flex items-center justify-between bg-card rounded-md">
                    <span className="truncate">{games[currentGameIndex]?.title || "Select a game"}</span>
                    <ChevronDown className="ml-2 w-4 h-4 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-96 overflow-y-auto rounded-md">
                  {games.map((game, index) => (
                    <DropdownMenuItem
                      key={game.id}
                      className="flex justify-between items-center cursor-pointer"
                      onSelect={() => handleGameSelect(index)}
                    >
                      <span className="truncate flex-1">{game.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 p-1 h-auto ml-2 flex-shrink-0 rounded-md"
                        onClick={(e) => {
                          e.stopPropagation()
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
          </div>
        )}

        {games.length > 0 ? (
          <main className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3 lg:gap-4 lg:h-[calc(100vh-14rem)]">
            {/* Board Section - Sticky on desktop */}
            <div className="lg:sticky lg:top-16 lg:self-start lg:h-[calc(100vh-14rem)]">
              <div className="flex flex-col w-full h-full">
                {/* Constrain the inner width to the measured boardWidth so controls align to the board */}
                <div style={{ width: boardWidth ? `${boardWidth}px` : "100%" }}>
                  <div
                    ref={boardWrapperRef}
                    className="w-full aspect-square max-h-[min(80vh,100%)] shadow-lg rounded-t-lg overflow-hidden"
                  >
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
                <div className="mt-3 w-full flex-shrink-0">
                  <Controls
                    onStart={goToStart}
                    onPrev={goToPrevious}
                    onNext={goToNext}
                    onEnd={goToEnd}
                    canGoBack={currentMoveIndex > -1}
                    canGoForward={currentMoveIndex < gameHistory.moves.length - 1}
                  />
                </div>
                </div>
                {gameHistory.moves.length > 0 && (
                  <div className="mt-2 text-center text-sm text-muted-foreground">
                    Move {currentMoveIndex + 1} of {gameHistory.moves.length}
                  </div>
                )}
              </div>
            </div>
            
            {/* Moves Section - Scrollable */}
            <div className="lg:h-full lg:overflow-hidden">
              <div className="h-full flex flex-col">
                <MovesList moves={gameHistory.moves} currentMoveIndex={currentMoveIndex} onMoveSelect={navigateTo} />
              </div>
            </div>
          </main>
        ) : (
          <div className="bg-card border border-border p-8 rounded-lg text-center shadow-sm">
            <p className="text-muted-foreground">No games found in the database.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// --- SUB-COMPONENTS ---

interface ControlsProps {
  onStart: () => void
  onPrev: () => void
  onNext: () => void
  onEnd: () => void
  canGoBack: boolean
  canGoForward: boolean
}
const Controls: React.FC<ControlsProps> = React.memo(({ onStart, onPrev, onNext, onEnd, canGoBack, canGoForward }) => (
  <div className="flex justify-center items-center gap-2 p-2 bg-card border border-border rounded-lg shadow-sm w-full">
    <ControlButton onClick={onStart} disabled={!canGoBack} aria-label="Go to start">
      <StartIcon />
    </ControlButton>
    <ControlButton onClick={onPrev} disabled={!canGoBack} aria-label="Previous move">
      <PrevIcon />
    </ControlButton>
    <ControlButton onClick={onNext} disabled={!canGoForward} aria-label="Next move">
      <NextIcon />
    </ControlButton>
    <ControlButton onClick={onEnd} disabled={!canGoForward} aria-label="Go to end">
      <EndIcon />
    </ControlButton>
  </div>
))

const ControlButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => (
  <button
    className="flex-1 flex justify-center items-center p-3 bg-secondary text-secondary-foreground rounded-md transition-colors hover:bg-secondary/80 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
    {...props}
  >
    {children}
  </button>
)

const GameInfo: React.FC<{ headers: Record<string, string> }> = React.memo(({ headers }) => (
  <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
    <h2 className="text-sm sm:text-base font-semibold mb-2 text-foreground tracking-tight">Game Details</h2>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm text-muted-foreground">
      <div>
        <span className="font-medium text-foreground">White:</span> {headers.White || "N/A"}
      </div>
      <div>
        <span className="font-medium text-foreground">Black:</span> {headers.Black || "N/A"}
      </div>
      <div>
        <span className="font-medium text-foreground">Event:</span> {headers.Event || "N/A"}
      </div>
      <div>
        <span className="font-medium text-foreground">Result:</span> {headers.Result || "N/A"}
      </div>
    </div>
  </div>
))

interface MovesListProps {
  moves: (VerboseMove & { moveNumber: number })[]
  currentMoveIndex: number
  onMoveSelect: (index: number) => void
}
const MovesList: React.FC<MovesListProps> = ({ moves, currentMoveIndex, onMoveSelect }) => {
  const movesListRef = useRef<HTMLDivElement>(null)
  const activeMoveRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (activeMoveRef.current && movesListRef.current) {
      const container = movesListRef.current
      const element = activeMoveRef.current
      const containerRect = container.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()
      const isVisible = elementRect.top >= containerRect.top && elementRect.bottom <= containerRect.bottom
      if (!isVisible) {
        element.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }, [currentMoveIndex])

  return (
    <div className="bg-card border border-border p-4 rounded-lg shadow-sm h-full flex flex-col">
      <h2 className="text-sm sm:text-base font-semibold mb-2 text-foreground tracking-tight">Moves</h2>
      <div ref={movesListRef} className="flex-1 overflow-y-auto pr-1 text-sm min-h-[400px] lg:min-h-0">
        <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-1 items-center max-w-[300px]">
          {moves.map((move, index) =>
            index % 2 === 0 ? (
              <React.Fragment key={`move-row-${move.moveNumber}`}>
                <div className="text-right text-muted-foreground font-mono pr-1 text-xs">{move.moveNumber}.</div>
                <MoveButton
                  move={move}
                  index={index}
                  isCurrent={currentMoveIndex === index}
                  onMoveSelect={onMoveSelect}
                  ref={currentMoveIndex === index ? activeMoveRef : null}
                />
                {moves[index + 1] ? (
                  <MoveButton
                    move={moves[index + 1]}
                    index={index + 1}
                    isCurrent={currentMoveIndex === index + 1}
                    onMoveSelect={onMoveSelect}
                    ref={currentMoveIndex === index + 1 ? activeMoveRef : null}
                  />
                ) : (
                  <div />
                )}
              </React.Fragment>
            ) : null,
          )}
        </div>
      </div>
    </div>
  )
}

interface MoveButtonProps {
  move: VerboseMove
  index: number
  isCurrent: boolean
  onMoveSelect: (index: number) => void
}
const MoveButton = React.forwardRef<HTMLButtonElement, MoveButtonProps>(
  ({ move, index, isCurrent, onMoveSelect }, ref) => (
    <button
      ref={ref}
      onClick={() => onMoveSelect(index)}
      className={`text-left p-1 rounded transition-colors font-mono tracking-tight text-sm ${isCurrent ? "bg-primary text-primary-foreground font-medium" : "hover:bg-secondary text-foreground"}`}
    >
      {move.san}
    </button>
  ),
)
MoveButton.displayName = "MoveButton"

interface GamesListProps {
  games: GameData[]
  currentGameIndex: number
  onGameSelect: (index: number) => void
}
const GamesList: React.FC<GamesListProps> = React.memo(({ games, currentGameIndex, onGameSelect }) => (
  <div className="bg-card border border-border p-3 sm:p-4 rounded-lg shadow-lg">
    <h2 className="text-lg sm:text-xl font-semibold mb-3 text-foreground tracking-tight">Select a Game</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
      {games.map((game, index) => (
        <button
          key={game.id}
          onClick={() => onGameSelect(index)}
          className={`p-2 text-sm rounded-md transition-colors font-medium text-left ${currentGameIndex === index ? "bg-primary text-primary-foreground shadow-md" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
        >
          {game.title}
        </button>
      ))}
    </div>
  </div>
))