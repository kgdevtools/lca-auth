'use server'

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export interface ProfilePageData {
  user: any; // User object from supabase.auth.getUser()
  profileData: any; // Data from 'profiles' table
  registrations: any[] | null; // Data from 'registrations' table
  profileError: string | null;
  registrationsError: string | null;
  users: any[]; // Data from users (mocked for now)
  usersError: string | null;
  serviceKey: any | null; // Service key (mocked for now)
  signOutAction: () => Promise<void>;
}

export async function signOut() {
  const server = await createClient()
  await server.auth.signOut()
  redirect('/login')
}

// TODO: Implement actual data fetching for user profile. This is a placeholder.
export async function fetchProfilePageData(user: any) {
  const supabase = await createClient()

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: registrations, error: registrationsError } = await supabase
    .from('registrations')
    .select('*')
    .eq('user_id', user.id)

  // Mock data for users and service key, assuming they might be fetched elsewhere
  const users: any[] = [] // Replace with actual fetch if needed
  const usersError: string | null = null
  const serviceKey: any | null = null // Replace with actual service key if needed

  return {
    user,
    profileData,
    registrations,
    profileError: profileError?.message ?? null,
    registrationsError: registrationsError?.message ?? null,
    users,
    usersError: usersError as string | null,
    serviceKey,
    signOutAction: signOut,
  }
}

