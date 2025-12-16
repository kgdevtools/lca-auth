'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, GripVertical, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QuizQuestion } from '@/components/academy/lessons/QuizContent'

interface QuizBuilderProps {
  value: {
    questions: QuizQuestion[]
    passingScore: number
    allowRetry: boolean
    showExplanations: boolean
  }
  onChange: (value: QuizBuilderProps['value']) => void
}

export function QuizBuilder({ value, onChange }: QuizBuilderProps) {
  const { questions = [], passingScore = 70, allowRetry = true, showExplanations = true } = value

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: `q${Date.now()}`,
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
    }

    onChange({
      ...value,
      questions: [...questions, newQuestion],
    })
  }

  const removeQuestion = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index)
    onChange({
      ...value,
      questions: updatedQuestions,
    })
  }

  const updateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
    const updatedQuestions = questions.map((q, i) => {
      if (i === index) {
        const updated = { ...q, ...updates }

        // When changing to true-false, set default options
        if (updates.type === 'true-false' && q.type !== 'true-false') {
          updated.options = ['True', 'False']
        }

        // When changing to text-input, remove options
        if (updates.type === 'text-input') {
          delete updated.options
        }

        // When changing to multiple-choice from text-input, add empty options
        if (updates.type === 'multiple-choice' && q.type === 'text-input') {
          updated.options = ['', '', '', '']
        }

        return updated
      }
      return q
    })

    onChange({
      ...value,
      questions: updatedQuestions,
    })
  }

  const updateOption = (questionIndex: number, optionIndex: number, optionValue: string) => {
    const question = questions[questionIndex]
    const updatedOptions = [...(question.options || [])]
    updatedOptions[optionIndex] = optionValue

    updateQuestion(questionIndex, { options: updatedOptions })
  }

  const addOption = (questionIndex: number) => {
    const question = questions[questionIndex]
    const updatedOptions = [...(question.options || []), '']
    updateQuestion(questionIndex, { options: updatedOptions })
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const question = questions[questionIndex]
    const updatedOptions = (question.options || []).filter((_, i) => i !== optionIndex)
    updateQuestion(questionIndex, { options: updatedOptions })
  }

  const updateSettings = (settings: Partial<QuizBuilderProps['value']>) => {
    onChange({
      ...value,
      ...settings,
    })
  }

  return (
    <div className="space-y-6">
      {/* Quiz Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Quiz Settings</CardTitle>
          <CardDescription>Configure how the quiz behaves</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="passingScore">Passing Score (%)</Label>
              <Input
                id="passingScore"
                type="number"
                min="0"
                max="100"
                value={passingScore}
                onChange={(e) => updateSettings({ passingScore: parseInt(e.target.value) || 70 })}
              />
              <p className="text-xs text-muted-foreground">
                Percentage required to pass the quiz
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allowRetry">Allow Retry</Label>
              <p className="text-xs text-muted-foreground">
                Let students retake the quiz
              </p>
            </div>
            <Switch
              id="allowRetry"
              checked={allowRetry}
              onCheckedChange={(checked: boolean) => updateSettings({ allowRetry: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="showExplanations">Show Explanations</Label>
              <p className="text-xs text-muted-foreground">
                Show explanations after submission
              </p>
            </div>
            <Switch
              id="showExplanations"
              checked={showExplanations}
              onCheckedChange={(checked: boolean) => updateSettings({ showExplanations: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Questions</CardTitle>
              <CardDescription>Build your quiz questions</CardDescription>
            </div>
            <Button onClick={addQuestion} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {questions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground mb-4">No questions yet</p>
              <Button onClick={addQuestion} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Question
              </Button>
            </div>
          ) : (
            questions.map((question, questionIndex) => (
              <Card key={question.id} className="border-2">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-1" />
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Q{questionIndex + 1}</Badge>
                          <Select
                            value={question.type}
                            onValueChange={(value: QuizQuestion['type']) =>
                              updateQuestion(questionIndex, { type: value })
                            }
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                              <SelectItem value="true-false">True/False</SelectItem>
                              <SelectItem value="text-input">Text Input</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Question Text */}
                        <div className="space-y-2">
                          <Label>Question *</Label>
                          <Textarea
                            value={question.question}
                            onChange={(e) => updateQuestion(questionIndex, { question: e.target.value })}
                            placeholder="What's the best opening move for White?"
                            rows={2}
                            className={cn(!question.question && 'border-amber-300 dark:border-amber-700')}
                          />
                          {!question.question && (
                            <p className="text-xs text-amber-600 dark:text-amber-500">Question text is required</p>
                          )}
                        </div>

                        {/* Multiple Choice or True/False Options */}
                        {(question.type === 'multiple-choice' || question.type === 'true-false') && (
                          <div className="space-y-3">
                            <Label>Options *</Label>
                            <div className="space-y-2">
                              {(question.options || []).map((option, optionIndex) => (
                                <div key={optionIndex} className="flex gap-2">
                                  <Input
                                    value={option}
                                    onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                                    placeholder={question.type === 'true-false' ? `${optionIndex === 0 ? 'True' : 'False'}` : `e.g., ${optionIndex === 0 ? '1. e4' : optionIndex === 1 ? '1. d4' : optionIndex === 2 ? '1. Nf3' : '1. c4'}`}
                                    disabled={question.type === 'true-false'}
                                    className={cn(!option.trim() && 'border-amber-300 dark:border-amber-700')}
                                  />
                                  {question.type === 'multiple-choice' && question.options && question.options.length > 2 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="w-9 h-9 p-0"
                                      onClick={() => removeOption(questionIndex, optionIndex)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                            {question.options?.some(o => !o.trim()) && (
                              <p className="text-xs text-amber-600 dark:text-amber-500">
                                All options must be filled in
                              </p>
                            )}
                            {question.type === 'multiple-choice' && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addOption(questionIndex)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Option
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Correct Answer */}
                        <div className="space-y-2">
                          <Label>Correct Answer *</Label>
                          {question.type === 'text-input' ? (
                            <div className="space-y-2">
                              <Input
                                value={question.correctAnswer}
                                onChange={(e) => updateQuestion(questionIndex, { correctAnswer: e.target.value })}
                                placeholder="e.g., 1. e4 or King's Pawn Opening"
                                className={cn(!question.correctAnswer && 'border-amber-300 dark:border-amber-700')}
                              />
                              {!question.correctAnswer && (
                                <p className="text-xs text-amber-600 dark:text-amber-500">Correct answer is required</p>
                              )}
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={question.caseSensitive || false}
                                  onCheckedChange={(checked: boolean) =>
                                    updateQuestion(questionIndex, { caseSensitive: checked })
                                  }
                                />
                                <Label className="text-xs text-muted-foreground">Case-sensitive</Label>
                              </div>
                            </div>
                          ) : (
                            <>
                              <Select
                                value={question.correctAnswer}
                                onValueChange={(value) => updateQuestion(questionIndex, { correctAnswer: value })}
                              >
                                <SelectTrigger className={cn(!question.correctAnswer && 'border-amber-300 dark:border-amber-700')}>
                                  <SelectValue placeholder="Choose the winning move!" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(question.options || [])
                                    .map((option, i) => ({ option, index: i }))
                                    .filter(({ option }) => option.trim() !== '')
                                    .map(({ option, index }) => (
                                      <SelectItem key={`${questionIndex}-opt-${index}`} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  {(question.options || []).every(opt => !opt.trim()) && (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                      Fill in options above first
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                              {!question.correctAnswer && (
                                <p className="text-xs text-amber-600 dark:text-amber-500">Select the correct answer from your options</p>
                              )}
                            </>
                          )}
                        </div>

                        {/* Explanation */}
                        <div className="space-y-2">
                          <Label>Explanation (Optional)</Label>
                          <Textarea
                            value={question.explanation || ''}
                            onChange={(e) => updateQuestion(questionIndex, { explanation: e.target.value })}
                            placeholder="Explain why this is the correct answer..."
                            rows={2}
                          />
                        </div>

                        {/* Validation Warning */}
                        {(!question.question || !question.correctAnswer ||
                          ((question.type === 'multiple-choice' || question.type === 'true-false') &&
                           (question.options?.some(o => !o)))) && (
                          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>Please fill in all required fields</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-9 h-9 p-0"
                      onClick={() => removeQuestion(questionIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {questions.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Questions:</span>
              <Badge>{questions.length}</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
