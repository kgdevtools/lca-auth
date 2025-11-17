import * as XLSX from "xlsx"
import { parseDate } from "@/lib/dateUtils"

/**
 * Round Robin Tournament Parser
 * Handles individual round robin tournaments with cross-table format
 * In cross-tables, numeric headers (1, 2, 3) represent opponent RANKS, not round numbers
 */

export interface TournamentMetadata {
  tournament_name?: string
  organizer?: string
  federation?: string
  chief_arbiter?: string
  deputy_chief_arbiter?: string
  tournament_director?: string
  arbiter?: string
  time_control?: string
  rate_of_play?: string
  location?: string
  rounds?: number | null
  tournament_type?: string
  rating_calculation?: string
  date?: string
  average_elo?: number | null
  average_age?: number | null
  source?: string
}

export interface PlayerRanking {
  rank: number
  name?: string
  federation?: string
  rating: number | null
  rounds: any[]
  points: number | null
  tie_breaks: Record<string, number | null>
}

export interface TournamentData {
  tournament_metadata: TournamentMetadata
  player_rankings: PlayerRanking[]
}

export class RoundRobinParser {
  private fileName: string

  constructor(fileName: string) {
    this.fileName = fileName
  }

  public parse(buffer: Buffer): TournamentData {
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

    console.log("=== ROUND ROBIN PARSER DEBUG ===")
    console.log("Total rows:", rows.length)
    console.log("Sheet name:", sheetName)

    // Print first 20 rows to analyze structure
    console.log("\n=== RAW EXCEL DATA ===")
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      console.log(`Row ${i}:`, JSON.stringify(rows[i]))
    }

    const metadata = this.extractMetadata(rows)
    const playerRankings = this.extractPlayers(rows)

    console.log("\n=== FINAL RESULTS ===")
    console.log("Tournament name:", metadata.tournament_name)
    console.log("Tournament type:", metadata.tournament_type)
    console.log("Date:", metadata.date)
    console.log("Players extracted:", playerRankings.length)

    if (playerRankings.length > 0) {
      console.log("\n=== SAMPLE PLAYER DATA ===")
      const samplePlayer = playerRankings[0]
      console.log("First player:", samplePlayer.name, "Rank:", samplePlayer.rank)
      console.log("Rounds extracted:", samplePlayer.rounds.length)
      console.log("Tie-breaks extracted:", Object.keys(samplePlayer.tie_breaks).length)

      if (samplePlayer.rounds.length > 0) {
        console.log("Sample rounds:", JSON.stringify(samplePlayer.rounds.slice(0, 3), null, 2))
      }
    }

    return {
      tournament_metadata: metadata,
      player_rankings: playerRankings,
    }
  }

  private extractMetadata(rows: any[][]): TournamentMetadata {
    const metadata: TournamentMetadata = {
      tournament_type: "Round robin"
    }

    console.log("\n=== METADATA EXTRACTION ===")

    // Extract tournament name from first few rows
    let tournamentName = ""

    // Try Row 0
    if (rows.length > 0 && rows[0] && rows[0][0]) {
      const row0Val = this.cleanCell(rows[0][0])
      // Skip if it's just a URL
      if (!/^http/i.test(row0Val)) {
        tournamentName = row0Val
        console.log(`Row 0 tournament name: "${tournamentName}"`)
      }
    }

    // If Row 1 exists and looks like part of the name, append it
    if (rows.length > 1 && rows[1] && rows[1][0]) {
      const row1Content = this.cleanCell(rows[1][0])
      if (row1Content &&
          !row1Content.toLowerCase().includes('final') &&
          !row1Content.toLowerCase().includes('ranking') &&
          !row1Content.toLowerCase().includes('organizer') &&
          !/^http/i.test(row1Content) &&
          row1Content.length > 0) {
        tournamentName += ` ${row1Content}`
        console.log(`Appending Row 1 to tournament name`)
      }
    }

    metadata.tournament_name = tournamentName
    console.log(`Final tournament name: "${metadata.tournament_name}"`)

    // Look for metadata fields in early rows
    for (let i = 0; i < Math.min(30, rows.length); i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      const firstCell = this.cleanCell(row[0])
      if (!firstCell) continue

      // Stop when we hit ranking section or header row
      const lowerCell = firstCell.toLowerCase()
      if (lowerCell.includes('final ranking') ||
          lowerCell.includes('ranking crosstable') ||
          lowerCell.includes('crosstable') ||
          lowerCell.includes('final standing') ||
          /^(rank|rk\.?)$/i.test(firstCell)) {
        console.log(`Stopping metadata search at row ${i}`)
        break
      }

      const fullRowText = row.join(' ')

      // Extract metadata fields
      if (/organizer/i.test(firstCell)) {
        metadata.organizer = this.extractAfterColon(fullRowText)
        console.log(`Organizer: ${metadata.organizer}`)
      }

      if (/federation/i.test(firstCell)) {
        metadata.federation = this.extractAfterColon(fullRowText)
        console.log(`Federation: ${metadata.federation}`)
      }

      if (/chief arbiter/i.test(firstCell) && !/deputy/i.test(firstCell)) {
        metadata.chief_arbiter = this.extractAfterColon(fullRowText)
        console.log(`Chief arbiter: ${metadata.chief_arbiter}`)
      }

      if (/deputy chief arbiter/i.test(firstCell)) {
        metadata.deputy_chief_arbiter = this.extractAfterColon(fullRowText)
        console.log(`Deputy chief arbiter: ${metadata.deputy_chief_arbiter}`)
      }

      if (/tournament director/i.test(firstCell)) {
        metadata.tournament_director = this.extractAfterColon(fullRowText)
        console.log(`Tournament director: ${metadata.tournament_director}`)
      }

      if (/arbiter/i.test(firstCell) && !/chief|deputy/i.test(firstCell)) {
        metadata.arbiter = this.extractAfterColon(fullRowText)
        console.log(`Arbiter: ${metadata.arbiter}`)
      }

      if (/time control/i.test(firstCell)) {
        const timeInfo = this.extractAfterColon(fullRowText)
        if (timeInfo) {
          const match = timeInfo.match(/([^(]+?)(?:\s*\(([^)]+)\))?$/)
          if (match) {
            metadata.time_control = match[1].trim()
            metadata.rate_of_play = match[2]?.trim()
          } else {
            metadata.time_control = timeInfo
          }
          console.log(`Time control: ${metadata.time_control}, Rate: ${metadata.rate_of_play}`)
        }
      }

      if (/location/i.test(firstCell) || /town/i.test(firstCell)) {
        metadata.location = this.extractAfterColon(fullRowText)
        console.log(`Location: ${metadata.location}`)
      }

      if (/date/i.test(firstCell)) {
        const rawDate = this.extractAfterColon(fullRowText)
        if (rawDate) {
          metadata.date = parseDate(rawDate)
          console.log(`Date: raw="${rawDate}", parsed="${metadata.date}"`)
        }
      }

      if (/rounds/i.test(firstCell) && /\d+/.test(firstCell)) {
        const roundMatch = firstCell.match(/(\d+)/)
        if (roundMatch) {
          metadata.rounds = parseInt(roundMatch[1])
          console.log(`Rounds: ${metadata.rounds}`)
        }
      }

      // Extract Rating-Ø / Average age
      if (/rating-ø/i.test(firstCell) || /average age/i.test(firstCell)) {
        const ratingAgeText = this.extractAfterColon(fullRowText)
        if (ratingAgeText) {
          const parts = ratingAgeText.split('/')
          if (parts.length === 2) {
            const elo = this.parseNumber(parts[0].trim())
            const age = this.parseFloat(parts[1].trim())
            if (elo !== null) metadata.average_elo = elo
            if (age !== null) metadata.average_age = age
            console.log(`Average ELO: ${metadata.average_elo}, Average age: ${metadata.average_age}`)
          }
        }
      }
    }

    metadata.source = this.fileName
    return metadata
  }

  private extractPlayers(rows: any[][]): PlayerRanking[] {
    console.log("\n=== PLAYER EXTRACTION (ROUND ROBIN CROSS-TABLE) ===")

    const headerRowIndex = this.findPlayerHeaderRow(rows)
    if (headerRowIndex === -1) {
      console.log("ERROR: Could not find player header row!")
      return []
    }

    console.log(`Player header row found at index: ${headerRowIndex}`)
    const headers = rows[headerRowIndex].map((h: any) => this.cleanCell(h))

    const columnMap = this.buildColumnMap(headers)
    console.log(`Column mapping complete. Opponent rank columns: ${columnMap.opponentRankColumns.length}`)

    // First pass: Extract basic player info
    const players: PlayerRanking[] = []
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue
      if (this.isFooterRow(row)) break

      const player = this.buildPlayerFromRow(row, columnMap, [])
      if (player) {
        players.push(player)
      }
    }

    console.log(`\nExtracted ${players.length} players`)

    // Second pass: Extract rounds with opponent rank mapping
    for (let i = 0; i < players.length; i++) {
      const player = players[i]
      const rowIndex = headerRowIndex + 1 + i
      const row = rows[rowIndex]

      if (!row) continue

      // Extract rounds from opponent rank columns
      for (const opponentCol of columnMap.opponentRankColumns || []) {
        const cellValue = this.cleanCell(row[opponentCol.columnIndex] || '')

        // Skip if it's an asterisk (player vs themselves)
        if (cellValue === '*') {
          console.log(`Player ${player.rank} vs opponent rank ${opponentCol.opponentRank}: SELF (skipped)`)
          continue
        }

        // Parse the cell to get result
        const roundData = this.parseRoundRobinCell(cellValue, opponentCol.opponentRank, players)
        if (roundData) {
          player.rounds.push(roundData)
        }
      }

      if (i < 2) {
        console.log(`\n--- SAMPLE PLAYER ${i + 1}: ${player.name} ---`)
        console.log(`Rank: ${player.rank}, Rounds: ${player.rounds.length}`)
        if (player.rounds.length > 0) {
          console.log(`Sample round:`, JSON.stringify(player.rounds[0]))
        }
      }
    }

    return players
  }

  private findPlayerHeaderRow(rows: any[][]): number {
    // Find ranking section first (various formats)
    let searchStart = 0
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (row && row[0]) {
        const cell = this.cleanCell(row[0]).toLowerCase()
        // Look for various ranking text patterns
        if (cell.includes('final ranking') ||
            cell.includes('ranking crosstable') ||
            cell.includes('crosstable') ||
            cell.includes('final standing')) {
          searchStart = i + 1
          console.log(`Found ranking section at row ${i}: "${cell}", searching headers from row ${searchStart}`)
          break
        }
      }
    }

    // Look for header row
    for (let i = searchStart; i < Math.min(searchStart + 10, rows.length); i++) {
      const row = rows[i]
      if (!row || row.length < 4) continue

      const cells = row.map((c: any) => this.cleanCell(c).toLowerCase())
      const hasRank = cells.some((c: string) => /^(rank|rk\.?)$/.test(c))
      const hasName = cells.some((c: string) => c === 'name')

      if (hasRank && hasName) {
        console.log(`Header row confirmed at index ${i}`)
        return i
      }
    }

    return -1
  }

  private buildColumnMap(headers: string[]): any {
    const map: any = {
      opponentRankColumns: [], // Cross-table opponent columns
      tieBreakColumns: []
    }

    console.log("\n=== COLUMN MAPPING (CROSS-TABLE) ===")

    for (let i = 0; i < headers.length; i++) {
      const header = this.cleanCell(headers[i]).toLowerCase()

      // Basic columns
      if (/^(rank|rk\.?)$/.test(header)) map.rank = i
      if (/^(sno\.?|no\.?)$/.test(header)) map.playerNumber = i
      if (header === 'name') map.name = i
      if (/^(rtg|rating)$/.test(header)) map.rating = i
      if (/^(fed|federation)$/.test(header)) map.federation = i
      if (/^(pts\.?|points)$/.test(header)) map.points = i

      // In round robin cross-tables, numeric-only headers represent opponent RANKS
      // NOT round numbers like in Swiss tournaments
      if (/^\d+$/.test(header)) {
        const opponentRank = parseInt(header)
        map.opponentRankColumns.push({
          opponentRank,      // The rank of the opponent (1, 2, 3, etc.)
          columnIndex: i     // Column position in Excel
        })
        console.log(`Opponent rank ${opponentRank} mapped to column ${i}`)
      }

      // Tie-break columns
      if (/^(sb|sonneborn)/i.test(header)) {
        map.tieBreakColumns.push({ index: i, name: "TB1" })
      } else if (/^(bh|buchholz)/i.test(header)) {
        map.tieBreakColumns.push({ index: i, name: "TB2" })
      } else if (/^(de|direct encounter)/i.test(header)) {
        map.tieBreakColumns.push({ index: i, name: "TB3" })
      } else if (/^ratp$/i.test(header)) {
        map.tieBreakColumns.push({ index: i, name: "TB5" })
      } else if (/^(aro|average rating)/i.test(header)) {
        map.tieBreakColumns.push({ index: i, name: "ARO" })
      } else if (/^tb\d+$/i.test(header)) {
        const tbMatch = header.match(/tb(\d+)/i)
        if (tbMatch) {
          map.tieBreakColumns.push({ index: i, name: `TB${tbMatch[1]}` })
        }
      }
    }

    return map
  }

  private buildPlayerFromRow(row: any[], columnMap: any, players: PlayerRanking[]): PlayerRanking | null {
    const rank = columnMap.rank !== undefined ? this.parseNumber(row[columnMap.rank]) : null
    const name = columnMap.name !== undefined ? this.cleanCell(row[columnMap.name]) : ''

    if (!rank && !name) return null

    const player: PlayerRanking = {
      rank: rank || 0,
      name: name || undefined,
      federation: columnMap.federation !== undefined ? this.cleanCell(row[columnMap.federation]) : undefined,
      rating: columnMap.rating !== undefined ? this.parseNumber(row[columnMap.rating]) : null,
      points: columnMap.points !== undefined ? this.parseFloat(row[columnMap.points]) : null,
      rounds: [],
      tie_breaks: {}
    }

    // Extract tie-breaks
    for (const tbCol of columnMap.tieBreakColumns || []) {
      const value = this.parseFloat(row[tbCol.index])
      if (value !== null) {
        player.tie_breaks[tbCol.name] = value
      }
    }

    return player
  }

  /**
   * Parse a round robin cross-table cell
   * @param cellValue - The cell value (e.g., "1", "0", "½", "+", "-", "w", "d", "l")
   * @param opponentRank - The rank of the opponent (from column header)
   * @param players - All players to look up opponent details
   */
  private parseRoundRobinCell(cellValue: string, opponentRank: number, players: PlayerRanking[]): any {
    if (!cellValue || cellValue === '' || cellValue === '-') {
      return null // No game
    }

    // Find opponent by rank
    const opponent = players.find(p => p.rank === opponentRank)

    // Parse result from cell
    let result: "win" | "loss" | "draw" | null = null

    // Common formats in round robin cross-tables:
    // "1" or "+" or "w" = win
    // "0" or "-" or "l" = loss
    // "½" or "=" or "d" = draw

    const lowerCell = cellValue.toLowerCase()

    if (cellValue === '1' || lowerCell === '+' || lowerCell === 'w' || lowerCell === 'win') {
      result = "win"
    } else if (cellValue === '0' || lowerCell === '-' || lowerCell === 'l' || lowerCell === 'loss') {
      result = "loss"
    } else if (cellValue === '½' || cellValue === '0.5' || lowerCell === '=' || lowerCell === 'd' || lowerCell === 'draw') {
      result = "draw"
    }

    // Build round data
    return {
      opponent: opponent ? opponent.name : `Rank ${opponentRank}`, // Opponent name or rank reference
      opponentRating: opponent ? opponent.rating : null,           // Opponent's rating
      color: null,                                                  // No color info in cross-table
      result,
      raw: cellValue
    }
  }

  private extractAfterColon(text: string): string | undefined {
    const parts = text.split(':')
    return parts.length > 1 ? parts.slice(1).join(':').trim() : undefined
  }

  private isFooterRow(row: any[]): boolean {
    const text = row.map(cell => this.cleanCell(cell)).join(' ').toLowerCase()
    return text.includes('program') ||
           text.includes('swiss-manager') ||
           text.includes('chess-results') ||
           text.includes('http')
  }

  private cleanCell(val: any): string {
    return val === null || val === undefined ? "" : String(val).trim()
  }

  private parseNumber(val: any): number | null {
    const cleaned = this.cleanCell(val)
    if (!cleaned || cleaned === '-') return null
    const n = parseInt(cleaned, 10)
    return isNaN(n) ? null : n
  }

  private parseFloat(val: any): number | null {
    const cleaned = this.cleanCell(val)
    if (!cleaned || cleaned === '-') return null
    const n = parseFloat(cleaned)
    return isNaN(n) ? null : n
  }
}

export function parseRoundRobinExcelToJson(buffer: Buffer, fileName = "uploaded.xlsx"): TournamentData {
  const parser = new RoundRobinParser(fileName)
  return parser.parse(buffer)
}
