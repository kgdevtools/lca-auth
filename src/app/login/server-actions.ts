"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { headers } from "next/headers"

export async function signInWithGoogle() {
  const supabase = await createClient()
  const h = await headers()
  const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL!
  const callback = new URL("/auth/callback", origin).toString()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
      skipBrowserRedirect: true,
    },
  })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  if (data?.url) {
    redirect(data.url)
  }

  redirect("/login")
}


