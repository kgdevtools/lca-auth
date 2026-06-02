// Shared, server-safe rankings constants. Kept in a NON-"use client" module so
// the page (a Server Component) can read them without importing FilterBar (which
// is "use client" — its value exports read as undefined when imported server-side).

/** Default chess-season period for the rankings view: 2025 = Oct 2025 – Sep 2026. */
export const DEFAULT_PERIOD = 2025
