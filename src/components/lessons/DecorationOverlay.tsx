'use client'

// Presentational extraction of the decorations engine's on-screen chrome —
// the armed-tool pointer-capture layer, the zone drag-to-select marquee, the
// focused-decoration manual-delete "×" badge, and the right-click popup
// itself. Pure props in, pure JSX out; all interaction/state lives in
// useBoardDecorations. Render this as a sibling of <Chessboard> inside the
// same `position: relative` container passed as `boardContainerRef` to the
// hook — ported from blunderbored's components/board/BoardShell.tsx lines
// ~890-955.

import { DecorationMenu, type DecorationCommit, type EditingKind } from './DecorationMenu'

interface DecorationOverlayProps {
  armed: boolean
  onArmedPointerDown: (e: React.PointerEvent) => void
  onArmedPointerMove: (e: React.PointerEvent) => void
  onArmedPointerUp: (e: React.PointerEvent) => void
  zoneDrag: { start: { x: number; y: number; squareSize: number }; end: { x: number; y: number } } | null
  focusedRect: DOMRect | null
  onDeleteFocused: () => void
  menu: { x: number; y: number; square: string; editing: EditingKind; editId: string | null } | null
  onMenuCommit: (commit: DecorationCommit) => void
  onMenuClose: () => void
}

export function DecorationOverlay({
  armed, onArmedPointerDown, onArmedPointerMove, onArmedPointerUp,
  zoneDrag, focusedRect, onDeleteFocused, menu, onMenuCommit, onMenuClose,
}: DecorationOverlayProps) {
  return (
    <>
      {/* Armed-tool capture overlay: while drawing an arrow or dragging a
          zone selection, this intercepts every pointer event over the board
          so the chessboard underneath never sees them as a piece drag. */}
      {armed && (
        <div
          className="absolute inset-0 z-20 cursor-crosshair touch-none"
          onPointerDown={onArmedPointerDown}
          onPointerMove={onArmedPointerMove}
          onPointerUp={onArmedPointerUp}
        />
      )}

      {/* Zone drag-to-select marquee — a rotated band matching the capsule
          selection (works for horizontal/vertical/diagonal drags alike), in
          a neutral gray independent of the highlight color already chosen
          from the popup. */}
      {zoneDrag && (() => {
        const dx = zoneDrag.end.x - zoneDrag.start.x
        const dy = zoneDrag.end.y - zoneDrag.start.y
        const length = Math.hypot(dx, dy)
        const angle = Math.atan2(dy, dx) * 180 / Math.PI
        return (
          <div
            className="fixed z-30 border-2 border-dashed border-gray-400 bg-gray-400/10 pointer-events-none"
            style={{
              left: zoneDrag.start.x,
              top: zoneDrag.start.y - zoneDrag.start.squareSize / 2,
              width: length,
              height: zoneDrag.start.squareSize,
              transformOrigin: 'left center',
              transform: `rotate(${angle}deg)`,
            }}
          />
        )
      })()}

      {/* Manual delete "×" for the focused decoration — click a decorated
          square/arrow to focus it, then click this to remove it. */}
      {focusedRect && (
        <button
          type="button"
          className="fixed z-40 w-5 h-5 rounded-full bg-destructive hover:opacity-90 text-white text-xs font-bold leading-none flex items-center justify-center shadow"
          style={{ left: focusedRect.right - 10, top: focusedRect.top - 10 }}
          onClick={e => { e.stopPropagation(); onDeleteFocused() }}
          title="Delete decoration"
        >
          ×
        </button>
      )}

      {menu && (
        <DecorationMenu
          x={menu.x}
          y={menu.y}
          editing={menu.editing}
          onCommit={onMenuCommit}
          onClose={onMenuClose}
        />
      )}
    </>
  )
}
