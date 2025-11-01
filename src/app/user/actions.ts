'use server'

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { User } from "@supabase/supabase-js"
import { getActivePlayerData, getPlayerStatistics, findPlayerMatches, ActivePlayerData, MatchResult } from './tournament-actions'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  tournament_fullname: string | null
  chessa_id: string | null
  role: string
  created_at?: string
}

export interface ProfilePageData {
  user: User
  profile: Profile | null
  profileError: string | null
  activePlayerData: ActivePlayerData[]
  playerStats: Awaited<ReturnType<typeof getPlayerStatistics>>
  matchResult: MatchResult
  signOutAction: () => Promise<void>
}

export async function signOut() {
  const server = await createClient()
  await server.auth.signOut()
  redirect('/login')
}

export async function fetchProfilePageData(user: User): Promise<ProfilePageData> {
  const supabase = await createClient()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, tournament_fullname, chessa_id, role, created_at')
    .eq('id', user.id)
    .single()

  // Fetch active player data if tournament_fullname exists
  let activePlayerData: ActivePlayerData[] = []
  let playerStats = null
  let matchResult: MatchResult = { exactMatch: null, closeMatches: [] }

  if (profile?.tournament_fullname) {
    activePlayerData = await getActivePlayerData(profile.tournament_fullname)
    playerStats = await getPlayerStatistics(profile.tournament_fullname)
    matchResult = await findPlayerMatches(profile.tournament_fullname)
  }

  return {
    user,
    profile: profile as Profile | null,
    profileError: profileError?.message ?? null,
    activePlayerData,
    playerStats,
    matchResult,
    signOutAction: signOut,
  }
}

// Server action to update editable profile fields from the user page
export async function updateProfile(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const tournamentFullName = (formData.get('tournament_fullname') as string) || null
  const chessaId = (formData.get('chessa_id') as string) || null

  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      tournament_fullname: tournamentFullName || null,
      chessa_id: chessaId || null,
    })
    .eq('id', user.id)

  if (error) {
    console.error('Error updating profile:', error)
    return { success: false, error: error.message }
  }

  // Return success - let client handle the UI update
  return { success: true }
}
