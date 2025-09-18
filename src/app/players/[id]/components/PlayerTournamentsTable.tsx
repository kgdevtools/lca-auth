'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ExternalLink, 
  Calendar, 
  MapPin, 
  Trophy, 
  Target,
  Medal,
  Loader2
} from 'lucide-react'
import { getPlayerTournaments } from '../../server-actions'
import type { TournamentInfo } from '../../server-actions'

interface PlayerTournamentsTableProps {
  sourceRecords: string[] | null
  performanceStats: any[]
}

export default function PlayerTournamentsTable({ sourceRecords, performanceStats }: PlayerTournamentsTableProps) {
  const [tournaments, setTournaments] = useState<TournamentInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingTournamentId, setLoadingTournamentId] = useState<string | null>(null)

  // LoadingTournamentButton component for tournament View buttons
  const LoadingTournamentButton = ({ tournamentId, href }: { tournamentId: string, href: string }) => {
    const isLoading = loadingTournamentId === tournamentId
    
    const handleClick = () => {
      setLoadingTournamentId(tournamentId)
      // The actual navigation will happen via Link, reset loading after delay
      setTimeout(() => setLoadingTournamentId(null), 1500)
    }
    
    return (
      <Link href={href} onClick={handleClick}>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-1 text-primary hover:text-primary/80"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ExternalLink className="h-3 w-3" />
          )}
          {isLoading ? 'Loading...' : 'View'}
        </Button>
      </Link>
    )
  }

  useEffect(() => {
    async function fetchTournaments() {
      try {
        setLoading(true)
        setError(null)

        if (!sourceRecords || sourceRecords.length === 0) {
          setTournaments([])
          return
        }

        const result = await getPlayerTournaments(sourceRecords)
        
        if (result.error) {
          setError(result.error)
          setTournaments([])
        } else {
          setTournaments(result.data || [])
        }
      } catch (err) {
        setError('Failed to load tournament data')
        setTournaments([])
      } finally {
        setLoading(false)
      }
    }

    fetchTournaments()
  }, [sourceRecords])

  // Create a map of tournament performance stats by tournament_id or tournament_name
  const performanceMap = new Map()
  performanceStats.forEach(stat => {
    if (stat.tournament_id) {
      performanceMap.set(stat.tournament_id, stat)
    } else if (stat.tournament_name) {
      performanceMap.set(stat.tournament_name, stat)
    }
  })

  const getPerformanceForTournament = (tournament: TournamentInfo) => {
    return performanceMap.get(tournament.id) || 
           performanceMap.get(tournament.tournament_name) ||
           null
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Unknown'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  const getRankBadgeVariant = (place: number | null): "default" | "secondary" | "destructive" | "outline" => {
    if (!place) return "outline"
    if (place === 1) return "default"
    if (place <= 3) return "secondary"
    return "outline"
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">Loading tournament history...</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tournament</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-center">Performance</TableHead>
              <TableHead className="text-center">Result</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-6 w-12 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-8 w-20 mx-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <Trophy className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-30" />
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (tournaments.length === 0) {
    return (
      <div className="text-center py-8">
        <Trophy className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-30" />
        <p className="text-muted-foreground">No tournament records found</p>
        <p className="text-sm text-muted-foreground mt-1">
          This player may have tournament data that hasn't been processed yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Showing {tournaments.length} tournament{tournaments.length !== 1 ? 's' : ''}
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-semibold">Tournament</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Location</TableHead>
              <TableHead className="text-center font-semibold">Performance</TableHead>
              <TableHead className="text-center font-semibold">Result</TableHead>
              <TableHead className="text-center font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tournaments.map((tournament) => {
              const performance = getPerformanceForTournament(tournament)
              
              return (
                <TableRow key={tournament.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-semibold text-foreground">
                        {tournament.tournament_name || 'Unnamed Tournament'}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {tournament.organizer && (
                          <span>{tournament.organizer}</span>
                        )}
                        {tournament.tournament_type && (
                          <>
                            <span>•</span>
                            <span>{tournament.tournament_type}</span>
                          </>
                        )}
                        {tournament.rounds && (
                          <>
                            <span>•</span>
                            <span>{tournament.rounds} rounds</span>
                          </>
                        )}
                      </div>
                      {tournament.time_control && (
                        <div className="text-xs text-muted-foreground">
                          Time Control: {tournament.time_control}
                          {tournament.rate_of_play && ` (${tournament.rate_of_play})`}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {formatDate(tournament.date)}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {tournament.location || 'Unknown'}
                    </div>
                    {tournament.federation && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {tournament.federation}
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-center">
                    {performance ? (
                      <div className="space-y-1">
                        {performance.performance_rating && (
                          <div className="flex items-center gap-1 justify-center">
                            <Target className="h-3 w-3 text-primary" />
                            <span className="font-semibold text-primary">
                              {performance.performance_rating}
                            </span>
                          </div>
                        )}
                        {performance.points !== undefined && performance.total_rounds && (
                          <div className="text-xs text-muted-foreground">
                            {performance.points} / {performance.total_rounds}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {performance.total_wins || 0}W-{performance.total_draws || 0}D-{performance.total_losses || 0}L
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-center">
                    {performance?.place ? (
                      <Badge 
                        variant={getRankBadgeVariant(performance.place)} 
                        className="gap-1"
                      >
                        <Medal className="h-3 w-3" />
                        #{performance.place}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <LoadingTournamentButton 
                      tournamentId={tournament.id}
                      href={`/tournaments/${tournament.id}`}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      
      {tournaments.length > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          Performance data is automatically calculated from tournament results
        </div>
      )}
    </div>
  )
}