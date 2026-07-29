// Shared microinteraction presets for the academy. Colors reuse the app's existing
// chart-token hues (emerald success / amber hint / red error) — no new palette.
// Every animation function takes `reduced` so callers degrade to equal-duration
// opacity fades under prefers-reduced-motion instead of skipping feedback entirely.

export type SpringConfig = { stiffness: number; damping: number }

export const SPRING_BOUNCY: SpringConfig = { stiffness: 200, damping: 20 } // students
export const SPRING_SNAPPY: SpringConfig = { stiffness: 400, damping: 40 } // coach/admin

export const TAP_SCALE = 0.96
export const HOVER_SCALE = 1.03

const EMERALD = '16,185,129' // --chart-2
const AMBER = '245,158,11'  // --chart-3
const RED = '239,68,68'     // --destructive (light)

export function tapAnimation(reduced: boolean) {
  return reduced ? undefined : { scale: TAP_SCALE }
}

export function hoverAnimation(reduced: boolean) {
  return reduced ? undefined : { scale: HOVER_SCALE }
}

/** Correct move / solve: pop + tiny wiggle + transient emerald glow. */
export function successAnimation(spring: SpringConfig, reduced: boolean) {
  if (reduced) {
    return { opacity: [1, 0.55, 1], transition: { duration: 0.2 } }
  }
  return {
    scale: [1, 1.05, 1],
    rotate: [0, 3, -3, 0],
    boxShadow: [
      `0 0 0 0 rgba(${EMERALD},0)`,
      `0 0 0 6px rgba(${EMERALD},0.35)`,
      `0 0 0 0 rgba(${EMERALD},0)`,
    ],
    transition: { duration: 0.4, type: 'spring' as const, ...spring },
  }
}

/** Wrong move / wrong answer: shake. */
export function errorAnimation(reduced: boolean) {
  if (reduced) {
    return { opacity: [1, 0.55, 1], transition: { duration: 0.2 } }
  }
  return {
    x: [0, -4, 4, -4, 4, 0],
    boxShadow: [
      `0 0 0 0 rgba(${RED},0)`,
      `0 0 0 4px rgba(${RED},0.3)`,
      `0 0 0 0 rgba(${RED},0)`,
    ],
    transition: { duration: 0.4, ease: 'easeInOut' as const },
  }
}

/** Unused hint available: gentle repeating amber pulse glow. */
export function hintAnimation(reduced: boolean) {
  if (reduced) return undefined
  return {
    boxShadow: [
      `0 0 0 0 rgba(${AMBER},0)`,
      `0 0 0 5px rgba(${AMBER},0.3)`,
      `0 0 0 0 rgba(${AMBER},0)`,
    ],
    transition: { duration: 0.6, repeat: Infinity, repeatDelay: 0.8, ease: 'easeInOut' as const },
  }
}
