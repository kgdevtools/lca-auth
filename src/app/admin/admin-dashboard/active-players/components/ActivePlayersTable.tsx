'use client'

import { useState, useEffect } from 'react'
import { usePagination } from '@/hooks/usePagination'
import { useTableFilters } from '@/hooks/useTableFilters'
import { useExport } from '@/hooks/useExport'
import {
  getActivePlayers,
  getAllActivePlayersForExport,
  getUniqueFederations,
  getUniqueTournamentsForActivePlayers,
} from '../server-actions'
import type { ActivePlayer } from '@/types/admin'
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
  Download,
  FileSpreadsheet,
  FileText,
  FileJson,
  RefreshCw,
  Filter,
  X,
} from 'lucide-react'

export function ActivePlayersTable() {
  // State
  const [players, setPlayers] = useState<ActivePlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [federations, setFederations] = useState<string[]>([])
  const [tournaments, setTournaments] = useState<
    Array<{ id: string; name: string }>
  >([])

  // Hooks
  const { filters, updateFilter, clearFilters, hasActiveFilters } =
    useTableFilters()
  const { page, itemsPerPage, totalPages, nextPage, prevPage, goToPage, changeItemsPerPage } =
    usePagination({
      initialPage: 1,
      initialItemsPerPage: 100,
      totalItems: totalCount,
    })
  const { isExporting, handleExport } = useExport<ActivePlayer>()

  // Load players
  const loadPlayers = async () => {
    setLoading(true)
    setError(null)

    const result = await getActivePlayers(page, itemsPerPage, filters)

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
      getUniqueFederations(),
      getUniqueTournamentsForActivePlayers(),
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
    const result = await getAllActivePlayersForExport(filters)
    if (result.data) {
      await handleExport(result.data, 'active_players', {
        format: 'csv',
        scope: 'filtered',
        excludeFields: ['id', 'created_at', 'tournament_id'],
        fieldMapping: {
          UNIQUE_NO: 'Player ID',
          SURNAME: 'Surname',
          FIRSTNAME: 'First Name',
          BDATE: 'Birth Date',
          SEX: 'Gender',
          TITLE: 'Title',
          RATING: 'Rating',
          FED: 'Federation',
          name: 'Full Name',
          player_rating: 'Player Rating',
          performance_rating: 'Performance Rating',
          confidence: 'Confidence',
          classifications: 'Classifications',
          tournament_name: 'Tournament',
        },
      })
    }
  }

  const handleExportExcel = async () => {
    const result = await getAllActivePlayersForExport(filters)
    if (result.data) {
      await handleExport(result.data, 'active_players', {
        format: 'excel',
        scope: 'filtered',
        excludeFields: ['id', 'created_at', 'tournament_id'],
        fieldMapping: {
          UNIQUE_NO: 'Player ID',
          SURNAME: 'Surname',
          FIRSTNAME: 'First Name',
          BDATE: 'Birth Date',
          SEX: 'Gender',
          TITLE: 'Title',
          RATING: 'Rating',
          FED: 'Federation',
          name: 'Full Name',
          player_rating: 'Player Rating',
          performance_rating: 'Performance Rating',
          confidence: 'Confidence',
          classifications: 'Classifications',
          tournament_name: 'Tournament',
        },
      })
    }
  }

  const handleExportJSON = async () => {
    const result = await getAllActivePlayersForExport(filters)
    if (result.data) {
      await handleExport(result.data, 'active_players', {
        format: 'json',
        scope: 'filtered',
        includeMetadata: true,
        pretty: true,
        excludeFields: ['id', 'created_at', 'tournament_id'],
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
          <CardTitle>Active Players</CardTitle>
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
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="250">250</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1000</SelectItem>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Federation</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Performance Rating</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Classifications</TableHead>
                  <TableHead>Tournament</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : players.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No players found
                    </TableCell>
                  </TableRow>
                ) : (
                  players.map((player, index) => (
                    <TableRow key={`${player.UNIQUE_NO}-${index}`}>
                      <TableCell className="font-medium">
                        {player.name || `${player.FIRSTNAME} ${player.SURNAME}`}
                      </TableCell>
                      <TableCell>{player.FED}</TableCell>
                      <TableCell>{player.RATING || player.player_rating}</TableCell>
                      <TableCell>{player.TITLE}</TableCell>
                      <TableCell>
                        {player.performance_rating && (
                          <span
                            className={`px-2 py-1 rounded text-sm ${
                              Number(player.performance_rating) > 2000
                                ? 'bg-green-100 text-green-800'
                                : Number(player.performance_rating) > 1500
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {player.performance_rating}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{player.confidence}</TableCell>
                      <TableCell>{player.classifications}</TableCell>
                      <TableCell className="text-sm">
                        {player.tournament_name}
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
    </div>
  )
}
