import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import TournamentsView from './TournamentsView.client'
import { fetchProfilePageData } from '../actions'
import { Suspense } from 'react'
import TournamentsViewSkeleton from './TournamentsViewSkeleton'

export const metadata: Metadata = {
  title: 'My Tournaments',
  description: 'View your tournament history and performance',
}

async function TournamentsData() {
  const supabase = await createClient()

  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // Fetch all profile data
  const profileData = await fetchProfilePageData(user)

  return <TournamentsView {...profileData} />
}

export default function TournamentsPage() {
  return (
    <Suspense fallback={<TournamentsViewSkeleton />}>
      <TournamentsData />
    </Suspense>
  )
}
