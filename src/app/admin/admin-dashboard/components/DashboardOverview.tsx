// src/app/admin/admin-dashboard/components/DashboardOverview.tsx
import { createClient } from '@/utils/supabase/server'
import { Trophy, Users, TrendingUp, Calendar } from 'lucide-react'

interface StatCard {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  trend?: string
}

async function getDashboardStats() {
  const supabase = await createClient()
  
  try {
    // Get tournaments count
    const { count: tournamentsCount } = await supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true })

    // Get players count  
    const { count: playersCount } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })

    // Get recent tournaments (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { count: recentTournamentsCount } = await supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Get average tournament rating
    const { data: avgRating } = await supabase
      .from('tournaments')
      .select('average_elo')
      .not('average_elo', 'is', null)

    const averageRating = avgRating && avgRating.length > 0 
      ? Math.round(avgRating.reduce((sum, t) => sum + (t.average_elo || 0), 0) / avgRating.length)
      : 0

    return {
      tournamentsCount: tournamentsCount || 0,
      playersCount: playersCount || 0,
      recentTournamentsCount: recentTournamentsCount || 0,
      averageRating
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return {
      tournamentsCount: 0,
      playersCount: 0,
      recentTournamentsCount: 0,
      averageRating: 0
    }
  }
}

export default async function DashboardOverview() {
  const stats = await getDashboardStats()

  const statCards: StatCard[] = [
    {
      title: 'Total Tournaments',
      value: stats.tournamentsCount.toString(),
      icon: Trophy,
    },
    {
      title: 'Total Players',
      value: stats.playersCount.toString(),
      icon: Users,
    },
    {
      title: 'Recent Tournaments',
      value: stats.recentTournamentsCount.toString(),
      icon: Calendar,
      trend: 'Last 30 days'
    },
    {
      title: 'Average Rating',
      value: stats.averageRating.toString(),
      icon: TrendingUp,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stat.value}</p>
                {stat.trend && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.trend}</p>
                )}
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/50 rounded-full">
                <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
