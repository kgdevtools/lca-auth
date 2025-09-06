import * as XLSX from "xlsx"

// Enhanced interfaces for the new parser
export interface TournamentMetadataV2 {
  tournament_name?: string
  section?: string
  organizer?: string
  federation?: string
  chief_arbiter?: string
  deputy_chief_arbiter?: string
  tournament_director?: string
  arbiter?: string
  time_control?: string
  rate_of_play?: string
  location?: string
  rounds?: number
  tournament_type?: "Swiss" | "Round Robin"
  rating_calculation?: string
  date?: string
  average_elo?: number
  average_age?: number
  source?: string
}

export interface PlayerRankingV2 {
  rank: number
  player_number?: number
  name?: string
  federation?: string
  rating?: number
  points?: number
  performance_rating?: number
  games_played?: number
  win_percentage?: number
  rounds: Record<string, any>
  tie_breaks: Record<string, number | undefined>
}

export interface TournamentDataV2 {
  tournament_metadata: TournamentMetadataV2
  player_rankings: PlayerRankingV2[]
}

export interface RoundResult {
  opponent_number?: string
  color?: "white" | "black"
  result?: "win" | "loss" | "draw" | "bye" | "forfeit"
  raw_value?: string
}

export class EnhancedParserService {
  private fileName: string

  constructor(fileName: string) {
    this.fileName = fileName
  }

  public parse(buffer: Buffer): TournamentDataV2 {
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

    const metadata = this.extractMetadata(rows)
    const playerRankings = this.extractPlayers(rows)

    return {
      tournament_metadata: metadata,
      player_rankings: playerRankings,
    }
  }

  private extractMetadata(rows: any[][]): TournamentMetadataV2 {
    const metadata: TournamentMetadataV2 = {}

    if (rows.length > 0 && rows[0][0]) {
      metadata.tournament_name = this.cleanCell(rows[0][0])
    }

    if (rows.length > 1 && rows[1][0]) {
      const sectionText = this.cleanCell(rows[1][0])
      if (sectionText && sectionText.toLowerCase() !== 'final ranking') {
        metadata.section = sectionText
      }
    }

    metadata.source = this.fileName

    const headerRowIndex = this.findHeaderRow(rows)
    if (headerRowIndex >= 0) {
      const tournamentTypeAndRounds = this.detectTournamentTypeAndRounds(rows[headerRowIndex])
      metadata.tournament_type = tournamentTypeAndRounds.type
      metadata.rounds = tournamentTypeAndRounds.rounds
    }

    return metadata
  }

  private findHeaderRow(rows: any[][]): number {
    const finalRankingIndex = rows.findIndex(row =>
      row && this.cleanCell(row[0]).toLowerCase().includes('final ranking')
    )

    if (finalRankingIndex >= 0) {
      for (let i = finalRankingIndex + 1; i <= finalRankingIndex + 3; i++) {
        if (this.isHeaderRow(rows[i])) return i
      }
    }

    return rows.findIndex(row => this.isHeaderRow(row))
  }

  private isHeaderRow(row: any[]): boolean {
    if (!row || row.length < 5) return false
    const cells = row.map(c => this.cleanCell(c).toLowerCase())

    const hasRank = cells.some(c => /^(rank|rk\.?)$/.test(c))
    const hasName = cells.some(c => c === 'name')
    const hasRating = cells.some(c => /^(rtg|rating)$/.test(c))
    const hasFed = cells.some(c => /^fed$/.test(c))

    return hasRank && hasName && hasRating && hasFed
  }

  private detectTournamentTypeAndRounds(headerRow: any[]): { type: "Swiss" | "Round Robin", rounds: number } {
    const headers = headerRow.map(h => this.cleanCell(h))
    let roundCount = 0
    let isSwiss = false

    for (const header of headers) {
      if (/^\d+\.?rd\.?$/i.test(header)) {
        isSwiss = true
        roundCount++
      } else if (/^\d+$/.test(header) && parseInt(header) > 1 && parseInt(header) < 20) {
        roundCount++
      }
    }

    return { type: isSwiss ? "Swiss" : "Round Robin", rounds: roundCount }
  }

  private extractPlayers(rows: any[][]): PlayerRankingV2[] {
    const players: PlayerRankingV2[] = []
    const headerRowIndex = this.findHeaderRow(rows)
    if (headerRowIndex === -1) return players

    const columnMap = this.mapColumns(rows[headerRowIndex])
    const tournamentType = this.detectTournamentTypeAndRounds(rows[headerRowIndex]).type

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue
      if (!row[columnMap.rank] && !row[columnMap.name]) break

      const player = this.extractPlayerFromRow(row, columnMap, tournamentType)
      if (player) players.push(player)
    }

    return players
  }

  private mapColumns(headerRow: any[]): any {
    const map: any = {}

    headerRow.forEach((header, index) => {
      const clean = this.cleanCell(header).toLowerCase()
      if (/^(rank|rk\.?)$/.test(clean)) map.rank = index
      if (/^(sno\.?|no\.?)$/.test(clean)) map.playerNumber = index
      if (clean === 'name') map.name = index
      if (/^(rtg|rating)$/.test(clean)) map.rating = index
      if (/^fed$/.test(clean)) map.federation = index
      if (/^pts\.?$/.test(clean)) map.points = index
      if (/^ratp$/i.test(clean)) map.performanceRating = index
      if (/^res$/i.test(clean)) map.gamesPlayed = index
      if (/^win\/p$/i.test(clean)) map.winPercentage = index
      if (/^bh\.?gp$/i.test(clean)) map.buchholz = index
      if (/^tpr$/i.test(clean)) map.tpr = index

      if (/^\d+\.?rd\.?$/i.test(clean) || (/^\d+$/.test(clean) && parseInt(clean) > 1)) {
        if (!map.roundColumns) map.roundColumns = []
        const match = clean.match(/\d+/)
        if (match) {
          map.roundColumns.push({
            index: index,
            header: header,
            roundNumber: parseInt(match[0])
          })
        }
      }
    })

    return map
  }

  private extractPlayerFromRow(row: any[], columnMap: any, tournamentType: "Swiss" | "Round Robin"): PlayerRankingV2 | null {
    const rank = this.parseNumber(row[columnMap.rank])
    const name = this.cleanCell(row[columnMap.name])
    if (!rank && !name) return null

    const player: PlayerRankingV2 = {
      rank: rank || 0,
      player_number: columnMap.playerNumber ? this.parseNumber(row[columnMap.playerNumber]) ?? undefined : undefined,
      name: name || undefined,
      federation: columnMap.federation ? this.cleanCell(row[columnMap.federation]) : undefined,
      rating: this.parseNumber(row[columnMap.rating]) ?? undefined,
      points: this.parseFloat(row[columnMap.points]) ?? undefined,
      performance_rating: columnMap.performanceRating ? this.parseNumber(row[columnMap.performanceRating]) ?? undefined : undefined,
      games_played: columnMap.gamesPlayed ? this.parseNumber(row[columnMap.gamesPlayed]) ?? undefined : undefined,
      win_percentage: columnMap.winPercentage ? this.parseFloat(row[columnMap.winPercentage]) ?? undefined : undefined,
      rounds: {},
      tie_breaks: {}
    }

    if (columnMap.roundColumns) {
      for (const roundCol of columnMap.roundColumns) {
        const cellValue = this.cleanCell(row[roundCol.index])
        const roundResult = this.parseRoundResult(cellValue, tournamentType)
        if (tournamentType === "Swiss") {
          player.rounds[`round_${roundCol.roundNumber}`] = roundResult
        } else {
          player.rounds[`vs_player_${roundCol.roundNumber}`] = roundResult
        }
      }
    }

    if (columnMap.buchholz) {
      player.tie_breaks.buchholz = this.parseFloat(row[columnMap.buchholz]) ?? undefined
    }
    if (columnMap.tpr) {
      player.tie_breaks.tournament_performance = this.parseNumber(row[columnMap.tpr]) ?? undefined
    }

    return player
  }

  private parseRoundResult(cellValue: string, tournamentType: "Swiss" | "Round Robin"): RoundResult {
    if (!cellValue || cellValue === '-' || cellValue === '- - -') {
      return { result: "bye", raw_value: cellValue }
    }

    if (tournamentType === "Swiss") {
      const match = cellValue.match(/(\d+)\s+([wb])\s+([10½])/i)
      if (match) {
        return {
          opponent_number: match[1],
          color: match[2].toLowerCase() === 'w' ? 'white' : 'black',
          result: this.parseResult(match[3]),
          raw_value: cellValue
        }
      }
    } else {
      const result = this.parseResult(cellValue)
      if (result) {
        return { result, raw_value: cellValue }
      }
    }

    return { raw_value: cellValue }
  }

  private parseResult(resultChar: string): "win" | "loss" | "draw" | undefined {
    switch (resultChar) {
      case '1': return 'win'
      case '0': return 'loss'
      case '½': return 'draw'
      default: return undefined
    }
  }

  private cleanCell(val: any): string {
    return val ? String(val).trim() : ""
  }

  private parseNumber(val: any): number | null {
    const cleaned = this.cleanCell(val)
    if (!cleaned || cleaned === '0') return null
    const n = parseInt(cleaned, 10)
    return isNaN(n) ? null : n
  }

  private parseFloat(val: any): number | null {
    const cleaned = this.cleanCell(val)
    if (!cleaned) return null
    const n = parseFloat(cleaned)
    return isNaN(n) ? null : n
  }
}

// Export function
export function parseEnhancedExcelToJson(buffer: Buffer, fileName = "uploaded.xlsx"): TournamentDataV2 {
  const parser = new EnhancedParserService(fileName)
  return parser.parse(buffer)
}
