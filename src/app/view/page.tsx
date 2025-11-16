"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Chess } from "chess.js"
import type { Move } from "chess.js"
import { Chessboard } from "react-chessboard"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ChevronDown, Play, Pause } from "lucide-react"
import { fetchGames, listTournaments, type GameData, type TournamentMeta } from "./actions"
import { type TournamentId } from "./config"
import { isNewItem } from "./utils"

type UiMove = Move & { moveNumber: number }
interface GameHistory { moves: UiMove[]; fenHistory: string[] }

const BOARD_CUSTOM_SQUARE_STYLES = { lastMove: { backgroundColor: "rgba(59, 130, 246, 0.4)" } }

export default function ViewOnlyPage() {
  const [tournaments, setTournaments] = useState<TournamentMeta[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<TournamentId | null>(null);
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
    let mounted = true;
    (async () => {
      const { tournaments: fetchedTournaments, error } = await listTournaments();
      if (!mounted) return;

      if (error) {
        console.error('Failed to load tournaments:', error);
      }

      setTournaments(fetchedTournaments);

      // Auto-select first tournament
      if (fetchedTournaments.length > 0) {
        setSelectedTournamentId(fetchedTournaments[0].name as TournamentId);
      } else {
        setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Load games when tournament changes
  useEffect(() => {
    async function loadGames() {
      if (!selectedTournamentId) {
        setGames([]);
        setCurrentGameIndex(-1);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const { games: fetchedGames, error } = await fetchGames(selectedTournamentId);

      if (error) {
        console.error("Error fetching games:", error);
        setGames([]);
        setCurrentGameIndex(-1);
      } else {
        setGames(fetchedGames);
        setCurrentGameIndex(fetchedGames.length > 0 ? 0 : -1);
      }

      setIsLoading(false);
    }

    loadGames();
  }, [selectedTournamentId]);
  
  const currentPgn = useMemo(() => {
    if (currentGameIndex < 0 || !games[currentGameIndex]) return "";
    return games[currentGameIndex].pgn;
  }, [games, currentGameIndex]);

  useEffect(() => {
    if (!currentPgn) {
      setGameHistory({ moves: [], fenHistory: [] })
      setGameHeaders({})
      setCurrentMoveIndex(-1)
      return
    }

    try {
      const chess = new Chess()
      chess.loadPgn(currentPgn)
      const headers = chess.header() as Record<string, string>
      setGameHeaders(headers)

      const history = chess.history({ verbose: true }) as Move[]
      const temp = new Chess()
      const fenHistory: string[] = [temp.fen()]
      history.forEach(m => {
        try { temp.move((m as any).san); fenHistory.push(temp.fen()) } catch (e) { /* ignore */ }
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

  // ** THE CRITICAL FIX FOR THE CHESSBOARD LOADING **
  // This effect now depends on `isLoading`. When `isLoading` becomes false,
  // the main content is rendered, and this effect will re-run to correctly
  // measure the width of the board's container.
  useEffect(() => {
    function handleResize() { 
      if (boardWrapperRef.current) {
        setBoardWidth(boardWrapperRef.current.offsetWidth);
      }
    }
    handleResize(); // Measure on initial render (or after loading state changes)
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isLoading]);

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

  const navigateTo = useCallback((index: number) => {
    // Stop replay if user manually navigates
    if (isReplaying) {
      stopReplay()
    }
    setCurrentMoveIndex(Math.max(-1, Math.min(index, gameHistory.moves.length - 1)))
  }, [gameHistory.moves.length, isReplaying, stopReplay])

  const startReplay = useCallback(() => {
    if (gameHistory.moves.length === 0) return

    // Stop any existing replay
    stopReplay()

    // Start from the beginning
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

  // Cleanup replay on unmount or when game changes
  useEffect(() => {
    return () => {
      if (replayTimerRef.current) {
        clearInterval(replayTimerRef.current)
      }
    }
  }, [])

  // Stop replay when game changes
  useEffect(() => {
    stopReplay()
  }, [currentPgn, stopReplay])

  const handleTournamentSelect = (tournamentName: TournamentId) => {
    if (tournamentName !== selectedTournamentId) {
        setSelectedTournamentId(tournamentName)
    }
  }

  const handleGameSelect = (index: number) => {
    setCurrentGameIndex(index);
  }

  const selectedTournament = tournaments.find(t => t.name === selectedTournamentId);
  const selectedTournamentName = selectedTournament?.display_name || selectedTournamentId || 'Select a tournament';
  const selectedGameTitle = games[currentGameIndex]?.title || (games.length > 0 ? 'Select a game' : 'No games available');

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-3">
        <header className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Limpopo Chess Academy</h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-muted-foreground">Games Database</h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Chess games from tournaments in and around Limpopo. Check back regularly—we update the database daily with new games!
          </p>
        </header>

        {/* Tournament/Game selector - ABOVE the chessboard and game details */}
        <div className="bg-card border border-border p-3 sm:p-4 rounded-lg shadow-sm space-y-4">
            <div>
                <h3 className="text-sm font-semibold mb-2.5 text-muted-foreground uppercase tracking-wide">Select Tournament</h3>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className="w-full flex items-center justify-between bg-background hover:bg-accent/50 border-border rounded-lg px-3 py-5 sm:px-4 sm:py-6 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                            <span className="truncate text-sm sm:text-base font-medium text-foreground">{selectedTournamentName}</span>
                            <ChevronDown className="ml-2 w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-screen sm:w-[var(--radix-dropdown-menu-trigger-width)] rounded-lg bg-card p-2 border border-border shadow-xl">
                        {tournaments.length === 0 ? (
                            <div className="px-3 py-2.5 text-sm text-muted-foreground">No tournaments available</div>
                        ) : tournaments.map((t) => (
                            <DropdownMenuItem
                                key={t.name}
                                onSelect={() => handleTournamentSelect(t.name as TournamentId)}
                                className="cursor-pointer px-3 py-2.5 rounded-md hover:bg-accent/70 transition-colors duration-150 flex items-center justify-between group"
                            >
                                <span className="text-sm font-medium text-foreground group-hover:text-accent-foreground flex-1">
                                    {t.display_name || t.name}
                                </span>
                                {isNewItem(t.created_at) && (
                                    <span className="ml-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm">
                                        New
                                    </span>
                                )}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div>
                <h3 className="text-sm font-semibold mb-2.5 text-muted-foreground uppercase tracking-wide">Select Game</h3>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={isLoading || games.length === 0}>
                        <Button
                            variant="outline"
                            className="w-full flex items-center justify-between bg-background hover:bg-accent/50 border-border rounded-lg px-3 py-5 sm:px-4 sm:py-6 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-background"
                        >
                            <span className="truncate text-sm sm:text-base font-medium text-foreground">
                                {isLoading ? 'Loading games...' : selectedGameTitle}
                            </span>
                            <ChevronDown className="ml-2 w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-screen sm:w-[var(--radix-dropdown-menu-trigger-width)] max-h-[50vh] sm:max-h-80 overflow-y-auto rounded-lg bg-card p-2 border border-border shadow-xl">
                        {games.map((g, i) => (
                            <DropdownMenuItem
                                key={g.id}
                                className="cursor-pointer px-3 py-2.5 rounded-md hover:bg-accent/70 transition-colors duration-150 group mb-1 last:mb-0"
                                onSelect={() => handleGameSelect(i)}
                            >
                                <div className="flex items-center justify-between w-full gap-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className="text-xs font-mono text-muted-foreground tabular-nums flex-shrink-0 w-8">
                                            {i + 1}.
                                        </span>
                                        <span className="truncate text-sm font-medium text-foreground group-hover:text-accent-foreground">
                                            {g.title}
                                        </span>
                                    </div>
                                    {isNewItem(g.created_at) && (
                                        <span className="ml-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm flex-shrink-0">
                                            New
                                        </span>
                                    )}
                                </div>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="bg-muted animate-pulse rounded-md aspect-square" />
              <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                <div className="space-y-2">
                  <div className="h-6 w-1/4 bg-muted rounded animate-pulse mb-4" />
                  {Array.from({ length: 10 }).map((_, i) => (<div key={i} className="h-6 bg-muted rounded animate-pulse" />))}
                </div>
              </div>
          </div>
        ) : games.length === 0 ? (
          <div className="bg-card border border-border p-8 rounded-lg text-center shadow-sm mt-3">
            <p className="text-muted-foreground">No games available for this tournament.</p>
          </div>
        ) : (
          <>
            {/* Game Details ABOVE chessboard - both in viewport */}
            <div className="space-y-2">
              <GameInfo headers={gameHeaders} />

              <div ref={boardWrapperRef} className="w-full aspect-square shadow-lg rounded-[2px] overflow-hidden border border-border max-w-lg mx-auto">
                {boardWidth && boardWidth > 0 ? (
                  <Chessboard boardWidth={boardWidth} position={gameHistory.fenHistory[currentMoveIndex + 1] || 'start'} arePiecesDraggable={false} customSquareStyles={lastMove ? { [lastMove.from]: BOARD_CUSTOM_SQUARE_STYLES.lastMove, [lastMove.to]: BOARD_CUSTOM_SQUARE_STYLES.lastMove } : {}}/>
                ) : (
                  <div className="w-full h-full bg-muted animate-pulse" />
                )}
              </div>

              <div className="max-w-lg mx-auto">
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

              {/* Moves list - minimal spacing */}
              <div className="max-w-lg mx-auto">
                <MovesList moves={gameHistory.moves} currentMoveIndex={currentMoveIndex} onMoveSelect={(i) => navigateTo(i)} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Sub-components (Controls, MovesList, etc.) remain unchanged from your last version. I'm including them here for completeness.
const Controls = React.memo(({ onStart, onPrev, onNext, onEnd, onReplay, canGoBack, canGoForward, isReplaying, isPaused }: {
  onStart: () => void;
  onPrev: () => void;
  onNext: () => void;
  onEnd: () => void;
  onReplay: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  isReplaying: boolean;
  isPaused: boolean;
}) => {
  const showPauseIcon = isReplaying && !isPaused
  const showPlayIcon = !isReplaying || isPaused

  return (
    <div className="flex justify-center items-center gap-2 p-3 bg-card border border-border rounded-[2px] shadow-sm">
      <Button variant="outline" size="lg" onClick={onStart} disabled={!canGoBack || (isReplaying && !isPaused)} aria-label="Go to start" className="flex-1 rounded-[2px] bg-transparent"><ChevronsLeft className="w-5 h-5" /></Button>
      <Button variant="outline" size="lg" onClick={onPrev} disabled={!canGoBack || (isReplaying && !isPaused)} aria-label="Previous move" className="flex-1 rounded-[2px] bg-transparent"><ChevronLeft className="w-5 h-5" /></Button>
      <Button
        variant={isReplaying && !isPaused ? "default" : "outline"}
        size="lg"
        onClick={onReplay}
        aria-label={showPauseIcon ? "Pause replay" : "Play game"}
        className="flex-1 rounded-[2px] bg-transparent"
      >
        {showPauseIcon ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </Button>
      <Button variant="outline" size="lg" onClick={onNext} disabled={!canGoForward || (isReplaying && !isPaused)} aria-label="Next move" className="flex-1 rounded-[2px] bg-transparent"><ChevronRight className="w-5 h-5" /></Button>
      <Button variant="outline" size="lg" onClick={onEnd} disabled={!canGoForward || (isReplaying && !isPaused)} aria-label="Go to end" className="flex-1 rounded-[2px] bg-transparent"><ChevronsRight className="w-5 h-5" /></Button>
    </div>
  )
})
Controls.displayName = "Controls"

const MovesList = React.memo(({ moves, currentMoveIndex, onMoveSelect }: { moves: UiMove[]; currentMoveIndex: number; onMoveSelect: (i: number) => void }) => {
  const movesListRef = useRef<HTMLDivElement>(null)
  const activeMoveRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (activeMoveRef.current && movesListRef.current) {
      const container = movesListRef.current
      const element = activeMoveRef.current

      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect()
        const elementRect = element.getBoundingClientRect()

        // Only scroll within the container, never scroll the page viewport
        const elementHeight = elementRect.height
        const visibleTop = Math.max(elementRect.top, containerRect.top)
        const visibleBottom = Math.min(elementRect.bottom, containerRect.bottom)
        const visibleHeight = Math.max(0, visibleBottom - visibleTop)
        const visibilityRatio = visibleHeight / elementHeight

        // Only scroll if less than 30% of the element is visible (more conservative)
        if (visibilityRatio < 0.3) {
          // Scroll within container only, using scrollTop for precise control
          const containerScrollTop = container.scrollTop
          const elementOffsetTop = element.offsetTop
          const containerHeight = container.clientHeight

          // Calculate target scroll position to center element
          const targetScroll = elementOffsetTop - (containerHeight / 2) + (elementHeight / 2)

          // Smooth scroll within container only
          container.scrollTo({
            top: targetScroll,
            behavior: "smooth"
          })
        }
      })
    }
  }, [currentMoveIndex])

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm max-w-lg mx-auto overflow-hidden">
      <div ref={movesListRef} className="overflow-y-auto p-3 sm:p-4 h-[280px] sm:h-[320px] md:h-[360px] scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-1.5 items-center">
          {moves.map((move, index) =>
            index % 2 === 0 ? (
              <React.Fragment key={index}>
                <div className="text-right text-muted-foreground font-mono pr-2 text-xs tabular-nums w-8">{move.moveNumber}.</div>
                <MoveButton move={move} index={index} isCurrent={currentMoveIndex === index} onMoveSelect={onMoveSelect} ref={currentMoveIndex === index ? activeMoveRef : null} />
                {moves[index + 1] && (<MoveButton move={moves[index + 1]} index={index + 1} isCurrent={currentMoveIndex === index + 1} onMoveSelect={onMoveSelect} ref={currentMoveIndex === index + 1 ? activeMoveRef : null}/>)}
              </React.Fragment>
            ) : null,
          )}
        </div>
      </div>
    </div>
  )
})
MovesList.displayName = "MovesList"

const MoveButton = React.forwardRef<HTMLButtonElement, { move: UiMove; index: number; isCurrent: boolean; onMoveSelect: (i: number) => void }>(({ move, index, isCurrent, onMoveSelect }, ref) => (
  <button
    ref={ref}
    onClick={() => onMoveSelect(index)}
    aria-current={isCurrent ? "true" : "false"}
    aria-label={`Move ${index + 1}: ${move.san}`}
    className={`w-full text-left px-2.5 py-1.5 rounded-md transition-all duration-150 font-mono text-sm ${
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
    <div className="bg-card border border-border p-3 rounded-lg shadow-sm">
      <h2 className="text-xs uppercase tracking-tight text-muted-foreground font-semibold mb-2">Game Details</h2>

      {/* Players - Compact */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-background/50 p-2 rounded border border-border/50">
          <div className="text-[10px] uppercase tracking-tight text-muted-foreground leading-none mb-0.5">White</div>
          <div className="text-sm font-bold text-foreground leading-tight">{white}</div>
          {whiteElo && <div className="text-xs text-muted-foreground leading-none mt-0.5">{whiteElo}</div>}
        </div>

        <div className="bg-background/50 p-2 rounded border border-border/50">
          <div className="text-[10px] uppercase tracking-tight text-muted-foreground leading-none mb-0.5">Black</div>
          <div className="text-sm font-bold text-foreground leading-tight">{black}</div>
          {blackElo && <div className="text-xs text-muted-foreground leading-none mt-0.5">{blackElo}</div>}
        </div>
      </div>

      {/* Event & Result - Compact */}
      <div className="space-y-1.5 pt-2 border-t border-border">
        <div>
          <div className="text-[10px] uppercase tracking-tight text-muted-foreground leading-none mb-0.5">Event</div>
          <div className="text-sm font-semibold text-foreground leading-tight">{event}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-tight text-muted-foreground leading-none mb-0.5">Date</div>
            <div className="text-xs font-medium text-foreground leading-tight">{date}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-tight text-muted-foreground leading-none mb-0.5">Result</div>
            <div className="text-xs font-bold text-foreground leading-tight">{result}</div>
          </div>
        </div>
      </div>
    </div>
  )
}