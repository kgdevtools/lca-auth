'use server'

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { User } from "@supabase/supabase-js"

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

  return {
    user,
    profile: profile as Profile | null,
    profileError: profileError?.message ?? null,
    signOutAction: signOut,
  }
}


// Server action to update editable profile fields from the user page
export async function updateProfile(formData: FormData) {
  const tournamentFullName = (formData.get('tournament_fullname') as string) || null
  const chessaId = (formData.get('chessa_id') as string) || null

  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user

  if (!user) {
    // If there's no logged-in user, send them to login
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
    // Redirect back to /user with an error message (simple approach)
    redirect(`/user?message=${encodeURIComponent(error.message)}`)
  }

  // After successful update, redirect back to the profile page to refresh
  redirect('/user')
}

