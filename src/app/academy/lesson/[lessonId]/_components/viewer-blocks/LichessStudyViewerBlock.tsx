'use client'

import { useState, useEffect } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { Button } from '@/components/ui/button'
import { ChevronRight, ChevronLeft, ExternalLink, RotateCcw } from 'lucide-react'

interface LichessStudyViewerBlockProps {
  data: {
    studyId?: string
    chapterId?: string
    studyName?: string
    chapterName?: string
    pgn?: string
  }
  onSolved: () => void
}

export default function LichessStudyViewerBlock({ data, onSolved }: LichessStudyViewerBlockProps) {
  const [currentMove, setCurrentMove] = useState(0)
  const [position, setPosition] = useState('')
  const [moves, setMoves] = useState<string[]>([])

  useEffect(() => {
    if (!data.pgn) return

    const game = new Chess()
    try {
      game.loadPgn(data.pgn)
      const history = game.history()
      setMoves(history)

      const tempGame = new Chess()
      history.forEach((_, i) => {
        const temp = new Chess()
        for (let j = 0; j <= i; j++) {
          temp.move(history[j])
        }
      })
      setPosition(tempGame.fen())
    } catch (e) {
      console.error('Failed to load PGN:', e)
    }
  }, [data.pgn])

  const handleNext = () => {
    if (currentMove >= moves.length - 1) {
      onSolved()
    } else {
      const newMove = currentMove + 1
      setCurrentMove(newMove)

      const tempGame = new Chess()
      for (let i = 0; i <= newMove; i++) {
        tempGame.move(moves[i])
      }
      setPosition(tempGame.fen())
    }
  }

  const handlePrev = () => {
    if (currentMove > 0) {
      const newMove = currentMove - 1
      setCurrentMove(newMove)

      const tempGame = new Chess()
      for (let i = 0; i <= newMove; i++) {
        tempGame.move(moves[i])
      }
      setPosition(tempGame.fen())
    }
  }

  const handleRestart = () => {
    setCurrentMove(0)
    const tempGame = new Chess()
    setPosition(tempGame.fen())
  }

  const studyUrl = data.studyId
    ? `https://lichess.org/study/${data.studyId}${data.chapterId ? `/${data.chapterId}` : ''}`
    : null

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="lg:w-3/5 flex justify-center">
        <div style={{ width: 360, height: 360 }}>
          <Chessboard
            position={position || 'start'}
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
          <h3 className="font-semibold text-lg">Lichess Study</h3>
          {data.chapterName && <p className="text-sm text-gray-500">{data.chapterName}</p>}
        </div>

        {studyUrl && (
          <a
            href={studyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Lichess
          </a>
        )}

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
              <span className="flex-1">{move}</span>
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
            {currentMove >= moves.length - 1 ? 'Finish' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}