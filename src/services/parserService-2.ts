import * as XLSX from "xlsx"

// Use original parser interfaces to maintain compatibility
export interface TournamentMetadata {
  tournament_name?: string
  organizer?: string
  federation?: string
  chief_arbiter?: string
  deputychiefarbiter?: string
  tournament_director?: string
  arbiter?: string
  time_control?: string
  rateofplay?: string
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
  rounds: any[] // Array structure like original parser
  points: number | null
  tie_breaks: Record<string, number | null>
}

export interface TournamentData {
  tournament_metadata: TournamentMetadata
  player_rankings: PlayerRanking[]
}

export class UnifiedParserService {
  private fileName: string

  constructor(fileName: string) {
    this.fileName = fileName
  }

  public parse(buffer: Buffer): TournamentData {
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

    console.log("=== UNIFIED PARSER DEBUG ===")
    console.log("Total rows:", rows.length)
    console.log("Sheet name:", sheetName)

    // Print first 15 rows to analyze structure
    console.log("\n=== RAW EXCEL DATA ===")
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      console.log(`Row ${i}:`, JSON.stringify(rows[i]))
    }

    const metadata = this.extractMetadata(rows)
    const playerRankings = this.extractPlayers(rows)

    console.log("\n=== FINAL RESULTS ===")
    console.log("Tournament name:", metadata.tournament_name)
    console.log("Source:", metadata.source)
    console.log("Players extracted:", playerRankings.length)
    
    if (playerRankings.length > 0) {
      console.log("\n=== SAMPLE PLAYER DATA ===")
      const samplePlayer = playerRankings[0]
      console.log("First player:", samplePlayer.name, "Rank:", samplePlayer.rank)
      console.log("Rounds extracted:", samplePlayer.rounds.length)
      console.log("Tie-breaks extracted:", Object.keys(samplePlayer.tie_breaks).length)
      
      if (samplePlayer.rounds.length > 0) {
        console.log("First round sample:", JSON.stringify(samplePlayer.rounds[0]))
      }
      if (Object.keys(samplePlayer.tie_breaks).length > 0) {
        console.log("Tie-breaks sample:", JSON.stringify(samplePlayer.tie_breaks))
      }
    }

    return {
      tournament_metadata: metadata,
      player_rankings: playerRankings,
    }
  }

  private extractMetadata(rows: any[][]): TournamentMetadata {
    const metadata: TournamentMetadata = {}

    console.log("\n=== METADATA EXTRACTION ===")

    // Extract tournament name from Row 0 + Row 1
    let tournamentName = ""
    
    // Get Row 0 content
    if (rows.length > 0 && rows[0] && rows[0][0]) {
      tournamentName = this.cleanCell(rows[0][0])
      console.log(`Row 0 tournament name: "${tournamentName}"`)
    }
    
    // Get Row 1 content and append if valid
    if (rows.length > 1 && rows[1] && rows[1][0]) {
      const row1Content = this.cleanCell(rows[1][0])
      console.log(`Row 1 content: "${row1Content}"`)
      
      if (row1Content && 
          !row1Content.toLowerCase().includes('final') &&
          !row1Content.toLowerCase().includes('ranking') &&
          !row1Content.toLowerCase().includes('organizer') &&
          row1Content.length > 0) {
        tournamentName += ` ${row1Content}`
        console.log(`Appending Row 1 to tournament name`)
      }
    }
    
    metadata.tournament_name = tournamentName
    console.log(`Final tournament name: "${metadata.tournament_name}"`)

    // Look for other metadata starting from Row 2 onwards
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue
      
      const firstCell = this.cleanCell(row[0])
      if (!firstCell) continue
      
      // Stop when we hit "Final ranking" - that's the start of player data
      if (firstCell.toLowerCase().includes('final ranking')) {
        console.log(`Stopping metadata search at row ${i} (Final ranking found)`)
        break
      }
      
      const fullRowText = row.join(' ')
      
      // Extract metadata fields with colon separators
      if (/organizer/i.test(firstCell)) {
        metadata.organizer = this.extractAfterColon(fullRowText)
        console.log(`Organizer: ${metadata.organizer}`)
      }
      
      if (/federation/i.test(firstCell)) {
        metadata.federation = this.extractAfterColon(fullRowText)
        console.log(`Federation: ${metadata.federation}`)
      }
      
      if (/tournament director/i.test(firstCell)) {
        metadata.tournament_director = this.extractAfterColon(fullRowText)
        console.log(`Tournament director: ${metadata.tournament_director}`)
      }
      
      if (/chief arbiter/i.test(firstCell) && !/deputy/i.test(firstCell)) {
        metadata.chief_arbiter = this.extractAfterColon(fullRowText)
        console.log(`Chief arbiter: ${metadata.chief_arbiter}`)
      }
      
      if (/deputy chief arbiter/i.test(firstCell)) {
        metadata.deputychiefarbiter = this.extractAfterColon(fullRowText)
        console.log(`Deputy chief arbiter: ${metadata.deputychiefarbiter}`)
      }
      
      if (/location/i.test(firstCell)) {
        metadata.location = this.extractAfterColon(fullRowText)
        console.log(`Location: ${metadata.location}`)
      }
      
      if (/date/i.test(firstCell)) {
        const rawDate = this.extractAfterColon(fullRowText)
        if (rawDate) {
          metadata.date = this.parseDate(rawDate)
          console.log(`Date: ${metadata.date}`)
        }
      }
      
      if (/time control/i.test(firstCell)) {
        const timeInfo = this.extractAfterColon(fullRowText)
        if (timeInfo) {
          const match = timeInfo.match(/([^(]+?)(?:\s*\(([^)]+)\))?$/)
          if (match) {
            metadata.time_control = match[1].trim()
            metadata.rateofplay = match[2]?.trim()
          } else {
            metadata.time_control = timeInfo
          }
          console.log(`Time control: ${metadata.time_control}, Rate: ${metadata.rateofplay}`)
        }
      }
      
      if (/rounds/i.test(firstCell) && /\d+/.test(firstCell)) {
        const roundMatch = firstCell.match(/(\d+)/)
        if (roundMatch) {
          metadata.rounds = parseInt(roundMatch[1])
          console.log(`Rounds: ${metadata.rounds}`)
        }
      }
    }

    metadata.source = this.fileName
    return metadata
  }

  private extractPlayers(rows: any[][]): PlayerRanking[] {
    console.log("\n=== PLAYER EXTRACTION ===")
    
    const headerRowIndex = this.findPlayerHeaderRow(rows)
    if (headerRowIndex === -1) {
      console.log("ERROR: Could not find player header row!")
      return []
    }
    
    console.log(`Player header row found at index: ${headerRowIndex}`)
    const headers = rows[headerRowIndex].map((h: any) => this.cleanCell(h))
    
    const columnMap = this.buildColumnMap(headers)
    console.log(`Column mapping complete. Rounds: ${columnMap.roundColumns.length}, Tie-breaks: ${columnMap.tieBreakColumns.length}`)
    
    const players: PlayerRanking[] = []
    let sampleCount = 0
    
    // Process player rows
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue
      
      // Stop at footer
      if (this.isFooterRow(row)) break
      
      const player = this.buildPlayerFromRow(row, columnMap)
      if (player) {
        players.push(player)
        
        // Show sample for first 2 players
        if (sampleCount < 2) {
          console.log(`\n--- SAMPLE PLAYER ${sampleCount + 1} ---`)
          console.log(`Name: ${player.name}, Rank: ${player.rank}`)
          console.log(`Rounds: ${player.rounds.length}, Tie-breaks: ${Object.keys(player.tie_breaks).length}`)
          sampleCount++
        }
      }
    }
    
    return players
  }

  private findPlayerHeaderRow(rows: any[][]): number {
    // Find "Final ranking" first
    let searchStart = 0
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (row && row[0] && this.cleanCell(row[0]).toLowerCase().includes('final ranking')) {
        searchStart = i + 1
        console.log(`Found "Final ranking" at row ${i}, searching headers from row ${searchStart}`)
        break
      }
    }
    
    // Look for header row with required columns
    for (let i = searchStart; i < Math.min(searchStart + 5, rows.length); i++) {
      const row = rows[i]
      if (!row || row.length < 4) continue
      
      const cells = row.map((c: any) => this.cleanCell(c).toLowerCase())
      const hasRank = cells.some((c: string) => /^(rank|rk\.?)$/.test(c))
      const hasName = cells.some((c: string) => c === 'name')
      const hasFed = cells.some((c: string) => c === 'fed')
      
      if (hasRank && hasName && hasFed) {
        console.log(`Header row confirmed at index ${i}`)
        return i
      }
    }
    
    return -1
  }

  private buildColumnMap(headers: string[]): any {
    const map: any = {
      roundColumns: [],
      tieBreakColumns: []
    }
    
    console.log("\n=== COLUMN MAPPING ===")
    
    for (let i = 0; i < headers.length; i++) {
      const header = this.cleanCell(headers[i]).toLowerCase()
      
      // Basic columns
      if (/^(rank|rk\.?)$/.test(header)) map.rank = i
      if (/^(sno\.?|no\.?)$/.test(header)) map.playerNumber = i  
      if (header === 'name') map.name = i
      if (/^(rtg|rating)$/.test(header)) map.rating = i
      if (/^(fed|federation)$/.test(header)) map.federation = i
      if (/^(pts\.?|points)$/.test(header)) map.points = i
      
      // Round columns (merged cells spanning 3 columns each)
      if (/^\d+\.rd\.?$/i.test(header)) {
        const roundMatch = header.match(/(\d+)/)
        if (roundMatch) {
          const roundNum = parseInt(roundMatch[0])
          map.roundColumns.push({
            roundNumber: roundNum,
            opponentIndex: i,
            colorIndex: i + 1,
            resultIndex: i + 2
          })
          console.log(`Round ${roundNum} mapped: opponent=${i}, color=${i+1}, result=${i+2}`)
        }
      }
      
      // Tie-break columns with specific mappings
      if (/^ratp$/i.test(header)) {
        map.tieBreakColumns.push({ index: i, name: "TB5" })
        console.log(`TB5 (Performance Rating) at column ${i}`)
      }
      else if (/^res\.?$/i.test(header)) {
        map.tieBreakColumns.push({ index: i, name: "TB1" })
        console.log(`TB1 (Direct Encounter) at column ${i}`)
      }
      else if (/^win\/p$/i.test(header)) {
        map.tieBreakColumns.push({ index: i, name: "TB4" })  
        console.log(`TB4 (Number of Wins) at column ${i}`)
      }
      else if (/^bh:gp$/i.test(header)) {
        map.tieBreakColumns.push({ index: i, name: "TB2" })
        console.log(`TB2 (Buchholz) at column ${i}`)
      }
      else if (/^tb\d+$/i.test(header)) {
        const tbMatch = header.match(/tb(\d+)/i)
        if (tbMatch) {
          map.tieBreakColumns.push({ index: i, name: `TB${tbMatch[1]}` })
          console.log(`Generic TB${tbMatch[1]} at column ${i}`)
        }
      }
    }
    
    return map
  }

  private buildPlayerFromRow(row: any[], columnMap: any): PlayerRanking | null {
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
    
    // Extract rounds
    for (const roundCol of columnMap.roundColumns || []) {
      const opponent = this.cleanCell(row[roundCol.opponentIndex] || '')
      const color = this.cleanCell(row[roundCol.colorIndex] || '')
      const result = this.cleanCell(row[roundCol.resultIndex] || '')
      
      const roundData = this.parseRound(opponent, color, result)
      if (roundData) {
        player.rounds.push(roundData)
      }
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

  private parseRound(opponent: string, color: string, result: string) {
    if (!opponent || opponent === '-') {
      return {
        opponent: null,
        color: null, 
        result: "bye",
        raw: `${opponent}|${color}|${result}`
      }
    }
    
    if (!/^\d+$/.test(opponent)) return null
    
    let parsedColor: "white" | "black" | null = null
    if (color.toLowerCase() === 'w') parsedColor = "white"
    else if (color.toLowerCase() === 'b') parsedColor = "black"
    
    let parsedResult: "win" | "loss" | "draw" | null = null
    if (result === '1') parsedResult = "win"
    else if (result === '0') parsedResult = "loss"
    else if (result === '½' || result === '0.5') parsedResult = "draw"
    
    return {
      opponent,
      color: parsedColor,
      result: parsedResult,
      raw: `${opponent}${color}${result}`
    }
  }

  private extractAfterColon(text: string): string | undefined {
    const parts = text.split(':')
    return parts.length > 1 ? parts.slice(1).join(':').trim() : undefined
  }

  private parseDate(rawDate: string): string | undefined {
    const serialNumber = parseFloat(rawDate)
    if (!isNaN(serialNumber) && serialNumber > 0 && serialNumber < 100000) {
      const excelEpoch = new Date(1900, 0, 1)
      const jsDate = new Date(excelEpoch.getTime() + (serialNumber - 1) * 24 * 60 * 60 * 1000)
      if (serialNumber > 59) jsDate.setDate(jsDate.getDate() - 1)
      return jsDate.toISOString().split('T')[0]
    }
    
    const dateMatch = rawDate.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/)
    if (dateMatch) {
      return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
    }
    
    return rawDate
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

export function parseUnifiedExcelToJson(buffer: Buffer, fileName = "uploaded.xlsx"): TournamentData {
  const parser = new UnifiedParserService(fileName)
  return parser.parse(buffer)
}
