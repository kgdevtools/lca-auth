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

    const metadata = this.extractMetadata(rows)
    const playerRankings = this.extractPlayers(rows)

    return {
      tournament_metadata: metadata,
      player_rankings: playerRankings,
    }
  }

  private extractMetadata(rows: any[][]): TournamentMetadata {
    const metadata: TournamentMetadata = {}

    if (rows.length > 1 && rows[1][0]) {
      metadata.tournament_name = this.cleanCell(rows[1][0])
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
          } else {
            metadata.time_control = raw
          }
        }
      }

      if (/location/i.test(cell)) metadata.location = row[0].split(":").pop()?.trim()
      if (/rounds?/i.test(cell)) metadata.rounds = this.parseNumber(row[1])
      if (/type/i.test(cell)) metadata.tournament_type = row[0].split(":").pop()?.trim()

      if (/rating (calculation|type)/i.test(cell)) {
        metadata.rating_calculation = row[0].split(":").pop()?.trim()
      }

      if (/date/i.test(cell)) metadata.date = row[0].split(":").pop()?.trim()

      if (/rating-ø/i.test(cell) || /average age/i.test(cell)) {
        const parts = cell.split(":").pop()?.trim().split("/")
        if (parts && parts.length === 2) {
          metadata.average_elo = this.parseNumber(parts[0])
          metadata.average_age = this.parseNumber(parts[1])
        }
      }
    }

    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i]
      if (!row || row.length === 0) continue
      const text = row.join(" ")
      const urlMatch = text.match(/https?:\/\/[^\s]+/i)
      if (urlMatch) {
        metadata.source = urlMatch[0]
        break
      }
    }

    return metadata
  }

  private extractPlayers(rows: any[][]): PlayerRanking[] {
    const players: PlayerRanking[] = []

    const headerIndex = rows.findIndex(
      (row) =>
        row.some((c: any) => /^(rk\.?|rank|pos\.?|position)$/i.test(this.cleanCell(c))) &&
        row.some((c: any) => /name/i.test(this.cleanCell(c))) &&
        row.some((c: any) => /(rtg|elo)/i.test(this.cleanCell(c)))
    )

    if (headerIndex === -1) {
      return players
    }

    const headers = rows[headerIndex].map((h: any) => this.cleanCell(h))

    for (let i = headerIndex + 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      const rankIdx = headers.findIndex((h) => /^(rk\.?|rank|pos\.?|position)$/i.test(h))
      const nameIdx = headers.findIndex((h) => /name/i.test(h))
      const fedIdx = headers.findIndex((h) => /^fed$/i.test(h))
      const ratingIdx = headers.findIndex((h) => /(rtg|elo)/i.test(h))
      const pointsIdx = headers.findIndex((h) => /pts?/i.test(h))

      const player: PlayerRanking = {
        rank: this.parseNumber(row[rankIdx]) ?? 0,
        name: this.cleanCell(row[nameIdx]),
        federation: fedIdx >= 0 ? this.cleanCell(row[fedIdx]) : undefined,
        rating: this.parseNumber(row[ratingIdx]),
        rounds: [],
        points: this.parseFloat(row[pointsIdx]) ?? 0,
        tie_breaks: {},
      }

      headers.forEach((h, idx) => {
        if (/(\d+\.?rd|\d+\.?round)/i.test(h)) {
          const val = this.cleanCell(row[idx])
          if (val) player.rounds.push(this.parseRound(val))
        }
      })

      headers.forEach((h, idx) => {
        if (/tb\d+/i.test(h)) {
          player.tie_breaks[h.toUpperCase()] = this.parseFloat(row[idx])
        }
      })

      players.push(player)
    }

    return players
  }

  private parseRound(val: string) {
    const clean = this.cleanCell(val)
    if (!clean) return null

    const match = clean.match(/(\d+)([wb])?([01=+½-])?/i)
    if (!match) return { raw: clean, result: null }

    let result: "win" | "loss" | "draw" | "absent" | "missed" | null = null
    if (/(\+|1)/.test(match[3] ?? "")) result = "win"
    else if (/(-|0)/.test(match[3] ?? "")) result = "loss"
    else if (/(=|½)/.test(match[3] ?? "")) result = "draw"
    else if (clean === "0") result = "absent"
    else if (clean === "-1") result = "missed"

    return {
      opponent: match[1],
      color: match[2] === "w" ? "white" : match[2] === "b" ? "black" : null,
      result,
      raw: clean,
    }
  }

  private cleanCell(val: any): string {
    return val ? String(val).trim() : ""
  }

  private parseNumber(val: any): number | null {
    const n = parseInt(this.cleanCell(val), 10)
    return isNaN(n) ? null : n
  }

  private parseFloat(val: any): number | null {
    const n = Number(this.cleanCell(val))
    return isNaN(n) ? null : n
  }
}

export function parseExcelToJson(buffer: Buffer, fileName = "uploaded.xlsx") {
  const parser = new ParserService(fileName)
  return parser.parse(buffer)
}


