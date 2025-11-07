import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ProfileView from '../ProfileView.client'
import { fetchProfilePageData } from '../actions'
import { Suspense } from 'react'
import ProfileViewSkeleton from './ProfileViewSkeleton'

export const metadata: Metadata = {
  title: 'Profile Overview',
  description: 'User profile overview page',
}

async function ProfileData() {
  const supabase = await createClient()

  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // Fetch all profile data
  const profileData = await fetchProfilePageData(user)

  return <ProfileView {...profileData} />
}

export default function ProfileOverviewPage() {
  return (
    <Suspense fallback={<ProfileViewSkeleton />}>
      <ProfileData />
    </Suspense>
  )
}
