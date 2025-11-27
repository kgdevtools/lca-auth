import * as XLSX from "xlsx"
import { parseDate } from "@/lib/dateUtils"
import {
  parseTeamScore,
  parseBoardResult,
  extractPlayerTitle,
  detectRoundNumber,
  isTeamPairingNumber,
  isBoardNumber,
  isChessTitle,
  validateTeamScore,
  cleanCell,
  parseIntOrNull
} from "@/lib/teamTournamentUtils"

/**
 * Team Tournament Parser
 * Parses individual round files from team tournaments
 */

export interface TeamTournamentMetadata {
  tournament_name?: string
  organizer?: string
  chief_arbiter?: string
  deputy_chief_arbiter?: string
  tournament_director?: string
  arbiter?: string
  location?: string
  date?: string
  round_number?: number
  round_date?: string
}

export interface BoardPairing {
  board_number: number
  white_player: string | null
  black_player: string | null
  white_rating: number | null
  black_rating: number | null
  white_title?: string
  black_title?: string
  result: string // "1:0", "0:1", "½:½"
  white_score: number
  black_score: number
  white_result: "win" | "draw" | "loss" | "forfeit"
  black_result: "win" | "draw" | "loss" | "forfeit"
}

export interface TeamPairing {
  pairing_number: string // "18.1", "6.2"
  team_white: string
  team_black: string
  team_white_rank?: number
  team_black_rank?: number
  team_white_score: number
  team_black_score: number
  is_forfeit: boolean
  board_pairings: BoardPairing[]
}

export interface TeamRoundData {
  tournament_metadata: TeamTournamentMetadata
  team_pairings: TeamPairing[]
}

export class TeamTournamentParser {
  private fileName: string

  constructor(fileName: string) {
    this.fileName = fileName
  }

  public parse(buffer: Buffer): TeamRoundData {
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

    console.log("=== TEAM TOURNAMENT PARSER DEBUG ===")
    console.log("File:", this.fileName)
    console.log("Total rows:", rows.length)
    console.log("Sheet name:", sheetName)

    // Print first 20 rows for debugging
    console.log("\n=== RAW EXCEL DATA ===")
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      console.log(`Row ${i}:`, JSON.stringify(rows[i]))
    }

    const metadata = this.extractMetadata(rows)
    const teamPairings = this.extractTeamPairings(rows)

    console.log("\n=== FINAL RESULTS ===")
    console.log("Tournament name:", metadata.tournament_name)
    console.log("Round number:", metadata.round_number)
    console.log("Team pairings extracted:", teamPairings.length)

    if (teamPairings.length > 0) {
      console.log("\n=== SAMPLE TEAM PAIRING ===")
      const sample = teamPairings[0]
      console.log(`Pairing: ${sample.pairing_number}`)
      console.log(`Teams: ${sample.team_white} (${sample.team_white_score}) vs ${sample.team_black} (${sample.team_black_score})`)
      console.log(`Board pairings: ${sample.board_pairings.length}`)
      if (sample.board_pairings.length > 0) {
        console.log("First board:", JSON.stringify(sample.board_pairings[0], null, 2))
      }
    }

    return {
      tournament_metadata: metadata,
      team_pairings: teamPairings
    }
  }

  private extractMetadata(rows: any[][]): TeamTournamentMetadata {
    const metadata: TeamTournamentMetadata = {}

    console.log("\n=== METADATA EXTRACTION ===")

    // Tournament name from Row 0
    if (rows.length > 0 && rows[0] && rows[0][0]) {
      metadata.tournament_name = cleanCell(rows[0][0])
      console.log(`Row 0 tournament name: "${metadata.tournament_name}"`)
    }

    // Age/Section from Row 1 - append to tournament name
    if (rows.length > 1 && rows[1] && rows[1][0]) {
      const row1Content = cleanCell(rows[1][0])
      // Check if it looks like a section (U/13A, U15, etc.) or part of the name
      if (row1Content &&
          !row1Content.toLowerCase().includes('organizer') &&
          !row1Content.toLowerCase().includes('round')) {
        metadata.tournament_name = `${metadata.tournament_name} ${row1Content}`.trim()
        console.log(`Appended Row 1, final name: "${metadata.tournament_name}"`)
      }
    }

    // Scan rows 2-15 for metadata fields
    for (let i = 2; i < Math.min(20, rows.length); i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      const firstCell = cleanCell(row[0])
      if (!firstCell) continue

      // Stop when we hit team pairing pattern
      if (isTeamPairingNumber(firstCell)) {
        console.log(`Stopping metadata scan at row ${i} (found team pairing)`)
        break
      }

      // Extract metadata using colon separator
      const fullRowText = row.join(' ')

      if (/organizer/i.test(firstCell)) {
        metadata.organizer = this.extractAfterColon(fullRowText)
        console.log(`Organizer: ${metadata.organizer}`)
      }

      if (/tournament director/i.test(firstCell)) {
        metadata.tournament_director = this.extractAfterColon(fullRowText)
        console.log(`Tournament Director: ${metadata.tournament_director}`)
      }

      if (/chief arbiter/i.test(firstCell) && !/deputy/i.test(firstCell)) {
        const arbiterInfo = this.extractAfterColon(fullRowText)
        // Remove license number in parentheses if present
        metadata.chief_arbiter = arbiterInfo?.replace(/\s*\([^)]+\)/, '').trim()
        console.log(`Chief Arbiter: ${metadata.chief_arbiter}`)
      }

      if (/deputy chief arbiter/i.test(firstCell)) {
        const arbiterInfo = this.extractAfterColon(fullRowText)
        metadata.deputy_chief_arbiter = arbiterInfo?.replace(/\s*\([^)]+\)/, '').trim()
        console.log(`Deputy Chief Arbiter: ${metadata.deputy_chief_arbiter}`)
      }

      if (/arbiter/i.test(firstCell) && !/chief|deputy/i.test(firstCell)) {
        metadata.arbiter = this.extractAfterColon(fullRowText)
        console.log(`Arbiter: ${metadata.arbiter}`)
      }

      if (/town|location/i.test(firstCell)) {
        metadata.location = this.extractAfterColon(fullRowText)
        console.log(`Location: ${metadata.location}`)
      }

      if (/^date\s*:/i.test(firstCell)) {
        const rawDate = this.extractAfterColon(fullRowText)
        if (rawDate) {
          metadata.date = parseDate(rawDate)
          console.log(`Date: ${metadata.date}`)
        }
      }

      // Round information: "Round 18 on 2025/10/30 at 14:00"
      if (/^round\s+\d+/i.test(firstCell)) {
        const roundMatch = firstCell.match(/round\s+(\d+)/i)
        if (roundMatch) {
          metadata.round_number = parseInt(roundMatch[1])
          console.log(`Round number: ${metadata.round_number}`)
        }

        // Extract round date if present
        const dateMatch = fullRowText.match(/on\s+([\d/\-]+)/)
        if (dateMatch) {
          metadata.round_date = parseDate(dateMatch[1])
          console.log(`Round date: ${metadata.round_date}`)
        }
      }
    }

    // Fallback: Try to detect round number from filename
    if (!metadata.round_number) {
      const roundFromFile = detectRoundNumber(this.fileName)
      if (roundFromFile) {
        metadata.round_number = roundFromFile
        console.log(`Round number from filename: ${metadata.round_number}`)
      }
    }

    return metadata
  }

  private extractTeamPairings(rows: any[][]): TeamPairing[] {
    console.log("\n=== TEAM PAIRING EXTRACTION ===")

    const pairings: TeamPairing[] = []
    let currentPairing: TeamPairing | null = null
    let currentPairingRowIndex = -1

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      const colA = cleanCell(row[0])

      // Check if this is a team pairing header row
      if (isTeamPairingNumber(colA)) {
        // Save previous pairing if exists
        if (currentPairing) {
          pairings.push(currentPairing)
        }

        // Parse new team pairing
        currentPairing = this.parseTeamPairingRow(row, i)
        currentPairingRowIndex = i

        if (currentPairing) {
          console.log(`\n--- Team Pairing ${currentPairing.pairing_number} ---`)
          console.log(`White: ${currentPairing.team_white} (${currentPairing.team_white_score})`)
          console.log(`Black: ${currentPairing.team_black} (${currentPairing.team_black_score})`)
        }
      }
      // Check if this is a board pairing row
      else if (currentPairing && isBoardNumber(colA)) {
        const boardPairing = this.parseBoardPairingRow(row, i, currentPairingRowIndex)
        if (boardPairing) {
          currentPairing.board_pairings.push(boardPairing)
          console.log(`  Board ${boardPairing.board_number}: ${boardPairing.white_player} vs ${boardPairing.black_player} (${boardPairing.result})`)
        }
      }
    }

    // Don't forget the last pairing
    if (currentPairing) {
      pairings.push(currentPairing)
    }

    // Validate each pairing
    for (const pairing of pairings) {
      this.validatePairing(pairing)
    }

    return pairings
  }

  private parseTeamPairingRow(row: any[], rowIndex: number): TeamPairing | null {
    // Actual format found in files:
    // Col A: Pairing number (e.g., "1.1", "18.2")
    // Col B: White team rank (optional)
    // Col C: White team name
    // Col D: (empty - sometimes merged cell)
    // Col E: Match score (e.g., "6 - 0", "4½ - 1½")
    // Col F: Black team rank (optional)
    // Col G: Black team name

    const pairingNumber = cleanCell(row[0])
    const colB = cleanCell(row[1])
    const colC = cleanCell(row[2])
    const colD = cleanCell(row[3])
    const colE = cleanCell(row[4])
    const colF = cleanCell(row[5])
    const colG = cleanCell(row[6])

    console.log(`Row ${rowIndex} cells: A="${pairingNumber}" B="${colB}" C="${colC}" D="${colD}" E="${colE}" F="${colF}" G="${colG}"`)

    // Try to detect which column has the score
    // It could be in colD or colE depending on the file format
    let scoreColumn = ""
    let whiteName = ""
    let blackName = ""
    let whiteRank: number | undefined
    let blackRank: number | undefined

    // Check if colD has a score pattern (contains "-" or ":")
    const colDHasScore = colD && /[\-–:½]/.test(colD)
    const colEHasScore = colE && /[\-–:½]/.test(colE)

    if (colEHasScore && colG) {
      // Format: A=pairing | B=white_rank | C=white_name | D=empty | E=score | F=black_rank | G=black_name
      scoreColumn = colE
      whiteRank = parseIntOrNull(colB) ?? undefined
      whiteName = colC
      blackRank = parseIntOrNull(colF) ?? undefined
      blackName = colG
    } else if (colDHasScore && colF) {
      // Format: A=pairing | B=white_rank | C=white_name | D=score | E=black_rank | F=black_name
      scoreColumn = colD
      whiteRank = parseIntOrNull(colB) ?? undefined
      whiteName = colC
      blackRank = parseIntOrNull(colE) ?? undefined
      blackName = colF
    } else {
      console.warn(`Row ${rowIndex}: Could not detect score column`)
      return null
    }

    // Parse match score
    const scoreInfo = parseTeamScore(scoreColumn)
    if (!scoreInfo) {
      console.warn(`Row ${rowIndex}: Could not parse team score "${scoreColumn}"`)
      return null
    }

    return {
      pairing_number: pairingNumber,
      team_white: whiteName || "Unknown",
      team_black: blackName || "Unknown",
      team_white_rank: whiteRank,
      team_black_rank: blackRank,
      team_white_score: scoreInfo.white,
      team_black_score: scoreInfo.black,
      is_forfeit: scoreInfo.isForfeit,
      board_pairings: []
    }
  }

  private parseBoardPairingRow(row: any[], rowIndex: number, pairingStartRow: number): BoardPairing | null {
    // Detect format by checking if column B is a chess title
    const colB = cleanCell(row[1])
    const hasTitle = isChessTitle(colB)

    if (hasTitle) {
      return this.parseBoardPairingWithTitle(row, rowIndex)
    } else {
      return this.parseBoardPairingNoTitle(row, rowIndex)
    }
  }

  /**
   * Parse board pairing - Format 1: Local (no titles)
   * Actual format found in files:
   * Col A: Board number
   * Col B: (empty/null - reserved for title)
   * Col C: White player name
   * Col D: White rating
   * Col E: Result (e.g., "1 : 0", "0 : 1", ":")
   * Col F: (empty/null - reserved for title)
   * Col G: Black player name
   * Col H: Black rating
   */
  private parseBoardPairingNoTitle(row: any[], rowIndex: number): BoardPairing | null {
    const boardNum = parseInt(cleanCell(row[0]))

    // The actual format has columns B and F as null/empty (reserved for titles)
    // Players are in columns C and G
    const whiteName = cleanCell(row[2])  // Column C
    const whiteRating = parseIntOrNull(row[3])  // Column D
    const resultStr = cleanCell(row[4])  // Column E
    const blackName = cleanCell(row[6])  // Column G
    const blackRating = parseIntOrNull(row[7])  // Column H

    if (isNaN(boardNum)) {
      console.warn(`Row ${rowIndex}: Invalid board number`)
      return null
    }

    // Parse result
    const result = parseBoardResult(resultStr)
    if (!result) {
      console.warn(`Row ${rowIndex}: Could not parse result "${resultStr}"`)
      return null
    }

    console.log(`    Row ${rowIndex}: Board ${boardNum} | White: "${whiteName}" (${whiteRating}) | Result: "${resultStr}" (${result.result}) | Black: "${blackName}" (${blackRating})`)

    return {
      board_number: boardNum,
      white_player: whiteName === '-' || !whiteName ? null : whiteName,
      black_player: blackName === '-' || !blackName ? null : blackName,
      white_rating: whiteRating,
      black_rating: blackRating,
      result: result.result,
      white_score: result.white_score,
      black_score: result.black_score,
      white_result: result.white_result,
      black_result: result.black_result
    }
  }

  /**
   * Parse board pairing - Format 2: International (with titles)
   * Col A: Board number
   * Col B: White title
   * Col C: White player name
   * Col D: White rating
   * Col E: Result
   * Col F: Black title
   * Col G: Black player name
   * Col H: Black rating
   */
  private parseBoardPairingWithTitle(row: any[], rowIndex: number): BoardPairing | null {
    const boardNum = parseInt(cleanCell(row[0]))
    const whiteTitle = cleanCell(row[1])
    const whiteName = cleanCell(row[2])
    const whiteRating = parseIntOrNull(row[3])
    const resultStr = cleanCell(row[4])
    const blackTitle = cleanCell(row[5])
    const blackName = cleanCell(row[6])
    const blackRating = parseIntOrNull(row[7])

    if (isNaN(boardNum)) {
      console.warn(`Row ${rowIndex}: Invalid board number`)
      return null
    }

    // Parse result
    const result = parseBoardResult(resultStr)
    if (!result) {
      console.warn(`Row ${rowIndex}: Could not parse result "${resultStr}"`)
      return null
    }

    return {
      board_number: boardNum,
      white_player: whiteName === '-' || !whiteName ? null : whiteName,
      black_player: blackName === '-' || !blackName ? null : blackName,
      white_rating: whiteRating,
      black_rating: blackRating,
      white_title: whiteTitle || undefined,
      black_title: blackTitle || undefined,
      result: result.result,
      white_score: result.white_score,
      black_score: result.black_score,
      white_result: result.white_result,
      black_result: result.black_result
    }
  }

  private validatePairing(pairing: TeamPairing): void {
    // Validate board count
    const boardCount = pairing.board_pairings.length
    if (boardCount < 3 || boardCount > 8) {
      console.warn(`Warning: Unusual board count for pairing ${pairing.pairing_number}: ${boardCount} boards`)
    }

    // Validate team score matches sum of board scores
    const boardScores = pairing.board_pairings.map(b => ({
      white: b.white_score,
      black: b.black_score
    }))

    const validation = validateTeamScore(
      pairing.team_white_score,
      pairing.team_black_score,
      boardScores
    )

    if (!validation.valid) {
      console.warn(`Warning: Pairing ${pairing.pairing_number}: ${validation.message}`)
    }
  }

  private extractAfterColon(text: string): string | undefined {
    const parts = text.split(':')
    return parts.length > 1 ? parts.slice(1).join(':').trim() : undefined
  }
}

/**
 * Export function for easy use (similar to existing parsers)
 */
export function parseTeamTournamentExcel(buffer: Buffer, fileName = "uploaded.xlsx"): TeamRoundData {
  const parser = new TeamTournamentParser(fileName)
  return parser.parse(buffer)
}
