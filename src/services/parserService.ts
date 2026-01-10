import * as XLSX from "xlsx"
import { parseDate } from "@/lib/dateUtils"

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

export class ParserService {
  private fileName: string

  constructor(fileName: string) {
    this.fileName = fileName
  }

  public parse(buffer: Buffer): TournamentData {
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

    console.log("=== EXCEL FILE DEBUG ===")
    console.log("Total rows:", rows.length)

    // Print first 15 rows to see structure
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      console.log(`Row ${i}:`, JSON.stringify(rows[i]))
    }

    const metadata = this.extractMetadata(rows)
    const playerRankings = this.extractPlayers(rows)

    console.log("=== FINAL RESULTS ===")
    console.log("Tournament name:", metadata.tournament_name)
    console.log("Rounds from Final Ranking:", metadata.rounds)
    console.log("Date parsed:", metadata.date)
    console.log("Players extracted:", playerRankings.length)
    if (playerRankings.length > 0) {
      console.log("First player rounds structure:", playerRankings[0].rounds)
      console.log("First player tie_breaks:", playerRankings[0].tie_breaks)
    }

    return {
      tournament_metadata: metadata,
      player_rankings: playerRankings,
    }
  }

  private extractMetadata(rows: any[][]): TournamentMetadata {
    const metadata: TournamentMetadata = {}

    console.log("\n=== METADATA EXTRACTION ===")

    // Tournament name from A2 (row 1)
    if (rows.length > 1 && rows[1][0]) {
      metadata.tournament_name = this.cleanCell(rows[1][0])
      console.log("Tournament name from row 1:", metadata.tournament_name)
    }

    // Extract rounds count from "Final Ranking" text
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (row && row[0]) {
        const cell = this.cleanCell(row[0])
        const finalRankingMatch = cell.match(/final ranking.*after\s+(\d+)\s+rounds/i)
        if (finalRankingMatch) {
          metadata.rounds = parseInt(finalRankingMatch[1])
          console.log(`Found rounds count from "Final Ranking" text: ${metadata.rounds}`)
          break
        }
      }
    }

    for (const row of rows) {
      if (!row || row.length === 0) continue
      const cell = this.cleanCell(row[0])

      if (/organizer/i.test(cell)) metadata.organizer = row[0].split(":").pop()?.trim()
      if (/federation/i.test(cell)) metadata.federation = row[0].split(":").pop()?.trim()
      if (/chief arbiter/i.test(cell)) metadata.chief_arbiter = row[0].split(":").pop()?.trim()
      if (/deputy chief arbiter/i.test(cell)) metadata.deputy_chief_arbiter = row[0].split(":").pop()?.trim()
      if (/tournament director/i.test(cell)) metadata.tournament_director = row[0].split(":").pop()?.trim()
      if (/arbiter/i.test(cell) && !/chief|deputy/i.test(cell)) metadata.arbiter = row[0].split(":").pop()?.trim()

      if (/time control/i.test(cell)) {
        const raw = row[0].split(":").pop()?.trim()
        if (raw) {
          const match = raw.match(/(\d+\s*\+?\s*\d*'?)\s*\((.*?)\)/i)
          if (match) {
            metadata.time_control = match[1].trim()
            metadata.rate_of_play = match[2].trim()
            console.log("Time control parsed:", metadata.time_control, "Rate:", metadata.rate_of_play)
          } else {
            metadata.time_control = raw
            console.log("Time control (no rate):", metadata.time_control)
          }
        }
      }

      if (/location/i.test(cell)) metadata.location = row[0].split(":").pop()?.trim()
      if (/rounds?/i.test(cell) && !metadata.rounds) metadata.rounds = this.parseNumber(row[1])
      if (/type/i.test(cell)) metadata.tournament_type = row[0].split(":").pop()?.trim()

      if (/rating (calculation|type)/i.test(cell)) {
        metadata.rating_calculation = row[0].split(":").pop()?.trim()
      }

      // Date: parse with shared utility (handles ranges and Excel serial numbers)
      if (/date/i.test(cell)) {
        const rawDatePart = row[0].split(":").pop()?.trim()
        if (rawDatePart) {
          metadata.date = parseDate(rawDatePart)
          console.log("Date parsed:", metadata.date)
        }
      }

      if (/rating-ø/i.test(cell) || /average age/i.test(cell)) {
        const parts = cell.split(":").pop()?.trim().split("/")
        if (parts && parts.length === 2) {
          metadata.average_elo = this.parseNumber(parts[0])
          metadata.average_age = this.parseNumber(parts[1])
          console.log("Average ELO:", metadata.average_elo, "Average age:", metadata.average_age)
        }
      }
    }

    metadata.source = this.fileName
    console.log("Source set to filename:", metadata.source)

    return metadata
  }

  private extractPlayers(rows: any[][]): PlayerRanking[] {
    const players: PlayerRanking[] = []

    console.log("\n=== HEADER DETECTION ===")

    let headerIndex = -1
    const rankingPatterns = [
      'final ranking',
      'ranking crosstable', 
      'final rank',
      'rankings',
      'final ranking list',
      'tournament ranking',
      'crosstable',
      'ranking list',
      'standings',
      'final standings'
    ]
    
    let searchStart = -1
    for (const pattern of rankingPatterns) {
      const patternIndex = rows.findIndex(row =>
        row && this.cleanCell(row[0]).toLowerCase().includes(pattern)
      )
      if (patternIndex >= 0) {
        searchStart = patternIndex
        console.log(`Found ranking pattern '${pattern}' at row:`, patternIndex)
        break
      }
    }
    
    if (searchStart >= 0) {
      // Expand search range to 10 rows instead of 3
      for (let i = searchStart + 1; i <= Math.min(searchStart + 10, rows.length - 1); i++) {
        if (rows[i] && rows[i].length > 3) {
          const hasRankingColumn = rows[i].some((c: any) => {
            const cleaned = this.cleanCell(c).toLowerCase()
            return /^(rk\.?|rank|ranking|position|pos\.?|no\.?|#)$/i.test(cleaned)
          })
          
          if (hasRankingColumn) {
            headerIndex = i
            console.log(`Found header row at ${i} (${i - searchStart} after ranking section)`)
            console.log(`Header row content:`, JSON.stringify(rows[i].map((c: any) => this.cleanCell(c))))
            break
          } else {
            console.log(`Row ${i} skipped - no ranking column found. Content:`, JSON.stringify(rows[i].slice(0, 5).map((c: any) => this.cleanCell(c))))
          }
        }
      }
    }

    if (headerIndex === -1) {
      console.log("ERROR: No header row found!")
      return players
    }

    const headers = rows[headerIndex].map((h: any) => this.cleanCell(h))
    console.log("Headers:", headers)

    let rankIdx = -1, nameIdx = -1, fedIdx = -1, ratingIdx = -1, pointsIdx = -1
    const tbIndices: { [key: string]: number } = {}

    console.log("\n=== COLUMN MATCHING ===")
    
    for (let j = 0; j < headers.length; j++) {
      const header = this.cleanCell(headers[j]).toLowerCase()
      if (!header) continue

      // Enhanced rank column matching
      if (rankIdx === -1 && /^(rk\.?|rank|ranking|position|pos\.?|no\.?|#)$/i.test(header)) {
        rankIdx = j
        console.log(`Found rank column at index ${j}: "${headers[j]}"`)
      }
      
      // Enhanced name column matching  
      if (nameIdx === -1 && /^(name|player|participant|competitor)$/i.test(header)) {
        nameIdx = j
        console.log(`Found name column at index ${j}: "${headers[j]}"`)
      }
      
      // Enhanced federation column matching
      if (fedIdx === -1 && /^(fed|federation|country|nat)$/i.test(header)) {
        fedIdx = j
        console.log(`Found federation column at index ${j}: "${headers[j]}"`)
      }
      
      // Enhanced rating column matching
      if (ratingIdx === -1 && /^(rtg|rating|elo|fide|nat\.?rating)$/i.test(header)) {
        ratingIdx = j
        console.log(`Found rating column at index ${j}: "${headers[j]}"`)
      }
      
      // Enhanced points column matching
      if (pointsIdx === -1 && /^(pts\.?|points|score|total)$/i.test(header)) {
        pointsIdx = j
        console.log(`Found points column at index ${j}: "${headers[j]}"`)
      }
      
      // Tie-break columns
      if (/^tb\d+$/i.test(header)) {
        tbIndices[header.toUpperCase()] = j
        console.log(`Found tie-break column at index ${j}: "${headers[j]}"`)
      }
    }

    console.log("Column mapping:", { rankIdx, nameIdx, fedIdx, ratingIdx, pointsIdx, tbIndices })

    console.log("\n=== PLAYER PROCESSING ===")
    let processedPlayers = 0
    let skippedRows = 0

    for (let i = headerIndex + 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) {
        console.log(`Row ${i}: Empty row, continuing`)
        continue
      }

      const rank = rankIdx >= 0 ? this.parseNumber(row[rankIdx]) : null
      const name = nameIdx >= 0 ? this.cleanCell(row[nameIdx]) : ''

      // More detailed debugging for skipped rows
      if (!rank || !name) {
        skippedRows++
        console.log(`Skipping row ${i}: rank=${rank} (col ${rankIdx}), name="${name}" (col ${nameIdx})`)
        console.log(`  Row data:`, JSON.stringify(row.slice(0, 5).map((c: any) => this.cleanCell(c))))
        continue
      }

      console.log(`\n--- Processing player ${rank}: ${name} ---`)
      console.log(`Row ${i} data:`, JSON.stringify(row.slice(0, Math.min(8, row.length)).map((c: any) => this.cleanCell(c))))
      processedPlayers++

      const player: PlayerRanking = {
        rank: rank,
        name: name,
        federation: fedIdx >= 0 ? this.cleanCell(row[fedIdx]) : undefined,
        rating: ratingIdx >= 0 ? this.parseNumber(row[ratingIdx]) : null,
        rounds: [],
        points: pointsIdx >= 0 ? this.parseFloat(row[pointsIdx]) : null,
        tie_breaks: {},
      }

      const roundColumns = []
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j]
        if (this.isRoundHeader(header)) {
          roundColumns.push({ index: j, header })
        }
      }

      console.log(`Round columns found: ${roundColumns.length}`)
      if (roundColumns.length > 0) {
        console.log(`Round headers:`, roundColumns.map(rc => rc.header))
      }

      let roundsProcessed = 0
      for (const roundCol of roundColumns) {
        const val = this.cleanCell(row[roundCol.index])
        if (val && val !== '-') {
          const parsedRound = this.parseRoundResult(val)
          if (parsedRound) {
            player.rounds.push(parsedRound)
            roundsProcessed++
          } else {
            console.log(`  Failed to parse round result at col ${roundCol.index}: "${val}"`)
          }
        }
      }

      let tieBreaksProcessed = 0
      for (const [tbName, tbIndex] of Object.entries(tbIndices)) {
        const value = this.parseFloat(row[tbIndex])
        if (value !== null) {
          player.tie_breaks[tbName] = value
          tieBreaksProcessed++
        }
      }

      console.log(`  Rounds processed: ${roundsProcessed}, Tie-breaks: ${tieBreaksProcessed}`)
      players.push(player)
    }

    console.log(`\n=== PLAYER PROCESSING SUMMARY ===`)
    console.log(`Total rows processed: ${rows.length - headerIndex - 1}`)
    console.log(`Players successfully processed: ${processedPlayers}`)
    console.log(`Rows skipped: ${skippedRows}`)
    console.log(`Final player count: ${players.length}`)

    return players
  }

  private parseRoundResult(val: string) {
    const clean = this.cleanCell(val)
    if (!clean) {
      console.log(`    Round parsing: empty value`)
      return null
    }

    // Enhanced patterns to match more chess result formats
    const patterns = [
      /(\d+)([wb])([01½])/i,  // Standard: 123w1, 45b½, etc.
      /(\d+)\s*([wb])\s*([01½])/i,  // With spaces: 123 w 1
      /(\d+)-([wb])-([01½])/i,  // With dashes: 123-w-1
      /^(\d+)([bw])([=\+\-])$/i,  // Alternative result chars: 123w+, 123b=, 123w-
    ]

    for (const pattern of patterns) {
      const match = clean.match(pattern)
      if (match) {
        let result: "win" | "loss" | "draw" | null = null
        const resultChar = match[3]
        
        if (resultChar === '1' || resultChar === '+') result = "win"
        else if (resultChar === '0' || resultChar === '-') result = "loss"
        else if (resultChar === '½' || resultChar === '=') result = "draw"

        const parsed = {
          opponent: match[1],
          color: match[2].toLowerCase() === 'w' ? 'white' : 'black',
          result,
          raw: clean
        }
        
        console.log(`    Round parsed successfully:`, parsed)
        return parsed
      }
    }

    console.log(`    Round parsing failed for value: "${clean}" - tried ${patterns.length} patterns`)
    return null
  }

  private isRoundHeader(header: string): boolean {
    const clean = this.cleanCell(header)
    // Enhanced round header patterns
    return /^\d+\.rd\.?$/i.test(clean) ||  // 1.rd, 2.RD
           /^r\d+$/i.test(clean) ||        // R1, R2, R10
           /^round\s*\d+$/i.test(clean) ||  // Round 1, ROUND 2
           /^\d+$/i.test(clean)             // 1, 2, 3 (if column is just a number)
  }

  private looksLikeRoundResult(val: string): boolean {
    const clean = this.cleanCell(val)
    return /^\s*\d+[bw][01½]\s*$/.test(clean)
  }

  private cleanCell(val: any): string {
    return val ? String(val).trim() : ""
  }

  private parseNumber(val: any): number | null {
    if (!val) return null
    const cleaned = this.cleanCell(val)
    if (!cleaned) return null
    const n = parseInt(cleaned, 10)
    return isNaN(n) ? null : n
  }

  private parseFloat(val: any): number | null {
    if (!val) return null
    const cleaned = this.cleanCell(val)
    if (!cleaned) return null
    const n = Number(cleaned)
    return isNaN(n) ? null : n
  }
}

export function parseExcelToJson(buffer: Buffer, fileName = "uploaded.xlsx") {
  const parser = new ParserService(fileName)
  return parser.parse(buffer)
}