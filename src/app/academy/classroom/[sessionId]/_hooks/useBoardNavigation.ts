'use client'

import { useState, useMemo, useEffect } from 'react'
import { Chess } from 'chess.js'

export interface BoardNavigation {
  /** The FEN to render — historical when scrubbing back, else the live FEN. */
  displayFen: string
  /** True when viewing the latest position (moves are only allowed here). */
  isAtEnd: boolean
  canBack: boolean
  canForward: boolean
  /** 0-based index of the move that produced the shown position; -1 at the start. */
  currentPly: number
  totalPlies: number
  goStart: () => void
  goPrev: () => void
  goNext: () => void
  goEnd: () => void
  /** Jump to the position *after* the given 0-based move index. */
  goToPly: (ply: number) => void
}

/**
 * Move-history navigation for the classroom board. Lifted out of ClassroomBoard
 * so the control bar + moves list (which live in the side panel) can drive it.
 * `liveFen`/`pgn` come from the realtime session; viewing history never mutates them.
 */
export function useBoardNavigation(pgn: string, liveFen: string): BoardNavigation {
  const [viewIndex, setViewIndex] = useState(-1) // -1 = live end; else index into fenHistory

  const fenHistory = useMemo<string[]>(() => {
    if (!pgn) return []
    try {
      const g = new Chess()
      g.loadPgn(pgn)
      const hist = g.history({ verbose: true }) as Array<{ san: string }>
      const temp = new Chess()
      const fens: string[] = [temp.fen()]
      for (const m of hist) {
        try { temp.move(m.san); fens.push(temp.fen()) } catch {}
      }
      return fens
    } catch { return [] }
  }, [pgn])

  // When a new move arrives (pgn changes), snap back to the live end.
  useEffect(() => { setViewIndex(-1) }, [pgn])

  const total        = fenHistory.length // positions incl. start; plies = total - 1
  const effectiveIdx = viewIndex === -1 ? total - 1 : Math.min(viewIndex, total - 1)
  const isAtEnd      = total === 0 || effectiveIdx >= total - 1
  const displayFen   = !isAtEnd && fenHistory[effectiveIdx] != null ? fenHistory[effectiveIdx] : liveFen

  const canBack    = total > 0 && effectiveIdx > 0
  const canForward = !isAtEnd

  const goStart = () => setViewIndex(0)
  const goPrev  = () => setViewIndex(Math.max(0, effectiveIdx - 1))
  const goNext  = () => {
    const next = effectiveIdx + 1
    if (next >= total - 1) setViewIndex(-1)
    else setViewIndex(next)
  }
  const goEnd   = () => setViewIndex(-1)
  const goToPly = (ply: number) => {
    const posIdx = ply + 1
    if (posIdx >= total - 1) setViewIndex(-1)
    else setViewIndex(Math.max(0, posIdx))
  }

  const currentPly = total > 0 ? effectiveIdx - 1 : -1
  const totalPlies = Math.max(0, total - 1)

  return { displayFen, isAtEnd, canBack, canForward, currentPly, totalPlies, goStart, goPrev, goNext, goEnd, goToPly }
}

/** Tracks the lg breakpoint (1024px) and the stage box, deriving a height-fit
 *  board size for desktop so the board column hugs the board (no side dead-space).
 *  Returns 0 on mobile — callers let the board self-measure its full-width slot. */
export function useStageMetrics(ref: React.RefObject<HTMLElement | null>) {
  const [isDesktop, setIsDesktop] = useState(false)
  const [box, setBox] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const apply = () => setIsDesktop(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setBox({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])

  // Desktop: fit the board to available height, reserve panel width + gap, cap at 560.
  const boardSize = isDesktop ? Math.max(220, Math.min(box.h - 8, box.w - 268, 560)) : 0
  return { isDesktop, boardSize }
}
