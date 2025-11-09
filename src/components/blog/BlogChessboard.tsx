'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Trophy } from 'lucide-react'
import type { ChessboardConfig } from '@/types/blog-enhancement'

interface BlogChessboardProps {
  config: ChessboardConfig
}

interface TournamentGame {
  id: string
  title: string
  pgn: string
  white?: string
  black?: string
  event?: string
  result?: string
}

export default function BlogChessboard({ config }: BlogChessboardProps) {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [game, setGame] = useState<Chess | null>(null)
  const [position, setPosition] = useState('start')
  const [moves, setMoves] = useState<string[]>([])
  const [boardWidth, setBoardWidth] = useState(400)
  const [gameInfo, setGameInfo] = useState<{
    white?: string
    black?: string
    event?: string
    result?: string
  }>({})
  const boardWrapperRef = useRef<HTMLDivElement>(null)

  // Tournament mode state
  const [tournamentGames, setTournamentGames] = useState<TournamentGame[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string>('')
  const [loadingGames, setLoadingGames] = useState(false)
  const [currentPgn, setCurrentPgn] = useState(config.pgn)

  // Load tournament games if in tournament mode
  useEffect(() => {
    async function loadTournamentGames() {
      if (!config.tournamentMode || !config.tournamentTableName) return

      setLoadingGames(true)
      try {
        const response = await fetch(`/api/tournaments/${config.tournamentTableName}/games`)
        if (response.ok) {
          const data = await response.json()
          setTournamentGames(data)
          // Set first game as selected by default
          if (data.length > 0) {
            setSelectedGameId(data[0].id)
            setCurrentPgn(data[0].pgn)
          }
        }
      } catch (error) {
        console.error('Error loading tournament games:', error)
      } finally {
        setLoadingGames(false)
      }
    }

    loadTournamentGames()
  }, [config.tournamentMode, config.tournamentTableName])

  // Handle game selection in tournament mode
  const handleGameSelect = (gameId: string) => {
    const selectedGame = tournamentGames.find(g => g.id === gameId)
    if (selectedGame) {
      setSelectedGameId(gameId)
      setCurrentPgn(selectedGame.pgn)
      setCurrentMoveIndex(-1) // Reset to start
    }
  }

  // Parse PGN and extract moves
  useEffect(() => {
    try {
      const chess = new Chess()
      chess.loadPgn(currentPgn)

      // Extract game info from PGN headers
      const headers = chess.header()
      setGameInfo({
        white: headers.White || undefined,
        black: headers.Black || undefined,
        event: headers.Event || undefined,
        result: headers.Result || undefined,
      })

      const history = chess.history()
      setMoves(history)
      setGame(chess)
      chess.reset()
      setPosition(chess.fen())
      setCurrentMoveIndex(-1)
    } catch (error) {
      console.error('Error parsing PGN:', error)
    }
  }, [currentPgn])

  // Navigation functions
  const goToStart = useCallback(() => {
    if (game) {
      const chess = new Chess()
      setPosition(chess.fen())
      setCurrentMoveIndex(-1)
    }
  }, [game])

  const goToPrevious = useCallback(() => {
    if (game && currentMoveIndex >= 0) {
      const chess = new Chess()
      for (let i = 0; i < currentMoveIndex; i++) {
        chess.move(moves[i])
      }
      setPosition(chess.fen())
      setCurrentMoveIndex(currentMoveIndex - 1)
    }
  }, [game, currentMoveIndex, moves])

  const goToNext = useCallback(() => {
    if (game && currentMoveIndex < moves.length - 1) {
      const chess = new Chess()
      for (let i = 0; i <= currentMoveIndex + 1; i++) {
        chess.move(moves[i])
      }
      setPosition(chess.fen())
      setCurrentMoveIndex(currentMoveIndex + 1)
    }
  }, [game, currentMoveIndex, moves])

  const goToEnd = useCallback(() => {
    if (game) {
      const chess = new Chess()
      moves.forEach((move) => chess.move(move))
      setPosition(chess.fen())
      setCurrentMoveIndex(moves.length - 1)
    }
  }, [game, moves])

  const goToMove = useCallback(
    (index: number) => {
      if (game) {
        const chess = new Chess()
        for (let i = 0; i <= index; i++) {
          chess.move(moves[i])
        }
        setPosition(chess.fen())
        setCurrentMoveIndex(index)
      }
    },
    [game, moves]
  )

  // Auto-play functionality
  useEffect(() => {
    if (config.autoPlay && moves.length > 0) {
      const interval = setInterval(() => {
        setCurrentMoveIndex((prev) => {
          if (prev >= moves.length - 1) {
            clearInterval(interval)
            return prev
          }
          return prev + 1
        })
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [config.autoPlay, moves.length])

  // Update position when auto-play changes currentMoveIndex
  useEffect(() => {
    if (config.autoPlay && game && currentMoveIndex >= 0) {
      const chess = new Chess()
      for (let i = 0; i <= currentMoveIndex; i++) {
        chess.move(moves[i])
      }
      setPosition(chess.fen())
    }
  }, [currentMoveIndex, config.autoPlay, game, moves])

  // Update board width on resize - CRITICAL: Match /view and /add-game implementation
  useEffect(() => {
    const updateBoardWidth = () => {
      if (boardWrapperRef.current) {
        setBoardWidth(boardWrapperRef.current.offsetWidth)
      }
    }

    updateBoardWidth()
    window.addEventListener('resize', updateBoardWidth)
    return () => window.removeEventListener('resize', updateBoardWidth)
  }, [])

  return (
    <div className="my-8">
      {/* Title */}
      {config.title && (
        <h3 className="text-lg font-bold mb-3 text-foreground">{config.title}</h3>
      )}

      {/* Tournament Mode: Game Selector */}
      {config.tournamentMode && (
        <Card className="p-4 mb-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-primary" />
            <div className="flex-1 space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold">
                  {config.tournamentDisplayName || 'Tournament'}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({tournamentGames.length} games)
                </span>
              </div>
              {loadingGames ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={selectedGameId} onValueChange={handleGameSelect}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a game" />
                  </SelectTrigger>
                  <SelectContent>
                    {tournamentGames.map((game) => (
                      <SelectItem key={game.id} value={game.id}>
                        <div className="flex flex-col items-start py-1">
                          <span className="font-medium">{game.title}</span>
                          {game.white && game.black && (
                            <span className="text-xs text-muted-foreground">
                              {game.white} vs {game.black}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 max-w-5xl">
        {/* Chessboard and Controls */}
        <div className="space-y-3">
          <div
            ref={boardWrapperRef}
            className="w-full aspect-square max-w-2xl shadow-lg rounded-md overflow-hidden border border-border"
          >
            {boardWidth && boardWidth > 0 ? (
              <Chessboard
                position={position}
                boardWidth={boardWidth}
                arePiecesDraggable={config.interactive || false}
              />
            ) : (
              <div className="w-full h-full bg-muted animate-pulse" />
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-center gap-2 max-w-2xl">
            <Button
              variant="outline"
              size="sm"
              onClick={goToStart}
              disabled={currentMoveIndex === -1}
              className="h-9 px-3"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevious}
              disabled={currentMoveIndex === -1}
              className="h-9 px-3"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNext}
              disabled={currentMoveIndex === moves.length - 1}
              className="h-9 px-3"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToEnd}
              disabled={currentMoveIndex === moves.length - 1}
              className="h-9 px-3"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Move counter */}
          {moves.length > 0 && (
            <p className="text-center text-sm text-muted-foreground max-w-2xl">
              Move {currentMoveIndex + 1} of {moves.length}
            </p>
          )}
        </div>

        {/* Moves List + Game Details */}
        <div className="space-y-4">
          {/* Game Details */}
          <Card className="p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Game Details
            </h4>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                  White
                </p>
                <p className="text-sm font-bold leading-tight">{gameInfo.white || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                  Black
                </p>
                <p className="text-sm font-bold leading-tight">{gameInfo.black || 'Unknown'}</p>
              </div>
              {gameInfo.event && (
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                    Event
                  </p>
                  <p className="text-xs leading-tight">{gameInfo.event}</p>
                </div>
              )}
              {gameInfo.result && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                    Result
                  </p>
                  <p className="text-sm font-bold leading-tight">{gameInfo.result}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Moves List */}
          {config.showAnnotations && moves.length > 0 && (
            <Card className="p-3 overflow-hidden flex flex-col h-[400px]">
              <h4 className="text-xs font-bold mb-2 uppercase tracking-wider">Moves</h4>
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="space-y-0.5">
                  {moves.map((move, index) => {
                    if (index % 2 === 0) {
                      return (
                        <div key={index} className="grid grid-cols-[auto_1fr_1fr] gap-1 items-center">
                          <span className="text-[10px] text-muted-foreground font-mono w-6 text-right">
                            {Math.floor(index / 2) + 1}.
                          </span>
                          <button
                            onClick={() => config.interactive && goToMove(index)}
                            disabled={!config.interactive}
                            className={`text-left px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                              config.interactive ? 'hover:bg-muted cursor-pointer' : 'cursor-default'
                            } ${
                              currentMoveIndex === index
                                ? 'bg-primary text-primary-foreground font-bold'
                                : ''
                            }`}
                          >
                            {move}
                          </button>
                          {moves[index + 1] ? (
                            <button
                              onClick={() => config.interactive && goToMove(index + 1)}
                              disabled={!config.interactive}
                              className={`text-left px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                                config.interactive ? 'hover:bg-muted cursor-pointer' : 'cursor-default'
                              } ${
                                currentMoveIndex === index + 1
                                  ? 'bg-primary text-primary-foreground font-bold'
                                  : ''
                              }`}
                            >
                              {moves[index + 1]}
                            </button>
                          ) : (
                            <div />
                          )}
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
