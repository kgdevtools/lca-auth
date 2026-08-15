'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FlipHorizontal, CheckCircle2, XCircle, Send } from 'lucide-react'
import { useMotionProfile } from '@/components/microinteractions/MotionProfileProvider'
import { successAnimation, errorAnimation, tapAnimation } from '@/components/microinteractions/presets'
import { fuzzyMatch } from '@/lib/fuzzyMatch'
import { cn } from '@/lib/utils'
import BlockMediaPreview, { type BlockMedia } from '@/components/BlockMediaPreview'

interface QaViewerBlockProps {
  data: {
    question?: string
    answer?: string
    media?: BlockMedia
  }
  onSolved: () => void
}

export default function QaViewerBlock({ data, onSolved }: QaViewerBlockProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [userAnswer, setUserAnswer] = useState('')
  const [matchResult, setMatchResult] = useState<boolean | null>(null)
  const { spring, reduced } = useMotionProfile()

  const question = data.question || ''
  const answer = data.answer || ''

  const handleFlip = () => setIsFlipped(f => !f)

  // Case/whitespace/punctuation-insensitive, tolerant of small typos — see
  // fuzzyMatch. Submitting always reveals the answer so the student can
  // compare, whether or not the fuzzy check considered it a match.
  const handleSubmit = () => {
    if (!userAnswer.trim()) return
    setMatchResult(fuzzyMatch(userAnswer, answer))
    setIsFlipped(true)
  }

  const handleGotIt = () => {
    setAcknowledged(true)
    setTimeout(onSolved, 500)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-3 h-full overflow-hidden">
      {/* Card column */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="flex items-center justify-between px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border text-xs font-medium shrink-0">
          <span className="font-semibold">Q&amp;A Flashcard</span>
        </div>

        <div
          className={cn(
            'flex-1 min-h-[240px] flex flex-col gap-3 px-6 py-6 rounded border transition-colors overflow-y-auto',
            isFlipped
              ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-900'
              : 'bg-slate-100 dark:bg-slate-800 border-border',
          )}
        >
          <div className="text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {isFlipped ? 'Answer' : 'Question'}
            </span>
            <p className="text-lg font-medium mt-1">{isFlipped ? answer : question}</p>
          </div>

          {!isFlipped && (
            <div className="mt-auto">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Your answer
              </label>
              <textarea
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                placeholder="Type what you think the answer is…"
                rows={2}
                className="mt-1 w-full px-2.5 py-2 text-sm rounded-sm border border-border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}

          {isFlipped && userAnswer && (
            <div className="mt-auto px-3 py-2 rounded-sm bg-background/60 border border-border">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Your answer</p>
              <p className="text-sm">{userAnswer}</p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 bg-card border border-border rounded-sm shadow-sm overflow-hidden">
          {!isFlipped && (
            <motion.button
              whileTap={tapAnimation(reduced)}
              onClick={handleSubmit}
              disabled={!userAnswer.trim()}
              className={cn(
                'flex-1 h-10 flex items-center justify-center gap-1.5 text-sm font-medium transition-colors',
                userAnswer.trim() ? 'bg-foreground text-background hover:opacity-90' : 'text-muted-foreground opacity-40 cursor-not-allowed',
              )}
            >
              <Send className="w-4 h-4" /> Submit
            </motion.button>
          )}
          <motion.button
            whileTap={tapAnimation(reduced)}
            onClick={handleFlip}
            className="flex-1 h-10 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <FlipHorizontal className="w-4 h-4" />
            {isFlipped ? 'Show Question' : 'Show Answer'}
          </motion.button>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {data.media && (
          <div className="mb-1 shrink-0">
            <BlockMediaPreview media={data.media} />
          </div>
        )}

        {matchResult !== null && !acknowledged && (
          matchResult ? (
            <motion.div
              animate={successAnimation(spring, reduced)}
              className="flex items-center gap-2 px-2 py-1.5 rounded bg-green-100 dark:bg-green-900/30 shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
              <span className="text-xs text-green-700 dark:text-green-300 font-medium">Nice, that matches!</span>
            </motion.div>
          ) : (
            <motion.div
              animate={errorAnimation(reduced)}
              className="flex items-center gap-2 px-2 py-1.5 rounded bg-red-50 dark:bg-red-900/20 shrink-0"
            >
              <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="text-xs text-red-700 dark:text-red-300">Not quite — compare with the answer shown.</span>
            </motion.div>
          )
        )}

        {acknowledged && (
          <motion.div
            animate={successAnimation(spring, reduced)}
            className="flex items-center gap-2 px-2 py-1.5 rounded bg-green-100 dark:bg-green-900/30 shrink-0"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
            <span className="text-xs text-green-700 dark:text-green-300 font-medium">Card completed!</span>
          </motion.div>
        )}

        {isFlipped && !acknowledged && (
          <div className="mt-auto flex shrink-0 bg-card border border-border rounded-sm shadow-sm overflow-hidden">
            <motion.button
              whileTap={tapAnimation(reduced)}
              onClick={handleGotIt}
              className="flex-1 h-10 flex items-center justify-center gap-1.5 text-sm font-medium bg-foreground text-background hover:opacity-90 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Got it!
            </motion.button>
          </div>
        )}
      </div>
    </div>
  )
}
