'use client'

import { motion } from 'framer-motion'
import { useMotionProfile } from '@/components/microinteractions/MotionProfileProvider'
import BlockProgressDots from './BlockProgressDots'

interface KnightProgressPathProps {
  total: number
  current: number
  completed: Set<number>
}

// Only three states exist at the shell level today (completed / current / not
// yet reached) — there's no per-block failed/gave-up outcome tracked here, so
// there's no real "red" state to show. Nodes render emerald/amber/hollow only;
// wiring a failed state in later just means passing richer data as a new prop.
export default function KnightProgressPath({ total, current, completed }: KnightProgressPathProps) {
  const { spring, reduced } = useMotionProfile()

  // Long daily-puzzle sets would crowd/overflow a leaping-knight path, and the
  // leap itself is the whole point — under reduced motion or too many blocks,
  // the plain dots are the better fit rather than a knight that can't move.
  if (total > 12 || reduced) {
    return <BlockProgressDots total={total} current={current} completed={completed} />
  }

  const knightPercent = total > 1 ? (current / (total - 1)) * 100 : 0

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
