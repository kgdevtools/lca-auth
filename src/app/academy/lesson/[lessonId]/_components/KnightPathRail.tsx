'use client'

import { useState } from 'react'
import { Menu, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import KnightProgressPath from './KnightProgressPath'

interface KnightPathRailProps {
  total: number
  current: number
  completed: Set<number>
}

// Lesson-progress indicator, shared by every block type (puzzle, MCQ, Q&A,
// study, interactive, Puzzle Storm) since LessonViewerShell is the one place
// they all render through.
//
// Below `sm` (~640px, portrait phones) a permanently-visible vertical rail
// would eat too much of an already-narrow board, so it's a hamburger-style
// trigger there instead — same pattern as the app's own sidebars — opening
// the vertical rail as a right-side drawer. From `sm` up it's a sticky
// full-height rail, independent of the board/data column's own height, with
// its own collapse toggle (mirrors the sidebar's Menu/ChevronLeft convention,
// mirrored left↔right since this rail sits on the right edge).
export default function KnightPathRail({ total, current, completed }: KnightPathRailProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile trigger — a knight glyph, not Menu/hamburger: the sidebar
          already owns that icon, and reusing it here reads as "open the
          sidebar" instead of "show lesson progress". */}
      <button
        onClick={() => setMobileOpen(true)}
        className="sm:hidden fixed top-20 right-4 z-40 h-9 w-9 flex items-center justify-center rounded-sm bg-background shadow-lg border border-border"
        aria-label="Show lesson progress"
      >
        <span className="text-lg leading-none text-muted-foreground select-none" aria-hidden="true">♞</span>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer — slides in from the right */}
      <div
        className={cn(
          'sm:hidden fixed top-20 bottom-0 right-0 z-50 flex flex-col w-24',
          'bg-background border-l border-border shadow-xl',
          'transform transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="shrink-0 flex items-center justify-center h-9 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Hide lesson progress"
        >
          <X className="w-4 h-4" />
        </button>
        <p className="shrink-0 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 py-2 tabular-nums">
          {current + 1}/{total}
        </p>
        <KnightProgressPath total={total} current={current} completed={completed} orientation="vertical" />
      </div>

      {/* sm+ : vertical sticky rail, no bg/border chrome — a plain floating column */}
      <div
        className={cn(
          'hidden sm:flex flex-col shrink-0 sticky top-20 self-start',
          'h-[calc(100dvh-6rem)]',
          'transition-[width] duration-200',
          collapsed ? 'w-9' : 'w-16',
        )}
      >
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="shrink-0 flex items-center justify-center h-8 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={collapsed ? 'Expand progress' : 'Collapse progress'}
          aria-label={collapsed ? 'Expand progress' : 'Collapse progress'}
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <p className="shrink-0 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 py-1.5 tabular-nums">
          {current + 1}/{total}
        </p>

        {!collapsed && (
          <KnightProgressPath total={total} current={current} completed={completed} orientation="vertical" />
        )}
      </div>
    </>
  )
}
