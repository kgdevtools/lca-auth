"use server"

import { parseExcelToJson } from "@/services/parserService"
import { saveTournamentNormalized } from "@/repositories/tournamentRepo"

export async function uploadTournamentAction(_prevState: any, formData: FormData) {
  try {
    const file = formData.get("file") as unknown as File | null
    if (!file) {
      return { ok: false, error: "No file provided" }
    }
    if (file.size > 50 * 1024 * 1024) {
      return { ok: false, error: "File too large. Max 50MB" }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = parseExcelToJson(buffer, file.name)
    const result = await saveTournamentNormalized(parsed)
    return { ok: true, ...result, parsed }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed" }
  }
}


