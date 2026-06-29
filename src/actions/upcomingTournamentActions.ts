'use server'

// Server-action wrappers around the upcoming-tournament repository so CLIENT
// components can use them without importing the server-only repo (which pulls in
// `next/headers` and breaks the client bundle). Marked 'use server', so the
// client only receives an RPC reference — the repo stays server-side.

import {
  getAllUpcomingTournaments,
  createUpcomingTournament,
} from '@/repositories/upcomingTournamentRepo'
import type {
  UpcomingTournament,
  CreateUpcomingTournamentPayload,
} from '@/types/upcoming-tournament'

export async function fetchAllUpcomingTournaments(): Promise<UpcomingTournament[]> {
  return getAllUpcomingTournaments()
}

export async function submitUpcomingTournament(
  data: CreateUpcomingTournamentPayload,
): Promise<{ success: boolean; error?: string; tournamentId?: string }> {
  return createUpcomingTournament(data)
}
