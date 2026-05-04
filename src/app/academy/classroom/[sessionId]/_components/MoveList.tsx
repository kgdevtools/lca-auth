'use client'

import { useMemo, useEffect, useRef } from 'react'
import { parsePgn } from '@/lib/pgnParser'
import { cn } from '@/lib/utils'

interface MoveListProps {
  pgn: string
  className?: string
}

export default function MoveList({ pgn, className }: MoveListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  const moves = useMemo(() => {
    if (!pgn.trim()) return []
    try {
      return parsePgn(pgn).moves
    } catch { return [] }
  }, [pgn])

  // Auto-scroll to latest move
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [moves.length])

  if (moves.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-6', className)}>
        <p className="text-xs text-muted-foreground">No moves yet</p>
      </div>
    )
  }

  // Build pairs: [[white, black], ...]
  const pairs: Array<{ num: number; white: string; black: string | null }> = []
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      num:   Math.floor(i / 2) + 1,
      white: moves[i].san,
      black: moves[i + 1]?.san ?? null,
    })
  }

  const lastMoveIndex = moves.length - 1

  return (
    <div className={cn('overflow-y-auto', className)}>
      <div className="px-3 py-2 flex flex-wrap gap-x-1 gap-y-0.5 content-start">
        {pairs.map(({ num, white, black }) => {
          const whiteIdx = (num - 1) * 2
          const blackIdx = whiteIdx + 1
          return (
            <span key={num} className="inline-flex items-baseline gap-0.5">
              <span className="text-[11px] text-muted-foreground/60 font-mono select-none w-5 text-right flex-shrink-0">
                {num}.
              </span>
              <span
                className={cn(
                  'text-sm px-1 py-0.5 rounded-[2px] font-medium leading-none',
                  whiteIdx === lastMoveIndex
                    ? 'bg-amber-500 text-black'
                    : 'text-foreground',
                )}
              >
                {white}
              </span>
              {black !== null && (
                <span
                  className={cn(
                    'text-sm px-1 py-0.5 rounded-[2px] font-medium leading-none',
                    blackIdx === lastMoveIndex
                      ? 'bg-amber-500 text-black'
                      : 'text-foreground',
                  )}
                >
                  {black}
                </span>
              )}
            </span>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
