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

