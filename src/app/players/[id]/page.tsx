import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { ArrowLeft, User, Trophy, Calendar, MapPin, Users, BarChart3, Star, Award, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { WarningBanner } from '@/components/warning-banner'
import { getPlayerDetails, getPlayerTournaments } from '../server-actions'
import PlayerTournamentsTable from './components/PlayerTournamentsTable'
import PlayerPerformanceChart from './components/PlayerPerformanceChart'
import PlayerStatsCards from './components/PlayerStatsCards'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PlayerDetailPage({ params }: Props) {
  const { id } = await params
  
  const playerResult = await getPlayerDetails(id)
  
  if (playerResult.error || !playerResult.data) {
    notFound()
  }
  
  const player = playerResult.data
  const fullName = `${player.firstname || ''} ${player.surname || ''}`.trim()
  const displayName = fullName || player.normalized_name || 'Unknown Player'
  
  const calculateAge = (bdate: string | null): number | null => {
    if (!bdate) return null
    try {
      const [year, month, day] = bdate.split('/').map(Number)
      const birthDate = new Date(year, month - 1, day)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      
      return age
    } catch (error) {
      return null
    }
  }
  
  const age = calculateAge(player.bdate)
  
  // Parse performance stats
  let performanceStats = []
  if (player.performance_stats) {
    try {
      performanceStats = Array.isArray(player.performance_stats) 
        ? player.performance_stats 
        : JSON.parse(player.performance_stats)
    } catch (error) {
      console.error('Error parsing performance stats:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-8 mx-auto max-w-7xl">
        <div className="space-y-6">
          <WarningBanner message="Development is still underway. Certain tournaments are missing performance calculations. Our developers are hard at work to include those. You may notice this player has tournaments listed but fewer performances calculated - this discrepancy will be resolved as we complete the performance calculation for all tournaments." />
          
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href="/players">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Players
              </Button>
            </Link>
          </div>

          {/* Player Profile Card */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-2">
                  <CardTitle className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                    <User className="h-8 w-8 text-primary" />
                    {displayName}
                  </CardTitle>
                  
                  {player.normalized_name && fullName !== player.normalized_name && (
                    <CardDescription className="text-base">
                      Also known as: {player.normalized_name}
                    </CardDescription>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {player.unique_no && (
                      <Badge variant="outline" className="gap-1">
                        <Star className="h-3 w-3" />
                        #{player.unique_no}
                      </Badge>
                    )}
                    {player.lim_id && (
                      <Badge variant="outline" className="gap-1">
                        LIM:{player.lim_id}
                      </Badge>
                    )}
                    {player.federation && (
                      <Badge variant="secondary" className="gap-1">
                        <MapPin className="h-3 w-3" />
                        {player.federation}
                      </Badge>
                    )}
                    {age && (
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" />
                        {age} years old
                      </Badge>
                    )}
                    {player.sex && (
                      <Badge variant="secondary">
                        {player.sex}
                      </Badge>
                    )}
                    {player.title && (
                      <Badge variant="default" className="gap-1">
                        <Award className="h-3 w-3" />
                        {player.title}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col sm:items-end gap-2">
                  {player.avg_performance_rating && (
                    <div className="text-center sm:text-right">
                      <div className="text-3xl font-bold text-primary">
                        {player.avg_performance_rating.toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">Average Performance</div>
                    </div>
                  )}
                  
                  {player.cf_rating && (
                    <div className="text-center sm:text-right">
                      <div className="text-xl font-semibold">
                        {player.cf_rating}
                      </div>
                      <div className="text-xs text-muted-foreground">CF Rating</div>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium text-muted-foreground">Tournaments</div>
                  <div className="text-lg font-semibold">
                    {player.performance_count || 0}
                  </div>
                </div>
                
                <div>
                  <div className="font-medium text-muted-foreground">Status</div>
                  <div className="text-lg font-semibold">
                    {player.is_reconciled ? (
                      <Badge variant="default" className="gap-1">
                        <BarChart3 className="h-3 w-3" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Processing
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div>
                  <div className="font-medium text-muted-foreground">Confidence</div>
                  <div className="text-lg font-semibold">
                    {player.confidence_score ? (
                      <Badge 
                        variant={player.confidence_score >= 0.9 ? "default" : player.confidence_score >= 0.7 ? "secondary" : "outline"}
                      >
                        {Math.round(player.confidence_score * 100)}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
                
                <div>
                  <div className="font-medium text-muted-foreground">Last Updated</div>
                  <div className="text-sm">
                    {new Date(player.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Statistics */}
          <Suspense fallback={<Skeleton className="h-32 w-full" />}>
            <PlayerStatsCards 
              performanceStats={performanceStats} 
              avgPerformanceRating={player.avg_performance_rating}
            />
          </Suspense>

          {/* Performance Chart */}
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <PlayerPerformanceChart performanceStats={performanceStats} />
          </Suspense>

          {/* Tournament History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Tournament History
              </CardTitle>
              <CardDescription>
                Detailed performance across all tournaments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense 
                fallback={
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                }
              >
                <PlayerTournamentsTable 
                  sourceRecords={player.source_records}
                  performanceStats={performanceStats}
                />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}