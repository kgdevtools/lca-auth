'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { Plus, Trash2, ChevronDown, ChevronRight, AlertCircle, GripVertical } from 'lucide-react'

interface Puzzle {
  id: string
  fen: string
  solution: string
  explanation?: string
  difficulty?: 'easy' | 'medium' | 'hard'
}

interface PuzzleBuilderProps {
  value: Puzzle[]
  onChange: (puzzles: Puzzle[]) => void
}

export function PuzzleBuilder({ value, onChange }: PuzzleBuilderProps) {
  const [openPuzzles, setOpenPuzzles] = useState<Set<string>>(new Set([value[0]?.id]))
  const [settings, setSettings] = useState({
    allowHints: true,
    showExplanations: true,
    progressTracking: true,
  })

  const addPuzzle = () => {
    const newPuzzle: Puzzle = {
      id: `puzzle-${Date.now()}`,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      solution: '',
      explanation: '',
      difficulty: 'medium',
    }
    onChange([...value, newPuzzle])
    setOpenPuzzles(new Set([...openPuzzles, newPuzzle.id]))
  }

  const removePuzzle = (id: string) => {
    onChange(value.filter((p) => p.id !== id))
    const newOpen = new Set(openPuzzles)
    newOpen.delete(id)
    setOpenPuzzles(newOpen)
  }

  const updatePuzzle = (id: string, updates: Partial<Puzzle>) => {
    onChange(value.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }

  const togglePuzzle = (id: string) => {
    const newOpen = new Set(openPuzzles)
    if (newOpen.has(id)) {
      newOpen.delete(id)
    } else {
      newOpen.add(id)
    }
    setOpenPuzzles(newOpen)
  }

  const validateFEN = (fen: string): boolean => {
    try {
      new Chess(fen)
      return true
    } catch {
      return false
    }
  }

  const validateSolution = (fen: string, solution: string): boolean => {
    try {
      const chess = new Chess(fen)
      const moves = solution.trim().split(/\s+/)
      for (const move of moves) {
        const result = chess.move(move)
        if (!result) return false
      }
      return true
    } catch {
      return false
    }
  }

  return (
    <div className="space-y-4">
      {/* Settings Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Puzzle Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="allow-hints" className="text-sm">
              Allow Hints
            </Label>
            <Switch
              id="allow-hints"
              checked={settings.allowHints}
              onCheckedChange={(checked) => setSettings({ ...settings, allowHints: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="show-explanations" className="text-sm">
              Show Explanations After Solving
            </Label>
            <Switch
              id="show-explanations"
              checked={settings.showExplanations}
              onCheckedChange={(checked) => setSettings({ ...settings, showExplanations: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="progress-tracking" className="text-sm">
              Track Student Progress
            </Label>
            <Switch
              id="progress-tracking"
              checked={settings.progressTracking}
              onCheckedChange={(checked) => setSettings({ ...settings, progressTracking: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Puzzles List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Puzzles ({value.length})
          </h3>
          <Button onClick={addPuzzle} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Puzzle
          </Button>
        </div>

        {value.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No puzzles yet. Click &quot;Add Puzzle&quot; to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {value.map((puzzle, index) => {
              const isOpen = openPuzzles.has(puzzle.id)
              const isFENValid = validateFEN(puzzle.fen)
              const isSolutionValid = puzzle.solution ? validateSolution(puzzle.fen, puzzle.solution) : false

              return (
                <Card key={puzzle.id}>
                  <Collapsible open={isOpen} onOpenChange={() => togglePuzzle(puzzle.id)}>
                    <CollapsibleTrigger asChild>
                      <button className="w-full">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            {isOpen ? (
                              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                            )}
                            <div className="flex-1 text-left">
                              <CardTitle className="text-sm font-medium">
                                Puzzle {index + 1}
                              </CardTitle>
                              {!isOpen && (
                                <div className="flex items-center gap-2 mt-1">
                                  {/* Mini board thumbnail */}
                                  <div className="w-12 h-12 border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
                                    <Chessboard
                                      position={puzzle.fen}
                                      boardWidth={48}
                                      arePiecesDraggable={false}
                                      customBoardStyle={{
                                        borderRadius: '0px',
                                      }}
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    {!isFENValid && (
                                      <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                        <AlertCircle className="w-3 h-3" />
                                        Invalid FEN
                                      </div>
                                    )}
                                    {isFENValid && !isSolutionValid && (
                                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                        <AlertCircle className="w-3 h-3" />
                                        Invalid Solution
                                      </div>
                                    )}
                                    {isFENValid && isSolutionValid && (
                                      <div className="text-green-600 dark:text-green-400">Valid</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                removePuzzle(puzzle.id)
                              }}
                              className="flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </Button>
                          </div>
                        </CardHeader>
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="space-y-4 pt-0">
                        {/* FEN Position */}
                        <div className="space-y-2">
                          <Label htmlFor={`fen-${puzzle.id}`} className="text-sm">
                            FEN Position *
                            {!isFENValid && (
                              <span className="ml-2 text-xs text-red-600 dark:text-red-400">
                                Invalid FEN notation
                              </span>
                            )}
                          </Label>
                          <Textarea
                            id={`fen-${puzzle.id}`}
                            value={puzzle.fen}
                            onChange={(e) => updatePuzzle(puzzle.id, { fen: e.target.value })}
                            placeholder="Enter FEN position"
                            rows={2}
                            className={!isFENValid ? 'border-red-500' : ''}
                          />
                          {/* Preview Board */}
                          {isFENValid && (
                            <div className="max-w-xs mx-auto">
                              <Chessboard
                                position={puzzle.fen}
                                boardWidth={280}
                                arePiecesDraggable={false}
                              />
                            </div>
                          )}
                        </div>

                        {/* Solution */}
                        <div className="space-y-2">
                          <Label htmlFor={`solution-${puzzle.id}`} className="text-sm">
                            Solution (moves in SAN notation) *
                            {puzzle.solution && !isSolutionValid && (
                              <span className="ml-2 text-xs text-red-600 dark:text-red-400">
                                Invalid move sequence
                              </span>
                            )}
                          </Label>
                          <Input
                            id={`solution-${puzzle.id}`}
                            value={puzzle.solution}
                            onChange={(e) => updatePuzzle(puzzle.id, { solution: e.target.value })}
                            placeholder="e.g., Qxh7+ Kxh7 Rh1#"
                            className={puzzle.solution && !isSolutionValid ? 'border-red-500' : ''}
                          />
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Enter moves separated by spaces (e.g., e4 e5 Nf3)
                          </p>
                        </div>

                        {/* Explanation */}
                        <div className="space-y-2">
                          <Label htmlFor={`explanation-${puzzle.id}`} className="text-sm">
                            Explanation (optional)
                          </Label>
                          <Textarea
                            id={`explanation-${puzzle.id}`}
                            value={puzzle.explanation}
                            onChange={(e) => updatePuzzle(puzzle.id, { explanation: e.target.value })}
                            placeholder="Explain the puzzle solution and key concepts"
                            rows={3}
                          />
                        </div>

                        {/* Difficulty */}
                        <div className="space-y-2">
                          <Label htmlFor={`difficulty-${puzzle.id}`} className="text-sm">
                            Difficulty
                          </Label>
                          <select
                            id={`difficulty-${puzzle.id}`}
                            value={puzzle.difficulty}
                            onChange={(e) =>
                              updatePuzzle(puzzle.id, {
                                difficulty: e.target.value as 'easy' | 'medium' | 'hard',
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
