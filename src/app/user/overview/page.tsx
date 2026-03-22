import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ProfileView from '../ProfileView.client'
import { fetchProfilePageData, getUserGames, getTotalGamesCount, getPlayerProfile, findClosePlayerMatches, getAcademyProgress } from '../actions'
import { Suspense } from 'react'
import ProfileViewSkeleton from './ProfileViewSkeleton'

export const metadata: Metadata = {
  title: 'Profile Overview',
  description: 'User profile overview page',
}

async function ProfileData() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  const profileData = await fetchProfilePageData(user)

  const playerName = profileData.profile?.tournament_fullname || profileData.profile?.full_name || ''
  
  const [userGames, totalGamesCount, playerProfile, closeMatches, academyProgress] = await Promise.all([
    playerName ? getUserGames(playerName, 5).catch(() => []) : [],
    playerName ? getTotalGamesCount(playerName).catch(() => 0) : 0,
    playerName ? getPlayerProfile(playerName).catch(() => null) : null,
    playerName ? findClosePlayerMatches(playerName).catch(() => []) : [],
    getAcademyProgress().catch(() => ({ total: 0, completed: 0, inProgress: 0, totalTimeMinutes: 0, averageQuizScore: 0 })),
  ])

  return (
    <ProfileView 
      {...profileData} 
      userGames={userGames}
      totalGamesCount={totalGamesCount}
      playerProfile={playerProfile}
      closeMatches={closeMatches}
      academyProgress={academyProgress}
    />
  )
}

export default function ProfileOverviewPage() {
  return (
    <Suspense fallback={<ProfileViewSkeleton />}>
      <ProfileData />
    </Suspense>
  )
}
