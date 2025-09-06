// src/lib/tieBreakUtils.ts

type TieBreakMap = Record<string, string>

export function detectTieBreaks(tieBreaks: Record<string, any> | null): TieBreakMap | null {
  if (!tieBreaks) return null

  const result: TieBreakMap = {}

  // Collect numeric-like values for cross-comparisons
  const numericEntries = Object.entries(tieBreaks)
    .map(([k, v]) => [k, typeof v === "string" ? parseFloat(v) : v])
    .filter(([, v]) => typeof v === "number" && !isNaN(v)) as [string, number][]

  // Sort numerics for highest/second-highest detection
  const sorted = [...numericEntries].sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))

  const highest = sorted[0]
  const secondHighest = sorted[1]

  Object.entries(tieBreaks).forEach(([key, rawVal]) => {
    const val = typeof rawVal === "string" ? parseFloat(rawVal) : rawVal

    if (val === null || val === undefined || isNaN(val)) {
      result[key] = "Unknown"
      return
    }

    // ---- Rule: Direct Encounter
    if ([0, 0.5, 1].includes(val)) {
      result[key] = "Direct Encounter"
      return
    }

    // ---- Rule: Wins
    if (Number.isInteger(val) && val <= 15) {
      result[key] = "Number of Wins"
      return
    }

    // ---- Rule: Performance Rating vs ARO
    if (Number.isInteger(val) && val >= 100 && val <= 3500) {
      if (highest && key === highest[0]) {
        result[key] = "Performance Rating"
      } else if (secondHighest && key === secondHighest[0]) {
        result[key] = "Average Rating of Opponents"
      } else {
        result[key] = "Performance/ARO Candidate"
      }
      return
    }

    // ---- Rule: Decimals → Buchholz / Sonneborn
    if (typeof val === "number" && val % 1 !== 0) {
      // Find close siblings to differentiate
      const siblings = numericEntries.filter(([k]) => k !== key && !Number.isInteger(val))
      if (siblings.length > 0) {
        result[key] = "Buchholz / Sonneborn-Berger"
      } else {
        result[key] = "Buchholz (Gamepoints)"
      }
      return
    }

    // ---- Fallback
    result[key] = "Unclassified"
  })

  return result
}
