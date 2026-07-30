'use client'

import { useReducer, useCallback, useEffect, useTransition, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { Zap, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getBlockDefinition, type BlockType } from '@/lib/blockRegistry'
import { useMotionProfile } from '@/components/microinteractions/MotionProfileProvider'
import { successAnimation } from '@/components/microinteractions/presets'
import { MotionButton } from '@/components/microinteractions/MotionButton'
import KnightPathRail from './KnightPathRail'
import LessonCompleteScreen from './LessonCompleteScreen'
import PuzzleViewerBlock from './viewer-blocks/PuzzleViewerBlock'
import McqViewerBlock from './viewer-blocks/McqViewerBlock'
import QaViewerBlock from './viewer-blocks/QaViewerBlock'
import StudyViewerBlock from './viewer-blocks/StudyViewerBlock'
import InteractiveStudyViewerBlock from './viewer-blocks/InteractiveStudyViewerBlock'
import PuzzleStormViewerBlock from './viewer-blocks/PuzzleStormViewerBlock'
import { useBlockCountdown, BlockTimerChip } from '@/components/lessons/BlockTimer'
import {
  startLesson,
  markLessonComplete,
  updateTimeSpent,
} from '@/services/progressService'
import { lessonStorageKey, readWithTtl, clearLessonStorage } from './lessonProgressStorage'
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
  academyRating: number | null
  ratedCount: number
}

type ViewerState = {
  currentIndex: number
  completedIds: Set<number>
  isComplete: boolean
  direction: 1 | -1
}

interface SavedShellProgress {
  savedAt: number
  currentIndex: number
  completedIds: number[]
  sessionPoints?: number
  sessionBreakdown?: Array<{ label: string; pts: number }>
  puzzleStreak?: number
}

type ViewerAction =
  | { type: 'SOLVE_BLOCK'; id: string }
  | { type: 'NEXT_BLOCK' }
  | { type: 'PREV_BLOCK' }
  | { type: 'LESSON_COMPLETE' }
  | { type: 'RESTORE'; currentIndex: number; completedIds: Set<number> }

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
        direction: 1,
      }
    case 'PREV_BLOCK':
      return {
        ...state,
        currentIndex: Math.max(state.currentIndex - 1, 0),
        direction: -1,
      }
    case 'LESSON_COMPLETE':
      return { ...state, isComplete: true }
    case 'RESTORE':
      return { ...state, currentIndex: action.currentIndex, completedIds: action.completedIds }
    default:
      return state
  }
}

// Fixed-px offset, not a % of the element's own width — a stuck/slow transition
// then just leaves a barely-visible sliver instead of translating whole screens'
// worth of content off-view. rotateY needs `perspective` set on an ancestor to
// read as a 3D card turn rather than a flat squish.
const blockVariants = {
  enter: (direction: 1 | -1) => ({
    x: direction > 0 ? 40 : -40,
    rotateY: direction > 0 ? 15 : -15,
    opacity: 0,
  }),
  center: { x: 0, rotateY: 0, opacity: 1 },
  exit: (direction: 1 | -1) => ({
    x: direction > 0 ? -40 : 40,
    rotateY: direction > 0 ? -15 : 15,
    opacity: 0,
  }),
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
  academyRating,
  ratedCount,
  onRatingPreview,
  onRatingCommit,
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
  academyRating: number | null
  ratedCount: number
  onRatingPreview: (rating: number) => void
  onRatingCommit: (rating: number) => void
}) {
  const blockType = block.type as BlockType

  // Per-block gameplay timer — opt-in, disclosed via a corner chip on the block
  // itself. Expiry auto-advances with a not-solved outcome (same as an
  // explicit skip/give-up), never a hard lockout. See BlockTimer.tsx.
  const timerConfig = (block.data as Record<string, unknown> | undefined)?.timer as
    | { enabled?: boolean; seconds?: number }
    | undefined
  const timerEnabled = !!timerConfig?.enabled && (timerConfig.seconds ?? 0) > 0
  const secondsLeft = useBlockCountdown(timerConfig?.seconds ?? 0, timerEnabled, onSolved)

  let content: React.ReactNode

  if (blockType === 'puzzle') {
    content = (
      <PuzzleViewerBlock
        data={block.data as any}
        onSolved={onSolved}
        onPrev={onPrev}
        canPrev={canPrev}
        lessonId={lessonId}
        blockKey={block.id}
        onBlockComplete={onBlockComplete}
        sessionPoints={sessionPoints}
        puzzleStreak={puzzleStreak}
        studentLevel={studentLevel}
        studentLevelName={studentLevelName}
        currentStreak={currentStreak}
        academyRating={academyRating}
        ratedCount={ratedCount}
        onRatingPreview={onRatingPreview}
        onRatingCommit={onRatingCommit}
      />
    )
  } else if (blockType === 'mcq') {
    content = <McqViewerBlock data={block.data as any} onSolved={onSolved} />
  } else if (blockType === 'qa') {
    content = <QaViewerBlock data={block.data as any} onSolved={onSolved} />
  } else if (blockType === 'study') {
    content = <StudyViewerBlock data={block.data as any} onSolved={onSolved} lessonId={lessonId} onBlockComplete={onBlockComplete} />
  } else if (blockType === 'interactive_study') {
    content = <InteractiveStudyViewerBlock data={block.data as any} onSolved={onSolved} lessonId={lessonId} blockKey={block.id} onBlockComplete={onBlockComplete} />
  } else if (blockType === 'puzzle_storm') {
    content = <PuzzleStormViewerBlock data={block.data as any} lessonId={lessonId} onSolved={onSolved} />
  } else {
    const definition = getBlockDefinition(blockType)
    content = (
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

  return (
    <div className="relative h-full">
      {timerEnabled && (
        <BlockTimerChip secondsLeft={secondsLeft} className="absolute -top-1 right-0 z-10" />
      )}
      {content}
    </div>
  )
}

// ── Main shell ────────────────────────────────────────────────────────────────

export default function LessonViewerShell({ lesson, gamificationSummary, academyRating: initialAcademyRating, ratedCount: initialRatedCount }: LessonViewerShellProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [gamification, setGamification] = useState<GamificationResult | null>(null)
  const [gamificationPending, setGamificationPending] = useState(false)
  const [sessionPoints, setSessionPoints] = useState(0)
  const [sessionBreakdown, setSessionBreakdown] = useState<Array<{ label: string; pts: number }>>([])
  const [puzzleStreak, setPuzzleStreak] = useState(0)
  const [academyRating, setAcademyRating] = useState(initialAcademyRating)
  const [ratedCount, setRatedCount] = useState(initialRatedCount)
  const [hasQuit, setHasQuit] = useState(false)
  const blockHadPts = useRef(false)

  // Called twice per solved puzzle: once optimistically (client-computed preview,
  // before the server round-trip resolves) and once to reconcile with the real
  // persisted value. Only the reconciled call advances ratedCount (k-factor input).
  const handleRatingPreview = useCallback((rating: number) => {
    setAcademyRating(rating)
  }, [])
  const handleRatingCommit = useCallback((rating: number) => {
    setAcademyRating(rating)
    setRatedCount(prev => prev + 1)
  }, [])

  const { spring, reduced } = useMotionProfile()
  const pointsChipControls = useAnimationControls()
  const prevSessionPointsRef = useRef(0)

  // Pulse the points chip whenever it climbs (block solved / puzzle scored)
  useEffect(() => {
    if (sessionPoints > prevSessionPointsRef.current) {
      pointsChipControls.start(successAnimation(spring, reduced))
    }
    prevSessionPointsRef.current = sessionPoints
  }, [sessionPoints, pointsChipControls, spring, reduced])

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
    direction: 1,
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

  // ── Restore position from localStorage after hydration (1-hour TTL) ───────
  useEffect(() => {
    try {
      const parsed = readWithTtl<SavedShellProgress>(lessonStorageKey(lesson.id))
      if (!parsed) {
        // Stale shell state also invalidates any per-block saved state.
        clearLessonStorage(lesson.id)
        return
      }
      if (
        typeof parsed.currentIndex === 'number' &&
        parsed.currentIndex >= 0 &&
        parsed.currentIndex < lesson.blocks.length &&
        Array.isArray(parsed.completedIds)
      ) {
        dispatch({ type: 'RESTORE', currentIndex: parsed.currentIndex, completedIds: new Set<number>(parsed.completedIds) })
      }
      if (typeof parsed.sessionPoints === 'number' && parsed.sessionPoints > 0) {
        setSessionPoints(parsed.sessionPoints)
      }
      if (Array.isArray(parsed.sessionBreakdown)) {
        setSessionBreakdown(parsed.sessionBreakdown)
      }
      if (typeof parsed.puzzleStreak === 'number') {
        setPuzzleStreak(parsed.puzzleStreak)
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id])

  // ── Persist position to localStorage on every navigation/solve ────────────
  useEffect(() => {
    if (state.isComplete) return
    try {
      localStorage.setItem(lessonStorageKey(lesson.id), JSON.stringify({
        savedAt: Date.now(),
        currentIndex: state.currentIndex,
        completedIds: Array.from(state.completedIds),
        sessionPoints,
        sessionBreakdown,
        puzzleStreak,
      }))
    } catch {}
  }, [state.currentIndex, state.completedIds, state.isComplete, lesson.id, sessionPoints, sessionBreakdown, puzzleStreak])

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
      clearLessonStorage(lesson.id)
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

  // ── Quit: bail out to a session summary without marking the lesson complete ──
  const handleQuit = useCallback(() => {
    if (!window.confirm('Quit this lesson? Your progress is saved and you can resume later.')) return
    const secondsOnBlock = Math.round((Date.now() - blockStartTimeRef.current) / 1000)
    if (secondsOnBlock > 2) {
      startTransition(() => {
        updateTimeSpent(lesson.id, secondsOnBlock).catch(() => {})
      })
    }
    setHasQuit(true)
  }, [lesson.id])

  // ── Render ────────────────────────────────────────────────────────────────

  if (state.isComplete || hasQuit) {
    return (
      <LessonCompleteScreen
        lesson={lesson}
        gamification={hasQuit ? null : gamification}
        gamificationPending={hasQuit ? false : gamificationPending}
        sessionSummary={{ breakdown: sessionBreakdown, total: sessionPoints }}
        variant={hasQuit ? 'quit' : 'completed'}
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

  const currentBlockDef = getBlockDefinition(currentBlock.type as BlockType)

  return (
    <div className="container mx-auto px-3 py-3 max-w-7xl overflow-hidden">
      <div className="flex gap-3 items-start">
        {/* Main column — header and content share this exact width so the
            heading lines up over the board and Quit/Rating lines up over the
            moves/data column, instead of the header spanning the full page
            width while the content narrows to lg:max-w-4xl underneath it. */}
        <div className="flex-1 min-w-0">
          <div className="lg:max-w-4xl lg:mx-auto mb-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate">{lesson.title}</h1>
              {lesson.description && (
                <p className="text-gray-600 dark:text-gray-400 truncate">{lesson.description}</p>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-1.5 select-none">
              {currentBlockDef?.icon && (
                <span className="text-lg leading-none select-none" title={currentBlockDef.label}>
                  {currentBlockDef.icon}
                </span>
              )}
              <MotionButton
                variant="ghost"
                size="sm"
                onClick={handleQuit}
                className="h-8 text-muted-foreground hover:text-foreground"
                title="Quit lesson"
              >
                <LogOut className="w-3.5 h-3.5" />
              </MotionButton>
              {academyRating !== null && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background border border-transparent rounded-sm text-sm font-black shadow-lg" title="Academy rating">
                  <span className="text-amber-400 text-xs leading-none">★</span>
                  {academyRating}
                </div>
              )}
              {sessionPoints > 0 && (
                <motion.div
                  animate={pointsChipControls}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background border border-transparent rounded-sm text-sm font-black shadow-lg"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  +{sessionPoints} pts
                </motion.div>
              )}
            </div>
          </div>

          <div className="w-full">
            {/* perspective lives on this non-transformed ancestor — CSS perspective has
                no effect on the element that also carries the rotateY transform itself. */}
            <div className="lg:max-w-4xl lg:mx-auto" style={{ perspective: 1200 }}>
              <AnimatePresence mode="wait" custom={state.direction}>
                <motion.div
                  key={state.currentIndex}
                  custom={state.direction}
                  variants={blockVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.5, type: 'spring', ...spring }}
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
                    academyRating={academyRating}
                    ratedCount={ratedCount}
                    onRatingPreview={handleRatingPreview}
                    onRatingCommit={handleRatingCommit}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Progress rail — separate, full-height, collapsible; see KnightPathRail. */}
        <KnightPathRail
          total={lesson.blocks.length}
          current={state.currentIndex}
          completed={state.completedIds}
        />
      </div>
    </div>
  )
}