import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import ProfilePage from "./profile-page"
import { fetchProfilePageData } from './server-actions'

export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/login")
  }

  const pageData = await fetchProfilePageData(data.user)

  return (
    <ProfilePage
      user={pageData.user}
      profileData={pageData.profileData}
      registrations={pageData.registrations}
      registrationsError={pageData.registrationsError}
      users={pageData.users}
      usersError={pageData.usersError}
      serviceKey={pageData.serviceKey}
      signOutAction={pageData.signOutAction}
    />
  )
}


