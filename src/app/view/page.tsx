"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Chess } from "chess.js"
import type { Move } from "chess.js"
import { Chessboard } from "react-chessboard"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ChevronDown, Play, Pause } from "lucide-react"
import { fetchGames, listTournaments, type GameData, type TournamentMeta } from "./actions"
import type { TournamentId } from "./config"
import { isNewItem } from "./utils"

type UiMove = Move & { moveNumber: number }
interface GameHistory {
  moves: UiMove[]
  fenHistory: string[]
}

const BOARD_CUSTOM_SQUARE_STYLES = { lastMove: { backgroundColor: "rgba(59, 130, 246, 0.4)" } }

export default function ViewOnlyPage() {
  const [tournaments, setTournaments] = useState<TournamentMeta[]>([])
  const [selectedTournamentId, setSelectedTournamentId] = useState<TournamentId | null>(null)
  const [games, setGames] = useState<GameData[]>([])
  const [currentGameIndex, setCurrentGameIndex] = useState(-1)

  const [gameHistory, setGameHistory] = useState<GameHistory>({ moves: [], fenHistory: [] })
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [gameHeaders, setGameHeaders] = useState<Record<string, string>>({})
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | undefined>(undefined)

  const [isLoading, setIsLoading] = useState(true)
  const boardWrapperRef = useRef<HTMLDivElement>(null)
  const [boardWidth, setBoardWidth] = useState<number>()

  const [isReplaying, setIsReplaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const replayTimerRef = useRef<NodeJS.Timeout | null>(null)
  const replayMoveIndexRef = useRef<number>(0)

  // Load tournaments on mount
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { tournaments: fetchedTournaments, error } = await listTournaments()
      if (!mounted) return

      if (error) {
        console.error("Failed to load tournaments:", error)
      }

      setTournaments(fetchedTournaments)

      // Auto-select first tournament
      if (fetchedTournaments.length > 0) {
        setSelectedTournamentId(fetchedTournaments[0].name as TournamentId)
      } else {
        setIsLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  // Load games when tournament changes
  useEffect(() => {
    async function loadGames() {
      if (!selectedTournamentId) {
        setGames([])
        setCurrentGameIndex(-1)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      const { games: fetchedGames, error } = await fetchGames(selectedTournamentId)

      if (error) {
        console.error("Error fetching games:", error)
        setGames([])
        setCurrentGameIndex(-1)
      } else {
        setGames(fetchedGames)
        setCurrentGameIndex(fetchedGames.length > 0 ? 0 : -1)
      }

      setIsLoading(false)
    }

    loadGames()
  }, [selectedTournamentId])

  const currentPgn = useMemo(() => {
    if (currentGameIndex < 0 || !games[currentGameIndex]) return ""
    return games[currentGameIndex].pgn
  }, [games, currentGameIndex])

  useEffect(() => {
    if (!currentPgn) {
      setGameHistory({ moves: [], fenHistory: [] })
      setGameHeaders({})
      setCurrentMoveIndex(-1)
      return
    }

    try {
      // Apply the same fix for TimeControl headers when loading for display
      let displayPgn = currentPgn;
      displayPgn = displayPgn.replace(/\[TimeControl\s+"([^"]*'[^"]*)""\]/g, (match, fullValue) => {
        const fixedValue = fullValue.replace(/'/g, '+');
        return `[TimeControl "${fixedValue}"]`;
      });

      const chess = new Chess()
      chess.loadPgn(displayPgn)
      const headers = chess.header() as Record<string, string>
      setGameHeaders(headers)

      const history = chess.history({ verbose: true }) as Move[]
      const temp = new Chess()
      const fenHistory: string[] = [temp.fen()]
      history.forEach((m) => {
        try {
          temp.move((m as any).san)
          fenHistory.push(temp.fen())
        } catch (e) {
          /* ignore */
        }
      })
      const movesWithNumbers: UiMove[] = history.map((m, i) => ({ ...(m as any), moveNumber: Math.floor(i / 2) + 1 }))
      setGameHistory({ moves: movesWithNumbers, fenHistory })
      setCurrentMoveIndex(-1)
    } catch (e) {
      console.error("Failed to load PGN:", e)
      setGameHeaders({})
      setGameHistory({ moves: [], fenHistory: [new Chess().fen()] })
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
  }, [isLoading])

  useEffect(() => {
    if (currentMoveIndex >= 0 && gameHistory.moves[currentMoveIndex]) {
      const m = gameHistory.moves[currentMoveIndex]
      setLastMove({ from: m.from, to: m.to })
    } else {
      setLastMove(undefined)
    }
  }, [currentMoveIndex, gameHistory.moves])

  const stopReplay = useCallback(() => {
    if (replayTimerRef.current) {
      clearInterval(replayTimerRef.current)
      replayTimerRef.current = null
    }
    setIsReplaying(false)
    setIsPaused(false)
    replayMoveIndexRef.current = -1
  }, [])

  const pauseReplay = useCallback(() => {
    if (replayTimerRef.current) {
      clearInterval(replayTimerRef.current)
      replayTimerRef.current = null
    }
    setIsPaused(true)
  }, [])

  const resumeReplay = useCallback(() => {
    if (!isReplaying || !isPaused) return

    setIsPaused(false)

    replayTimerRef.current = setInterval(() => {
      replayMoveIndexRef.current++
      if (replayMoveIndexRef.current >= gameHistory.moves.length) {
        stopReplay()
        return
      }
      setCurrentMoveIndex(replayMoveIndexRef.current)
    }, 1500)
  }, [isReplaying, isPaused, gameHistory.moves.length, stopReplay])

  const navigateTo = useCallback(
    (index: number) => {
      if (isReplaying) {
        stopReplay()
      }
      setCurrentMoveIndex(Math.max(-1, Math.min(index, gameHistory.moves.length - 1)))
    },
    [gameHistory.moves.length, isReplaying, stopReplay],
  )

  const startReplay = useCallback(() => {
    if (gameHistory.moves.length === 0) return

    stopReplay()

    setCurrentMoveIndex(-1)
    setIsReplaying(true)
    setIsPaused(false)
    replayMoveIndexRef.current = -1

    replayTimerRef.current = setInterval(() => {
      replayMoveIndexRef.current++
      if (replayMoveIndexRef.current >= gameHistory.moves.length) {
        stopReplay()
        return
      }
      setCurrentMoveIndex(replayMoveIndexRef.current)
    }, 1500)
  }, [gameHistory.moves.length, stopReplay])

  const toggleReplay = useCallback(() => {
    if (!isReplaying) {
      startReplay()
    } else if (isPaused) {
      resumeReplay()
    } else {
      pauseReplay()
    }
  }, [isReplaying, isPaused, startReplay, resumeReplay, pauseReplay])

  useEffect(() => {
    return () => {
      if (replayTimerRef.current) {
        clearInterval(replayTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    stopReplay()
  }, [currentPgn, stopReplay])

  const handleTournamentSelect = (tournamentName: TournamentId) => {
    if (tournamentName !== selectedTournamentId) {
      setSelectedTournamentId(tournamentName)
    }
  }

  const handleGameSelect = (index: number) => {
    setCurrentGameIndex(index)
  }

  const selectedTournament = tournaments.find((t) => t.name === selectedTournamentId)
  const selectedTournamentName = selectedTournament?.alias || selectedTournament?.display_name || selectedTournamentId || "Select a tournament"
  const selectedGameTitle =
    games[currentGameIndex]?.title || (games.length > 0 ? "Select a game" : "No games available")

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto space-y-2 p-2 md:p-3">
        <header className="text-center space-y-1 mb-2">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">Limpopo Chess Academy Games Database</h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Chess games from tournaments in and around Limpopo. Updated regularly.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 bg-card border border-border p-2 rounded-lg shadow-sm">
          <div>
            <h3 className="text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wide">Tournament</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-between bg-background hover:bg-accent/50 border-border rounded-md px-3 py-4 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <span className="truncate text-sm font-medium text-foreground">{selectedTournamentName}</span>
                  <ChevronDown className="ml-2 w-4 h-4 flex-shrink-0 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-screen sm:w-[var(--radix-dropdown-menu-trigger-width)] rounded-lg bg-card p-1.5 border border-border shadow-xl">
                {tournaments.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No tournaments available</div>
                ) : (
                  tournaments.map((t, i) => (
                    <DropdownMenuItem
                      key={t.name}
                      onSelect={() => handleTournamentSelect(t.name as TournamentId)}
                      className={`cursor-pointer flex items-center justify-between gap-3 p-3 rounded-md transition-colors duration-150 ${i % 2 === 0 ? 'bg-accent/30' : ''}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="w-6 text-right flex-shrink-0 text-xs font-mono text-muted-foreground bg-muted rounded-full h-6 flex items-center justify-center">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="block truncate font-medium text-foreground group-hover:text-accent-foreground">
                            {t.alias || t.display_name || t.name}
                          </span>
                          <span className="block text-xs text-muted-foreground truncate mt-0.5 font-mono">
                            {t.name}
                          </span>
                        </div>
                      </div>
                      {isNewItem(t.created_at) && (
                        <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm">
                          New
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <h3 className="text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wide">Game</h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild disabled={isLoading || games.length === 0}>
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-between bg-background hover:bg-accent/50 border-border rounded-md px-3 py-4 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-background"
                >
                  <span className="truncate text-sm font-medium text-foreground">
                    {isLoading ? "Loading games..." : selectedGameTitle}
                  </span>
                  <ChevronDown className="ml-2 w-4 h-4 flex-shrink-0 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-screen sm:w-[var(--radix-dropdown-menu-trigger-width)] max-h-[50vh] sm:max-h-72 overflow-y-auto rounded-lg bg-card p-1.5 border border-border shadow-xl">
                {games.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No games available</div>
                ) : games.map((g, i) => (
                  <DropdownMenuItem
                    key={g.id}
                    className={`cursor-pointer flex items-center justify-between gap-3 p-3 rounded-md transition-colors duration-150 ${i % 2 === 0 ? 'bg-accent/30' : ''}`}
                    onSelect={() => handleGameSelect(i)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="w-6 text-right flex-shrink-0 text-xs font-mono text-muted-foreground bg-muted rounded-full h-6 flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="block truncate font-medium text-foreground group-hover:text-accent-foreground">
                          {(() => {
                            // Extract player names from PGN headers for cleaner display
                            const whiteMatch = g.pgn.match(/^\s*\[White\s+"([^"]*)"\]/m);
                            const blackMatch = g.pgn.match(/^\s*\[Black\s+"([^"]*)"\]/m);
                            const white = whiteMatch ? whiteMatch[1] : "Unknown";
                            const black = blackMatch ? blackMatch[1] : "Unknown";
                            return `${white} vs ${black}`;
                          })()}
                        </span>
                        <span className="block text-xs text-muted-foreground truncate mt-0.5">
                          {g.title}
                        </span>
                      </div>
                    </div>
                    {isNewItem(g.created_at) && (
                      <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm flex-shrink-0">
                        New
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_280px] lg:grid-cols-[minmax(0,1fr)_320px] gap-1">
            <div className="w-full">
              <div className="bg-muted animate-pulse rounded-md aspect-square" />
            </div>
            <div className="bg-card border border-border p-3 rounded-lg shadow-sm">
              <div className="space-y-2">
                <div className="h-5 w-1/3 bg-muted rounded animate-pulse mb-3" />
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-5 bg-muted rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        ) : games.length === 0 ? (
          <div className="bg-card border border-border p-6 rounded-lg text-center shadow-sm">
            <p className="text-muted-foreground">No games available for this tournament.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_280px] lg:grid-cols-[minmax(0,1fr)_320px] gap-1">
            {/* Left column: Chessboard + Controls */}
            <div className="space-y-1">
              <div
                ref={boardWrapperRef}
                className="w-full aspect-square shadow-lg rounded-sm overflow-hidden border border-border"
              >
                {boardWidth && boardWidth > 0 ? (
                  <Chessboard
                    boardWidth={boardWidth}
                    position={gameHistory.fenHistory[currentMoveIndex + 1] || "start"}
                    arePiecesDraggable={false}
                    customSquareStyles={
                      lastMove
                        ? {
                            [lastMove.from]: BOARD_CUSTOM_SQUARE_STYLES.lastMove,
                            [lastMove.to]: BOARD_CUSTOM_SQUARE_STYLES.lastMove,
                          }
                        : {}
                    }
                  />
                ) : (
                  <div className="w-full h-full bg-muted animate-pulse" />
                )}
              </div>

              <div className="w-full">
                <Controls
                  onStart={() => navigateTo(-1)}
                  onPrev={() => navigateTo(currentMoveIndex - 1)}
                  onNext={() => navigateTo(currentMoveIndex + 1)}
                  onEnd={() => navigateTo(gameHistory.moves.length - 1)}
                  onReplay={toggleReplay}
                  canGoBack={currentMoveIndex > -1}
                  canGoForward={currentMoveIndex < gameHistory.moves.length - 1}
                  isReplaying={isReplaying}
                  isPaused={isPaused}
                />
              </div>
            </div>

            {/* Right column: Game Info + Moves List stacked */}
            <div className="space-y-1 md:flex md:flex-col">
              <GameInfo headers={gameHeaders} />
              <MovesList
                moves={gameHistory.moves}
                currentMoveIndex={currentMoveIndex}
                onMoveSelect={(i) => navigateTo(i)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const Controls = React.memo(
  ({
    onStart,
    onPrev,
    onNext,
    onEnd,
    onReplay,
    canGoBack,
    canGoForward,
    isReplaying,
    isPaused,
  }: {
    onStart: () => void
    onPrev: () => void
    onNext: () => void
    onEnd: () => void
    onReplay: () => void
    canGoBack: boolean
    canGoForward: boolean
    isReplaying: boolean
    isPaused: boolean
  }) => {
    const showPauseIcon = isReplaying && !isPaused
    const showPlayIcon = !isReplaying || isPaused

    return (
      <div className="flex justify-center items-center gap-1 p-1 bg-card border border-border rounded-sm shadow-sm">
        <Button
          variant="outline"
          size="sm"
          onClick={onStart}
          disabled={!canGoBack || (isReplaying && !isPaused)}
          aria-label="Go to start"
          className="flex-1 rounded-sm bg-transparent h-9"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={!canGoBack || (isReplaying && !isPaused)}
          aria-label="Previous move"
          className="flex-1 rounded-sm bg-transparent h-9"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant={isReplaying && !isPaused ? "default" : "outline"}
          size="sm"
          onClick={onReplay}
          aria-label={showPauseIcon ? "Pause replay" : "Play game"}
          className="flex-1 rounded-sm bg-transparent h-9"
        >
          {showPauseIcon ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!canGoForward || (isReplaying && !isPaused)}
          aria-label="Next move"
          className="flex-1 rounded-sm bg-transparent h-9"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onEnd}
          disabled={!canGoForward || (isReplaying && !isPaused)}
          aria-label="Go to end"
          className="flex-1 rounded-sm bg-transparent h-9"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    )
  },
)
Controls.displayName = "Controls"

const MovesList = React.memo(
  ({
    moves,
    currentMoveIndex,
    onMoveSelect,
  }: { moves: UiMove[]; currentMoveIndex: number; onMoveSelect: (i: number) => void }) => {
    const movesListRef = useRef<HTMLDivElement>(null)
    const activeMoveRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
      if (activeMoveRef.current && movesListRef.current) {
        const container = movesListRef.current
        const element = activeMoveRef.current

        requestAnimationFrame(() => {
          const containerRect = container.getBoundingClientRect()
          const elementRect = element.getBoundingClientRect()

          const elementHeight = elementRect.height
          const visibleTop = Math.max(elementRect.top, containerRect.top)
          const visibleBottom = Math.min(elementRect.bottom, containerRect.bottom)
          const visibleHeight = Math.max(0, visibleBottom - visibleTop)
          const visibilityRatio = visibleHeight / elementHeight

          if (visibilityRatio < 0.3) {
            const elementOffsetTop = element.offsetTop
            const containerHeight = container.clientHeight
            const targetScroll = elementOffsetTop - containerHeight / 2 + elementHeight / 2

            container.scrollTo({
              top: targetScroll,
              behavior: "smooth",
            })
          }
        })
      }
    }, [currentMoveIndex])

    return (
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden md:flex-1 md:min-h-0">
        <div
          ref={movesListRef}
          className="overflow-y-auto p-2 h-[200px] md:h-full scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
        >
          <div className="grid grid-cols-[auto_1fr_1fr] gap-x-1.5 gap-y-1 items-center">
            {moves.map((move, index) =>
              index % 2 === 0 ? (
                <React.Fragment key={index}>
                  <div className="text-right text-muted-foreground font-mono pr-1 text-xs tabular-nums w-6">
                    {move.moveNumber}.
                  </div>
                  <MoveButton
                    move={move}
                    index={index}
                    isCurrent={currentMoveIndex === index}
                    onMoveSelect={onMoveSelect}
                    ref={currentMoveIndex === index ? activeMoveRef : null}
                  />
                  {moves[index + 1] && (
                    <MoveButton
                      move={moves[index + 1]}
                      index={index + 1}
                      isCurrent={currentMoveIndex === index + 1}
                      onMoveSelect={onMoveSelect}
                      ref={currentMoveIndex === index + 1 ? activeMoveRef : null}
                    />
                  )}
                </React.Fragment>
              ) : null,
            )}
          </div>
        </div>
      </div>
    )
  },
)
MovesList.displayName = "MovesList"

const MoveButton = React.forwardRef<
  HTMLButtonElement,
  { move: UiMove; index: number; isCurrent: boolean; onMoveSelect: (i: number) => void }
>(({ move, index, isCurrent, onMoveSelect }, ref) => (
  <button
    ref={ref}
    onClick={() => onMoveSelect(index)}
    aria-current={isCurrent ? "true" : "false"}
    aria-label={`Move ${index + 1}: ${move.san}`}
    className={`w-full text-left px-2 py-1 rounded transition-all duration-150 font-mono text-xs ${
      isCurrent
        ? "bg-primary text-primary-foreground shadow-sm font-semibold"
        : "hover:bg-accent/70 text-foreground hover:shadow-sm"
    }`}
  >
    {move.san}
  </button>
))
MoveButton.displayName = "MoveButton"

const GameInfo: React.FC<{ headers: Record<string, string> }> = ({ headers }) => {
  const white = headers.White || headers.white || "N/A"
  const black = headers.Black || headers.black || "N/A"
  const event = headers.Event || headers.event || "N/A"
  const result = headers.Result || headers.result || "*"
  const date = headers.Date || headers.date || headers.UTCDate || "N/A"
  const whiteElo = headers.WhiteElo || headers.whiteElo || ""
  const blackElo = headers.BlackElo || headers.blackElo || ""

  return (
    <div className="bg-card border border-border p-2 rounded-lg shadow-sm">
      {/* Players - Primary focus with larger, bolder text */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">White</div>
          <div className="text-base font-bold text-foreground leading-snug truncate">{white}</div>
          {whiteElo && <div className="text-xs text-muted-foreground mt-0.5">{whiteElo}</div>}
        </div>

        {/* Result in center - eye-catching */}
        <div className="flex-shrink-0 px-2.5 py-1.5 bg-primary/10 border border-primary/20 rounded-md text-center">
          <div className="text-lg font-bold text-primary leading-none">{result}</div>
        </div>

        <div className="flex-1 min-w-0 text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Black</div>
          <div className="text-base font-bold text-foreground leading-snug truncate">{black}</div>
          {blackElo && <div className="text-xs text-muted-foreground mt-0.5">{blackElo}</div>}
        </div>
      </div>

      {/* Event and Date - Secondary info, more subdued */}
      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Event</div>
          <div className="text-sm font-medium text-foreground/80 leading-tight truncate">{event}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Date</div>
          <div className="text-sm text-muted-foreground leading-tight">{date}</div>
        </div>
      </div>
    </div>
  )
}
