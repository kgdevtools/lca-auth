'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from 'lucide-react'
import { toast } from 'sonner'
import type { ChessboardConfig } from '@/types/blog-enhancement'

interface ChessboardComponentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (config: ChessboardConfig) => void
  initialConfig?: ChessboardConfig
}

interface Tournament {
  id: string
  display_name: string
  table_name: string
}

interface Game {
  id: string
  title: string
  pgn: string
  white?: string
  black?: string
  event?: string
  result?: string
}

export default function ChessboardComponentModal({
  open,
  onOpenChange,
  onSave,
  initialConfig,
}: ChessboardComponentModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingTournaments, setLoadingTournaments] = useState(false)
  const [loadingGames, setLoadingGames] = useState(false)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [selectedTournament, setSelectedTournament] = useState('')
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [title, setTitle] = useState(initialConfig?.title || '')
  const [interactive, setInteractive] = useState(initialConfig?.interactive ?? true)
  const [autoPlay, setAutoPlay] = useState(initialConfig?.autoPlay ?? false)
  const [showAnnotations, setShowAnnotations] = useState(initialConfig?.showAnnotations ?? true)
  const [tournamentMode, setTournamentMode] = useState(initialConfig?.tournamentMode ?? false)

  // Chess state
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [game, setGame] = useState<Chess | null>(null)
  const [position, setPosition] = useState('start')
  const [moves, setMoves] = useState<string[]>([])
  const [boardWidth, setBoardWidth] = useState(400)
  const boardWrapperRef = useRef<HTMLDivElement>(null)
  const [gameSelected, setGameSelected] = useState(false)

  // Parse PGN and extract moves
  const parsePGN = useCallback((pgn: string) => {
    try {
      const chess = new Chess()
      chess.loadPgn(pgn)
      const history = chess.history()
      setMoves(history)
      setGame(chess)
      chess.reset()
      setPosition(chess.fen())
      setCurrentMoveIndex(-1)
      return history
    } catch (error) {
      console.error('Error parsing PGN:', error)
      toast.error('Invalid PGN format')
      return []
    }
  }, [])

  // Load tournaments
  useEffect(() => {
    async function loadTournaments() {
      setLoadingTournaments(true)
      try {
        const response = await fetch('/api/tournaments/list')
        if (response.ok) {
          const data = await response.json()
          setTournaments(data)
        }
      } catch (error) {
        console.error('Error loading tournaments:', error)
      } finally {
        setLoadingTournaments(false)
      }
    }
    if (open) {
      loadTournaments()
    }
  }, [open])

  // Load games when tournament selected
  useEffect(() => {
    async function loadGames() {
      if (!selectedTournament) return

      setLoadingGames(true)
      try {
        const response = await fetch(`/api/tournaments/${selectedTournament}/games`)
        if (response.ok) {
          const data = await response.json()
          setGames(data)
        }
      } catch (error) {
        console.error('Error loading games:', error)
      } finally {
        setLoadingGames(false)
      }
    }
    loadGames()
  }, [selectedTournament])

  // Handle game selection
  const handleGameSelect = (gameId: string) => {
    const game = games.find((g) => g.id === gameId)
    if (game) {
      setSelectedGame(game)
      parsePGN(game.pgn)
      setTitle(game.title)
      setGameSelected(true)
    }
  }

  // Navigation functions
  const goToStart = () => {
    if (game) {
      const chess = new Chess()
      setPosition(chess.fen())
      setCurrentMoveIndex(-1)
    }
  }

  const goToPrevious = () => {
    if (game && currentMoveIndex >= 0) {
      const chess = new Chess()
      for (let i = 0; i < currentMoveIndex; i++) {
        chess.move(moves[i])
      }
      setPosition(chess.fen())
      setCurrentMoveIndex(currentMoveIndex - 1)
    }
  }

  const goToNext = () => {
    if (game && currentMoveIndex < moves.length - 1) {
      const chess = new Chess()
      for (let i = 0; i <= currentMoveIndex + 1; i++) {
        chess.move(moves[i])
      }
      setPosition(chess.fen())
      setCurrentMoveIndex(currentMoveIndex + 1)
    }
  }

  const goToEnd = () => {
    if (game) {
      const chess = new Chess()
      moves.forEach((move) => chess.move(move))
      setPosition(chess.fen())
      setCurrentMoveIndex(moves.length - 1)
    }
  }

  const goToMove = (index: number) => {
    if (game) {
      const chess = new Chess()
      for (let i = 0; i <= index; i++) {
        chess.move(moves[i])
      }
      setPosition(chess.fen())
      setCurrentMoveIndex(index)
    }
  }

  // Update board width on resize - CRITICAL: Must depend on isLoading like /view and /add-game
  useEffect(() => {
    const updateBoardWidth = () => {
      if (boardWrapperRef.current) {
        setBoardWidth(boardWrapperRef.current.offsetWidth)
      }
    }

    updateBoardWidth()
    window.addEventListener('resize', updateBoardWidth)
    return () => window.removeEventListener('resize', updateBoardWidth)
  }, [gameSelected, isLoading]) // Re-measure when loading state changes AND when game is selected

  const handleSave = () => {
    if (!selectedGame) {
      toast.error('Please select a game')
      return
    }

    const config: ChessboardConfig = {
      title,
      pgn: selectedGame.pgn,
      interactive,
      autoPlay,
      showAnnotations,
      tournamentMode,
      tournamentTableName: tournamentMode ? selectedTournament : undefined,
      tournamentDisplayName: tournamentMode
        ? tournaments.find(t => t.table_name === selectedTournament)?.display_name
        : undefined,
    }

    onSave(config)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setSelectedTournament('')
    setSelectedGame(null)
    setGameSelected(false)
    setCurrentMoveIndex(-1)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-[1400px] max-h-[95vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Add Interactive Chessboard</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selection Controls - Only show if no game selected */}
          {!gameSelected && (
            <div className="space-y-4">
              {/* Tournament Dropdown - Full Width with Skeleton */}
              <div className="space-y-2">
                <Label>Tournament</Label>
                {loadingTournaments ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select tournament" />
                    </SelectTrigger>
                    <SelectContent>
                      {tournaments.map((tournament) => (
                        <SelectItem key={tournament.id} value={tournament.table_name}>
                          {tournament.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Game Dropdown - Full Width with Skeleton */}
              <div className="space-y-2">
                <Label>Game</Label>
                {loadingGames ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={selectedGame?.id || ''}
                    onValueChange={handleGameSelect}
                    disabled={!selectedTournament}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select game" />
                    </SelectTrigger>
                    <SelectContent>
                      {games.map((game) => (
                        <SelectItem key={game.id} value={game.id}>
                          {game.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          {/* Game Viewer - Only show when game selected */}
          {gameSelected && selectedGame && (
            <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr_300px] gap-4">
              {/* Game Details - Left sidebar */}
              <Card className="p-4 space-y-3 h-fit">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-extrabold tracking-tight">Game Details</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setGameSelected(false)}
                    className="h-7 w-7 p-0 -mt-1"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                      White
                    </p>
                    <p className="text-sm font-bold leading-tight">{selectedGame.white || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                      Black
                    </p>
                    <p className="text-sm font-bold leading-tight">{selectedGame.black || 'Unknown'}</p>
                  </div>
                  <div className="pt-1 border-t border-border">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                      Event
                    </p>
                    <p className="text-xs leading-tight">{selectedGame.event || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                      Result
                    </p>
                    <p className="text-sm font-bold leading-tight">{selectedGame.result || 'N/A'}</p>
                  </div>
                </div>
              </Card>

              {/* Chessboard - Center, larger - FIXED: No ugly spacing */}
              <div className="space-y-3">
                <div ref={boardWrapperRef} className="w-full aspect-square">
                  {boardWidth && boardWidth > 0 ? (
                    <div className="w-full h-full shadow-lg rounded-md overflow-hidden border-2 border-border">
                      <Chessboard
                        position={position}
                        boardWidth={boardWidth}
                        arePiecesDraggable={false}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-muted animate-pulse shadow-lg rounded-md overflow-hidden border-2 border-border" />
                  )}
                </div>

                {/* Navigation Controls - Compact */}
                <div className="flex justify-center gap-1.5">
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
                  <p className="text-center text-xs text-muted-foreground">
                    Move {currentMoveIndex + 1} of {moves.length}
                  </p>
                )}
              </div>

              {/* Moves List - Right sidebar */}
              <Card className="p-3 overflow-hidden flex flex-col h-[500px]">
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
                              onClick={() => goToMove(index)}
                              className={`text-left px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                                currentMoveIndex === index
                                  ? 'bg-primary text-primary-foreground font-bold'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              {move}
                            </button>
                            {moves[index + 1] ? (
                              <button
                                onClick={() => goToMove(index + 1)}
                                className={`text-left px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                                  currentMoveIndex === index + 1
                                    ? 'bg-primary text-primary-foreground font-bold'
                                    : 'hover:bg-muted'
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
            </div>
          )}

          {/* Configuration Options */}
          {gameSelected && (
            <div className="space-y-3 border-t pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-semibold">Display Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Game 1: Notable Opening"
                  className="h-9"
                />
              </div>

              <div className="space-y-3">
                {/* Tournament Mode - Highlighted */}
                <div className="bg-muted/50 p-3 rounded-md border border-border">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tournamentMode}
                      onChange={(e) => setTournamentMode(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded"
                    />
                    <div>
                      <div className="text-sm font-semibold">Enable Tournament Mode</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Adds a game selector dropdown on the blog, allowing readers to browse all games from the {tournaments.find(t => t.table_name === selectedTournament)?.display_name || 'tournament'}
                      </p>
                    </div>
                  </label>
                </div>

                {/* Other Options */}
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={interactive}
                      onChange={(e) => setInteractive(e.target.checked)}
                      className="w-3.5 h-3.5 rounded"
                    />
                    <span className="text-xs">Allow user interaction</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAnnotations}
                      onChange={(e) => setShowAnnotations(e.target.checked)}
                      className="w-3.5 h-3.5 rounded"
                    />
                    <span className="text-xs">Show annotations</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoPlay}
                      onChange={(e) => setAutoPlay(e.target.checked)}
                      className="w-3.5 h-3.5 rounded"
                    />
                    <span className="text-xs">Auto-play game</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={handleCancel} className="h-9">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!gameSelected} className="h-9">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Insert Chessboard'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
