"use server"

import { parseExcelToJson } from "@/services/parserService" // Original parser
import { parseUnifiedExcelToJson } from "@/services/parserService-2" // Enhanced parser
import { parseRoundRobinExcelToJson } from "@/services/roundRobinParser" // Round robin parser
import { saveTournamentNormalized } from "@/repositories/tournamentRepo"

export async function uploadTournamentAction(_prevState: any, formData: FormData) {
  try {
    const file = formData.get("file") as unknown as File | null
    const parserType = formData.get("parserType") as string // Add parser selection

    if (!file) {
      return { ok: false, error: "No file provided" }
    }
    if (file.size > 50 * 1024 * 1024) {
      return { ok: false, error: "File too large. Max 50MB" }
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Choose parser based on selection
    let parsed
    if (parserType === "enhanced") {
      parsed = parseUnifiedExcelToJson(buffer, file.name)
    } else if (parserType === "roundrobin") {
      parsed = parseRoundRobinExcelToJson(buffer, file.name)
    } else {
      parsed = parseExcelToJson(buffer, file.name)
    }


const normalizedParsed = Array.isArray(parsed)
  ? parsed.map((t: any) => ({
      ...t,
      player_rankings: t.player_rankings?.map((p: any) => ({
        ...p,
        rating: p.rating ?? null
      }))
    }))
  : {
      ...parsed,
      player_rankings: parsed.player_rankings?.map((p: any) => ({
        ...p,
        rating: p.rating ?? null
      }))
    }

// If the parser returned an array, take the first element; else use the object
const tournamentToSave = Array.isArray(normalizedParsed)
  ? normalizedParsed[0]
  : normalizedParsed

const result = await saveTournamentNormalized(tournamentToSave)
    
    
    return { ok: true, ...result, parsed, parserUsed: parserType }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed" }
  }
}
