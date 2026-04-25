'use client'

import { useState, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { Button } from '@/components/ui/button'
import { ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react'

interface PgnViewerViewerBlockProps {
  data: {
    pgn?: string
    showEval?: boolean
    showClocks?: boolean
    showArrows?: boolean
    showHighlights?: boolean
    orientation?: 'white' | 'black'
  }
  onSolved: () => void
}

interface ParsedMove {
  san: string
  uci: string
  eval?: string
  clock?: string
  arrows?: string[]
  highlights?: string[]
}

export default function PgnViewerViewerBlock({ data, onSolved }: PgnViewerViewerBlockProps) {
  const [currentMove, setCurrentMove] = useState(0)
  const [position, setPosition] = useState('')
  const [moves, setMoves] = useState<ParsedMove[]>([])

  useEffect(() => {
    if (!data.pgn) return

    const game = new Chess()
    try {
      game.loadPgn(data.pgn)
    } catch (e) {
      console.error('Failed to load PGN:', e)
      return
    }

    const history = game.history({ verbose: true })
    const parsedMoves: ParsedMove[] = history.map((move) => ({
      san: move.san,
      uci: move.from + move.to + (move.promotion ? move.promotion : ''),
    }))

    setMoves(parsedMoves)

    const tempGame = new Chess()
    parsedMoves.forEach((_, i) => {
      if (i === 0) {
        tempGame.reset()
      }
      const move = history[i]
      if (move) tempGame.move(move)
    })
    setPosition(tempGame.fen())
  }, [data.pgn])

  useEffect(() => {
    if (!data.pgn || moves.length === 0) return

    const game = new Chess()
    try {
      game.loadPgn(data.pgn)
    } catch (e) {
      return
    }

    const history = game.history({ verbose: true })
    const tempGame = new Chess()
    for (let i = 0; i <= currentMove; i++) {
      if (history[i]) {
        tempGame.move(history[i])
      }
    }
    setPosition(tempGame.fen())
  }, [currentMove, data.pgn, moves.length])

  const handleNext = () => {
    if (currentMove >= moves.length - 1) {
      onSolved()
    } else {
      setCurrentMove(currentMove + 1)
    }
  }

  const handlePrev = () => {
    if (currentMove > 0) {
      setCurrentMove(currentMove - 1)
    }
  }

  const handleRestart = () => {
    setCurrentMove(0)
  }

  const isLastMove = currentMove >= moves.length - 1
  const totalMoves = Math.ceil(moves.length / 2)

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="lg:w-3/5 flex justify-center">
        <div style={{ width: 360, height: 360 }}>
          <Chessboard
            position={position}
            boardOrientation={data.orientation || 'white'}
            arePiecesDraggable={false}
            customBoardStyle={{
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          />
        </div>
      </div>
      <div className="lg:w-2/5 space-y-4">
        <div>
          <h3 className="font-semibold text-lg">PGN Viewer</h3>
          <p className="text-sm text-gray-500">
            Move {Math.floor(currentMove / 2) + 1} of {totalMoves}
          </p>
        </div>

        <div className="max-h-[200px] overflow-y-auto space-y-1 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
          {moves.map((move, i) => (
            <div
              key={i}
              className={`flex text-sm ${
                i === currentMove
                  ? 'bg-blue-100 dark:bg-blue-900/30 font-medium'
                  : i < currentMove
                  ? 'text-gray-400'
                  : ''
              }`}
            >
              <span className="w-8 text-gray-500">{i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ''}</span>
              <span className="flex-1">{move.san}</span>
              {move.eval && data.showEval && (
                <span className="text-xs text-green-600">{move.eval}</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRestart}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrev} disabled={currentMove === 0}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button onClick={handleNext} className="flex-1 gap-2">
            {isLastMove ? 'Finish' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}