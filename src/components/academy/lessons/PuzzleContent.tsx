'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Chess, type Square } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Button } from '@/components/ui/button'
import { RefreshCcw, CheckCircle, XCircle, Lightbulb } from 'lucide-react'

const BOARD_CUSTOM_SQUARE_STYLES = {
  lastMove: { backgroundColor: 'rgba(59, 130, 246, 0.4)' },
  legalMove: { background: 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)' },
  legalCapture: { background: 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)' },
  selectedPiece: { backgroundColor: 'rgba(59, 130, 246, 0.4)' },
}

interface PuzzleContentProps {
  content: {
    fen: string
    solution: string[] | string
    description?: string
    explanation?: string
  }
}

type Feedback = { type: 'success' | 'error' | 'info'; message: string } | null

export default function PuzzleContent({ content }: PuzzleContentProps) {
  const game = useRef(new Chess(content.fen))
  const [fen, setFen] = useState(content.fen)
  const solutionMoves = Array.isArray(content.solution) ? content.solution : content.solution.split(' ')
  const [userMoveIndex, setUserMoveIndex] = useState(0)
  const [moveFrom, setMoveFrom] = useState<Square | ''>('')
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({})
  const [isSolved, setIsSolved] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>({
    type: 'info',
    message: content.description || 'Find the best move.',
  })
  const boardWrapperRef = useRef<HTMLDivElement>(null)
  const [boardWidth, setBoardWidth] = useState<number>()
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [incorrectMove, setIncorrectMove] = useState<{ from: string; to: string } | null>(null)
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [showHint, setShowHint] = useState(false)

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = { ...optionSquares }
    if (lastMove) {
      styles[lastMove.from] = BOARD_CUSTOM_SQUARE_STYLES.lastMove
      styles[lastMove.to] = BOARD_CUSTOM_SQUARE_STYLES.lastMove
    }
    if (incorrectMove) {
      styles[incorrectMove.from] = { backgroundColor: 'rgba(239, 68, 68, 0.5)' }
      styles[incorrectMove.to] = { backgroundColor: 'rgba(239, 68, 68, 0.5)' }
    }
    return styles
  }, [lastMove, optionSquares, incorrectMove])

  useEffect(() => {
    function handleResize() {
      if (boardWrapperRef.current) setBoardWidth(boardWrapperRef.current.offsetWidth)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const resetPuzzle = () => {
    game.current.load(content.fen)
    setFen(content.fen)
    setUserMoveIndex(0)
    setIsSolved(false)
    setLastMove(null)
    setIncorrectMove(null)
    setMoveFrom('')
    setOptionSquares({})
    setAttempts(0)
    setShowHint(false)
    setFeedback({ type: 'info', message: content.description || 'Find the best move.' })
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current)
      feedbackTimeoutRef.current = null
    }
  }

  const getHint = () => {
    if (isSolved || showHint) return
    setShowHint(true)
    const expectedMoveSAN = solutionMoves[userMoveIndex]
    const solutionGameCopy = new Chess(game.current.fen())
    const hintMove = solutionGameCopy.move(expectedMoveSAN)
    if (hintMove) {
      setFeedback({
        type: 'info',
        message: `Hint: Move from ${hintMove.from.toUpperCase()} to ${hintMove.to.toUpperCase()}`,
      })
    }
  }

  const makeMove = (move: { from: Square; to: Square; promotion?: string }): boolean => {
    if (isSolved) return false

    // Check if the move is a valid chess move
    const gameCopy = new Chess(game.current.fen())
    const madeMove = gameCopy.move(move)
    if (madeMove === null) return false

    // Check if the move matches the solution
    const expectedMoveSAN = solutionMoves[userMoveIndex]
    const solutionGameCopy = new Chess(game.current.fen())
    const correctMoveDetails = solutionGameCopy.move(expectedMoveSAN)

    if (madeMove.from !== correctMoveDetails.from || madeMove.to !== correctMoveDetails.to) {
      setAttempts((prev) => prev + 1)

      // Show incorrect move temporarily
      game.current.move(move)
      setFen(game.current.fen())
      setIncorrectMove({ from: madeMove.from, to: madeMove.to })
      setFeedback({ type: 'error', message: 'Incorrect move. Try again!' })

      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current)
      }

      // Reset after delay
      feedbackTimeoutRef.current = setTimeout(() => {
        game.current.load(content.fen)
        setFen(content.fen)
        setUserMoveIndex(0)
        setIncorrectMove(null)
        setLastMove(null)
        setShowHint(false)
        setFeedback({ type: 'info', message: content.description || 'Find the best move.' })
        feedbackTimeoutRef.current = null
      }, 1000)

      return true
    }

    // Correct move!
    game.current.move(move)
    setFen(game.current.fen())
    setLastMove({ from: madeMove.from, to: madeMove.to })
    setIncorrectMove(null)
    setFeedback({ type: 'info', message: 'Correct!' })

    const nextUserMoveIndex = userMoveIndex + 1
    if (nextUserMoveIndex >= solutionMoves.length) {
      setIsSolved(true)
      setFeedback({ type: 'success', message: 'Puzzle solved! 🎉' })
    } else {
      // Auto-play opponent's response
      setTimeout(() => {
        const opponentMove = solutionMoves[nextUserMoveIndex]
        const opponentResult = game.current.move(opponentMove)
        if (opponentResult) {
          setFen(game.current.fen())
          setLastMove({ from: opponentResult.from, to: opponentResult.to })
          setUserMoveIndex(nextUserMoveIndex + 1)
          setShowHint(false)

          if (feedbackTimeoutRef.current) {
            clearTimeout(feedbackTimeoutRef.current)
          }

          setFeedback({ type: 'info', message: 'Correct! Now find the next best move.' })

          feedbackTimeoutRef.current = setTimeout(() => {
            setFeedback({ type: 'info', message: content.description || 'Find the best move.' })
            feedbackTimeoutRef.current = null
          }, 1500)
        }
      }, 300)
    }
    return true
  }

  const onPieceDrop = (sourceSquare: Square, targetSquare: Square): boolean => {
    const success = makeMove({ from: sourceSquare, to: targetSquare, promotion: 'q' })
    setMoveFrom('')
    setOptionSquares({})
    return success
  }

  const showLegalMoves = useCallback(
    (square: Square) => {
      const moves = game.current.moves({ square, verbose: true })
      if (moves.length === 0) return
      const newSquares: Record<string, React.CSSProperties> = {}
      moves.forEach((move) => {
        newSquares[move.to] = game.current.get(move.to as Square)
          ? BOARD_CUSTOM_SQUARE_STYLES.legalCapture
          : BOARD_CUSTOM_SQUARE_STYLES.legalMove
      })
      newSquares[square] = BOARD_CUSTOM_SQUARE_STYLES.selectedPiece
      setOptionSquares(newSquares)
    },
    []
  )

  const onSquareClick = (square: Square) => {
    if (isSolved) return
    if (!moveFrom) {
      const piece = game.current.get(square)
      if (piece && piece.color === game.current.turn()) {
        setMoveFrom(square)
        showLegalMoves(square)
      }
      return
    }
    makeMove({ from: moveFrom, to: square, promotion: 'q' })
    setMoveFrom('')
    setOptionSquares({})
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      {content.description && !isSolved && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-blue-900 dark:text-blue-100">{content.description}</p>
        </div>
      )}

      {/* Chess Board */}
      <div
        ref={boardWrapperRef}
        className="w-full max-w-2xl mx-auto aspect-square shadow-xl rounded-lg overflow-hidden"
      >
        {boardWidth ? (
          <Chessboard
            boardWidth={boardWidth}
            position={fen}
            onPieceDrop={onPieceDrop}
            onSquareClick={onSquareClick}
            customSquareStyles={customSquareStyles}
            arePiecesDraggable={!isSolved}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        )}
      </div>

      {/* Feedback */}
      <div className="text-center p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        {feedback && (
          <div className="flex items-center justify-center gap-2 mb-2">
            {feedback.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
            {feedback.type === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
            <p
              className={`font-medium ${
                feedback.type === 'success'
                  ? 'text-green-600 dark:text-green-400'
                  : feedback.type === 'error'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {feedback.message}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="flex justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <span className="font-semibold">Attempts:</span> {attempts}
          </div>
          <div>
            <span className="font-semibold">Move:</span> {userMoveIndex / 2 + 1}/
            {Math.ceil(solutionMoves.length / 2)}
          </div>
        </div>

        {/* Explanation (shown after solving) */}
        {isSolved && content.explanation && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
              Explanation
            </h4>
            <p className="text-green-800 dark:text-green-200 text-sm">{content.explanation}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={resetPuzzle}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          Reset Puzzle
        </Button>
        {!isSolved && (
          <Button variant="outline" onClick={getHint} disabled={showHint}>
            <Lightbulb className="w-4 h-4 mr-2" />
            Show Hint
          </Button>
        )}
      </div>
    </div>
  )
}
