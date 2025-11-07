'use client'

import { useState, useEffect } from 'react'
import { usePagination } from '@/hooks/usePagination'
import { useTableFilters } from '@/hooks/useTableFilters'
import { useExport } from '@/hooks/useExport'
import {
  getAllPlayers,
  getAllPlayersForExport,
  getUniqueFederationsForPlayers,
  getTournamentsForPlayers,
} from '../server-actions'
import type { Player } from '@/types/admin'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  FileJson,
  RefreshCw,
  X,
  Eye,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function AllPlayersTable() {
  // State
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [federations, setFederations] = useState<string[]>([])
  const [tournaments, setTournaments] = useState<
    Array<{ id: string; name: string }>
  >([])
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  // Hooks
  const { filters, updateFilter, clearFilters, hasActiveFilters } =
    useTableFilters()
  const {
    page,
    itemsPerPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    changeItemsPerPage,
  } = usePagination({
    initialPage: 1,
    initialItemsPerPage: 50,
    totalItems: totalCount,
  })
  const { isExporting, handleExport } = useExport<Player>()

  // Load players
  const loadPlayers = async () => {
    setLoading(true)
    setError(null)

    const result = await getAllPlayers(page, itemsPerPage, filters)

    if (result.error) {
      setError(result.error)
      setPlayers([])
    } else {
      setPlayers(result.data || [])
      setTotalCount(result.count || 0)
    }

    setLoading(false)
  }

  // Load filter options
  const loadFilterOptions = async () => {
    const [fedsResult, tournamentsResult] = await Promise.all([
      getUniqueFederationsForPlayers(),
      getTournamentsForPlayers(),
    ])

    if (fedsResult.data) setFederations(fedsResult.data)
    if (tournamentsResult.data) setTournaments(tournamentsResult.data)
  }

  // Effects
  useEffect(() => {
    loadFilterOptions()
  }, [])

  useEffect(() => {
    loadPlayers()
  }, [page, itemsPerPage, filters])

  // Export handlers
  const handleExportCSV = async () => {
    const result = await getAllPlayersForExport(filters)
    if (result.data) {
      // Flatten JSONB fields for CSV export
      const flattenedData = result.data.map((player) => ({
        ...player,
        rounds: JSON.stringify(player.rounds),
        tie_breaks: JSON.stringify(player.tie_breaks),
      })) as any[]

      await handleExport(flattenedData, 'all_players', {
        format: 'csv',
        scope: 'filtered',
        excludeFields: ['id', 'created_at', 'tournament_id'],
        fieldMapping: {
          rank: 'Rank',
          name: 'Name',
          federation: 'Federation',
          rating: 'Rating',
          points: 'Points',
          rounds: 'Rounds',
          tie_breaks: 'Tie Breaks',
        },
      })
    }
  }

  const handleExportExcel = async () => {
    const result = await getAllPlayersForExport(filters)
    if (result.data) {
      // Flatten JSONB fields for Excel export
      const flattenedData = result.data.map((player) => ({
        ...player,
        rounds: JSON.stringify(player.rounds),
        tie_breaks: JSON.stringify(player.tie_breaks),
      })) as any[]

      await handleExport(flattenedData, 'all_players', {
        format: 'excel',
        scope: 'filtered',
        excludeFields: ['id', 'created_at', 'tournament_id'],
        fieldMapping: {
          rank: 'Rank',
          name: 'Name',
          federation: 'Federation',
          rating: 'Rating',
          points: 'Points',
          rounds: 'Rounds',
          tie_breaks: 'Tie Breaks',
        },
      })
    }
  }

  const handleExportJSON = async () => {
    const result = await getAllPlayersForExport(filters)
    if (result.data) {
      await handleExport(result.data, 'all_players', {
        format: 'json',
        scope: 'filtered',
        includeMetadata: true,
        pretty: true,
        excludeFields: ['id', 'created_at'],
      })
    }
  }

  // Loading skeleton
  if (loading && players.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 animate-pulse rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <Card>
        <CardHeader>
          <CardTitle>All Players</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <Input
              placeholder="Search by name..."
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full"
            />

            {/* Federation Filter */}
            <Select
              value={filters.federation || 'all'}
              onValueChange={(value) =>
                updateFilter('federation', value === 'all' ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Federation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Federations</SelectItem>
                {federations.map((fed) => (
                  <SelectItem key={fed} value={fed}>
                    {fed}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tournament Filter */}
            <Select
              value={filters.tournament || 'all'}
              onValueChange={(value) =>
                updateFilter('tournament', value === 'all' ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tournament" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tournaments</SelectItem>
                {tournaments.map((tournament) => (
                  <SelectItem key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Showing {(page - 1) * itemsPerPage + 1} -{' '}
                {Math.min(page * itemsPerPage, totalCount)} of {totalCount}
              </span>

              {/* Items per page */}
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => changeItemsPerPage(Number(value))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={isExporting || loading}
              >
                <FileText className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={isExporting || loading}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                disabled={isExporting || loading}
              >
                <FileJson className="w-4 h-4 mr-2" />
                JSON
              </Button>
              <Button variant="outline" size="sm" onClick={loadPlayers}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800">{error}</p>
          <Button onClick={loadPlayers} className="mt-2" variant="outline">
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Federation</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : players.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No players found
                    </TableCell>
                  </TableRow>
                ) : (
                  players.map((player, index) => (
                    <TableRow key={player.id || index}>
                      <TableCell className="font-medium">{player.rank}</TableCell>
                      <TableCell>{player.name}</TableCell>
                      <TableCell>{player.federation}</TableCell>
                      <TableCell>{player.rating}</TableCell>
                      <TableCell>{player.points}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPlayer(player)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            {/* Page Numbers */}
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }

                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => goToPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Player Details Modal */}
      <Dialog
        open={selectedPlayer !== null}
        onOpenChange={() => setSelectedPlayer(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPlayer?.name}</DialogTitle>
            <DialogDescription>Player details and rounds</DialogDescription>
          </DialogHeader>

          {selectedPlayer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Rank</p>
                  <p className="font-medium">{selectedPlayer.rank}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Federation</p>
                  <p className="font-medium">{selectedPlayer.federation}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Rating</p>
                  <p className="font-medium">{selectedPlayer.rating}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Points</p>
                  <p className="font-medium">{selectedPlayer.points}</p>
                </div>
              </div>

              {selectedPlayer.rounds && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Rounds</p>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedPlayer.rounds, null, 2)}
                  </pre>
                </div>
              )}

              {selectedPlayer.tie_breaks && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Tie Breaks</p>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedPlayer.tie_breaks, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
