'use client'

import { motion } from 'framer-motion'
import { useMotionProfile } from '@/components/microinteractions/MotionProfileProvider'
import BlockProgressDots from './BlockProgressDots'

interface KnightProgressPathProps {
  total: number
  current: number
  completed: Set<number>
  /** 'vertical' stacks nodes top-to-bottom for the right-rail layout; 'horizontal' (default) is the original strip. */
  orientation?: 'horizontal' | 'vertical'
}

// Only three states exist at the shell level today (completed / current / not
// yet reached) — there's no per-block failed/gave-up outcome tracked here, so
// there's no real "red" state to show. Nodes render emerald/amber/hollow only;
// wiring a failed state in later just means passing richer data as a new prop.
export default function KnightProgressPath({ total, current, completed, orientation = 'horizontal' }: KnightProgressPathProps) {
  const { spring, reduced } = useMotionProfile()

  // Long daily-puzzle sets would crowd/overflow a leaping-knight path, and the
  // leap itself is the whole point — under reduced motion or too many blocks,
  // the plain dots are the better fit rather than a knight that can't move.
  if (total > 12 || reduced) {
    return <BlockProgressDots total={total} current={current} completed={completed} orientation={orientation} />
  }

  const knightPercent = total > 1 ? (current / (total - 1)) * 100 : 0
  const isVertical = orientation === 'vertical'

  if (isVertical) {
    return (
      <div className="py-4 w-full flex justify-center flex-1 min-h-0">
        <div className="relative w-full h-full">
          {/* Dashed hairline path */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 border-l-2 border-dashed border-border" />

          {/* Filled trail behind the knight — grows downward */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[3px] bg-foreground transition-[height] duration-300"
            style={{ height: `${knightPercent}%` }}
          />

          {/* Nodes */}
          <div className="relative w-full h-full flex flex-col items-center justify-between">
            {Array.from({ length: total }, (_, i) => {
              const isCompleted = completed.has(i)
              const isCurrent = i === current
              return (
                <div
                  key={i}
                  title={`Block ${i + 1}`}
                  className={`w-4 h-4 rounded-full border-2 transition-colors ${
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-500'
                      : isCurrent
                      ? 'bg-amber-500 border-amber-500'
                      : 'bg-transparent border-border'
                  }`}
                />
              )
            })}
          </div>

          {/* Knight glyph leaping node-to-node, top-to-bottom — kept large and
              on its own: it's the motivator, so it should read at a glance
              even though the nodes/trail around it stay small. */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl leading-none select-none"
            animate={{ top: `${knightPercent}%` }}
            transition={{ type: 'spring', ...spring }}
          >
            ♞
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 h-8 flex items-center">
      <div className="relative w-full h-full">
        {/* Dashed hairline path */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t border-dashed border-border" />

        {/* Filled trail behind the knight — monochrome, no color coding */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-foreground transition-[width] duration-300"
          style={{ width: `${knightPercent}%` }}
        />

        {/* Nodes */}
        <div className="relative h-full flex items-center justify-between">
          {Array.from({ length: total }, (_, i) => {
            const isCompleted = completed.has(i)
            const isCurrent = i === current
            return (
              <div
                key={i}
                title={`Block ${i + 1}`}
                className={`w-2.5 h-2.5 rounded-full border transition-colors ${
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-500'
                    : isCurrent
                    ? 'bg-amber-500 border-amber-500'
                    : 'bg-transparent border-border'
                }`}
              />
            )
          })}
        </div>

        {/* Knight glyph leaping node-to-node */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-base leading-none select-none"
          animate={{ left: `${knightPercent}%` }}
          transition={{ type: 'spring', ...spring }}
        >
          ♞
        </motion.div>
      </div>
    </div>
  )
}
