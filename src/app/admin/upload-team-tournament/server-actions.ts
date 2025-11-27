"use server"

import { parseTeamTournamentExcel } from "@/services/teamTournamentParser"
import { saveTeamTournamentRound } from "@/repositories/teamTournamentRepo"

export async function uploadTeamTournamentRoundAction(formData: FormData) {
  try {
    const file = formData.get("file") as File | null
    const roundNumberStr = formData.get("roundNumber") as string | null

    if (!file) {
      return { ok: false, error: "No file provided" }
    }

    if (file.size > 50 * 1024 * 1024) {
      return { ok: false, error: "File too large. Max 50MB" }
    }

    // Parse round number
    let roundNumber: number | undefined
    if (roundNumberStr) {
      roundNumber = parseInt(roundNumberStr)
      if (isNaN(roundNumber)) {
        return { ok: false, error: "Invalid round number" }
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Parse the Excel file
    const parsed = parseTeamTournamentExcel(buffer, file.name)

    // If round number was provided in form, override parsed value
    if (roundNumber) {
      parsed.tournament_metadata.round_number = roundNumber
    }

    // Validate that we got a round number
    if (!parsed.tournament_metadata.round_number) {
      return {
        ok: false,
        error: "Could not determine round number. Please specify it manually."
      }
    }

    // Save to database
    console.log("=== SAVING TO DATABASE ===")
    const result = await saveTeamTournamentRound(parsed)

    console.log("=== UPLOAD SUCCESS ===")
    console.log("Tournament ID:", result.tournament_id)
    console.log("Round:", result.round_number)
    console.log("Pairings:", result.pairings_inserted)
    console.log("Boards:", result.boards_inserted)

    return {
      ok: true,
      tournament_id: result.tournament_id,
      round_number: result.round_number,
      pairings_count: result.pairings_inserted,
      boards_count: result.boards_inserted,
      parsed // Include parsed data for preview
    }
  } catch (e) {
    console.error("Upload error:", e)
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Upload failed"
    }
  }
}
