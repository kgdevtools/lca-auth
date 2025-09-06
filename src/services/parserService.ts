import * as XLSX from "xlsx"

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
  rounds: any[] // Changed back to array structure
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

    // PATCH 1: Tournament name from A2 (row 1), not A1 (row 0)
    if (rows.length > 1 && rows[1][0]) {
      metadata.tournament_name = this.cleanCell(rows[1][0])
      console.log("Tournament name from row 1:", metadata.tournament_name)
    }

    // PATCH 2: Extract rounds count from "Final Ranking" text
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
      if (/rounds?/i.test(cell) && !metadata.rounds) metadata.rounds = this.parseNumber(row[1]) // Only if not found from Final Ranking
      if (/type/i.test(cell)) metadata.tournament_type = row[0].split(":").pop()?.trim()

      if (/rating (calculation|type)/i.test(cell)) {
        metadata.rating_calculation = row[0].split(":").pop()?.trim()
      }

      // PATCH 3: Date format fix - handle Excel serial dates and text dates
      if (/date/i.test(cell)) {
        const rawDatePart = row[0].split(":").pop()?.trim()
        if (rawDatePart) {
          console.log("Raw date part:", rawDatePart)
          
          // Check if it's a number (Excel serial date)
          const serialNumber = parseFloat(rawDatePart)
          if (!isNaN(serialNumber) && serialNumber > 0 && serialNumber < 100000) {
            // Convert Excel serial date to JavaScript Date
            // Excel uses 1900-01-01 as day 1, but incorrectly treats 1900 as leap year
            // So we need to subtract 1 day for dates after Feb 28, 1900
            const excelEpoch = new Date(1900, 0, 1) // Jan 1, 1900
            const millisecondsPerDay = 24 * 60 * 60 * 1000
            const jsDate = new Date(excelEpoch.getTime() + (serialNumber - 1) * millisecondsPerDay)
            
            // Account for Excel's leap year bug (Excel thinks 1900 is a leap year)
            if (serialNumber > 59) { // After Feb 28, 1900
              jsDate.setDate(jsDate.getDate() - 1)
            }
            
            metadata.date = jsDate.toISOString().split('T')[0] // yyyy-mm-dd format
            console.log("Converted Excel serial date:", serialNumber, "->", metadata.date)
          } else {
            // Handle text date format "2025/04/26 to 2025/05/01" - extract start date
            const dateMatch = rawDatePart.match(/(\d{4}\/\d{2}\/\d{2})/)
            if (dateMatch) {
              // Convert from yyyy/mm/dd to yyyy-mm-dd
              metadata.date = dateMatch[1].replace(/\//g, '-')
              console.log("Parsed text date:", metadata.date)
            } else {
              metadata.date = rawDatePart
              console.log("Date (no conversion):", metadata.date)
            }
          }
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

    // PATCH 4: Source field fix - use filename, not Excel URL
    metadata.source = this.fileName
    console.log("Source set to filename:", metadata.source)

    return metadata
  }

  private extractPlayers(rows: any[][]): PlayerRanking[] {
    const players: PlayerRanking[] = []

    console.log("\n=== HEADER DETECTION ===")

    // Look for "Final ranking" then next row with data
    let headerIndex = -1
    const finalRankingIndex = rows.findIndex(row =>
      row && this.cleanCell(row[0]).toLowerCase().includes('final ranking')
    )
    
    if (finalRankingIndex >= 0) {
      console.log("Found 'Final ranking' at row:", finalRankingIndex)
      // Check next few rows for headers
      for (let i = finalRankingIndex + 1; i <= finalRankingIndex + 3; i++) {
        if (rows[i] && rows[i].length > 3) {
          const hasRk = rows[i].some((c: any) => /^(rk\.?|rank)$/i.test(this.cleanCell(c)))
          if (hasRk) {
            headerIndex = i
            console.log(`Found header row at ${i} (${i - finalRankingIndex} after Final ranking)`)
            break
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

    // Map columns
    let rankIdx = -1, nameIdx = -1, fedIdx = -1, ratingIdx = -1, pointsIdx = -1
    const tbIndices: { [key: string]: number } = {}

    for (let j = 0; j < headers.length; j++) {
      const header = this.cleanCell(headers[j]).toLowerCase()
      if (!header) continue

      if (rankIdx === -1 && /^rk\.?$/.test(header)) rankIdx = j
      if (nameIdx === -1 && header === 'name') nameIdx = j
      if (fedIdx === -1 && header === 'fed') fedIdx = j
      if (ratingIdx === -1 && /^rtg$/.test(header)) ratingIdx = j
      if (pointsIdx === -1 && /^pts\.?$/.test(header)) pointsIdx = j
      
      // PATCH 6: Tiebreak detection
      if (/^tb\d+$/i.test(header)) {
        tbIndices[header.toUpperCase()] = j
      }
    }

    console.log("Column mapping:", { rankIdx, nameIdx, fedIdx, ratingIdx, pointsIdx, tbIndices })

    // Extract players
    for (let i = headerIndex + 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      const rank = rankIdx >= 0 ? this.parseNumber(row[rankIdx]) : null
      const name = nameIdx >= 0 ? this.cleanCell(row[nameIdx]) : ''

      if (!rank || !name) {
        console.log(`Skipping row ${i}: rank=${rank}, name="${name}"`)
        continue
      }

      console.log(`\nProcessing player ${rank}: ${name}`)

      const player: PlayerRanking = {
        rank: rank,
        name: name,
        federation: fedIdx >= 0 ? this.cleanCell(row[fedIdx]) : undefined,
        rating: ratingIdx >= 0 ? this.parseNumber(row[ratingIdx]) : null,
        rounds: [], // PATCH 4: Back to array
        points: pointsIdx >= 0 ? this.parseFloat(row[pointsIdx]) : null,
        tie_breaks: {},
      }

      // PATCH 5: Round extraction - parse into array format
      const roundColumns = []
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j]
        if (this.isRoundHeader(header)) {
          roundColumns.push({ index: j, header })
        }
      }

      console.log(`Found ${roundColumns.length} round columns for player ${name}`)

      for (const roundCol of roundColumns) {
        const val = this.cleanCell(row[roundCol.index])
        if (val && val !== '-') {
          const parsedRound = this.parseRoundResult(val)
          if (parsedRound) {
            player.rounds.push(parsedRound)
            console.log(`Round parsed: ${val} -> `, parsedRound)
          }
        }
      }

      // PATCH 6: Tiebreak extraction
      for (const [tbName, tbIndex] of Object.entries(tbIndices)) {
        const value = this.parseFloat(row[tbIndex])
        if (value !== null) {
          player.tie_breaks[tbName] = value
        }
      }

      console.log(`Player added: ${player.name}, ${player.rounds.length} rounds, ${Object.keys(player.tie_breaks).length} tiebreaks`)
      players.push(player)
    }

    return players
  }

  // PATCH 5: New round result parsing method
  private parseRoundResult(val: string) {
    const clean = this.cleanCell(val)
    if (!clean) return null

    console.log(`Parsing round: "${clean}"`)

    // Parse format like "3b½", "27w1", etc.
    const match = clean.match(/(\d+)([wb])([01½])/i)
    if (!match) {
      console.log(`No match for round: ${clean}`)
      return null
    }

    let result: "win" | "loss" | "draw" | null = null
    const resultChar = match[3]
    
    if (resultChar === '1') result = "win"
    else if (resultChar === '0') result = "loss"
    else if (resultChar === '½') result = "draw"

    return {
      opponent: match[1],
      color: match[2] === 'w' ? 'white' : 'black',
      result,
      raw: clean
    }
  }

  private isRoundHeader(header: string): boolean {
    const clean = this.cleanCell(header)
    return /^\d+\.rd$/i.test(clean)
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
