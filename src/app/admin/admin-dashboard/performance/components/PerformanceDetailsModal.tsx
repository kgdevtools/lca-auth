'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, BarChart3, Trophy, Target, Award, Calendar, Users, Star, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Player {
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
  sex: string | null
  bdate: string | null
}

interface PerformanceDetail {
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
  }
  date?: string
  section?: string
  place?: number
  category?: string
  opponents?: Array<{
    name?: string
    rating?: number
    result?: string
  }>
}

interface PerformanceDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  player: Player | null
  performanceDetails: PerformanceDetail[]
}

export default function PerformanceDetailsModal({
  isOpen,
  onClose,
  player,
  performanceDetails = []
}: PerformanceDetailsModalProps) {
  if (!player) return null

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date'
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return dateString
    }
  }

  const getConfidenceColor = (confidence?: string) => {
    switch (confidence?.toUpperCase()) {
      case 'HIGH':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LOW':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getWinPercentage = (wins: number = 0, draws: number = 0, losses: number = 0) => {
    const totalGames = wins + draws + losses
    if (totalGames === 0) return 0
    return ((wins + (draws * 0.5)) / totalGames) * 100
  }

  // Debug log to see what data we're receiving
  console.log('Performance details received:', performanceDetails)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[90rem] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Performance Analytics
            </DialogTitle>
            <DialogDescription className="text-base">
              Detailed tournament performances for {player.firstname} {player.surname}
              {player.normalized_name && ` (${player.normalized_name})`}
            </DialogDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="grid gap-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {player.avg_performance_rating ? player.avg_performance_rating.toFixed(1) : '-'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Avg Perf</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {player.cf_rating || '-'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {player.performance_count || '0'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {performanceDetails.length || '0'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Performances</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {player.federation || '-'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Federation</div>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-6 py-3 font-semibold text-sm flex items-center gap-2">
              <Award className="h-4 w-4" />
              Tournament Performances ({performanceDetails.length})
            </div>
            <div className="divide-y">
              {performanceDetails && performanceDetails.length > 0 ? (
                performanceDetails.map((detail, index) => {
                  const winPercentage = getWinPercentage(
                    detail.total_wins,
                    detail.total_draws,
                    detail.total_losses
                  )

                  return (
                    <div key={index} className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">
                            {detail.tournament_name || 'Unknown Tournament'}
                          </h4>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                            {detail.date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(detail.date)}
                              </span>
                            )}
                            {detail.section && (
                              <Badge variant="outline">{detail.section}</Badge>
                            )}
                            {detail.category && (
                              <Badge variant="secondary">{detail.category}</Badge>
                            )}
                            {detail.place && (
                              <Badge className="bg-blue-100 text-blue-800">
                                {detail.place} {detail.place === 1 ? 'st' : detail.place === 2 ? 'nd' : detail.place === 3 ? 'rd' : 'th'} Place
                              </Badge>
                            )}
                            {detail.confidence && (
                              <Badge className={getConfidenceColor(detail.confidence)}>
                                {detail.confidence}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {detail.performance_rating && (
                            <Badge className="bg-primary text-primary-foreground px-3 py-2 text-lg">
                              <Target className="h-4 w-4 mr-2" />
                              Perf: {detail.performance_rating}
                            </Badge>
                          )}
                          {detail.player_rating && (
                            <Badge variant="outline" className="text-sm">
                              Rating: {detail.player_rating}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 text-sm mb-4">
                        <div className="bg-secondary/50 p-3 rounded-lg">
                          <div className="text-muted-foreground">Points</div>
                          <div className="font-bold text-lg">{detail.points ?? '0'}</div>
                        </div>
                        <div className="bg-secondary/50 p-3 rounded-lg">
                          <div className="text-muted-foreground">Record (W-D-L)</div>
                          <div className="font-bold text-lg">
                            {detail.total_wins ?? '0'}-{detail.total_draws ?? '0'}-{detail.total_losses ?? '0'}
                          </div>
                        </div>
                        <div className="bg-secondary/50 p-3 rounded-lg">
                          <div className="text-muted-foreground">Win %</div>
                          <div className="font-bold text-lg">{winPercentage.toFixed(1)}%</div>
                        </div>
                        <div className="bg-secondary/50 p-3 rounded-lg">
                          <div className="text-muted-foreground">Rounds</div>
                          <div className="font-bold text-lg">{detail.total_rounds ?? '0'}</div>
                        </div>
                        <div className="bg-secondary/50 p-3 rounded-lg">
                          <div className="text-muted-foreground">Player Rating</div>
                          <div className="font-bold text-lg">{detail.player_rating ?? '-'}</div>
                        </div>
                        <div className="bg-secondary/50 p-3 rounded-lg">
                          <div className="text-muted-foreground">Performance</div>
                          <div className="font-bold text-lg">{detail.performance_rating ?? '-'}</div>
                        </div>
                      </div>

                      {detail.classifications && (
                        <div className="mt-4 pt-4 border-t">
                          <h5 className="font-semibold text-sm text-muted-foreground mb-2">Tie-breaks:</h5>
                          <div className="flex flex-wrap gap-2">
                            {detail.classifications.TB1 && (
                              <Badge variant="outline">TB1: {detail.classifications.TB1}</Badge>
                            )}
                            {detail.classifications.TB2 && (
                              <Badge variant="outline">TB2: {detail.classifications.TB2}</Badge>
                            )}
                            {detail.classifications.TB3 && (
                              <Badge variant="outline">TB3: {detail.classifications.TB3}</Badge>
                            )}
                            {detail.classifications.TB4 && (
                              <Badge variant="outline">TB4: {detail.classifications.TB4}</Badge>
                            )}
                            {detail.classifications.TB5 && (
                              <Badge variant="outline">TB5: {detail.classifications.TB5}</Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="p-12 text-center text-muted-foreground">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No performance data available</p>
                  <p className="text-sm mt-2">This player hasn't participated in any rated tournaments yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
