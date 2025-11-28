"use client"

import { useEffect, useState } from 'react'
import { getRankings, type PlayerRanking } from '@/app/rankings/server-actions'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const AGE_GROUPS = ['U8', 'U10', 'U12', 'U14', 'U16', 'U18', 'U20', 'Seniors']
const GENDERS = ['M', 'F']
const FEDERATIONS = ['LCP', 'LMG', 'LVT', 'LWT', 'LSG', 'LIM']

export function RankingsCard() {
  const [rankings, setRankings] = useState<PlayerRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryLabel, setCategoryLabel] = useState('')

  useEffect(() => {
    async function loadRankings() {
      try {
        const allRankings = await getRankings()

        // Randomly select a filter type (removed Overall, only specific filters)
        const filterType = Math.random()
        let filtered: PlayerRanking[] = []
        let label = ''

        if (filterType < 0.33) {
          // Filter by age group
          const randomAge = AGE_GROUPS[Math.floor(Math.random() * AGE_GROUPS.length)]
          filtered = allRankings.filter(p => p.age_group === randomAge)
          label = `Top 10 ${randomAge} Players`
        } else if (filterType < 0.66) {
          // Filter by gender
          const randomGender = GENDERS[Math.floor(Math.random() * GENDERS.length)]
          filtered = allRankings.filter(p => p.sex === randomGender)
          label = randomGender === 'M' ? 'Top 10 Male Players' : 'Top 10 Female Players'
        } else {
          // Filter by Limpopo federation
          filtered = allRankings.filter(p => FEDERATIONS.includes(p.fed || ''))
          label = 'Top 10 Limpopo Players'
        }

        // Sort by average performance rating and take top 10
        const sorted = filtered
          .filter(p => p.avg_performance_rating) // Only players with ratings
          .sort((a, b) => (b.avg_performance_rating || 0) - (a.avg_performance_rating || 0))
          .slice(0, 10)

        // If filtered is empty, fall back to top 10 overall
        if (sorted.length === 0) {
          const topOverall = allRankings
            .filter(p => p.avg_performance_rating)
            .sort((a, b) => (b.avg_performance_rating || 0) - (a.avg_performance_rating || 0))
            .slice(0, 10)
          setRankings(topOverall)
          setCategoryLabel('Top 10 Players Overall')
        } else {
          setRankings(sorted)
          setCategoryLabel(label)
        }
      } catch (error) {
        console.error('Error loading rankings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRankings()
  }, [])

  if (loading) {
    return (
      <div className="aspect-square rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg flex flex-col p-4">
        <h2 className="text-xl font-bold mb-4 text-primary">Loading Rankings...</h2>
        <div className="space-y-2 flex-1">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-6 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (rankings.length === 0) {
    return (
      <div className="aspect-square rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg flex flex-col p-6">
        <h2 className="text-xl font-bold mb-4 text-primary">Current Rankings</h2>
        <div className="flex-1 flex items-center justify-center text-center">
          <p className="text-muted-foreground">No rankings available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="aspect-square rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg flex flex-col">
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <Link href="/rankings" className="group">
          <h2 className="text-lg font-bold text-primary group-hover:text-primary/80 flex items-center gap-2">
            {categoryLabel}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </h2>
        </Link>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr className="border-b border-border">
                <th className="text-left p-2 font-semibold whitespace-nowrap">Rank</th>
                <th className="text-left p-2 font-semibold">Name</th>
                {/* Show Events on sm and up */}
                <th className="hidden sm:table-cell text-center p-2 font-semibold whitespace-nowrap">Events</th>
                {/* Show Fed on md and up */}
                <th className="hidden md:table-cell text-left p-2 font-semibold whitespace-nowrap">Fed</th>
                {/* Show Rating on lg and up */}
                <th className="hidden lg:table-cell text-right p-2 font-semibold whitespace-nowrap">Rating</th>
                {/* APR always shown */}
                <th className="text-right p-2 font-semibold whitespace-nowrap">APR</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((player, index) => (
                <tr
                  key={player.name_key || index}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="p-2 font-medium whitespace-nowrap">{index + 1}</td>
                  <td className="p-2">
                    <div className="font-medium line-clamp-1 text-xs">{player.name}</div>
                  </td>
                  {/* Events column - sm and up */}
                  <td className="hidden sm:table-cell p-2 text-center text-muted-foreground whitespace-nowrap">
                    {player.tournaments_count || 0}
                  </td>
                  {/* Fed column - md and up */}
                  <td className="hidden md:table-cell p-2 whitespace-nowrap">
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {player.fed || '-'}
                    </div>
                  </td>
                  {/* Rating column - lg and up */}
                  <td className="hidden lg:table-cell p-2 text-right text-muted-foreground whitespace-nowrap">
                    {player.rating || '-'}
                  </td>
                  {/* APR column - always shown */}
                  <td className="p-2 text-right font-semibold text-primary whitespace-nowrap">
                    {player.avg_performance_rating
                      ? Math.round(player.avg_performance_rating)
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 border-t border-border flex-shrink-0">
          <Link
            href="/rankings"
            className="text-xs text-primary hover:text-primary/80 font-medium flex items-center justify-center gap-1 group"
          >
            View All Rankings
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  )
}
