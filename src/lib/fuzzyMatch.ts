// Lightweight fuzzy string match for short free-text answers (Q&A flashcards).
// Tolerant of case, surrounding whitespace, punctuation, and small typos —
// not meant for long-form grading, just "did they basically get it."

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // strip punctuation
    .replace(/\s+/g, ' ')
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[a.length][b.length]
}

/** Similarity in [0, 1] — 1 means identical after normalization. */
export function similarity(userAnswer: string, correctAnswer: string): number {
  const a = normalize(userAnswer)
  const b = normalize(correctAnswer)
  if (!a || !b) return 0
  if (a === b) return 1
  const distance = levenshtein(a, b)
  return 1 - distance / Math.max(a.length, b.length)
}

/** Case/whitespace/punctuation-insensitive, tolerant of a couple of typos. */
export function fuzzyMatch(userAnswer: string, correctAnswer: string, threshold = 0.75): boolean {
  return similarity(userAnswer, correctAnswer) >= threshold
}
