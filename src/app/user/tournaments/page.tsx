import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import TournamentsView from './TournamentsView.client'
import TournamentsViewSkeleton from './TournamentsViewSkeleton'
import { fetchProfilePageData, getUserGames } from '../actions'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'My Tournaments',
  description: 'Tournament history, stats and games',
}

async function TournamentsData() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const profileData = await fetchProfilePageData(user)
  const playerName  = profileData.profile?.tournament_fullname || ''

  const games = playerName
    ? await getUserGames(playerName, 30).catch(() => [])
    : []

  return <TournamentsView {...profileData} games={games} />
}

export default function TournamentsPage() {
  return (
    <Suspense fallback={<TournamentsViewSkeleton />}>
      <TournamentsData />
    </Suspense>
  )
}
