'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, RefreshCw, Trophy, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateQuizScore } from '@/services/progressService'
import { toast } from 'sonner'

// Question types
export type QuestionType = 'multiple-choice' | 'true-false' | 'text-input'

export interface QuizQuestion {
  id: string
  question: string
  type: QuestionType
  options?: string[] // For multiple-choice and true-false
  correctAnswer: string
  explanation?: string
  caseSensitive?: boolean // For text-input
}

export interface QuizContentProps {
  lessonId?: string // Optional lesson ID for progress tracking
  questions: QuizQuestion[]
  passingScore?: number // Percentage (default 70)
  allowRetry?: boolean // Allow retaking the quiz (default true)
  showExplanations?: boolean // Show explanations after submission (default true)
}

interface QuizAnswer {
  questionId: string
  answer: string
  isCorrect: boolean
}

export function QuizContent({
  lessonId,
  questions,
  passingScore = 70,
  allowRetry = true,
  showExplanations = true,
}: QuizContentProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<QuizAnswer[]>([])
  const [score, setScore] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }))
  }

  const handleSubmit = async () => {
    // Calculate results
    const quizResults: QuizAnswer[] = questions.map(q => {
      const userAnswer = answers[q.id] || ''
      let isCorrect = false

      if (q.type === 'text-input' && !q.caseSensitive) {
        isCorrect = userAnswer.trim().toLowerCase() === q.correctAnswer.toLowerCase()
      } else {
        isCorrect = userAnswer.trim() === q.correctAnswer
      }

      return {
        questionId: q.id,
        answer: userAnswer,
        isCorrect,
      }
    })

    // Calculate score percentage
    const correctCount = quizResults.filter(r => r.isCorrect).length
    const scorePercentage = Math.round((correctCount / questions.length) * 100)

    setResults(quizResults)
    setScore(scorePercentage)
    setSubmitted(true)

    // Save quiz score to progress tracking if lessonId is provided
    if (lessonId) {
      setIsSaving(true)
      try {
        await updateQuizScore(lessonId, scorePercentage)

        if (scorePercentage >= passingScore) {
          toast.success('Quiz Passed! 🎉', {
            description: `Awesome! You scored ${scorePercentage}% and passed the quiz!`,
          })
        } else {
          toast.info('Quiz Complete', {
            description: `You scored ${scorePercentage}%. Keep practicing to improve!`,
          })
        }
      } catch (error) {
        console.error('Error saving quiz score:', error)
        // Don't show error toast - the quiz results are still displayed
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleRetry = () => {
    setAnswers({})
    setSubmitted(false)
    setResults([])
    setScore(0)
  }

  const isAnswered = (questionId: string) => {
    return !!answers[questionId]
  }

  const allQuestionsAnswered = questions.every(q => isAnswered(q.id))

  const getQuestionResult = (questionId: string) => {
    return results.find(r => r.questionId === questionId)
  }

  const passed = score >= passingScore

  return (
    <div className="space-y-6">
      {/* Quiz Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Quiz Challenge
          </CardTitle>
          <CardDescription>
            Answer all questions below. You need {passingScore}% to pass.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{questions.length} Questions</span>
            <span>•</span>
            <span>Passing Score: {passingScore}%</span>
            {submitted && (
              <>
                <span>•</span>
                <span className={cn(
                  'font-semibold',
                  passed ? 'text-green-600' : 'text-red-600'
                )}>
                  Your Score: {score}%
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Summary (after submission) */}
      {submitted && (
        <Card className={cn(
          'border-2',
          passed ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {passed ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <span className="text-green-600">Congratulations! You Passed!</span>
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 text-red-600" />
                  <span className="text-red-600">Keep Trying!</span>
                </>
              )}
            </CardTitle>
            <CardDescription>
              {passed
                ? `Great job! You scored ${score}% and passed the quiz.`
                : `You scored ${score}%. You need ${passingScore}% to pass. ${allowRetry ? 'Try again!' : ''}`
              }
            </CardDescription>
          </CardHeader>
          {allowRetry && (
            <CardFooter>
              <Button onClick={handleRetry} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry Quiz
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((question, index) => {
          const result = getQuestionResult(question.id)
          const showResult = submitted && result

          return (
            <Card key={question.id} className={cn(
              showResult && (result.isCorrect ? 'border-green-500' : 'border-red-500')
            )}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-base font-semibold flex items-start gap-2">
                      <span className="text-muted-foreground">Q{index + 1}.</span>
                      <span>{question.question}</span>
                    </CardTitle>
                    <Badge variant="outline" className="mt-2">
                      {question.type === 'multiple-choice' && 'Multiple Choice'}
                      {question.type === 'true-false' && 'True/False'}
                      {question.type === 'text-input' && 'Text Answer'}
                    </Badge>
                  </div>
                  {showResult && (
                    <div>
                      {result.isCorrect ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Multiple Choice or True/False */}
                {(question.type === 'multiple-choice' || question.type === 'true-false') && question.options && (
                  <RadioGroup
                    value={answers[question.id] || ''}
                    onValueChange={(value: string) => handleAnswerChange(question.id, value)}
                    disabled={submitted}
                  >
                    {question.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className={cn(
                          'flex items-center space-x-2 rounded-lg border p-4 transition-colors',
                          submitted && option === question.correctAnswer && 'border-green-500 bg-green-50',
                          submitted && result && !result.isCorrect && option === result.answer && 'border-red-500 bg-red-50'
                        )}
                      >
                        <RadioGroupItem value={option} id={`${question.id}-${optionIndex}`} />
                        <Label
                          htmlFor={`${question.id}-${optionIndex}`}
                          className="flex-1 cursor-pointer"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {/* Text Input */}
                {question.type === 'text-input' && (
                  <div className="space-y-2">
                    <Input
                      value={answers[question.id] || ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      disabled={submitted}
                      placeholder="Type your answer here..."
                      className={cn(
                        submitted && result && (result.isCorrect ? 'border-green-500' : 'border-red-500')
                      )}
                    />
                    {question.caseSensitive && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Case-sensitive answer
                      </p>
                    )}
                  </div>
                )}

                {/* Explanation (shown after submission if enabled) */}
                {submitted && showExplanations && question.explanation && (
                  <div className={cn(
                    'rounded-lg border p-4',
                    result?.isCorrect ? 'border-green-500 bg-green-50' : 'border-blue-500 bg-blue-50'
                  )}>
                    <p className="text-sm font-semibold mb-1">Explanation:</p>
                    <p className="text-sm text-muted-foreground">{question.explanation}</p>
                    {!result?.isCorrect && (
                      <p className="text-sm mt-2">
                        <span className="font-semibold">Correct answer: </span>
                        {question.correctAnswer}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Submit Button */}
      {!submitted && (
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handleSubmit}
              disabled={!allQuestionsAnswered}
              className="w-full"
              size="lg"
            >
              Submit Quiz
            </Button>
            {!allQuestionsAnswered && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                Please answer all questions before submitting
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
