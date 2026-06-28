'use client'

import { useState } from 'react'
import { Chess } from 'chess.js'
import { MoreVertical, X, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface BoardControlBarProps {
  canBack: boolean
  canForward: boolean
  onStart: () => void
  onPrev: () => void
  onNext: () => void
  onEnd: () => void
  hasAnnotations: boolean
  onClearAnnotations: () => void
  onFlip: () => void
  // Coach-only position controls
  onReset?: () => void
  onSetFen?: (fen: string) => void
  onLoadPgn?: (fen: string, pgn: string) => void
  controlsDisabled?: boolean
}

type InputMode = 'none' | 'fen' | 'pgn'

export default function BoardControlBar({
  canBack, canForward, onStart, onPrev, onNext, onEnd,
  hasAnnotations, onClearAnnotations, onFlip,
  onReset, onSetFen, onLoadPgn, controlsDisabled = false,
}: BoardControlBarProps) {
  const [inputMode,  setInputMode]  = useState<InputMode>('none')
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  const hasCoachControls = !!(onReset || onSetFen || onLoadPgn)

  const closeInput = () => { setInputMode('none'); setInputValue(''); setInputError(null) }
  const openInput = (mode: 'fen' | 'pgn') => {
    setInputMode(prev => (prev === mode ? 'none' : mode))
    setInputValue('')
    setInputError(null)
  }

  const handleApplyInput = () => {
    setInputError(null)
    if (inputMode === 'fen') {
      try {
        new Chess(inputValue.trim())
        onSetFen?.(inputValue.trim())
        closeInput()
      } catch { setInputError('Invalid FEN string') }
    } else if (inputMode === 'pgn') {
      try {
        const g = new Chess(); g.loadPgn(inputValue.trim())
        onLoadPgn?.(g.fen(), g.pgn())
        closeInput()
      } catch { setInputError('Invalid PGN') }
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {inputMode !== 'none' && (
        <div className="flex flex-col gap-1.5">
          {inputMode === 'fen' ? (
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleApplyInput(); if (e.key === 'Escape') closeInput() }}
              placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
              autoFocus
              className="w-full text-xs px-2 py-1.5 rounded-sm border border-border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          ) : (
            <textarea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') closeInput() }}
              placeholder="1. e4 e5 2. Nf3 Nc6 ..."
              rows={3}
              autoFocus
              className="w-full text-xs px-2 py-1.5 rounded-sm border border-border bg-background font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}
          {inputError && <p className="text-[10px] text-destructive">{inputError}</p>}
          <div className="flex gap-1.5">
            <button
              onClick={handleApplyInput}
              className="text-xs px-3 py-1 rounded-sm bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
            >
              Apply
            </button>
            <button
              onClick={closeInput}
              className="text-xs px-3 py-1 rounded-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 p-1.5 bg-card border border-border rounded-sm shadow-sm">
        <Button variant="outline" size="sm" onClick={onStart} disabled={!canBack} className="flex-1 h-9 rounded-sm">
          <ChevronsLeft className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onPrev} disabled={!canBack} className="flex-1 h-9 rounded-sm">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={!canForward} className="flex-1 h-9 rounded-sm">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onEnd} disabled={!canForward} className="flex-1 h-9 rounded-sm">
          <ChevronsRight className="w-4 h-4" />
        </Button>
        {hasAnnotations && (
          <button
            onClick={onClearAnnotations}
            title="Clear annotations"
            className="h-9 px-1.5 flex items-center gap-1 text-xs text-destructive hover:bg-destructive/10 rounded-sm transition-colors flex-shrink-0"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 flex-shrink-0 rounded-sm" title="More controls">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[140px]">
            {hasCoachControls && (
              <>
                <DropdownMenuItem disabled={controlsDisabled} onSelect={() => { onReset?.(); closeInput() }}>
                  Reset
                </DropdownMenuItem>
                <DropdownMenuItem disabled={controlsDisabled} onSelect={() => openInput('fen')}>
                  Set FEN
                </DropdownMenuItem>
                <DropdownMenuItem disabled={controlsDisabled} onSelect={() => openInput('pgn')}>
                  Load PGN
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onSelect={onFlip}>
              Flip board
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
