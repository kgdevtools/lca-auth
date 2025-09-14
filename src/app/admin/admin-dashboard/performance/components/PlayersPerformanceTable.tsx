'use client'

import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronDown, ChevronRight, BarChart3, Filter } from 'lucide-react'
import { getPlayersWithPerformanceStats, getPlayerPerformanceDetails } from '../server-actions'
import PerformanceDetailsModal from './PerformanceDetailsModal'

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

export default function PlayersPerformanceTable() {
  const [players, setPlayers] = useState<Player[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [performanceDetails, setPerformanceDetails] = useState<Record<string, PerformanceDetail[]>>({})
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  useEffect(() => {
    async function fetchPlayers() {
      try {
        const result = await getPlayersWithPerformanceStats()
        
        if (result.error) {
          setPlayers([])
          setFilteredPlayers([])
          return
        }
        
        if (!result.data || !Array.isArray(result.data)) {
          setPlayers([])
          setFilteredPlayers([])
          return
        }
        
        const sortedData = result.data.sort((a, b) => {
          const aRating = a.avg_performance_rating || 0
          const bRating = b.avg_performance_rating || 0
          return bRating - aRating
        })
        
        setPlayers(sortedData)
        setFilteredPlayers(sortedData)
      } catch (error) {
        setPlayers([])
        setFilteredPlayers([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchPlayers()
  }, [])

  const calculateAge = (bdate: string | null | undefined): number | null => {
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

  useEffect(() => {
    let filtered = players
    
    switch (activeFilter) {
      case 'resolved':
        filtered = players.filter(player => 
          player.unique_no !== null && player.normalized_name !== null
        )
        break
      case 'no_tp':
        filtered = players.filter(player => 
          player.avg_performance_rating === null || player.avg_performance_rating === 0
        )
        break
      case 'u20':
        filtered = players.filter(player => {
          const age = calculateAge(player.bdate)
          return age !== null && age >= 17 && age <= 19
        })
        break
      case 'u18':
        filtered = players.filter(player => {
          const age = calculateAge(player.bdate)
          return age !== null && age >= 15 && age <= 17
        })
        break
      case 'u16':
        filtered = players.filter(player => {
          const age = calculateAge(player.bdate)
          return age !== null && age >= 13 && age <= 15
        })
        break
      case 'u14':
        filtered = players.filter(player => {
          const age = calculateAge(player.bdate)
          return age !== null && age >= 11 && age <= 13
        })
        break
      case 'u12':
        filtered = players.filter(player => {
          const age = calculateAge(player.bdate)
          return age !== null && age >= 9 && age <= 11
        })
        break
      case 'u10':
        filtered = players.filter(player => {
          const age = calculateAge(player.bdate)
          return age !== null && age >= 7 && age <= 9
        })
        break
      case 'male':
        filtered = players.filter(player =>
          player.sex?.toLowerCase() === 'male' || player.sex?.toLowerCase() === 'm'
        )
        break
      case 'female':
        filtered = players.filter(player => 
          player.sex?.toLowerCase() === 'female' || player.sex?.toLowerCase() === 'f'
        )
        break
      default:
        break
    }
    
    setFilteredPlayers(filtered)
  }, [activeFilter, players])

  const toggleRowExpansion = async (playerId: string) => {
    const newExpandedRows = new Set(expandedRows)
    if (newExpandedRows.has(playerId)) {
      newExpandedRows.delete(playerId)
    } else {
      newExpandedRows.add(playerId)
      if (!performanceDetails[playerId]) {
        try {
          const result = await getPlayerPerformanceDetails(playerId)
          if (result.data?.performance_stats) {
            setPerformanceDetails(prev => ({
              ...prev,
              [playerId]: result.data.performance_stats
            }))
          }
        } catch (error) {
          // Error handling can be added here if needed
        }
      }
    }
    setExpandedRows(newExpandedRows)
  }

  const openModal = (player: Player) => {
    setSelectedPlayer(player)
    setIsModalOpen(true)
  }

  const FilterButton = ({ type, label }: { type: FilterType, label: string }) => (
    <Button
      variant={activeFilter === type ? "default" : "outline"}
      size="sm"
      onClick={() => setActiveFilter(type)}
      className="text-xs h-7 px-2"
    >
      {label}
    </Button>
  )

  if (loading) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-2 px-2 text-xs md:text-sm font-bold">Pos</TableHead>
              <TableHead className="py-2 px-2 text-xs md:text-sm font-bold">Player</TableHead>
              <TableHead className="text-right py-2 px-2 text-xs md:text-sm font-bold">Rating</TableHead>
              <TableHead className="text-right py-2 px-2 text-xs md:text-sm font-bold">Avg Perf</TableHead>
              <TableHead className="text-right py-2 px-2 text-xs md:text-sm font-bold">Events</TableHead>
              <TableHead className="w-[50px] py-2 px-2"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell className="py-1 px-2">
                  <Skeleton className="h-4 w-6" />
                </TableCell>
                <TableCell className="py-1 px-2">
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell className="text-right py-1 px-2">
                  <Skeleton className="h-4 w-10 ml-auto" />
                </TableCell>
                <TableCell className="text-right py-1 px-2">
                  <Skeleton className="h-4 w-10 ml-auto" />
                </TableCell>
                <TableCell className="text-right py-1 px-2">
                  <Skeleton className="h-4 w-6 ml-auto" />
                </TableCell>
                <TableCell className="py-1 px-2">
                  <Skeleton className="h-6 w-6 rounded-md" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4 p-2 bg-muted/30 rounded-lg">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Filter:</span>
        <FilterButton type="all" label="All" />
        <FilterButton type="resolved" label="Resolved" />
        <FilterButton type="no_tp" label="No TP" />
        <div className="flex items-center gap-1 ml-2">
          <span className="text-xs text-muted-foreground">Age:</span>
          <FilterButton type="u20" label="U20 (17-19)" />
          <FilterButton type="u18" label="U18 (15-17)" />
          <FilterButton type="u16" label="U16 (13-15)" />
          <FilterButton type="u14" label="U14 (11-13)" />
          <FilterButton type="u12" label="U12 (9-11)" />
          <FilterButton type="u10" label="U10 (7-9)" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Gender:</span>
          <FilterButton type="male" label="Male" />
          <FilterButton type="female" label="Female" />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="p-4 bg-muted/10 text-sm">
          Showing {filteredPlayers.length} of {players.length} total players
        </div>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="py-2 px-2 text-xs md:text-sm font-bold">Pos</TableHead>
              <TableHead className="py-2 px-2 text-xs md:text-sm font-bold text-left">Player</TableHead>
              <TableHead className="text-right py-2 px-2 text-xs md:text-sm font-bold">Rating</TableHead>
              <TableHead className="text-right py-2 px-2 text-xs md:text-sm font-bold">Avg Perf</TableHead>
              <TableHead className="text-right py-2 px-2 text-xs md:text-sm font-bold">Events</TableHead>
              <TableHead className="w-[50px] py-2 px-2"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPlayers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {players.length === 0 ? 'No players found in database' : 'No players match the current filter'}
                </TableCell>
              </TableRow>
            ) : (
              filteredPlayers.map((player, index) => (
                <TableRow key={player.id} className="hover:bg-secondary/30 group">
                  <TableCell className="py-1 px-2 text-xs md:text-sm font-medium text-muted-foreground text-left">
                    {index + 1}
                  </TableCell>
                  <TableCell className="py-1 px-2 text-left">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => toggleRowExpansion(player.id)}
                      >
                        {expandedRows.has(player.id) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </Button>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-foreground truncate">
                          {player.firstname} {player.surname}
                        </div>
                        {player.normalized_name && (
                          <div className="text-xs text-muted-foreground truncate">
                            {player.normalized_name}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {player.unique_no && <span>#{player.unique_no}</span>}
                          {player.federation && <span>• {player.federation}</span>}
                          {player.bdate && <span>• {calculateAge(player.bdate)} yrs</span>}
                          {player.sex && <span>• {player.sex}</span>}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-1 px-2 text-sm text-left">
                    {player.cf_rating ? (
                      <span className="font-semibold">{player.cf_rating}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-1 px-2 text-sm text-left">
                    {player.avg_performance_rating ? (
                      <span className="font-semibold text-primary">
                        {player.avg_performance_rating.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-1 px-2 text-left">
                    {player.performance_count ? (
                      <Badge variant="secondary" className="text-xs">
                        {player.performance_count}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-1 px-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 bg-primary/10 hover:bg-primary/20 transition-colors"
                      onClick={() => openModal(player)}
                    >
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PerformanceDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        player={selectedPlayer}
        performanceDetails={selectedPlayer ? performanceDetails[selectedPlayer.id] || [] : []}
      />
    </>
  )
}
