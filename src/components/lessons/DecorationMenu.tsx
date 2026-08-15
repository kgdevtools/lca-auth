'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ARROW_COLOR_OPTIONS,
  HIGHLIGHT_COLOR_OPTIONS,
  ARROW_RENDER_COLOR,
  HIGHLIGHT_RENDER_COLOR,
  COLOR_LABEL,
  type DecorationColor,
  type AnimationEffect,
} from '@/lib/decorations'
import { cn } from '@/lib/utils'

// Small anchored popup for the board's right-click decoration engine —
// ported from blunderbored's components/board/DecorationMenu.tsx. Same
// fixed-position + outside-click-close pattern, same step machine, same
// edit-existing-decoration affordances (recolor/delete/replay).

export type DecorationCommit =
  | { kind: 'arrow'; color: DecorationColor }
  | { kind: 'highlight'; target: 'square' | 'zone'; color: DecorationColor }
  | { kind: 'animate'; effect: AnimationEffect }
  | { kind: 'delete' }
  | { kind: 'replay' }
  | { kind: 'recolor'; color: DecorationColor }

// When the popup is opened on a square that already anchors a decoration, the
// root panel shows edit controls (Recolor/Delete/Replay) for that item *and*
// the normal create options — so a new, separate decoration can be added
// without disturbing the existing one.
export type EditingKind = 'arrow' | 'highlight' | 'animation' | null

type Step =
  | 'root'
  | 'arrow-color'
  | 'highlight-type'
  | 'highlight-color'
  | 'animate-effect'

interface DecorationMenuProps {
  x: number
  y: number
  editing: EditingKind
  onCommit: (commit: DecorationCommit) => void
  onClose: () => void
}

const PANEL_WIDTH = 176
// Kept in sync with the viewport edge — never let the popup touch it exactly.
const EDGE_MARGIN = 8

const EFFECT_LABEL: Record<AnimationEffect, string> = { bounce: 'Bounce', pulsate: 'Pulsate', shake: 'Shake' }

function ColorSwatch({ color, kind, onClick }: { color: DecorationColor; kind: 'arrow' | 'highlight'; onClick: () => void }) {
  const dot = kind === 'arrow' ? ARROW_RENDER_COLOR[color] : HIGHLIGHT_RENDER_COLOR[color]
  return (
    <button
      onClick={onClick}
      title={COLOR_LABEL[color]}
      className="flex-1 flex flex-col items-center gap-1 py-1.5 rounded hover:bg-muted"
    >
      <span className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: dot }} />
      <span className="text-[10px] text-muted-foreground">{COLOR_LABEL[color]}</span>
    </button>
  )
}

function MenuButton({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn('block w-full text-left px-3 py-1.5 hover:bg-muted transition-colors', danger ? 'text-destructive' : 'text-foreground')}
    >
      {label}
    </button>
  )
}

export function DecorationMenu({ x, y, editing, onCommit, onClose }: DecorationMenuProps) {
  const [step, setStep] = useState<Step>('root')
  const [highlightTarget, setHighlightTarget] = useState<'square' | 'zone'>('square')
  const panelRef = useRef<HTMLDivElement>(null)

  // Best-guess position for the very first paint (before the panel has a
  // real measured size) — refined below the instant it's in the DOM, so
  // there's no visible jump (useLayoutEffect runs before the browser paints).
  const [pos, setPos] = useState(() => ({
    left: Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 0) - PANEL_WIDTH - EDGE_MARGIN),
    top: y,
  }))

  useEffect(() => {
    const close = () => onClose()
    window.addEventListener('mousedown', close)
    window.addEventListener('touchstart', close, { passive: true })
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('touchstart', close)
    }
  }, [onClose])

  // Clamps against the panel's OWN real measured size — not a guessed height
  // budget — so it's never cropped regardless of viewport size or how tall
  // the current step's content is (the "editing" root panel with Recolor +
  // Replay + Delete + Add new is noticeably taller than a plain create step).
  // Re-measures on every step change, since each step's height differs.
  useLayoutEffect(() => {
    const el = panelRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const maxLeft = window.innerWidth - width - EDGE_MARGIN
    const maxTop = window.innerHeight - height - EDGE_MARGIN
    setPos({
      left: Math.max(EDGE_MARGIN, Math.min(x, maxLeft)),
      top: Math.max(EDGE_MARGIN, Math.min(y, maxTop)),
    })
  }, [x, y, step, editing])

  const commitAndClose = (commit: DecorationCommit) => {
    onCommit(commit)
    onClose()
  }

  return (
    <div
      ref={panelRef}
      className="fixed z-[150] bg-popover border border-border rounded-md shadow-xl py-1 text-sm"
      style={{ left: pos.left, top: pos.top, width: PANEL_WIDTH }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {step === 'root' && (
        <>
          {editing && (
            <>
              <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">This decoration</div>
              <div className="flex items-center gap-0.5 px-2 pb-1.5">
                {(editing === 'arrow' ? ARROW_COLOR_OPTIONS : HIGHLIGHT_COLOR_OPTIONS).map((c) => (
                  <ColorSwatch key={c} color={c} kind={editing === 'arrow' ? 'arrow' : 'highlight'} onClick={() => commitAndClose({ kind: 'recolor', color: c })} />
                ))}
              </div>
              {editing === 'animation' && <MenuButton label="Replay" onClick={() => commitAndClose({ kind: 'replay' })} />}
              <MenuButton label="Delete" danger onClick={() => commitAndClose({ kind: 'delete' })} />
              <div className="my-1 border-t border-border" />
              <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">Add new</div>
            </>
          )}
          <MenuButton label="Arrow" onClick={() => setStep('arrow-color')} />
          <MenuButton label="Highlight" onClick={() => setStep('highlight-type')} />
          <MenuButton label="Animate" onClick={() => setStep('animate-effect')} />
        </>
      )}

      {step === 'arrow-color' && (
        <div className="flex items-center gap-0.5 px-2 py-1.5">
          {ARROW_COLOR_OPTIONS.map((c) => (
            <ColorSwatch key={c} color={c} kind="arrow" onClick={() => commitAndClose({ kind: 'arrow', color: c })} />
          ))}
        </div>
      )}

      {step === 'highlight-type' && (
        <>
          <MenuButton label="Square" onClick={() => { setHighlightTarget('square'); setStep('highlight-color') }} />
          <MenuButton label="Zone" onClick={() => { setHighlightTarget('zone'); setStep('highlight-color') }} />
        </>
      )}

      {step === 'highlight-color' && (
        <div className="flex items-center gap-0.5 px-2 py-1.5">
          {HIGHLIGHT_COLOR_OPTIONS.map((c) => (
            <ColorSwatch
              key={c}
              color={c}
              kind="highlight"
              onClick={() => commitAndClose({ kind: 'highlight', target: highlightTarget, color: c })}
            />
          ))}
        </div>
      )}

      {step === 'animate-effect' && (
        <>
          {(['bounce', 'pulsate', 'shake'] as AnimationEffect[]).map((e) => (
            <MenuButton key={e} label={EFFECT_LABEL[e]} onClick={() => commitAndClose({ kind: 'animate', effect: e })} />
          ))}
        </>
      )}
    </div>
  )
}
