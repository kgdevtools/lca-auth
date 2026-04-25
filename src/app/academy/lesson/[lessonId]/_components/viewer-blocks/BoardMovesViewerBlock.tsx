'use client'

import { useState, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { Button } from '@/components/ui/button'
import { ChevronRight, ChevronLeft, Play, RotateCcw } from 'lucide-react'

interface BoardMovesViewerBlockProps {
  data: {
    pgn?: string
    startMove?: number
    showAnnotations?: boolean
    showClocks?: boolean
    orientation?: 'white' | 'black'
  }
  onSolved: () => void
}

interface ParsedMove {
  san: string
  uci: string
  comment?: string
  clock?: string
}

export default function BoardMovesViewerBlock({ data, onSolved }: BoardMovesViewerBlockProps) {
  const [game] = useState(() => {
    const g = new Chess()
    if (data.pgn) {
      try {
        g.loadPgn(data.pgn)
      } catch (e) {
        console.error('Failed to load PGN:', e)
      }
    }
    return g
  })

  const [currentMove, setCurrentMove] = useState(data.startMove || 0)
  const [position, setPosition] = useState(game.fen())

  const moves: ParsedMove[] = []
  const history = game.history({ verbose: true })
  history.forEach((move) => {
    moves.push({
      san: move.san,
      uci: move.from + move.to + (move.promotion ? move.promotion : ''),
    })
  })

  useEffect(() => {
    const g = new Chess()
    if (data.pgn) {
      try {
        g.loadPgn(data.pgn)
        const moveList = g.history({ verbose: true })
        if (currentMove < moveList.length) {
          const tempGame = new Chess()
          for (let i = 0; i <= currentMove; i++) {
            tempGame.move(moveList[i])
          }
          setPosition(tempGame.fen())
        }
      } catch (e) {
        console.error('Failed to load PGN:', e)
      }
    }
  }, [currentMove, data.pgn])

  const handleNext = () => {
    if (currentMove < moves.length - 1) {
      setCurrentMove(currentMove + 1)
    } else {
      onSolved()
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
          <h3 className="font-semibold text-lg">Move Sequence</h3>
          <p className="text-sm text-gray-500">Follow the moves</p>
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
              <span className="w-8 text-gray-500">{i + 1}.</span>
              <span className="flex-1">{move.san}</span>
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