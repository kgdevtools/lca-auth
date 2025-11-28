"use client"

import { useEffect, useState, useRef } from "react"
import { Chess } from "chess.js"
import { Chessboard } from "react-chessboard"
import { fetchGames, listTournaments, type GameData } from "@/app/view/actions"
import Link from "next/link"

export function TournamentGamesCard() {
  const [games, setGames] = useState<GameData[]>([])
  const [currentGameIndex, setCurrentGameIndex] = useState(0)
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [gameHeaders, setGameHeaders] = useState<Record<string, string | null>>({})
  const [fenHistory, setFenHistory] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const boardWrapperRef = useRef<HTMLDivElement>(null)
  const [boardWidth, setBoardWidth] = useState<number>()

  // Load a random tournament and its games
  useEffect(() => {
    async function loadRandomTournamentGames() {
      try {
        const { tournaments } = await listTournaments()
        if (tournaments.length === 0) {
          setLoading(false)
          return
        }

        // Select a random tournament
        const randomTournament = tournaments[Math.floor(Math.random() * tournaments.length)]
        const { games: fetchedGames } = await fetchGames(randomTournament.name as any)

        if (fetchedGames.length > 0) {
          // Randomly shuffle games for variety
          const shuffled = [...fetchedGames].sort(() => Math.random() - 0.5)
          setGames(shuffled)
          setCurrentGameIndex(0)
        }
      } catch (error) {
        console.error("Error loading tournament games:", error)
      } finally {
        setLoading(false)
      }
    }

    loadRandomTournamentGames()
  }, [])

  // Parse the current game's PGN
  useEffect(() => {
    if (games.length === 0 || currentGameIndex >= games.length) return

    const currentGame = games[currentGameIndex]
    if (!currentGame?.pgn) return

    try {
      const chess = new Chess()
      chess.loadPgn(currentGame.pgn)

      const headers = chess.header()
      setGameHeaders(headers)

      // Build FEN history
      const history = chess.history({ verbose: true })
      const temp = new Chess()
      const fens: string[] = [temp.fen()]
      history.forEach((move) => {
        temp.move(move.san)
        fens.push(temp.fen())
      })

      setFenHistory(fens)
      setCurrentMoveIndex(-1)
    } catch (error) {
      console.error("Error parsing PGN:", error)
      const startFen = new Chess().fen()
      setFenHistory([startFen])
      setCurrentMoveIndex(-1)
    }
  }, [games, currentGameIndex])

  // Handle board width resize - use full container width
  useEffect(() => {
    function handleResize() {
      if (boardWrapperRef.current) {
        const container = boardWrapperRef.current
        const width = container.offsetWidth
        setBoardWidth(width)
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [loading])

  // Auto-replay logic
  useEffect(() => {
    if (fenHistory.length === 0) return

    // Start auto-replay after a short delay
    timerRef.current = setInterval(() => {
      setCurrentMoveIndex((prev) => {
        const nextIndex = prev + 1

        // If we've reached the end of the game
        if (nextIndex >= fenHistory.length - 1) {
          // Move to next game after 2 seconds
          setTimeout(() => {
            setCurrentGameIndex((prevGameIndex) => (prevGameIndex + 1) % games.length)
          }, 2000)
          return -1 // Reset to start
        }

        return nextIndex
      })
    }, 1000) // 1 move per second

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [fenHistory, games.length])

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
        {/* Header Skeleton */}
        <div className="bg-muted/30 border-b border-border/50 px-3 py-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <div className="h-2 w-10 bg-muted/50 rounded animate-pulse" />
              <div className="h-3 w-20 bg-muted/50 rounded animate-pulse" />
              <div className="h-2 w-12 bg-muted/50 rounded animate-pulse" />
            </div>
            <div className="h-6 w-12 bg-muted/50 rounded animate-pulse" />
            <div className="flex-1 space-y-1 flex flex-col items-end">
              <div className="h-2 w-10 bg-muted/50 rounded animate-pulse" />
              <div className="h-3 w-20 bg-muted/50 rounded animate-pulse" />
              <div className="h-2 w-12 bg-muted/50 rounded animate-pulse" />
            </div>
          </div>
        </div>
        {/* Board Skeleton */}
        <div className="w-full aspect-square bg-muted/30 animate-pulse" />
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <Link
        href="/view"
        className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg flex flex-col items-center justify-center p-6"
      >
        <p className="text-muted-foreground">No games available</p>
      </Link>
    )
  }

  const currentFen = fenHistory[currentMoveIndex + 1] || fenHistory[0] || "start"

  return (
    <Link
      href="/view"
      className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg flex flex-col group"
    >
      {/* Game Info - Compact header */}
      <div className="bg-muted/30 border-b border-border/50 px-2 py-1.5 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <div className="text-[8px] uppercase tracking-wide text-muted-foreground font-medium">White</div>
            <div className="text-[10px] font-bold text-foreground leading-tight truncate">
              {gameHeaders.White || "White"}
            </div>
            {gameHeaders.WhiteElo && <div className="text-[8px] text-muted-foreground">{gameHeaders.WhiteElo}</div>}
          </div>

          <div className="flex-shrink-0 px-1 py-0.5 bg-primary/10 border border-primary/20 rounded text-center">
            <div className="text-[10px] font-bold text-primary leading-none">{gameHeaders.Result || "*"}</div>
          </div>

          <div className="flex-1 min-w-0 text-right">
            <div className="text-[8px] uppercase tracking-wide text-muted-foreground font-medium">Black</div>
            <div className="text-[10px] font-bold text-foreground leading-tight truncate">
              {gameHeaders.Black || "Black"}
            </div>
            {gameHeaders.BlackElo && <div className="text-[8px] text-muted-foreground">{gameHeaders.BlackElo}</div>}
          </div>
        </div>
      </div>

      {/* Chessboard */}
      <div ref={boardWrapperRef} className="w-full aspect-square overflow-hidden bg-card">
        {boardWidth && boardWidth > 0 ? (
          <Chessboard boardWidth={boardWidth} position={currentFen} arePiecesDraggable={false} />
        ) : (
          <div className="w-full h-full bg-muted animate-pulse" />
        )}
      </div>
    </Link>
  )
}
