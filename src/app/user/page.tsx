import type { Metadata } from 'next'
import ProfileView from './ProfileView.client'
import { fetchProfilePageData } from './actions'

export const metadata: Metadata = {
  title: 'My Profile',
}

export default async function ProfilePage() {
  // fetch user from server actions (uses server supabase client)
  // middleware already protects /user routes
  // We rely on layout and middleware to redirect unauthenticated users

  // The function signature expects a user, but many pages in the app call createClient()
  // and fetch user there; to keep this change minimal, reuse the layout's approach:
  // call createClient here and use the returned user to fetch profile data.
  const { createClient } = await import('@/utils/supabase/server')
  const server = await createClient()
  const { data } = await server.auth.getUser()
  const user = data.user

  if (!user) {
    // If middleware is configured correctly this shouldn't happen, but return an informative UI
    return (
      <main className="min-h-dvh p-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-semibold">Not signed in</h1>
          <p className="text-muted-foreground mt-2">You need to sign in to view your profile.</p>
        </div>
      </main>
    )
  }

  const pageData = await fetchProfilePageData(user)

  return <ProfileView {...pageData} />
}
