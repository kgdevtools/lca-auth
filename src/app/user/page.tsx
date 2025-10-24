import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ProfileView from './ProfileView.client'
import { fetchProfilePageData } from './actions'

export const metadata: Metadata = {
  title: 'Profile',
  description: 'User profile page',
}

export default async function ProfilePage() {
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