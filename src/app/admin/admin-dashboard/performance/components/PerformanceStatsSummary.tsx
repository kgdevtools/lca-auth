'use client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getPerformanceStatsSummary, getPlayersWithPerformanceStats } from '../server-actions'
import { useEffect, useState } from 'react'

export interface Player {
  id: string
  lim_id: string | null
  surname: string | null
  firstname: string | null
  normalized_name: string | null
  unique_no: string | null
  federation: string | null
  cf_rating: number | null
  avg_performance_rating: number | null
  performance_count: number | null
  bdate: string | null
  sex: string | null
  performance_stats?: PerformanceDetail[]
  performance_stats_resolved?: boolean
  confidence_score?: number
  is_reconciled?: boolean
}

export interface PerformanceDetail {
  points?: number
  confidence?: string
  total_wins?: number
  player_name?: string
  source_name?: string
  total_draws?: number
  total_losses?: number
  total_rounds?: number
  player_rating?: number | null
  tournament_id?: string
  tournament_name?: string
  performance_rating?: number | null
  classifications?: {
    TB1?: string
    TB2?: string
    TB3?: string
    TB4?: string
    TB5?: string
    [key: string]: string | undefined
  }
  date?: string
  place?: number
  category?: string
  opponents?: Array<{
    name?: string
    rating?: number
    result?: string
  }>
}

export type FilterType = 'all' | 'resolved' | 'no_tp' | 'u20' | 'u18' | 'u16' | 'u14' | 'u12' | 'u10' | 'male' | 'female'

interface StatsSummary {
  totalPlayers: number
  playersWithStats: number
  averageRating: number | null
  completionPercentage: number
}

export default function PerformanceStatsSummary() {
  const [stats, setStats] = useState<StatsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true)
        setError(null)
        console.log('Fetching performance stats...')

        const summaryResult = await getPerformanceStatsSummary()
        console.log('Performance summary result:', summaryResult)

        if (summaryResult.error) {
          throw new Error(summaryResult.error)
        }

        const playersResult = await getPlayersWithPerformanceStats()
        console.log('Players result:', playersResult)
        if (playersResult.error) {
          throw new Error(playersResult.error)
        }

        const totalPlayers = playersResult.data?.length || 0
        const playersWithStats = summaryResult.data?.playersWithStats || 0
        const averageRating = summaryResult.data?.averageRating || null
        const completionPercentage = totalPlayers > 0 ? (playersWithStats / totalPlayers) * 100 : 0

        const statsData: StatsSummary = {
          totalPlayers,
          playersWithStats,
          averageRating,
          completionPercentage
        }

        console.log('Final stats data:', statsData)
        setStats(statsData)

      } catch (error) {
        console.error('Failed to fetch stats:', error)
        setError(error instanceof Error ? error.message : 'Failed to load statistics')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="col-span-full border-destructive bg-destructive/5">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-destructive mb-1">Error Loading Statistics</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="col-span-full">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No statistics available</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg md:text-xl">Total Players</CardTitle>
          <CardDescription>All players in database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-bold text-primary">
            {stats.totalPlayers.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg md:text-xl">Players with Stats</CardTitle>
          <CardDescription>
            {stats.completionPercentage.toFixed(1)}% have performance data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-bold text-primary">
            {stats.playersWithStats.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg md:text-xl">Average Rating</CardTitle>
          <CardDescription>Across all performances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl md:text-3xl font-bold text-primary">
            {stats.averageRating ? stats.averageRating.toFixed(1) : 'No Data'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
