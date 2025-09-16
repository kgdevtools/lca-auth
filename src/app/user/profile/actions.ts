'use server'

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export async function signOut() {
  const server = await createClient()
  await server.auth.signOut()
  redirect('/login')
}
