// src/app/admin/admin-dashboard/components/TournamentsChart.tsx
'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { createClient } from '@/utils/supabase/client'

interface ChartData {
  month: string
  tournaments: number
  players: number
}

export default function TournamentsChart() {
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchChartData() {
      const supabase = createClient()

      try {
        // Get tournaments data
        const { data: tournaments } = await supabase
          .from('tournaments')
          .select('created_at')
          .order('created_at', { ascending: true })

        // Get players data
        const { data: players } = await supabase
          .from('players')
          .select('created_at')
          .order('created_at', { ascending: true })

        if (!tournaments || !players) return

        // Process data by month
        const monthlyData = new Map<string, { tournaments: number; players: number }>()

        // Process tournaments
        tournaments.forEach(tournament => {
          if (tournament.created_at) {
            const date = new Date(tournament.created_at)
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            const existing = monthlyData.get(monthKey) || { tournaments: 0, players: 0 }
            monthlyData.set(monthKey, { ...existing, tournaments: existing.tournaments + 1 })
          }
        })

        // Process players
        players.forEach(player => {
          if (player.created_at) {
            const date = new Date(player.created_at)
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            const existing = monthlyData.get(monthKey) || { tournaments: 0, players: 0 }
            monthlyData.set(monthKey, { ...existing, players: existing.players + 1 })
          }
        })

        // Convert to array and sort
        const chartData: ChartData[] = Array.from(monthlyData.entries())
          .map(([month, counts]) => ({
            month: new Date(month + '-01').toLocaleDateString('en-US', {
              month: 'short',
              year: '2-digit'
            }),
            tournaments: counts.tournaments,
            players: counts.players
          }))
          .sort((a, b) => a.month.localeCompare(b.month))
          .slice(-6) // Last 6 months

        setData(chartData)
      } catch (error) {
        console.error('Error fetching chart data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChartData()
  }, [])

  if (loading) {
    return (
      <div className="bg-white p-4 lg:p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Tournament Activity</h3>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading chart data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tournament Activity</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 sm:mt-0">Last 6 months</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" className="dark:stroke-gray-600" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              className="dark:fill-gray-300"
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              className="dark:fill-gray-300"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              labelStyle={{ fontWeight: 'medium', color: '#374151' }}
            />
            <Line
              type="monotone"
              dataKey="tournaments"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#1d4ed8' }}
              name="Tournaments"
            />
            <Line
              type="monotone"
              dataKey="players"
              stroke="#dc2626"
              strokeWidth={3}
              dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#b91c1c' }}
              name="Players"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
