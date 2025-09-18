'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Target, TrendingUp, Award, Users, Clock } from 'lucide-react'

interface PlayerStatsCardsProps {
  performanceStats: any[]
  avgPerformanceRating: number | null
}

export default function PlayerStatsCards({ performanceStats, avgPerformanceRating }: PlayerStatsCardsProps) {
  // Calculate statistics from performance stats
  const totalTournaments = performanceStats.length
  
  const totalWins = performanceStats.reduce((sum, stat) => sum + (stat.total_wins || 0), 0)
  const totalDraws = performanceStats.reduce((sum, stat) => sum + (stat.total_draws || 0), 0)
  const totalLosses = performanceStats.reduce((sum, stat) => sum + (stat.total_losses || 0), 0)
  const totalGames = totalWins + totalDraws + totalLosses
  
  const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0
  const drawRate = totalGames > 0 ? (totalDraws / totalGames) * 100 : 0
  
  const totalPoints = performanceStats.reduce((sum, stat) => sum + (stat.points || 0), 0)
  const avgPoints = totalTournaments > 0 ? totalPoints / totalTournaments : 0
  
  const performanceRatings = performanceStats
    .map(stat => stat.performance_rating)
    .filter(rating => rating && rating > 0)
  
  const bestPerformance = performanceRatings.length > 0 ? Math.max(...performanceRatings) : null
  const worstPerformance = performanceRatings.length > 0 ? Math.min(...performanceRatings) : null
  
  // Recent form (last 5 tournaments)
  const recentStats = performanceStats
    .sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())
    .slice(0, 5)
  
  const recentWins = recentStats.reduce((sum, stat) => sum + (stat.total_wins || 0), 0)
  const recentGames = recentStats.reduce((sum, stat) => sum + (stat.total_rounds || 0), 0)
  const recentForm = recentGames > 0 ? (recentWins / recentGames) * 100 : 0

  if (totalTournaments === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>No tournament performance data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Overall Performance */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">Overall Performance</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-primary">
              {avgPerformanceRating ? avgPerformanceRating.toFixed(1) : '-'}
            </div>
            <div className="text-xs text-muted-foreground">
              Average Rating
            </div>
            {bestPerformance && (
              <div className="text-sm">
                <span className="text-green-600 font-medium">Best: {bestPerformance}</span>
                {worstPerformance && (
                  <span className="text-muted-foreground"> | Worst: {worstPerformance}</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Win Statistics */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-green-600" />
            <CardTitle className="text-sm font-medium">Win Statistics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-green-600">
              {winRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              Win Rate
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Wins:</span>
                <span className="font-medium text-green-600">{totalWins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Draws:</span>
                <span className="font-medium text-yellow-600">{totalDraws}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Losses:</span>
                <span className="font-medium text-red-600">{totalLosses}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tournament Activity */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-medium">Tournament Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-blue-600">
              {totalTournaments}
            </div>
            <div className="text-xs text-muted-foreground">
              Total Tournaments
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Games:</span>
                <span className="font-medium">{totalGames}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Points:</span>
                <span className="font-medium">{avgPoints.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Form */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            <CardTitle className="text-sm font-medium">Recent Form</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-purple-600">
              {recentForm.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              Last 5 Tournaments
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tournaments:</span>
                <span className="font-medium">{recentStats.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Win Rate:</span>
                <span className={`font-medium ${recentForm >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                  {recentForm.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}