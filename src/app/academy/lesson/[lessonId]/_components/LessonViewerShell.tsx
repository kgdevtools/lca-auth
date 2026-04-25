'use client'

import { useReducer, useCallback, useEffect, useTransition, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getBlockDefinition, type BlockType } from '@/lib/blockRegistry'
import BlockProgressDots from './BlockProgressDots'
import LessonCompleteScreen from './LessonCompleteScreen'
import PuzzleViewerBlock from './viewer-blocks/PuzzleViewerBlock'
import StudyViewerBlock from './viewer-blocks/StudyViewerBlock'
import InteractiveStudyViewerBlock from './viewer-blocks/InteractiveStudyViewerBlock'
import {
  startLesson,
  markLessonComplete,
  updateTimeSpent,
} from '@/services/progressService'
import type { GamificationResult, StudentGamificationSummary } from '@/services/gamificationService'

interface LessonBlock {
  id: string
  type: string
  data: Record<string, unknown>
}

interface LessonViewerShellProps {
  lesson: {
    id: string
    title: string
    slug: string
    description: string | null
    difficulty: string | null
    blocks: LessonBlock[]
  }
  gamificationSummary: StudentGamificationSummary | null
}

type ViewerState = {
  currentIndex: number
  completedIds: Set<number>
  isComplete: boolean
}

type ViewerAction =
  | { type: 'SOLVE_BLOCK'; id: string }
  | { type: 'NEXT_BLOCK' }
  | { type: 'PREV_BLOCK' }
  | { type: 'LESSON_COMPLETE' }

function viewerReducer(state: ViewerState, action: ViewerAction): ViewerState {
  switch (action.type) {
    case 'SOLVE_BLOCK': {
      const newCompleted = new Set(state.completedIds)
      newCompleted.add(state.currentIndex)
      return { ...state, completedIds: newCompleted }
    }
    case 'NEXT_BLOCK':
      return {
        ...state,
        currentIndex: Math.min(state.currentIndex + 1, state.completedIds.size),
      }
    case 'PREV_BLOCK':
      return {
        ...state,
        currentIndex: Math.max(state.currentIndex - 1, 0),
      }
    case 'LESSON_COMPLETE':
      return { ...state, isComplete: true }
    default:
      return state
  }
}

const blockVariants = {
  enter:  { x: '100%', opacity: 0 },
  center: { x: 0,      opacity: 1 },
  exit:   { x: '-100%', opacity: 0 },
}

// ── Block renderer ────────────────────────────────────────────────────────────

function ViewerBlockRenderer({
  block,
  onSolved,
  onPrev,
  canPrev,
  lessonId,
  onBlockComplete,
  sessionPoints,
  puzzleStreak,
  studentLevel,
  studentLevelName,
  currentStreak,
}: {
  block: LessonBlock
  onSolved: () => void
  onPrev?: () => void
  canPrev?: boolean
  lessonId: string
  onBlockComplete: (pts: number, label: string) => void
  sessionPoints: number
  puzzleStreak: number
  studentLevel: number
  studentLevelName: string
  currentStreak: number
}) {
  const blockType = block.type as BlockType

  if (blockType === 'puzzle') {
    return (
      <PuzzleViewerBlock
        data={block.data as any}
        onSolved={onSolved}
        onPrev={onPrev}
        canPrev={canPrev}
        lessonId={lessonId}
        onBlockComplete={onBlockComplete}
        sessionPoints={sessionPoints}
        puzzleStreak={puzzleStreak}
        studentLevel={studentLevel}
        studentLevelName={studentLevelName}
        currentStreak={currentStreak}
      />
    )
  }

  if (blockType === 'study') {
    return <StudyViewerBlock data={block.data as any} onSolved={onSolved} lessonId={lessonId} onBlockComplete={onBlockComplete} />
  }

  if (blockType === 'interactive_study') {
    return <InteractiveStudyViewerBlock data={block.data as any} onSolved={onSolved} lessonId={lessonId} onBlockComplete={onBlockComplete} />
  }

  const definition = getBlockDefinition(blockType)

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="lg:w-3/5">
        <div className="aspect-square max-w-md mx-auto bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <span className="text-6xl">{definition?.icon}</span>
        </div>
      </div>
      <div className="lg:w-2/5 space-y-4">
        <div>
          <h3 className="font-semibold text-lg">{definition?.label}</h3>
          <p className="text-sm text-gray-500">{definition?.description}</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <pre className="text-xs overflow-auto whitespace-pre-wrap">
            {JSON.stringify(block.data, null, 2)}
          </pre>
        </div>
        <Button onClick={onSolved} className="w-full">
          Mark Complete
        </Button>
      </div>
    </div>
  )
}

// ── Main shell ────────────────────────────────────────────────────────────────

export default function LessonViewerShell({ lesson, gamificationSummary }: LessonViewerShellProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [gamification, setGamification] = useState<GamificationResult | null>(null)
  const [gamificationPending, setGamificationPending] = useState(false)
  const [sessionPoints, setSessionPoints] = useState(0)
  const [sessionBreakdown, setSessionBreakdown] = useState<Array<{ label: string; pts: number }>>([])
  const [puzzleStreak, setPuzzleStreak] = useState(0)
  const blockHadPts = useRef(false)

  const handleBlockComplete = useCallback((pts: number, label: string) => {
    setSessionPoints(prev => prev + pts)
    setSessionBreakdown(prev => [...prev, { label, pts }])
    if (pts > 0 && label.startsWith('Puzzle')) {
      blockHadPts.current = true
    }
  }, [])

  const [state, dispatch] = useReducer(viewerReducer, {
    currentIndex: 0,
    completedIds: new Set<number>(),
    isComplete: false,
  })

  // Track time: record when the current block was first shown
  const blockStartTimeRef = useRef<number>(Date.now())

  // ── Step 0: start lesson on mount ──────────────────────────────────────────
  // Fire-and-forget — we never block the UI on this
  useEffect(() => {
    startTransition(() => {
      startLesson(lesson.id).catch(() => {
        // Non-fatal: progress tracking failure should never break the lesson UX
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id])

  // ── Reset block timer whenever the active block changes ───────────────────
  useEffect(() => {
    blockStartTimeRef.current = Date.now()
  }, [state.currentIndex])

  // ── Flush time spent when the user leaves (tab close / navigate away) ──────
  useEffect(() => {
    const flushTime = () => {
      const seconds = Math.round((Date.now() - blockStartTimeRef.current) / 1000)
      if (seconds > 2) {
        // Best-effort — sendBeacon would be ideal here but we keep it simple
        updateTimeSpent(lesson.id, seconds).catch(() => {})
      }
    }
    window.addEventListener('beforeunload', flushTime)
    return () => {
      flushTime() // also flush on React unmount (client-side navigation)
      window.removeEventListener('beforeunload', flushTime)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id])

  // ── handleSolved: called when a block is completed ────────────────────────
  const handleSolved = useCallback(() => {
    const newCompleted = new Set(state.completedIds)
    newCompleted.add(state.currentIndex)
    const isLastBlock = state.currentIndex >= lesson.blocks.length - 1

    // Update puzzle streak for puzzle blocks
    if (lesson.blocks[state.currentIndex]?.type === 'puzzle') {
      if (blockHadPts.current) setPuzzleStreak(prev => prev + 1)
      else setPuzzleStreak(0)
      blockHadPts.current = false
    }

    // Flush time spent on this block before advancing
    const secondsOnBlock = Math.round((Date.now() - blockStartTimeRef.current) / 1000)
    if (secondsOnBlock > 2) {
      startTransition(() => {
        updateTimeSpent(lesson.id, secondsOnBlock).catch(() => {})
      })
    }

    if (isLastBlock) {
      // ── Lesson complete — dispatch immediately for instant feedback,
      // then resolve gamification data asynchronously.
      dispatch({ type: 'LESSON_COMPLETE' })
      setGamificationPending(true)
      markLessonComplete(lesson.id)
        .then(r => setGamification(r.gamification))
        .catch(() => {})
        .finally(() => setGamificationPending(false))
    } else {
      // ── Advance to next block ──
      dispatch({ type: 'SOLVE_BLOCK', id: lesson.blocks[state.currentIndex].id })
      dispatch({ type: 'NEXT_BLOCK' })
    }
  }, [state.currentIndex, state.completedIds, lesson.blocks, lesson.id])

  const handlePrev = () => {
    if (state.currentIndex > 0) {
      dispatch({ type: 'PREV_BLOCK' })
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (state.isComplete) {
    return (
      <LessonCompleteScreen
        lesson={lesson}
        gamification={gamification}
        gamificationPending={gamificationPending}
        sessionSummary={{ breakdown: sessionBreakdown, total: sessionPoints }}
      />
    )
  }

  const currentBlock = lesson.blocks[state.currentIndex]
  if (!currentBlock) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>No blocks in this lesson.</p>
        <Button onClick={() => router.push('/academy/lessons')}>Back to Lessons</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-3 py-3 max-w-7xl overflow-hidden">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
          {lesson.description && (
            <p className="text-gray-600 dark:text-gray-400">{lesson.description}</p>
          )}
        </div>
        {sessionPoints > 0 && (
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-sm text-sm font-black text-white shadow-lg select-none">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            +{sessionPoints} pts
          </div>
        )}
      </div>

      <div className="w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentIndex}
            variants={blockVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="h-full"
          >
            <ViewerBlockRenderer
              block={currentBlock}
              onSolved={handleSolved}
              onPrev={handlePrev}
              canPrev={state.currentIndex > 0}
              lessonId={lesson.id}
              onBlockComplete={handleBlockComplete}
              sessionPoints={sessionPoints}
              puzzleStreak={puzzleStreak}
              studentLevel={gamificationSummary?.level ?? 1}
              studentLevelName={gamificationSummary?.levelName ?? 'Pawn'}
              currentStreak={gamificationSummary?.currentStreak ?? 0}
            />
          </motion.div>
        </AnimatePresence>

        <div className="mt-3">
          <BlockProgressDots
            total={lesson.blocks.length}
            current={state.currentIndex}
            completed={state.completedIds}
          />
        </div>

        {currentBlock.type !== 'puzzle' && (
          <div className="flex justify-between mt-2">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={state.currentIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button onClick={handleSolved} className="gap-2">
              {state.currentIndex >= lesson.blocks.length - 1 ? 'Finish' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}