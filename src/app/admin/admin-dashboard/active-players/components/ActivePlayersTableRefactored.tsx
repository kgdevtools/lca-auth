'use client'

import { useState, useEffect } from 'react'
import { Search, FileSpreadsheet, FileText, FileJson, RefreshCw, Edit2, Eye } from 'lucide-react'
import {
  getActivePlayers,
  getAllActivePlayersForExport,
  getUniqueFederations,
  getUniqueTournamentsForActivePlayers,
} from '../server-actions'
import type { ActivePlayer } from '@/types/admin'
import { useExport } from '@/hooks/useExport'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export default function ActivePlayersTableRefactored() {
  // State
  const [players, setPlayers] = useState<ActivePlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(100)
  const [federations, setFederations] = useState<string[]>([])
  const [tournaments, setTournaments] = useState<Array<{ id: string; name: string }>>([])
  const [selectedFederation, setSelectedFederation] = useState<string>('all')
  const [selectedTournament, setSelectedTournament] = useState<string>('all')
  const [selectedPlayer, setSelectedPlayer] = useState<ActivePlayer | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  // Export hook
  const { isExporting, handleExport } = useExport<ActivePlayer>()

  // Load players
  const fetchPlayers = async () => {
    setLoading(true)
    try {
      const filters: any = {}
      if (search) filters.search = search
      if (selectedFederation !== 'all') filters.federation = selectedFederation
      if (selectedTournament !== 'all') filters.tournament = selectedTournament

      const result = await getActivePlayers(currentPage, itemsPerPage, filters)
      if (result.error) {
        console.error('Error fetching players:', result.error)
      } else {
        setPlayers(result.data || [])
        setTotalCount(result.count || 0)
        setTotalPages(result.totalPages || 1)
      }
    } catch (error) {
      console.error('Error fetching players:', error)
    } finally {
      setLoading(false)
    }
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

  useEffect(() => {
    loadFilterOptions()
  }, [])

  useEffect(() => {
    fetchPlayers()
  }, [currentPage, itemsPerPage, search, selectedFederation, selectedTournament])

  // Export handlers
  const handleExportCSV = async () => {
    const filters: any = {}
    if (search) filters.search = search
    if (selectedFederation !== 'all') filters.federation = selectedFederation
    if (selectedTournament !== 'all') filters.tournament = selectedTournament

    const result = await getAllActivePlayersForExport(filters)
    if (result.data) {
      await handleExport(result.data as any[], 'active_players', {
        format: 'csv',
        scope: 'filtered',
        excludeFields: ['id', 'created_at', 'tournament_id'],
        fieldMapping: {
          UNIQUE_NO: 'Player ID',
          SURNAME: 'Surname',
          FIRSTNAME: 'First Name',
          name: 'Full Name',
          FED: 'Federation',
          RATING: 'Rating',
          performance_rating: 'Performance Rating',
          tournament_name: 'Tournament',
        },
      })
    }
  }

  const handleExportExcel = async () => {
    const filters: any = {}
    if (search) filters.search = search
    if (selectedFederation !== 'all') filters.federation = selectedFederation
    if (selectedTournament !== 'all') filters.tournament = selectedTournament

    const result = await getAllActivePlayersForExport(filters)
    if (result.data) {
      await handleExport(result.data as any[], 'active_players', {
        format: 'excel',
        scope: 'filtered',
        excludeFields: ['id', 'created_at', 'tournament_id'],
        fieldMapping: {
          UNIQUE_NO: 'Player ID',
          SURNAME: 'Surname',
          FIRSTNAME: 'First Name',
          name: 'Full Name',
          FED: 'Federation',
          RATING: 'Rating',
          performance_rating: 'Performance Rating',
          tournament_name: 'Tournament',
        },
      })
    }
  }

  const handleExportJSON = async () => {
    const filters: any = {}
    if (search) filters.search = search
    if (selectedFederation !== 'all') filters.federation = selectedFederation
    if (selectedTournament !== 'all') filters.tournament = selectedTournament

    const result = await getAllActivePlayersForExport(filters)
    if (result.data) {
      await handleExport(result.data as any[], 'active_players', {
        format: 'json',
        scope: 'filtered',
        includeMetadata: true,
        pretty: true,
        excludeFields: ['id', 'created_at'],
      })
    }
  }

  const handleViewDetails = (player: ActivePlayer) => {
    setSelectedPlayer(player)
    setIsDetailsOpen(true)
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400 tracking-tight leading-tight">
                {totalCount} players total
              </p>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative flex-shrink-0">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent w-52 text-sm tracking-tight leading-tight transition-colors"
                />
              </div>

              {/* Federation Filter */}
              <Select value={selectedFederation} onValueChange={setSelectedFederation}>
                <SelectTrigger size="sm" className="w-36">
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
              <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                <SelectTrigger size="sm" className="w-44">
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

              {/* Items per page */}
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger size="sm" className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="250">250</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1000</SelectItem>
                </SelectContent>
              </Select>

              {/* Export Buttons */}
              <div className="flex gap-1.5 ml-auto">
                <button
                  onClick={handleExportCSV}
                  disabled={isExporting || loading}
                  title="Export as CSV"
                  className="inline-flex items-center px-2.5 py-1.5 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <div className="w-4 h-4 border-2 border-gray-600 dark:border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={isExporting || loading}
                  title="Export as Excel"
                  className="inline-flex items-center px-2.5 py-1.5 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <div className="w-4 h-4 border-2 border-gray-600 dark:border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={handleExportJSON}
                  disabled={isExporting || loading}
                  title="Export as JSON"
                  className="inline-flex items-center px-2.5 py-1.5 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <div className="w-4 h-4 border-2 border-gray-600 dark:border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FileJson className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={fetchPlayers}
                  disabled={loading}
                  title="Refresh"
                  className="inline-flex items-center px-2.5 py-1.5 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-tighter">
                  Name
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-tighter">
                  Federation
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-tighter">
                  Rating
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-tighter">
                  Performance
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-tighter">
                  Tournament
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-tighter">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                [...Array(itemsPerPage > 10 ? 10 : itemsPerPage)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : players.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                    {search || selectedFederation !== 'all' || selectedTournament !== 'all'
                      ? 'No players found matching your filters.'
                      : 'No players found.'}
                  </td>
                </tr>
              ) : (
                players.map((player, index) => (
                  <tr
                    key={`${player.UNIQUE_NO}-${index}`}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-3 py-3">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
                        {player.name || `${player.FIRSTNAME} ${player.SURNAME}`}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 tracking-tight leading-tight">
                      {player.FED || '-'}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 tracking-tight leading-tight">
                      {player.RATING || player.player_rating || '-'}
                    </td>
                    <td className="px-3 py-3">
                      {player.performance_rating && (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium tracking-tight ${
                            Number(player.performance_rating) > 2000
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : Number(player.performance_rating) > 1500
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {player.performance_rating}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300 tracking-tight leading-tight">
                      {player.tournament_name || '-'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center space-x-1.5">
                        <button
                          title="View Details"
                          onClick={() => handleViewDetails(player)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30 rounded-md transition-all duration-200"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-gray-700 dark:text-gray-300 tracking-tight leading-tight">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} results
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors tracking-tight"
                >
                  Previous
                </button>
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 text-sm border rounded-md transition-colors tracking-tight ${
                          currentPage === pageNum
                            ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors tracking-tight"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Player Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl tracking-tight leading-tight">
              {selectedPlayer?.name || 'Player Details'}
            </DialogTitle>
            <DialogDescription className="tracking-tight leading-tight">
              Detailed information about this player
            </DialogDescription>
          </DialogHeader>

          {selectedPlayer && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 tracking-tight">Full Name</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 tracking-tight">
                    {selectedPlayer.name || `${selectedPlayer.FIRSTNAME} ${selectedPlayer.SURNAME}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 tracking-tight">Federation</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 tracking-tight">
                    {selectedPlayer.FED || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 tracking-tight">Rating</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 tracking-tight">
                    {selectedPlayer.RATING || selectedPlayer.player_rating || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 tracking-tight">Title</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 tracking-tight">
                    {selectedPlayer.TITLE || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 tracking-tight">Performance Rating</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 tracking-tight">
                    {selectedPlayer.performance_rating || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 tracking-tight">Confidence</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 tracking-tight">
                    {selectedPlayer.confidence || '-'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 tracking-tight">Tournament</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 tracking-tight">
                    {selectedPlayer.tournament_name || '-'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 tracking-tight">Classifications</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 tracking-tight">
                    {selectedPlayer.classifications || '-'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
