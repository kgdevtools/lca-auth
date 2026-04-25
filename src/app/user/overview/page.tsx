import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import UserDashboardClient from '../ProfileView.client'
import {
  fetchProfilePageData,
  getDashboardLessons,
  getGamificationSummary,
  getCoachDashboardData,
  getUserGames,
} from '../actions'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Your LCA profile overview',
}

async function DashboardData() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const profileData = await fetchProfilePageData(user)
  const { profile } = profileData
  const role = profile?.role ?? 'member'
  const playerName = profile?.tournament_fullname || ''

  // Fetch everything in parallel — skip slow queries if data isn't relevant
  const [dashboardLessons, gamificationSummary, recentGames, coachData] = await Promise.all([
    (role === 'student' || role === 'coach')
      ? getDashboardLessons(profile!.id).catch(() => ({ completed: [], upcoming: [] }))
      : Promise.resolve({ completed: [], upcoming: [] }),

    (role === 'student' || role === 'coach')
      ? getGamificationSummary(profile!.id).catch(() => null)
      : Promise.resolve(null),

    playerName
      ? getUserGames(playerName, 5).catch(() => [])
      : Promise.resolve([]),

    role === 'coach'
      ? getCoachDashboardData(profile!.id).catch(() => ({ students: [], createdLessons: [] }))
      : Promise.resolve(null),
  ])

  return (
    <UserDashboardClient
      {...profileData}
      dashboardLessons={dashboardLessons}
      gamificationSummary={gamificationSummary}
      recentGames={recentGames}
      coachData={coachData}
    />
  )
}

export default function ProfileOverviewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
      </div>
    }>
      <DashboardData />
    </Suspense>
  )
}
