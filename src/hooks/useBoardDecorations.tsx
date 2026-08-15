'use client'

// Shared board decorations engine — arrows, square/zone highlights, and
// persisted, auto-replaying piece animations, all via right-click (desktop)
// or a 3s long-press (touch). Ported behaviorally from blunderbored's
// components/board/BoardShell.tsx (~lines 385-955) + hooks/useBoardGame.ts's
// decoration mutators (~lines 397-507), generalized so any board editor can
// use it: instead of blunderbored's single mutable move-tree, this hook is
// keyed by an opaque `currentKey` string supplied by the caller (e.g.
// `${chapterIndex}:${moveIndex}` for a Study board, or a ply index for a
// Puzzle board) and operates on a `Map<key, StoredAnnotationSet>` the caller
// owns and persists.
//
// One deliberate deviation from blunderbored: animations are real, persisted
// decorations (not a fire-and-forget flourish), and they AUTO-REPLAY every
// time `currentKey` becomes active again — not just once at creation, and
// not only via the menu's manual "Replay". See the auto-replay effect below
// for exactly how that's scoped so it can't spuriously re-trigger.
//
// Usage: the caller renders <Chessboard> inside a `position: relative`
// container (ref = `boardContainerRef`), immediately followed by `{overlay}`
// as a sibling (not a child) of <Chessboard> in that same container — the
// overlay's capture layer is `absolute inset-0` and needs the container's
// box, not the chessboard component's own internals, to size against.
// Forward `onBoardPointerDown`/`onBoardContextMenu`/`onBoardTouchStart`/
// `onBoardTouchEnd` onto that same container element, and hand `customArrows`/
// `customSquare` straight to <Chessboard> (customSquareStyles stays owned by
// the caller — last-move/selection/check tints are board-specific, not part
// of this engine).

import { useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from 'react'
import {
  ARROW_RENDER_COLOR,
  HIGHLIGHT_RENDER_COLOR,
  DEFAULT_COLOR,
  newDecorationId,
  EMPTY_ANNOTATION_SET,
  type ArrowDecoration,
  type HighlightDecoration,
  type AnimationEffect,
  type DecorationColor,
  type StoredAnnotationSet,
} from '@/lib/decorations'
import { type DecorationCommit, type EditingKind } from '@/components/lessons/DecorationMenu'
import { DecorationOverlay } from '@/components/lessons/DecorationOverlay'

// Re-exported for convenience — StoredAnnotationSet's canonical home is
// lib/decorations.ts (a pure data shape, no React needed), but every board
// editor already imports it from here alongside the hook itself.
export type { StoredAnnotationSet }

export interface CustomSquareRenderProps {
  children: ReactNode
  square: string
  style: React.CSSProperties
}

interface UseBoardDecorationsArgs {
  /** Opaque "where we are" key — changing it both switches which annotation
   *  set is being edited and is the auto-replay trigger for animations. */
  currentKey: string
  annotations: Map<string, StoredAnnotationSet>
  onAnnotationsChange: (next: Map<string, StoredAnnotationSet>) => void
  boardContainerRef: React.RefObject<HTMLElement | null>
  /** Disables all decoration gestures (right-click, armed overlay, Escape)
   *  without unmounting anything — for BoardEditor's Place/Decorate toggle. */
  disabled?: boolean
}

interface UseBoardDecorationsResult {
  customArrows: [string, string, string][]
  customSquare: ((props: CustomSquareRenderProps) => ReactNode) | undefined
  overlay: ReactNode
  onBoardPointerDown: (e: React.PointerEvent) => void
  onBoardContextMenu: (e: React.MouseEvent) => void
  onBoardTouchStart: (e: React.TouchEvent) => void
  onBoardTouchEnd: () => void
  /** Called from the caller's own square-click handler once it's decided a
   *  click was "inert" (not a move/piece-placement) — focuses whatever
   *  decoration is anchored there so the manual delete "×" badge appears. */
  focusSquare: (square: string) => void
  removeDecoration: (id: string) => void
  clearAll: () => void
  hasDecorations: boolean
}

type ArmedTool =
  | { kind: 'arrow'; from: string; color: DecorationColor }
  | { kind: 'zone-highlight'; color: DecorationColor }
  | null

const nextOrder = (cur: StoredAnnotationSet) => cur.arrows.length + cur.highlights.length + cur.animations.length

export function useBoardDecorations({
  currentKey, annotations, onAnnotationsChange, boardContainerRef, disabled = false,
}: UseBoardDecorationsArgs): UseBoardDecorationsResult {
  const current = annotations.get(currentKey) ?? EMPTY_ANNOTATION_SET

  const setCurrent = useCallback((updater: (cur: StoredAnnotationSet) => StoredAnnotationSet) => {
    const cur = annotations.get(currentKey) ?? EMPTY_ANNOTATION_SET
    const next = new Map(annotations)
    next.set(currentKey, updater(cur))
    onAnnotationsChange(next)
  }, [annotations, currentKey, onAnnotationsChange])

  // ── Mutators — ported from useBoardGame.ts's addArrow/addHighlight/
  // addAnimation/recolorDecoration/removeDecoration, keyed by currentKey
  // instead of a move-tree node id. ──────────────────────────────────────────

  const addArrow = useCallback((from: string, to: string, color?: DecorationColor) => {
    setCurrent(cur => {
      const existing = cur.arrows.find(a => a.from === from && a.to === to)
      if (existing && existing.color === color) {
        return { ...cur, arrows: cur.arrows.filter(a => a.id !== existing.id) }
      }
      if (existing) {
        return { ...cur, arrows: cur.arrows.map(a => a.id === existing.id ? { ...a, color } : a) }
      }
      const arrow: ArrowDecoration = { id: newDecorationId(), order: nextOrder(cur), from, to, color }
      return { ...cur, arrows: [...cur.arrows, arrow] }
    })
  }, [setCurrent])

  const addHighlight = useCallback((square: string, color?: DecorationColor, squares?: string[]) => {
    setCurrent(cur => {
      const key = (squares ?? [square]).slice().sort().join(',')
      const existing = cur.highlights.find(h => (h.squares ?? [h.square]).slice().sort().join(',') === key)
      if (existing && existing.color === color) {
        return { ...cur, highlights: cur.highlights.filter(h => h.id !== existing.id) }
      }
      if (existing) {
        return { ...cur, highlights: cur.highlights.map(h => h.id === existing.id ? { ...h, color } : h) }
      }
      const highlight: HighlightDecoration = { id: newDecorationId(), order: nextOrder(cur), square, squares, color }
      return { ...cur, highlights: [...cur.highlights, highlight] }
    })
  }, [setCurrent])

  // Animations are one-shot events, not togglable state — always adds a new
  // decoration. `id` lets the caller (handleMenuCommit below) generate it up
  // front so playback can start tracking the instant it commits.
  const addAnimation = useCallback((square: string, effect: AnimationEffect, color: DecorationColor | undefined, id: string) => {
    setCurrent(cur => ({
      ...cur,
      animations: [...cur.animations, { id, order: nextOrder(cur), square, effect, color }],
    }))
  }, [setCurrent])

  const recolorDecoration = useCallback((id: string, color?: DecorationColor) => {
    setCurrent(cur => ({
      arrows: cur.arrows.map(a => a.id === id ? { ...a, color } : a),
      highlights: cur.highlights.map(h => h.id === id ? { ...h, color } : h),
      animations: cur.animations.map(a => a.id === id ? { ...a, color } : a),
    }))
  }, [setCurrent])

  const removeDecoration = useCallback((id: string) => {
    setCurrent(cur => ({
      arrows: cur.arrows.filter(a => a.id !== id),
      highlights: cur.highlights.filter(h => h.id !== id),
      animations: cur.animations.filter(a => a.id !== id),
    }))
  }, [setCurrent])

  const clearAll = useCallback(() => {
    const next = new Map(annotations)
    next.delete(currentKey)
    onAnnotationsChange(next)
  }, [annotations, currentKey, onAnnotationsChange])

  // ── Right-click / long-press popup + armed-tool drag-to-finish ────────────

  const findDecorationAt = useCallback((square: string): { kind: EditingKind; id: string } | null => {
    const arrow = current.arrows.find(a => a.from === square || a.to === square)
    if (arrow) return { kind: 'arrow', id: arrow.id }
    const highlight = current.highlights.find(h => (h.squares ?? [h.square]).includes(square))
    if (highlight) return { kind: 'highlight', id: highlight.id }
    const animation = current.animations.find(a => a.square === square)
    if (animation) return { kind: 'animation', id: animation.id }
    return null
  }, [current])

  const rightMouseDownSquare = useRef<string | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; square: string; editing: EditingKind; editId: string | null } | null>(null)
  const [armed, setArmed] = useState<ArmedTool>(null)
  const [zoneDragStart, setZoneDragStart] = useState<{ x: number; y: number; squareSize: number } | null>(null)
  const [zoneDragEnd, setZoneDragEnd] = useState<{ x: number; y: number } | null>(null)
  const [focused, setFocused] = useState<{ kind: EditingKind; id: string } | null>(null)
  const [playingAnimIds, setPlayingAnimIds] = useState<Set<string>>(new Set())

  // Squares are resolved from pointer coordinates via the chessboard
  // library's own data-square attributes — orientation-proof, works over
  // piece images and coordinate labels alike.
  const squareFromPoint = useCallback((x: number, y: number): string | null => {
    const el = document.elementsFromPoint(x, y).find(e => e.hasAttribute('data-square'))
    return el?.getAttribute('data-square') ?? null
  }, [])

  // Squares whose DOM element's centre falls within half a square-width of
  // the start→end drag segment (clamped to the segment) — a "capsule"
  // selection along the drag vector, handling any angle with one test.
  const squaresAlongDrag = useCallback((start: { x: number; y: number }, end: { x: number; y: number }): string[] => {
    const container = boardContainerRef.current
    if (!container) return []
    const squareEls = container.querySelectorAll('[data-square]')
    let squareSize = 0
    squareEls.forEach(el => { if (!squareSize) squareSize = el.getBoundingClientRect().width })
    const halfWidth = squareSize / 2
    const dx = end.x - start.x
    const dy = end.y - start.y
    const lenSq = dx * dx + dy * dy
    const out: string[] = []
    squareEls.forEach(el => {
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((cx - start.x) * dx + (cy - start.y) * dy) / lenSq))
      const px = start.x + t * dx
      const py = start.y + t * dy
      if (Math.hypot(cx - px, cy - py) <= halfWidth) out.push(el.getAttribute('data-square')!)
    })
    return out
  }, [boardContainerRef])

  const openMenuAt = useCallback((clientX: number, clientY: number) => {
    if (disabled) return
    const square = squareFromPoint(clientX, clientY)
    if (!square) return
    const found = findDecorationAt(square)
    setMenu({ x: clientX, y: clientY, square, editing: found?.kind ?? null, editId: found?.id ?? null })
  }, [disabled, squareFromPoint, findDecorationAt])

  // Marks an animation as "currently playing" for ~700ms — long enough for a
  // one-shot CSS animation to run — then it settles back to static. The
  // AnimationDecoration record itself is untouched by this; only membership
  // in `playingAnimIds` controls whether the CSS class is currently applied.
  const playAnimation = useCallback((id: string) => {
    setPlayingAnimIds(prev => new Set(prev).add(id))
    setTimeout(() => {
      setPlayingAnimIds(prev => {
        if (!prev.has(id)) return prev
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 700)
  }, [])

  // Auto-replay every animation stored at `currentKey` whenever that key
  // becomes active — on mount, and on every subsequent key change — NOT on
  // every render. This effect deliberately depends only on [currentKey]:
  // creating/editing a decoration while sitting at the same key must not
  // spuriously re-trigger every other animation already at that key: only
  // navigating away and back (or a fresh mount landing on a key with
  // existing animations) fires it.
  useEffect(() => {
    const anims = annotations.get(currentKey)?.animations ?? []
    for (const a of anims) playAnimation(a.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey])

  const onBoardPointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return
    if (e.button === 2) rightMouseDownSquare.current = squareFromPoint(e.clientX, e.clientY)
  }, [disabled, squareFromPoint])

  const onBoardContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  // Plain right-click (pointerup on the same square as pointerdown, no drag)
  // opens the popup. A right-drag to a different square is a no-op unless a
  // tool is already armed — the capture overlay handles that case.
  useEffect(() => {
    if (disabled) return
    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 2) return
      const start = rightMouseDownSquare.current
      rightMouseDownSquare.current = null
      if (!start || armed) return
      const end = squareFromPoint(e.clientX, e.clientY)
      if (end === start) openMenuAt(e.clientX, e.clientY)
    }
    window.addEventListener('pointerup', onPointerUp)
    return () => window.removeEventListener('pointerup', onPointerUp)
  }, [disabled, squareFromPoint, openMenuAt, armed])

  const onBoardTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return
    const touch = e.touches[0]
    if (!touch) return
    const { clientX, clientY } = touch
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null
      openMenuAt(clientX, clientY)
    }, 3000)
  }, [disabled, openMenuAt])

  const onBoardTouchEnd = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }, [])

  // Escape cancels an armed tool without committing.
  useEffect(() => {
    if (!armed) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setArmed(null); setZoneDragStart(null); setZoneDragEnd(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [armed])

  // Disabling mid-arm (e.g. BoardEditor's Place/Decorate toggle switching
  // away) cancels cleanly rather than leaving a dangling overlay/menu.
  useEffect(() => {
    if (!disabled) return
    setArmed(null); setZoneDragStart(null); setZoneDragEnd(null); setMenu(null); setFocused(null)
  }, [disabled])

  const handleMenuCommit = useCallback((commit: DecorationCommit) => {
    if (!menu) return
    const { square, editId } = menu
    switch (commit.kind) {
      case 'recolor':
        if (editId) recolorDecoration(editId, commit.color)
        break
      case 'delete':
        if (editId) removeDecoration(editId)
        break
      case 'replay':
        if (editId) playAnimation(editId)
        break
      case 'arrow':
        setArmed({ kind: 'arrow', from: square, color: commit.color })
        break
      case 'highlight':
        if (commit.target === 'square') addHighlight(square, commit.color)
        else setArmed({ kind: 'zone-highlight', color: commit.color })
        break
      case 'animate': {
        const id = newDecorationId()
        addAnimation(square, commit.effect, undefined, id)
        playAnimation(id)
        break
      }
    }
  }, [menu, recolorDecoration, removeDecoration, playAnimation, addHighlight, addAnimation])

  // While a tool is armed, a transparent overlay captures every pointer
  // event over the board so the chessboard's own piece-drag handling never
  // sees them — the gesture is finishing a decoration, not moving a piece.
  const handleArmedPointerDown = useCallback((e: React.PointerEvent) => {
    if (armed?.kind === 'zone-highlight') {
      const squareSize = boardContainerRef.current?.querySelector('[data-square]')?.getBoundingClientRect().width ?? 0
      setZoneDragStart({ x: e.clientX, y: e.clientY, squareSize })
      setZoneDragEnd({ x: e.clientX, y: e.clientY })
    }
  }, [armed, boardContainerRef])

  const handleArmedPointerMove = useCallback((e: React.PointerEvent) => {
    if (!zoneDragStart) return
    setZoneDragEnd({ x: e.clientX, y: e.clientY })
  }, [zoneDragStart])

  const handleArmedPointerUp = useCallback((e: React.PointerEvent) => {
    if (armed?.kind === 'arrow') {
      const dest = squareFromPoint(e.clientX, e.clientY)
      if (dest) addArrow(armed.from, dest, armed.color)
    } else if (armed?.kind === 'zone-highlight' && zoneDragStart) {
      const squares = squaresAlongDrag(zoneDragStart, { x: e.clientX, y: e.clientY })
      if (squares.length > 0) addHighlight(squares[0], armed.color, squares)
    }
    setArmed(null)
    setZoneDragStart(null)
    setZoneDragEnd(null)
  }, [armed, zoneDragStart, squareFromPoint, squaresAlongDrag, addArrow, addHighlight])

  // Screen-space anchor for the focused decoration's manual-delete "×" — a
  // highlight/animation anchors at its square, an arrow at the midpoint
  // between its two endpoint squares.
  const decorationAnchorRect = useCallback((kind: EditingKind, id: string): DOMRect | null => {
    const container = boardContainerRef.current
    if (!container) return null
    if (kind === 'arrow') {
      const arrow = current.arrows.find(a => a.id === id)
      if (!arrow) return null
      const fromEl = container.querySelector(`[data-square="${arrow.from}"]`)
      const toEl = container.querySelector(`[data-square="${arrow.to}"]`)
      if (!fromEl || !toEl) return null
      const r1 = fromEl.getBoundingClientRect()
      const r2 = toEl.getBoundingClientRect()
      const cx = (r1.left + r1.width / 2 + r2.left + r2.width / 2) / 2
      const cy = (r1.top + r1.height / 2 + r2.top + r2.height / 2) / 2
      return new DOMRect(cx - 10, cy - 10, 20, 20)
    }
    const square = kind === 'highlight'
      ? current.highlights.find(h => h.id === id)?.square
      : current.animations.find(a => a.id === id)?.square
    if (!square) return null
    const el = container.querySelector(`[data-square="${square}"]`)
    return el?.getBoundingClientRect() ?? null
  }, [boardContainerRef, current])

  // Plain left-click (no drag/selection in play) on a square with nothing
  // armed focuses whatever decoration is anchored there, driving the manual
  // delete "×" badge. Each caller has its own move/piece-placement click
  // logic, so this hook doesn't intercept clicks itself — callers call
  // `focusSquare(square)` from their own click handler once they've decided
  // a click wasn't a move/piece-placement.
  const focusSquare = useCallback((square: string) => {
    if (disabled) return
    setFocused(findDecorationAt(square))
  }, [disabled, findDecorationAt])

  useEffect(() => { setFocused(null) }, [currentKey])

  const [focusedRect, setFocusedRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    setFocusedRect(focused ? decorationAnchorRect(focused.kind, focused.id) : null)
  }, [focused, decorationAnchorRect])

  // ── Render props ───────────────────────────────────────────────────────────

  const customArrows = useMemo<[string, string, string][]>(() =>
    current.arrows.map(a => [a.from, a.to, ARROW_RENDER_COLOR[a.color ?? DEFAULT_COLOR]] as [string, string, string])
  , [current.arrows])

  const highlightsBySquare = useMemo(() => {
    const map = new Map<string, { id: string; color: string }[]>()
    for (const h of current.highlights) {
      const color = HIGHLIGHT_RENDER_COLOR[h.color ?? DEFAULT_COLOR]
      for (const sq of h.squares ?? [h.square]) {
        const arr = map.get(sq) ?? []
        arr.push({ id: h.id, color })
        map.set(sq, arr)
      }
    }
    return map
  }, [current.highlights])

  const activeAnimBySquare = useMemo(() => {
    const map = new Map<string, AnimationEffect>()
    for (const a of current.animations) {
      if (playingAnimIds.has(a.id)) map.set(a.square, a.effect)
    }
    return map
  }, [current.animations, playingAnimIds])

  const customSquare = useMemo(() => {
    if (highlightsBySquare.size === 0 && activeAnimBySquare.size === 0) return undefined
    return function DecoratedSquare({ children, square, style }: CustomSquareRenderProps) {
      const colors = highlightsBySquare.get(square)
      const animEffect = activeAnimBySquare.get(square)
      const pieceWrapClass = animEffect ? `decoration-${animEffect}` : undefined
      return (
        <div style={{ ...style, position: 'relative' }}>
          {colors?.map(({ id, color }) => (
            <div key={id} className="decoration-fade-in" style={{ position: 'absolute', inset: 0, backgroundColor: color }} />
          ))}
          <div className={pieceWrapClass} style={{ width: '100%', height: '100%', position: 'relative' }}>
            {children}
          </div>
        </div>
      )
    }
  }, [highlightsBySquare, activeAnimBySquare])

  const overlay = (
    <DecorationOverlay
      armed={armed !== null}
      onArmedPointerDown={handleArmedPointerDown}
      onArmedPointerMove={handleArmedPointerMove}
      onArmedPointerUp={handleArmedPointerUp}
      zoneDrag={zoneDragStart && zoneDragEnd ? { start: zoneDragStart, end: zoneDragEnd } : null}
      focusedRect={focused ? focusedRect : null}
      onDeleteFocused={() => { if (focused) { removeDecoration(focused.id); setFocused(null) } }}
      menu={menu}
      onMenuCommit={handleMenuCommit}
      onMenuClose={() => setMenu(null)}
    />
  )

  const hasDecorations = current.arrows.length > 0 || current.highlights.length > 0 || current.animations.length > 0

  return {
    customArrows, customSquare, overlay,
    onBoardPointerDown, onBoardContextMenu, onBoardTouchStart, onBoardTouchEnd,
    focusSquare, removeDecoration, clearAll, hasDecorations,
  }
}
