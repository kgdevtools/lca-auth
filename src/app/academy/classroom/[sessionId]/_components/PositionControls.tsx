'use client'

import { useState } from 'react'
import { Chess } from 'chess.js'
import { RotateCcw, Terminal, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PositionControlsProps {
  onReset:   () => void
  onSetFen:  (fen: string) => void
  onLoadPgn: (fen: string, pgn: string) => void
  disabled?: boolean
}

export default function PositionControls({
  onReset,
  onSetFen,
  onLoadPgn,
  disabled = false,
}: PositionControlsProps) {
  const [mode,  setMode]  = useState<'none' | 'fen' | 'pgn'>('none')
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const close = () => { setMode('none'); setInput(''); setError(null) }

  const toggle = (next: 'fen' | 'pgn') => {
    setMode(prev => prev === next ? 'none' : next)
    setInput('')
    setError(null)
  }

  const handleApply = () => {
    setError(null)
    if (mode === 'fen') {
      try {
        new Chess(input.trim())
        onSetFen(input.trim())
        close()
      } catch {
        setError('Invalid FEN string')
      }
    } else if (mode === 'pgn') {
      try {
        const game = new Chess()
        game.loadPgn(input.trim())
        onLoadPgn(game.fen(), game.pgn())
        close()
      } catch {
        setError('Invalid PGN')
      }
    }
  }

  return (
    <div className="flex-shrink-0 border-b border-border bg-muted/20">
      <div className="flex items-center gap-1 px-4 py-1.5">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mr-1.5">
          Position
        </span>

        <button
          onClick={() => { onReset(); close() }}
          disabled={disabled}
          title="Reset to starting position"
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>

        <button
          onClick={() => toggle('fen')}
          disabled={disabled}
          className={cn(
            'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
            mode === 'fen'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          <Terminal className="w-3.5 h-3.5" />
          Set FEN
        </button>

        <button
          onClick={() => toggle('pgn')}
          disabled={disabled}
          className={cn(
            'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
            mode === 'pgn'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          <FileText className="w-3.5 h-3.5" />
          Load PGN
        </button>
      </div>

      {mode !== 'none' && (
        <div className="px-4 pb-2 flex flex-col gap-1.5">
          {mode === 'fen' ? (
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleApply(); if (e.key === 'Escape') close() }}
              placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
              autoFocus
              className="w-full text-xs px-2 py-1.5 rounded-sm border border-border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
          ) : (
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') close() }}
              placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 ..."
              rows={3}
              autoFocus
              className="w-full text-xs px-2 py-1.5 rounded-sm border border-border bg-background font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          )}

          {error && (
            <p className="text-[10px] text-destructive">{error}</p>
          )}

          <div className="flex gap-1.5">
            <button
              onClick={handleApply}
              className="text-xs px-3 py-1 rounded-sm bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
            >
              Apply
            </button>
            <button
              onClick={close}
              className="text-xs px-3 py-1 rounded-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
