'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Trophy,
  Lightbulb,
  Lock,
} from 'lucide-react'

interface Puzzle {
  id: string
  fen: string
  solution: string
  explanation?: string
  difficulty?: 'easy' | 'medium' | 'hard'
}

interface PuzzleContentMultiProps {
  puzzles: Puzzle[]
  lessonId?: string
}

type PuzzleStatus = 'locked' | 'available' | 'in-progress' | 'completed' | 'failed'

export function PuzzleContentMulti({ puzzles, lessonId }: PuzzleContentMultiProps) {
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [game, setGame] = useState<Chess | null>(null)
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const [solutionIndex, setSolutionIndex] = useState(0)
  const [status, setStatus] = useState<'playing' | 'solved' | 'failed'>('playing')
  const [puzzleStatuses, setPuzzleStatuses] = useState<Map<number, PuzzleStatus>>(new Map([[0, 'available']]))
  const [showHint, setShowHint] = useState(false)
  const [attempts, setAttempts] = useState(0)

  const currentPuzzle = puzzles[currentPuzzleIndex]
  const solutionMoves = currentPuzzle?.solution.trim().split(/\s+/) || []
  const completedCount = Array.from(puzzleStatuses.values()).filter((s) => s === 'completed').length
  const progressPercentage = puzzles.length > 0 ? (completedCount / puzzles.length) * 100 : 0

  // Initialize game when puzzle changes
  useEffect(() => {
    if (currentPuzzle) {
      try {
        const chess = new Chess(currentPuzzle.fen)
        setGame(chess)
        setMoveHistory([])
        setSolutionIndex(0)
        setStatus('playing')
        setShowHint(false)
        setAttempts(0)
      } catch (error) {
        console.error('Invalid FEN:', error)
      }
    }
  }, [currentPuzzle])

  const resetPuzzle = useCallback(() => {
    if (currentPuzzle) {
      const chess = new Chess(currentPuzzle.fen)
      setGame(chess)
      setMoveHistory([])
      setSolutionIndex(0)
      setStatus('playing')
      setShowHint(false)
      setAttempts((prev) => prev + 1)
    }
  }, [currentPuzzle])

  const onDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      if (!game || status !== 'playing') return false

      try {
        const move = game.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q',
        })

        if (!move) return false

        const moveNotation = move.san
        const expectedMove = solutionMoves[solutionIndex]

        if (moveNotation === expectedMove) {
          // Correct move
          setMoveHistory([...moveHistory, moveNotation])
          setSolutionIndex(solutionIndex + 1)
          setGame(new Chess(game.fen()))

          // Check if puzzle is solved
          if (solutionIndex + 1 >= solutionMoves.length) {
            setStatus('solved')
            setPuzzleStatuses((prev) => {
              const updated = new Map(prev)
              updated.set(currentPuzzleIndex, 'completed')
              // Unlock next puzzle
              if (currentPuzzleIndex + 1 < puzzles.length) {
                updated.set(currentPuzzleIndex + 1, 'available')
              }
              return updated
            })

            // Auto-advance after 2 seconds
            setTimeout(() => {
              if (currentPuzzleIndex + 1 < puzzles.length) {
                goToNextPuzzle()
              }
            }, 2000)
          }

          return true
        } else {
          // Wrong move - undo it
          game.undo()
          setStatus('failed')
          setTimeout(() => {
            setStatus('playing')
          }, 1000)
          return false
        }
      } catch (error) {
        return false
      }
    },
    [game, status, solutionIndex, solutionMoves, moveHistory, currentPuzzleIndex, puzzles.length]
  )

  const goToNextPuzzle = () => {
    if (currentPuzzleIndex + 1 < puzzles.length) {
      setDirection('forward')
      setCurrentPuzzleIndex(currentPuzzleIndex + 1)
    }
  }

  const goToPreviousPuzzle = () => {
    if (currentPuzzleIndex > 0) {
      setDirection('backward')
      setCurrentPuzzleIndex(currentPuzzleIndex - 1)
    }
  }

  const goToPuzzle = (index: number) => {
    const puzzleStatus = puzzleStatuses.get(index)
    if (puzzleStatus === 'locked') return

    setDirection(index > currentPuzzleIndex ? 'forward' : 'backward')
    setCurrentPuzzleIndex(index)
  }

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const getStatusIcon = (puzzleStatus: PuzzleStatus) => {
    switch (puzzleStatus) {
      case 'completed':
        return <CheckCircle2 className="w-3 h-3 text-green-500" />
      case 'failed':
        return <XCircle className="w-3 h-3 text-red-500" />
      case 'locked':
        return <Lock className="w-3 h-3 text-gray-400" />
      default:
        return <div className="w-3 h-3 rounded-full border-2 border-gray-400" />
    }
  }

  // Animation variants
  const slideVariants = {
    enter: (direction: 'forward' | 'backward') => ({
      x: direction === 'forward' ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: 'forward' | 'backward') => ({
      x: direction === 'forward' ? -300 : 300,
      opacity: 0,
    }),
  }

  if (!currentPuzzle || !game) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">No puzzles available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Overall Progress
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {completedCount} / {puzzles.length}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Puzzle Navigation */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {puzzles.map((puzzle, index) => {
              const puzzleStatus = puzzleStatuses.get(index) || 'locked'
              const isActive = index === currentPuzzleIndex
              const isLocked = puzzleStatus === 'locked'

              return (
                <button
                  key={puzzle.id}
                  onClick={() => goToPuzzle(index)}
                  disabled={isLocked}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-md transition-all text-sm font-medium
                    ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : isLocked
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {getStatusIcon(puzzleStatus)}
                  <span>#{index + 1}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Puzzle Board */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentPuzzleIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
        >
          <Card className="max-w-lg mx-auto">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">
                    Puzzle {currentPuzzleIndex + 1} of {puzzles.length}
                  </CardTitle>
                  {currentPuzzle.difficulty && (
                    <Badge className={getDifficultyColor(currentPuzzle.difficulty)}>
                      {currentPuzzle.difficulty}
                    </Badge>
                  )}
                </div>
                {status === 'solved' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  >
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </motion.div>
                )}
              </div>
              <CardDescription className="text-xs">
                {status === 'playing' && `Make the winning moves! (${solutionIndex} / ${solutionMoves.length} moves)`}
                {status === 'solved' && 'Puzzle solved! Well done!'}
                {status === 'failed' && 'Wrong move! Try again.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Chessboard */}
              <div className="w-full max-w-[400px] mx-auto">
                <Chessboard
                  position={game.fen()}
                  onPieceDrop={onDrop}
                  boardWidth={400}
                  customBoardStyle={{
                    borderRadius: '8px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  }}
                  arePiecesDraggable={status === 'playing'}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between gap-2">
                <Button onClick={resetPuzzle} variant="outline" size="sm">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                {!showHint && status === 'playing' && (
                  <Button onClick={() => setShowHint(true)} variant="outline" size="sm">
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Hint
                  </Button>
                )}
              </div>

              {/* Hint */}
              {showHint && status === 'playing' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                >
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    <strong>Next move:</strong> {solutionMoves[solutionIndex]}
                  </p>
                </motion.div>
              )}

              {/* Explanation (after solving) */}
              {status === 'solved' && currentPuzzle.explanation && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                >
                  <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                    Explanation
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    {currentPuzzle.explanation}
                  </p>
                </motion.div>
              )}

              {/* Attempts Counter */}
              {attempts > 0 && (
                <p className="text-xs text-center text-gray-600 dark:text-gray-400">
                  Attempts: {attempts}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-center gap-2">
        <Button
          onClick={goToPreviousPuzzle}
          disabled={currentPuzzleIndex === 0}
          variant="outline"
          size="sm"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button
          onClick={goToNextPuzzle}
          disabled={currentPuzzleIndex === puzzles.length - 1 || puzzleStatuses.get(currentPuzzleIndex + 1) === 'locked'}
          variant="outline"
          size="sm"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Completion Celebration */}
      {completedCount === puzzles.length && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        >
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-300 dark:border-yellow-700">
            <CardContent className="py-6 text-center">
              <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                All Puzzles Completed!
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                You've mastered all {puzzles.length} puzzles in this lesson. Great work!
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
