"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Chess } from "chess.js"
import type { Move } from "chess.js"
import { Chessboard } from "react-chessboard"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ChevronDown } from "lucide-react"
import { fetchGames, type GameData } from "./actions"

type UiMove = Move & { moveNumber: number }
interface GameHistory { moves: UiMove[]; fenHistory: string[] }

const BOARD_CUSTOM_SQUARE_STYLES = { lastMove: { backgroundColor: "rgba(59, 130, 246, 0.4)" } }

export default function ViewOnlyPage() {
  const [games, setGames] = useState<GameData[]>([])
  const [currentGameIndex, setCurrentGameIndex] = useState(0)
  const [gameHistory, setGameHistory] = useState<GameHistory>({ moves: [], fenHistory: [] })
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [gameHeaders, setGameHeaders] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | undefined>(undefined)

  const boardWrapperRef = useRef<HTMLDivElement>(null)
  const [boardWidth, setBoardWidth] = useState<number>()

  useEffect(() => { loadGames() }, [])
  async function loadGames() {
    setIsLoading(true)
    const { games: fetchedGames, error } = await fetchGames()
    if (error) console.error("Error fetching games:", error)
    else { setGames(fetchedGames); if (fetchedGames.length > 0) setCurrentGameIndex(0) }
    setIsLoading(false)
  }

  const currentPgn = useMemo(() => games[currentGameIndex]?.pgn || "", [games, currentGameIndex])

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
        try { temp.move((m as any).san); fenHistory.push(temp.fen()) } catch (e) { }
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
    function handleResize() { if (boardWrapperRef.current) setBoardWidth(boardWrapperRef.current.offsetWidth) }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [isLoading])

  useEffect(() => {
    if (currentMoveIndex >= 0 && gameHistory.moves[currentMoveIndex]) {
      const m = gameHistory.moves[currentMoveIndex]
      setLastMove({ from: m.from, to: m.to })
    } else setLastMove(undefined)
  }, [currentMoveIndex, gameHistory.moves])

  const navigateTo = useCallback((index: number) => setCurrentMoveIndex(Math.max(-1, Math.min(index, gameHistory.moves.length - 1))), [gameHistory.moves.length])

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-3">
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">View LCA Tournament Games (Viewer)</h1>
          <p className="text-muted-foreground">Browse, replay and inspect games.</p>
        </header>

        {games.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <GameInfo headers={gameHeaders} />
            <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Current Game</h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full flex items-center justify-between bg-card rounded-md">
                    <span className="truncate">{games[currentGameIndex]?.title || 'Select a game'}</span>
                    <ChevronDown className="ml-2 w-4 h-4 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-screen sm:w-[var(--radix-dropdown-menu-trigger-width)] max-h-[40vh] sm:max-h-60 md:max-h-80 lg:max-h-96 overflow-y-auto rounded-md bg-card p-1 border border-border">
                  {games.map((g, i) => (
                    <DropdownMenuItem key={g.id} className={`flex justify-between items-center cursor-pointer px-2 py-1.5 rounded-md ${i % 2 === 0 ? 'bg-card' : 'bg-accent/50'}`} onSelect={() => setCurrentGameIndex(i)}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground tabular-nums">{i + 1}.</span>
                        <span className="truncate flex-1 text-foreground text-sm">{g.title}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {games.length > 0 ? (
          <main className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-3">
            <div className="flex flex-col max-w-lg mx-auto lg:mx-0 w-full">
              <div ref={boardWrapperRef} className="w-full aspect-square shadow-lg rounded-[2px] overflow-hidden border border-border">
                {boardWidth && boardWidth > 0 ? (
                  <Chessboard
                    boardWidth={boardWidth}
                    position={gameHistory.fenHistory[currentMoveIndex + 1] || 'start'}
                    arePiecesDraggable={false}
                    customSquareStyles={lastMove ? { [lastMove.from]: BOARD_CUSTOM_SQUARE_STYLES.lastMove, [lastMove.to]: BOARD_CUSTOM_SQUARE_STYLES.lastMove } : {}}
                  />
                ) : (
                  <div className="w-full h-full bg-muted animate-pulse" />
                )}
              </div>

              <div className="mt-3">
                <Controls
                  onStart={() => navigateTo(-1)}
                  onPrev={() => navigateTo(currentMoveIndex - 1)}
                  onNext={() => navigateTo(currentMoveIndex + 1)}
                  onEnd={() => navigateTo(gameHistory.moves.length - 1)}
                  canGoBack={currentMoveIndex > -1}
                  canGoForward={currentMoveIndex < gameHistory.moves.length - 1}
                />
              </div>

              {gameHistory.moves.length > 0 && (
                <div className="mt-2 text-center text-sm text-muted-foreground">Move {currentMoveIndex + 1} of {gameHistory.moves.length}</div>
              )}
            </div>

            <div className="lg:h-[calc(100vh-14rem)] lg:overflow-hidden">
              <div className="h-full flex flex-col">
                <MovesList moves={gameHistory.moves} currentMoveIndex={currentMoveIndex} onMoveSelect={(i) => navigateTo(i)} />
              </div>
            </div>
          </main>
        ) : (
          isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                <div className="w-full h-80 bg-muted animate-pulse" />
              </div>
              <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
                <div className="space-y-2">
                  <div className="h-6 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border p-8 rounded-lg text-center shadow-sm">
              <p className="text-muted-foreground">No games available yet.</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}

const Controls = React.memo(({ onStart, onPrev, onNext, onEnd, canGoBack, canGoForward }: { onStart: () => void; onPrev: () => void; onNext: () => void; onEnd: () => void; canGoBack: boolean; canGoForward: boolean }) => (
  <div className="flex justify-center items-center gap-2 p-3 bg-card border border-border rounded-[2px] shadow-sm">
    <Button variant="outline" size="lg" onClick={onStart} disabled={!canGoBack} aria-label="Go to start" className="flex-1 rounded-[2px] bg-transparent"><ChevronsLeft className="w-5 h-5" /></Button>
    <Button variant="outline" size="lg" onClick={onPrev} disabled={!canGoBack} aria-label="Previous move" className="flex-1 rounded-[2px] bg-transparent"><ChevronLeft className="w-5 h-5" /></Button>
    <Button variant="outline" size="lg" onClick={onNext} disabled={!canGoForward} aria-label="Next move" className="flex-1 rounded-[2px] bg-transparent"><ChevronRight className="w-5 h-5" /></Button>
    <Button variant="outline" size="lg" onClick={onEnd} disabled={!canGoForward} aria-label="Go to end" className="flex-1 rounded-[2px] bg-transparent"><ChevronsRight className="w-5 h-5" /></Button>
  </div>
))
Controls.displayName = "Controls"

const MovesList = React.memo(({ moves, currentMoveIndex, onMoveSelect }: { moves: UiMove[]; currentMoveIndex: number; onMoveSelect: (i: number) => void }) => {
  const movesListRef = useRef<HTMLDivElement>(null)
  const activeMoveRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (activeMoveRef.current && movesListRef.current) {
      const container = movesListRef.current
      const element = activeMoveRef.current
      const containerRect = container.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()
      const isVisible = elementRect.top >= containerRect.top && elementRect.bottom <= containerRect.bottom
      if (!isVisible) element.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [currentMoveIndex])

  return (
    <div className="bg-card border border-border p-4 rounded-lg shadow-sm h-full flex flex-col">
      <h2 className="text-sm sm:text-base font-semibold mb-2 text-foreground tracking-tight">Moves</h2>
      <div ref={movesListRef} className="flex-1 overflow-y-auto pr-1 text-sm min-h-[400px] lg:min-h-0">
        <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-1 items-center max-w-[300px]">
          {moves.map((move, index) =>
            index % 2 === 0 ? (
              <React.Fragment key={index}>
                <div className="text-right text-muted-foreground font-mono pr-1 text-xs">{move.moveNumber}.</div>
                <MoveButton move={move} index={index} isCurrent={currentMoveIndex === index} onMoveSelect={onMoveSelect} ref={currentMoveIndex === index ? activeMoveRef : null} />
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
})
MovesList.displayName = "MovesList"

const MoveButton = React.forwardRef<HTMLButtonElement, { move: UiMove; index: number; isCurrent: boolean; onMoveSelect: (i: number) => void }>(({ move, index, isCurrent, onMoveSelect }, ref) => (
  <button
    ref={ref}
    onClick={() => onMoveSelect(index)}
    aria-current={isCurrent ? "true" : "false"}
    aria-label={`Move ${index + 1}: ${move.san}`}
    className={`w-full text-left px-2 py-1 rounded-[2px] transition-colors font-mono text-sm ${isCurrent ? "bg-primary text-primary-foreground" : "hover:bg-accent text-foreground"}`}
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
  return (
    <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
      <h2 className="text-sm sm:text-base font-semibold mb-2 text-foreground tracking-tight">Game Details</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm text-muted-foreground">
        <div><span className="font-medium text-foreground">White:</span> {white}</div>
        <div><span className="font-medium text-foreground">Black:</span> {black}</div>
        <div><span className="font-medium text-foreground">Event:</span> {event}</div>
        <div><span className="font-medium text-foreground">Result:</span> {result}</div>
      </div>
    </div>
  )
}