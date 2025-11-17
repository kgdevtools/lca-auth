// src/app/admin/admin-dashboard/tournaments/TournamentsTable.tsx
"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Edit2, Trash2, Eye, Users, FileSpreadsheet, FileText, FileJson } from "lucide-react"
import { getTournaments, deleteTournament, getAllTournamentsForExport } from "../server-actions"
import TournamentFormModal from "./TournamentFormModal"
import { useExport } from "@/hooks/useExport"
import type { Tournament as TournamentType } from "@/types/admin"

interface Tournament {
  id: string
  tournament_name: string | null
  organizer: string | null
  federation: string | null
  tournament_director: string | null
  chief_arbiter: string | null
  deputy_chief_arbiter: string | null
  arbiter: string | null
  time_control: string | null
  rate_of_play: string | null
  location: string | null
  rounds: number | null
  tournament_type: string | null
  rating_calculation: string | null
  date: string | null
  average_elo: number | null
  average_age: number | null
  source: string | null
  created_at: string
}

export default function TournamentsTable() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)

  // Export hook
  const { isExporting, handleExport } = useExport<TournamentType>()

  const itemsPerPage = 10

  useEffect(() => {
    fetchTournaments()
  }, [currentPage, search])

  const fetchTournaments = async () => {
    setLoading(true)
    try {
      const result = await getTournaments(currentPage, itemsPerPage, search || undefined)
      if (result.error) {
        console.error("Error fetching tournaments:", result.error)
      } else {
        setTournaments(result.tournaments)
        setTotalCount(result.count)
        setTotalPages(result.totalPages ?? 1)
      }
    } catch (error) {
      console.error("Error fetching tournaments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)
    if (!confirmed) return

    setDeleting(id)
    try {
      const result = await deleteTournament(id)
      if (result.success) {
        await fetchTournaments()
      } else {
        alert(`Error deleting tournament: ${result.error}`)
      }
    } catch (error) {
      console.error("Error deleting tournament:", error)
      alert("Error deleting tournament")
    } finally {
      setDeleting(null)
    }
  }

  const handleCreate = () => {
    setEditingTournament(null)
    setIsModalOpen(true)
  }

  const handleEdit = (tournament: Tournament) => {
    setEditingTournament(tournament)
    setIsModalOpen(true)
  }

  const handleModalSuccess = () => {
    fetchTournaments()
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-"
    try {
      return new Date(dateStr).toLocaleDateString()
    } catch {
      return dateStr
    }
  }

  // Export handlers
  const handleExportCSV = async () => {
    const result = await getAllTournamentsForExport(search || undefined)
    if (result.data) {
      await handleExport(result.data as any[], 'tournaments', {
        format: 'csv',
        scope: 'filtered',
        excludeFields: ['id', 'created_at', 'source'],
        fieldMapping: {
          tournament_name: 'Tournament Name',
          organizer: 'Organizer',
          federation: 'Federation',
          tournament_director: 'Tournament Director',
          chief_arbiter: 'Chief Arbiter',
          deputy_chief_arbiter: 'Deputy Chief Arbiter',
          arbiter: 'Arbiter',
          time_control: 'Time Control',
          rate_of_play: 'Rate of Play',
          location: 'Location',
          rounds: 'Rounds',
          tournament_type: 'Tournament Type',
          rating_calculation: 'Rating Calculation',
          date: 'Date',
          average_elo: 'Average Elo',
          average_age: 'Average Age',
        },
      })
    }
  }

  const handleExportExcel = async () => {
    const result = await getAllTournamentsForExport(search || undefined)
    if (result.data) {
      await handleExport(result.data as any[], 'tournaments', {
        format: 'excel',
        scope: 'filtered',
        excludeFields: ['id', 'created_at', 'source'],
        fieldMapping: {
          tournament_name: 'Tournament Name',
          organizer: 'Organizer',
          federation: 'Federation',
          tournament_director: 'Tournament Director',
          chief_arbiter: 'Chief Arbiter',
          deputy_chief_arbiter: 'Deputy Chief Arbiter',
          arbiter: 'Arbiter',
          time_control: 'Time Control',
          rate_of_play: 'Rate of Play',
          location: 'Location',
          rounds: 'Rounds',
          tournament_type: 'Tournament Type',
          rating_calculation: 'Rating Calculation',
          date: 'Date',
          average_elo: 'Average Elo',
          average_age: 'Average Age',
        },
      })
    }
  }

  const handleExportJSON = async () => {
    const result = await getAllTournamentsForExport(search || undefined)
    if (result.data) {
      await handleExport(result.data as any[], 'tournaments', {
        format: 'json',
        scope: 'filtered',
        includeMetadata: true,
        pretty: true,
        excludeFields: ['id', 'created_at'],
      })
    }
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{totalCount} tournaments total</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-3">
              {/* Left side - Search */}
              <div className="relative flex-shrink-0">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search tournaments..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent w-full lg:w-64 text-sm tracking-tight transition-colors"
                />
              </div>

              {/* Right side - Export & Add buttons */}
              <div className="flex gap-2 lg:ml-auto">
                <button
                  onClick={handleExportCSV}
                  disabled={isExporting || loading}
                  className="inline-flex items-center px-2.5 py-1.5 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-tight"
                >
                  {isExporting ? (
                    <div className="w-4 h-4 border-2 border-gray-600 dark:border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-1.5" />
                      <span className="hidden sm:inline">CSV</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={isExporting || loading}
                  className="inline-flex items-center px-2.5 py-1.5 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-tight"
                >
                  {isExporting ? (
                    <div className="w-4 h-4 border-2 border-gray-600 dark:border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                      <span className="hidden sm:inline">Excel</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleExportJSON}
                  disabled={isExporting || loading}
                  className="inline-flex items-center px-2.5 py-1.5 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-tight"
                >
                  {isExporting ? (
                    <div className="w-4 h-4 border-2 border-gray-600 dark:border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <FileJson className="w-4 h-4 mr-1.5" />
                      <span className="hidden sm:inline">JSON</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-md transition-colors font-medium text-sm tracking-tight"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Tournament
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
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tournament
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Organizer
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Stats
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                [...Array(itemsPerPage)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-3 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : tournaments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                    {search ? "No tournaments found matching your search." : "No tournaments found."}
                  </td>
                </tr>
              ) : (
                tournaments.map((tournament) => (
                  <tr key={tournament.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-3 py-4">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {tournament.tournament_name || "Untitled Tournament"}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {tournament.organizer || "-"}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-700 dark:text-gray-300">{tournament.location || "-"}</td>
                    <td className="px-3 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(tournament.date)}
                    </td>
                    <td className="px-3 py-4">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {tournament.rounds && (
                          <div className="flex items-center mb-1">
                            <Users className="w-3 h-3 mr-1 text-gray-400 dark:text-gray-500" />
                            <span className="font-medium">{tournament.rounds} rounds</span>
                          </div>
                        )}
                        {tournament.average_elo && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Avg Rating: {tournament.average_elo}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          title="View Details"
                          onClick={() => window.open(`/tournaments/${tournament.id}`, "_blank")}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30 rounded-md transition-all duration-200"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          title="Edit Tournament"
                          onClick={() => handleEdit(tournament)}
                          className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/30 rounded-md transition-all duration-200"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          title="Delete Tournament"
                          onClick={() => {
                            const name = tournament.tournament_name || "tournament"
                            handleDelete(tournament.id, name)
                          }}
                          disabled={deleting === tournament.id}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 rounded-md transition-all duration-200 disabled:opacity-50"
                        >
                          {deleting === tournament.id ? (
                            <div className="w-4 h-4 border-2 border-red-600 dark:border-red-400 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
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
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of{" "}
                {totalCount} results
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                        className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                          currentPage === pageNum
                            ? "bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500"
                            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tournament Form Modal */}
      <TournamentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tournament={editingTournament as any}
        onSuccess={handleModalSuccess}
      />
    </>
  )
}
