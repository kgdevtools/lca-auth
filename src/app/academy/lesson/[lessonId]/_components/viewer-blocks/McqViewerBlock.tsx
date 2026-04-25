'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, XCircle, ChevronRight } from 'lucide-react'

interface McqViewerBlockProps {
  data: {
    question?: string
    options?: Array<{ id: string; text: string; isCorrect: boolean }>
    explanation?: string
  }
  onSolved: () => void
}

export default function McqViewerBlock({ data, onSolved }: McqViewerBlockProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)

  const question = data.question || ''
  const options = data.options || []
  const explanation = data.explanation || ''
  const correctOption = options.find((o) => o.isCorrect)
  const isCorrect = selectedId === correctOption?.id

  const handleSelect = (id: string) => {
    if (showResult) return
    setSelectedId(id)
  }

  const handleSubmit = () => {
    if (!selectedId) return
    setShowResult(true)
    if (isCorrect) {
      setTimeout(onSolved, 1500)
    }
  }

  const handleRetry = () => {
    setSelectedId(null)
    setShowResult(false)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="lg:w-3/5 space-y-4">
        <div>
          <h3 className="font-semibold text-lg">Multiple Choice</h3>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-lg font-medium">{question}</p>
        </div>

        <div className="space-y-2">
          {options.map((option) => {
            const isSelected = selectedId === option.id
            const isCorrectOption = option.isCorrect
            const showAsCorrect = showResult && isCorrectOption
            const showAsWrong = showResult && isSelected && !isCorrectOption

            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                disabled={showResult}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  showAsCorrect
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                    : showAsWrong
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                    : isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      showAsCorrect
                        ? 'border-green-500 bg-green-500'
                        : showAsWrong
                        ? 'border-red-500 bg-red-500'
                        : isSelected
                        ? 'border-blue-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {showAsCorrect && <CheckCircle2 className="w-3 h-3 text-white" />}
                    {showAsWrong && <XCircle className="w-3 h-3 text-white" />}
                  </div>
                  <span className="flex-1">{option.text}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="lg:w-2/5 space-y-4">
        {showResult && isCorrect && explanation && (
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2">Explanation</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{explanation}</p>
            </CardContent>
          </Card>
        )}

        {!showResult ? (
          <Button onClick={handleSubmit} disabled={!selectedId} className="w-full">
            Submit Answer
          </Button>
        ) : isCorrect ? (
          <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg text-center">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="font-medium text-green-700">Correct!</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg text-center">
              <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="font-medium text-red-700">Incorrect</p>
            </div>
            <Button variant="outline" onClick={handleRetry} className="w-full">
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}