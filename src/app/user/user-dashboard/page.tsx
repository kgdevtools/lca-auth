import { Suspense } from 'react'
import { WarningBanner } from '@/components/warning-banner'
import { fetchDashboardData } from './server-actions'


export default async function UserDashboardPage() {
  const { userProfile } = await fetchDashboardData()

  return (
    <div className="min-h-screen bg-background">
      <div className="px-1 py-4 lg:px-4 lg:py-8">
        <div className="space-y-6 lg:space-y-8">
          <WarningBanner message="Still under development: Some services may not work." />
          {/* Header */}
          <div className="pb-4 border-b border-border">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Welcome, {userProfile.name}</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Here's a snapshot of your chess journey.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Profile Overview Card (moved to left, distinct styling) */}
            <div className="md:col-span-1 lg:col-span-1 bg-gradient-to-br from-primary to-accent text-white p-6 rounded-lg shadow-xl flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">My Profile</h2>
                <p className="text-lg font-semibold">{userProfile.name}</p>
                <p className="text-sm opacity-90">{userProfile.email}</p>
                <p className="mt-4 text-sm italic">"{userProfile.bio}"</p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/30 text-sm">
                <p>Member Since: {userProfile.memberSince}</p>
                <p>Current Rating: <span className="font-bold">{userProfile.currentRating}</span></p>
              </div>
            </div>

            <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
              {/* Performance Rating Stats Card */}
              <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                <h3 className="text-xl font-semibold text-foreground mb-4">Performance Rating Stats</h3>
                <div className="grid grid-cols-2 gap-y-3">
                  <p className="text-muted-foreground">Avg Rating:</p>
                  <p className="text-lg font-bold text-primary">{userProfile.performanceStats.avgRating}</p>

                  <p className="text-muted-foreground">Highest Rating:</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{userProfile.performanceStats.highestRating}</p>

                  <p className="text-muted-foreground">Games Played:</p>
                  <p className="text-lg font-bold text-foreground">{userProfile.performanceStats.gamesPlayed}</p>

                  <p className="text-muted-foreground">Win Rate:</p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{(userProfile.performanceStats.winRate * 100).toFixed(0)}%</p>

                  <p className="text-muted-foreground">Losses:</p>
                  <p className="text-lg font-bold text-destructive">{userProfile.performanceStats.losses}</p>

                  <p className="text-muted-foreground">Draws:</p>
                  <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{userProfile.performanceStats.draws}</p>
                </div>
              </div>

              {/* Tournaments Card */}
              <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
                <h3 className="text-xl font-semibold text-foreground mb-4">My Tournaments</h3>
                <ul className="space-y-3">
                  {userProfile.tournaments.map((tournament) => (
                    <li key={tournament.id} className="flex items-center justify-between text-foreground border-b border-border pb-2 last:border-b-0">
                      <div>
                        <p className="font-medium text-lg">{tournament.name}</p>
                        <p className="text-sm text-muted-foreground">{tournament.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">Placement: N/A</p>
                        <p className="text-sm text-muted-foreground">Score: N/A</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
            <h3 className="text-xl font-semibold mb-4 text-foreground">Recent Activity</h3>
            <ul className="space-y-4">
              {userProfile.recentActivity.map((activity) => (
                <li key={activity.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-foreground pb-3 border-b border-border last:border-b-0">
                  <span className="font-medium text-base mb-1 sm:mb-0">
                    {activity.type === 'tournament' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mr-2">Tournament</span>}
                    {activity.type === 'online_game' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 mr-2">Online Game</span>}
                    {activity.type === 'lesson' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 mr-2">Lesson</span>}
                    {activity.title}
                  </span>
                  <span className="text-sm text-muted-foreground">{activity.date}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
