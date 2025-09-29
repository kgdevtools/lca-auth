import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import ProfilePage from "./profile-page"
import { fetchProfilePageData } from './actions'
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "My Profile",
  description: "View and manage your Limpopo Chess Academy profile.",
}

export default async function Page() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/login")
  }

  const pageData = await fetchProfilePageData(data.user)

  return (
    <ProfilePage
      {...pageData}
    />
  )
}


