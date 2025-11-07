import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ProfileEditView from './ProfileEditView.client'
import { fetchProfilePageData } from '../actions'

export const metadata: Metadata = {
  title: 'Edit Profile',
  description: 'Edit your profile settings',
}

export default async function ProfileEditPage() {
  const supabase = await createClient()

  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // Fetch all profile data
  const profileData = await fetchProfilePageData(user)

  return <ProfileEditView {...profileData} />
}
