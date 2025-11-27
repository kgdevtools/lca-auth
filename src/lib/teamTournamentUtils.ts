/**
 * Team Tournament Utilities
 * Helper functions for parsing team tournament data
 */

/**
 * Parse team score string (e.g., "3 - 3", "6F - 0F", "½ - 3½")
 * Returns scores for white and black teams
 */
export function parseTeamScore(scoreStr: string): { white: number; black: number; isForfeit: boolean } | null {
  if (!scoreStr) return null

  const cleaned = scoreStr.trim()

  // Match patterns like: "3 - 3", "6F - 0F", "½ - 3½", "1½ - 4½"
  const match = cleaned.match(/^([\d½]+)(F?)\s*[-–]\s*([\d½]+)(F?)$/i)

  if (!match) {
    console.warn(`Could not parse team score: "${scoreStr}"`)
    return null
  }

  const whiteScoreStr = match[1]
  const whiteForfeited = match[2].toUpperCase() === 'F'
  const blackScoreStr = match[3]
  const blackForfeited = match[4].toUpperCase() === 'F'

  // Convert score strings to numbers
  const whiteScore = parseScoreValue(whiteScoreStr)
  const blackScore = parseScoreValue(blackScoreStr)

  if (whiteScore === null || blackScore === null) {
    console.warn(`Invalid score values in: "${scoreStr}"`)
    return null
  }

  return {
    white: whiteScore,
    black: blackScore,
    isForfeit: whiteForfeited || blackForfeited
  }
}

/**
 * Parse individual board result (e.g., "1 : 0", "½ : ½", "+ : -")
 * Returns structured result data
 */
export function parseBoardResult(resultStr: string): {
  result: string
  white_score: number
  black_score: number
  white_result: "win" | "draw" | "loss" | "forfeit"
  black_result: "win" | "draw" | "loss" | "forfeit"
} | null {
  if (!resultStr) return null

  const cleaned = resultStr.trim()

  // Handle forfeit patterns: "+ : -", "- : +", "- : -"
  if (cleaned === '+ : -' || cleaned === '+:-') {
    return {
      result: "1:0",
      white_score: 1,
      black_score: 0,
      white_result: "forfeit",
      black_result: "forfeit"
    }
  }

  if (cleaned === '- : +' || cleaned === '-:+') {
    return {
      result: "0:1",
      white_score: 0,
      black_score: 1,
      white_result: "forfeit",
      black_result: "forfeit"
    }
  }

  if (cleaned === '- : -' || cleaned === '-:-') {
    return {
      result: "0:0",
      white_score: 0,
      black_score: 0,
      white_result: "forfeit",
      black_result: "forfeit"
    }
  }

  // Handle standard results: "1 : 0", "0 : 1", "½ : ½"
  const match = cleaned.match(/^([\d½.]+)\s*[:]\s*([\d½.]+)$/)

  if (!match) {
    console.warn(`Could not parse board result: "${resultStr}"`)
    return null
  }

  const whiteScore = parseScoreValue(match[1])
  const blackScore = parseScoreValue(match[2])

  if (whiteScore === null || blackScore === null) {
    console.warn(`Invalid score values in result: "${resultStr}"`)
    return null
  }

  // Determine result types
  let white_result: "win" | "draw" | "loss" | "forfeit"
  let black_result: "win" | "draw" | "loss" | "forfeit"

  if (whiteScore === 1 && blackScore === 0) {
    white_result = "win"
    black_result = "loss"
  } else if (whiteScore === 0 && blackScore === 1) {
    white_result = "loss"
    black_result = "win"
  } else if (whiteScore === 0.5 && blackScore === 0.5) {
    white_result = "draw"
    black_result = "draw"
  } else if (whiteScore === 0 && blackScore === 0) {
    white_result = "forfeit"
    black_result = "forfeit"
  } else {
    console.warn(`Unexpected score combination: ${whiteScore}:${blackScore}`)
    white_result = "draw"
    black_result = "draw"
  }

  // Normalize result string
  let normalizedResult: string
  if (whiteScore === 0.5 && blackScore === 0.5) {
    normalizedResult = "½:½"
  } else {
    normalizedResult = `${whiteScore}:${blackScore}`
  }

  return {
    result: normalizedResult,
    white_score: whiteScore,
    black_score: blackScore,
    white_result,
    black_result
  }
}

/**
 * Parse score value (handles "½", "0.5", "1", "0", "6", etc.)
 * Used for both team scores (0-8) and individual board scores (0-1)
 */
function parseScoreValue(scoreStr: string): number | null {
  if (!scoreStr) return null

  const cleaned = scoreStr.trim()

  // Handle half point notation
  if (cleaned === '½') return 0.5

  // Try parsing as float (handles all numeric values)
  const parsed = parseFloat(cleaned)
  if (!isNaN(parsed) && parsed >= 0) {
    return parsed
  }

  return null
}

/**
 * Extract player title from name string
 * Examples: "GM Fedoseev Vladimir" → { title: "GM", name: "Fedoseev Vladimir" }
 */
export function extractPlayerTitle(nameStr: string): { name: string; title?: string } {
  if (!nameStr) return { name: "" }

  const cleaned = nameStr.trim()

  // List of recognized titles
  const titles = ['GM', 'IM', 'FM', 'CM', 'WGM', 'WIM', 'WFM', 'WCM', 'NM']

  for (const title of titles) {
    const regex = new RegExp(`^${title}\\s+(.+)$`, 'i')
    const match = cleaned.match(regex)
    if (match) {
      return {
        title: title,
        name: match[1].trim()
      }
    }
  }

  return { name: cleaned }
}

/**
 * Calculate match result based on team scores
 */
export function calculateMatchResult(whiteScore: number, blackScore: number): "win" | "draw" | "loss" {
  if (whiteScore > blackScore) return "win"
  if (whiteScore < blackScore) return "loss"
  return "draw"
}

/**
 * Detect round number from filename
 * Examples: "Round_18.xlsx" → 18, "R6_pairings.xlsx" → 6
 */
export function detectRoundNumber(filename: string): number | null {
  if (!filename) return null

  // Pattern 1: "Round_18", "Round 18", "round18"
  let match = filename.match(/round[_\s]*(\d+)/i)
  if (match) return parseInt(match[1])

  // Pattern 2: "R18", "r6"
  match = filename.match(/\br(\d+)/i)
  if (match) return parseInt(match[1])

  // Pattern 3: Just a number in filename
  match = filename.match(/\b(\d+)\b/)
  if (match) {
    const num = parseInt(match[1])
    if (num >= 1 && num <= 30) return num // Reasonable round number range
  }

  return null
}

/**
 * Check if a string represents a team pairing number (e.g., "18.1", "6.2")
 */
export function isTeamPairingNumber(str: string): boolean {
  if (!str) return false
  return /^\d+\.\d+$/.test(str.trim())
}

/**
 * Check if a string represents a board number (1-8)
 */
export function isBoardNumber(str: string): boolean {
  if (!str) return false
  const cleaned = str.trim()
  const num = parseInt(cleaned)
  return !isNaN(num) && num >= 1 && num <= 8 && cleaned === String(num)
}

/**
 * Check if a string is a chess title
 */
export function isChessTitle(str: string): boolean {
  if (!str) return false
  const titles = ['GM', 'IM', 'FM', 'CM', 'WGM', 'WIM', 'WFM', 'WCM', 'NM']
  return titles.includes(str.trim().toUpperCase())
}

/**
 * Validate team score matches sum of board scores
 */
export function validateTeamScore(
  teamWhiteScore: number,
  teamBlackScore: number,
  boardScores: { white: number; black: number }[]
): { valid: boolean; message?: string } {
  const sumWhite = boardScores.reduce((sum, board) => sum + board.white, 0)
  const sumBlack = boardScores.reduce((sum, board) => sum + board.black, 0)

  const tolerance = 0.5 // Allow small rounding errors

  const whiteValid = Math.abs(sumWhite - teamWhiteScore) <= tolerance
  const blackValid = Math.abs(sumBlack - teamBlackScore) <= tolerance

  if (whiteValid && blackValid) {
    return { valid: true }
  }

  return {
    valid: false,
    message: `Score mismatch: Team shows ${teamWhiteScore}-${teamBlackScore}, boards sum to ${sumWhite}-${sumBlack}`
  }
}

/**
 * Clean cell value from Excel (remove extra spaces, handle null/undefined)
 */
export function cleanCell(val: any): string {
  if (val === null || val === undefined) return ""
  return String(val).trim()
}

/**
 * Parse integer value, returning null for invalid/empty values
 */
export function parseIntOrNull(val: any): number | null {
  if (val === null || val === undefined) return null
  const cleaned = cleanCell(val)
  if (!cleaned || cleaned === '-' || cleaned === '0') return null
  const num = parseInt(cleaned, 10)
  return isNaN(num) ? null : num
}
