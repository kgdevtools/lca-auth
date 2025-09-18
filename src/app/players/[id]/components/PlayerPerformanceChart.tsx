'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { TrendingUp, Calendar } from 'lucide-react'

interface PlayerPerformanceChartProps {
  performanceStats: any[]
}

export default function PlayerPerformanceChart({ performanceStats }: PlayerPerformanceChartProps) {
  if (!performanceStats || performanceStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Trend
          </CardTitle>
          <CardDescription>Tournament performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>No performance data available for charting</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Prepare data for charts - sort by date
  const chartData = performanceStats
    .filter(stat => stat.date && stat.tournament_name)
    .sort((a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime())
    .map((stat, index) => ({
      tournament: stat.tournament_name?.slice(0, 20) + (stat.tournament_name?.length > 20 ? '...' : '') || `Tournament ${index + 1}`,
      date: stat.date,
      performance_rating: stat.performance_rating || 0,
      points: stat.points || 0,
      total_rounds: stat.total_rounds || 0,
      wins: stat.total_wins || 0,
      draws: stat.total_draws || 0,
      losses: stat.total_losses || 0,
      winRate: stat.total_rounds > 0 ? ((stat.total_wins || 0) / stat.total_rounds) * 100 : 0,
      place: stat.place || null
    }))
    .slice(-10) // Show last 10 tournaments to keep chart readable

  const hasPerformanceRatings = chartData.some(data => data.performance_rating > 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Performance Rating Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Performance Rating Trend
          </CardTitle>
          <CardDescription>Recent tournament performance ratings</CardDescription>
        </CardHeader>
        <CardContent>
          {hasPerformanceRatings ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="tournament" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    fontSize={10}
                    className="fill-muted-foreground"
                  />
                  <YAxis className="fill-muted-foreground" fontSize={12} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-background border rounded-lg shadow-lg p-3">
                            <p className="font-semibold text-sm mb-2">{label}</p>
                            <p className="text-sm text-muted-foreground mb-1">Date: {data.date || 'Unknown'}</p>
                            <p className="text-sm">
                              <span className="text-primary font-medium">Performance: {data.performance_rating || 'N/A'}</span>
                            </p>
                            <p className="text-sm">Points: {data.points} / {data.total_rounds}</p>
                            {data.place && <p className="text-sm">Place: #{data.place}</p>}
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="performance_rating" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No performance ratings available</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Win Rate Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Win Rate by Tournament
          </CardTitle>
          <CardDescription>Percentage of games won per tournament</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="tournament" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  fontSize={10}
                  className="fill-muted-foreground"
                />
                <YAxis 
                  domain={[0, 100]}
                  className="fill-muted-foreground" 
                  fontSize={12} 
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-3">
                          <p className="font-semibold text-sm mb-2">{label}</p>
                          <p className="text-sm text-muted-foreground mb-1">Date: {data.date || 'Unknown'}</p>
                          <p className="text-sm">
                            <span className="text-green-600 font-medium">Win Rate: {data.winRate.toFixed(1)}%</span>
                          </p>
                          <p className="text-sm">
                            W:{data.wins} D:{data.draws} L:{data.losses}
                          </p>
                          <p className="text-sm">Total Games: {data.total_rounds}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar 
                  dataKey="winRate" 
                  fill="hsl(var(--primary))"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}