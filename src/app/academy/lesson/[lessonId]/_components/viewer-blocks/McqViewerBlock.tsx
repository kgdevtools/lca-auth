'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { useMotionProfile } from '@/components/microinteractions/MotionProfileProvider'
import { successAnimation, errorAnimation, tapAnimation } from '@/components/microinteractions/presets'
import { cn } from '@/lib/utils'
import BlockMediaPreview, { type BlockMedia } from '@/components/BlockMediaPreview'

interface McqViewerBlockProps {
  data: {
    question?: string
    options?: Array<{ id: string; text: string; isCorrect: boolean }>
    explanation?: string
    media?: BlockMedia
  }
  onSolved: () => void
}

export default function McqViewerBlock({ data, onSolved }: McqViewerBlockProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)

  const { spring, reduced } = useMotionProfile()

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
    <div className="flex flex-col lg:flex-row gap-3 h-full overflow-hidden">
      {/* Question column */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="flex items-center justify-between px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border text-xs font-medium shrink-0">
          <span className="font-semibold">Multiple Choice</span>
        </div>

        <div className="px-3 py-3 bg-slate-100 dark:bg-slate-800 rounded text-sm font-medium shrink-0">
          {question}
        </div>

        <div className="flex flex-col gap-1.5">
          {options.map(option => {
            const isSelected = selectedId === option.id
            const isCorrectOption = option.isCorrect
            const showAsCorrect = showResult && isCorrectOption
            const showAsWrong = showResult && isSelected && !isCorrectOption

            return (
              <motion.button
                key={option.id}
                whileTap={tapAnimation(reduced)}
                animate={showAsWrong ? errorAnimation(reduced) : showAsCorrect ? successAnimation(spring, reduced) : undefined}
                onClick={() => handleSelect(option.id)}
                disabled={showResult}
                className={cn(
                  'flex items-center gap-2.5 w-full px-3 py-2 rounded-sm border text-left text-sm transition-colors',
                  showAsCorrect
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                    : showAsWrong
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : isSelected
                    ? 'border-foreground bg-accent'
                    : 'border-border hover:bg-accent',
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 shrink-0 rounded-full border flex items-center justify-center',
                    showAsCorrect
                      ? 'border-emerald-500 bg-emerald-500'
                      : showAsWrong
                      ? 'border-red-500 bg-red-500'
                      : isSelected
                      ? 'border-foreground'
                      : 'border-border',
                  )}
                >
                  {showAsCorrect && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                  {showAsWrong && <XCircle className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="flex-1">{option.text}</span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {data.media && (
          <div className="mb-1 shrink-0">
            <BlockMediaPreview media={data.media} />
          </div>
        )}

        {showResult && (
          isCorrect ? (
            <motion.div
              animate={successAnimation(spring, reduced)}
              className="flex items-center gap-2 px-2 py-1.5 rounded bg-green-100 dark:bg-green-900/30 shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
              <span className="text-xs text-green-700 dark:text-green-300 font-medium">Correct! Well done!</span>
            </motion.div>
          ) : (
            <motion.div
              animate={errorAnimation(reduced)}
              className="flex items-center gap-2 px-2 py-1.5 rounded bg-red-50 dark:bg-red-900/20 shrink-0"
            >
              <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="text-xs text-red-700 dark:text-red-300">Not quite — try again.</span>
            </motion.div>
          )
        )}

        {showResult && isCorrect && explanation && (
          <div className="flex items-start gap-1.5 px-2 py-1.5 bg-amber-50 dark:bg-amber-900/30 rounded text-xs text-amber-800 dark:text-amber-200 shrink-0">
            {explanation}
          </div>
        )}

        <div className="mt-auto flex shrink-0 bg-card border border-border rounded-sm shadow-sm overflow-hidden">
          {!showResult ? (
            <motion.button
              whileTap={tapAnimation(reduced)}
              onClick={handleSubmit}
              disabled={!selectedId}
              className={cn(
                'flex-1 h-10 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors',
                selectedId
                  ? 'bg-foreground text-background hover:opacity-90'
                  : 'text-muted-foreground disabled:opacity-30',
              )}
            >
              Submit Answer
            </motion.button>
          ) : !isCorrect ? (
            <motion.button
              whileTap={tapAnimation(reduced)}
              onClick={handleRetry}
              className="flex-1 h-10 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </motion.button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
