// Shared decoration model for the study/interactive board's right-click
// annotation engine: arrows, square/zone highlights, and one-shot piece
// animations. Ported from blunderbored's lib/decorations.ts — same canonical
// color letters (PGN [%cal]/[%csl] values) so annotations keep round-tripping
// through PGN export/import, plus GRAY as a fifth, app-only value with no PGN
// letter, matching the reference implementation exactly.

export type DecorationColor = 'R' | 'G' | 'B' | 'Y' | 'GRAY'

export const COLOR_LABEL: Record<DecorationColor, string> = {
  R: 'Red',
  G: 'Green',
  B: 'Blue',
  Y: 'Amber',
  GRAY: 'Gray',
}

export const ARROW_RENDER_COLOR: Record<DecorationColor, string> = {
  R: 'rgba(239,68,68,0.85)',
  G: 'rgba(34,197,94,0.85)',
  B: 'rgba(59,130,246,0.85)',
  Y: 'rgba(255,180,0,0.85)',
  GRAY: 'rgba(148,163,184,0.85)',
}

export const HIGHLIGHT_RENDER_COLOR: Record<DecorationColor, string> = {
  R: 'rgba(239,68,68,0.45)',
  G: 'rgba(34,197,94,0.4)',
  B: 'rgba(59,130,246,0.4)',
  Y: 'rgba(255,180,0,0.4)',
  GRAY: 'rgba(148,163,184,0.4)',
}

// Legacy colorless arrows/highlights (drawn before colors existed) fall back
// to this.
export const DEFAULT_COLOR: DecorationColor = 'Y'

export const ARROW_COLOR_OPTIONS: DecorationColor[] = ['R', 'B', 'Y', 'G', 'GRAY']
export const HIGHLIGHT_COLOR_OPTIONS: DecorationColor[] = ['R', 'B', 'Y', 'G', 'GRAY']

// PGN [%cal]/[%csl] only understands R/G/B/Y — GRAY has no letter and must
// never be emitted.
export function pgnLetter(color?: DecorationColor): string | undefined {
  if (color === 'GRAY') return undefined
  return color ?? DEFAULT_COLOR
}

export interface ArrowDecoration {
  id: string
  from: string
  to: string
  color?: DecorationColor
}

export interface HighlightDecoration {
  id: string
  square: string // anchor square — the single square for a plain highlight
  squares?: string[] // present only for zone highlights (all covered squares, incl. `square`); app-only, never exported
  color?: DecorationColor
}

export type AnimationEffect = 'bounce' | 'pulsate' | 'shake'

export interface AnimationDecoration {
  id: string
  square: string
  effect: AnimationEffect
  color?: DecorationColor
}

// A decoration only survives a PGN round-trip if standard PGN software could
// parse it back: a single square in a standard color.
export function isPgnExportableHighlight(h: HighlightDecoration): boolean {
  return (!h.squares || h.squares.length <= 1) && h.color !== 'GRAY'
}

export function isPgnExportableArrow(a: ArrowDecoration): boolean {
  return a.color !== 'GRAY'
}

let _idCounter = 0

// Stable, unique-enough id for a decoration. Prefer crypto.randomUUID when
// available (browser runtime); fall back to a counter for SSR/test contexts.
export function newDecorationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `dec${++_idCounter}`
}
