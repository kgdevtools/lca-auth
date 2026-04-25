"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Plus, Edit2, Trash2, Eye, Users, FileSpreadsheet, FileText, FileJson, SlidersHorizontal, X } from "lucide-react"
import { getTournaments, deleteTournament, bulkDeleteTournaments, getAllTournamentsForExport } from "../server-actions"
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

type Filters = {
  organizer: string
  location: string
  chief_arbiter: string
  tournament_director: string
  date_from: string
  date_to: string
}

const EMPTY_FILTERS: Filters = {
  organizer: '', location: '', chief_arbiter: '', tournament_director: '', date_from: '', date_to: '',
}

const ITEMS_PER_PAGE = 10

const filterInputCls = "h-8 w-full px-2.5 rounded-sm border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors"

export default function TournamentsTable() {
  // ── Data state ───────────────────────────────────────────────────────────────
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)

  // ── Search + filters ─────────────────────────────────────────────────────────
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [debouncedFilters, setDebouncedFilters] = useState<Filters>(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // ── Selection + delete ───────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // ── Modal ────────────────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)

  const { isExporting, handleExport } = useExport<TournamentType>()

  // ── Debounce filter inputs ───────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedFilters(filters)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [filters])

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchTournaments = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getTournaments(currentPage, ITEMS_PER_PAGE, search || undefined, debouncedFilters)
      if (!result.error) {
        setTournaments(result.tournaments)
        setTotalCount(result.count)
        setTotalPages(result.totalPages ?? 1)
      }
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, debouncedFilters])

  useEffect(() => { fetchTournaments() }, [fetchTournaments])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const activeFilterCount = Object.values(debouncedFilters).filter(v => v.trim()).length
  const allOnPageSelected  = tournaments.length > 0 && tournaments.every(t => selected.has(t.id))
  const someOnPageSelected = tournaments.some(t => selected.has(t.id))

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleSearch(value: string) { setSearch(value); setCurrentPage(1) }

  function handleFilterChange(key: keyof Filters, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function clearFilters() { setFilters(EMPTY_FILTERS) }

  function handleSelectAll(checked: boolean) {
    setSelected(prev => {
      const next = new Set(prev)
      tournaments.forEach(t => checked ? next.add(t.id) : next.delete(t.id))
      return next
    })
  }

  function handleSelectRow(id: string, checked: boolean) {
    setSelected(prev => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    setConfirmDeleteId(null)
    try {
      const result = await deleteTournament(id)
      if (result.success) {
        setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
        await fetchTournaments()
      }
    } finally {
      setDeleting(null)
    }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      const result = await bulkDeleteTournaments(Array.from(selected))
      if (result.success) {
        setSelected(new Set())
        setConfirmBulkDelete(false)
        await fetchTournaments()
      }
    } finally {
      setBulkDeleting(false)
    }
  }

  function handleCreate() { setEditingTournament(null); setIsModalOpen(true) }
  function handleEdit(t: Tournament) { setEditingTournament(t); setIsModalOpen(true) }
  function handleModalSuccess() { fetchTournaments() }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—"
    try { return new Date(dateStr).toLocaleDateString() } catch { return dateStr }
  }

  // ── Export ───────────────────────────────────────────────────────────────────
  const EXPORT_FIELD_MAP = {
    tournament_name: 'Tournament Name', organizer: 'Organizer', federation: 'Federation',
    tournament_director: 'Tournament Director', chief_arbiter: 'Chief Arbiter',
    deputy_chief_arbiter: 'Deputy Chief Arbiter', arbiter: 'Arbiter',
    time_control: 'Time Control', rate_of_play: 'Rate of Play', location: 'Location',
    rounds: 'Rounds', tournament_type: 'Tournament Type', rating_calculation: 'Rating Calculation',
    date: 'Date', average_elo: 'Average Elo', average_age: 'Average Age',
  }
  const EXPORT_EXCLUDE = ['id', 'created_at', 'source']

  async function withExportData(fn: (data: any[]) => Promise<void>) {
    const result = await getAllTournamentsForExport(search || undefined)
    if (result.data) await fn(result.data as any[])
  }

  const handleExportCSV   = () => withExportData(d => handleExport(d, 'tournaments', { format: 'csv',   scope: 'filtered', excludeFields: EXPORT_EXCLUDE, fieldMapping: EXPORT_FIELD_MAP }))
  const handleExportExcel = () => withExportData(d => handleExport(d, 'tournaments', { format: 'excel', scope: 'filtered', excludeFields: EXPORT_EXCLUDE, fieldMapping: EXPORT_FIELD_MAP }))
  const handleExportJSON  = () => withExportData(d => handleExport(d, 'tournaments', { format: 'json',  scope: 'filtered', includeMetadata: true, pretty: true, excludeFields: ['id', 'created_at'] }))

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="bg-card border border-border rounded-sm shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search tournaments…"
                value={search}
                onChange={e => handleSearch(e.target.value)}
                className="h-8 pl-8 pr-3 w-full rounded-sm border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors"
              />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setFiltersOpen(p => !p)}
              className={`inline-flex items-center h-8 px-2.5 rounded-sm border text-xs font-medium transition-colors gap-1.5 ${
                filtersOpen || activeFilterCount > 0
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="h-4 min-w-4 rounded-full bg-background text-foreground text-[10px] font-bold px-1 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Export + Add */}
            <div className="flex gap-1.5 sm:ml-auto">
              {([
                { fn: handleExportCSV,   icon: <FileText className="w-3.5 h-3.5" />,        label: 'CSV'   },
                { fn: handleExportExcel, icon: <FileSpreadsheet className="w-3.5 h-3.5" />, label: 'Excel' },
                { fn: handleExportJSON,  icon: <FileJson className="w-3.5 h-3.5" />,        label: 'JSON'  },
              ] as const).map(({ fn, icon, label }) => (
                <button
                  key={label}
                  onClick={fn as () => void}
                  disabled={isExporting || loading}
                  className="inline-flex items-center h-8 px-2.5 rounded-sm border border-border bg-card text-xs text-foreground hover:bg-accent transition-colors disabled:opacity-50 gap-1.5"
                >
                  {isExporting ? <span className="w-3.5 h-3.5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" /> : icon}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
              <button
                onClick={handleCreate}
                className="inline-flex items-center h-8 px-3 rounded-sm bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Tournament
              </button>
            </div>
          </div>

          {/* Count */}
          <p className="text-xs text-muted-foreground mt-2">{totalCount} tournament{totalCount !== 1 ? 's' : ''}</p>
        </div>

        {/* Filter bar */}
        {filtersOpen && (
          <div className="px-4 py-3 border-b border-border bg-muted/20">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <input
                type="text" placeholder="Organizer"
                value={filters.organizer}
                onChange={e => handleFilterChange('organizer', e.target.value)}
                className={filterInputCls}
              />
              <input
                type="text" placeholder="Location"
                value={filters.location}
                onChange={e => handleFilterChange('location', e.target.value)}
                className={filterInputCls}
              />
              <input
                type="text" placeholder="Chief Arbiter"
                value={filters.chief_arbiter}
                onChange={e => handleFilterChange('chief_arbiter', e.target.value)}
                className={filterInputCls}
              />
              <input
                type="text" placeholder="Director"
                value={filters.tournament_director}
                onChange={e => handleFilterChange('tournament_director', e.target.value)}
                className={filterInputCls}
              />
              <input
                type="date"
                value={filters.date_from}
                onChange={e => handleFilterChange('date_from', e.target.value)}
                className={filterInputCls}
                title="Date from"
              />
              <input
                type="date"
                value={filters.date_to}
                onChange={e => handleFilterChange('date_to', e.target.value)}
                className={filterInputCls}
                title="Date to"
              />
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
          </div>
        )}

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {selected.size} selected
            </span>
            {confirmBulkDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-destructive font-medium">Delete {selected.size} tournament{selected.size !== 1 ? 's' : ''}?</span>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="h-7 px-2.5 rounded-sm bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  {bulkDeleting ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : 'Confirm'}
                </button>
                <button
                  onClick={() => setConfirmBulkDelete(false)}
                  className="h-7 px-2.5 rounded-sm border border-border text-xs text-foreground hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmBulkDelete(true)}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-destructive text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete {selected.size}
              </button>
            )}
          </div>
        )}

        {/* Table */}
        <div>
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-2.5 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    ref={el => { if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected }}
                    onChange={e => handleSelectAll(e.target.checked)}
                    className="rounded-sm border-border accent-foreground cursor-pointer"
                  />
                </th>
                <th className="px-2.5 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tournament</th>
                <th className="hidden sm:table-cell px-2.5 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Organizer</th>
                <th className="hidden sm:table-cell px-2.5 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Location</th>
                <th className="px-2.5 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="hidden md:table-cell px-2.5 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Stats</th>
                <th className="px-2.5 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                [...Array(ITEMS_PER_PAGE)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-2.5 py-2"><div className="h-3 bg-muted rounded w-3/4 animate-pulse" /></td>
                    <td className="px-2.5 py-2"><div className="h-3 bg-muted rounded w-3/4 animate-pulse" /></td>
                    <td className="hidden sm:table-cell px-2.5 py-2"><div className="h-3 bg-muted rounded w-3/4 animate-pulse" /></td>
                    <td className="hidden sm:table-cell px-2.5 py-2"><div className="h-3 bg-muted rounded w-3/4 animate-pulse" /></td>
                    <td className="px-2.5 py-2"><div className="h-3 bg-muted rounded w-3/4 animate-pulse" /></td>
                    <td className="hidden md:table-cell px-2.5 py-2"><div className="h-3 bg-muted rounded w-3/4 animate-pulse" /></td>
                    <td className="px-2.5 py-2"><div className="h-3 bg-muted rounded w-3/4 animate-pulse" /></td>
                  </tr>
                ))
              ) : tournaments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    {search || activeFilterCount > 0 ? "No tournaments match the current filters." : "No tournaments found."}
                  </td>
                </tr>
              ) : (
                tournaments.map(tournament => (
                  <tr
                    key={tournament.id}
                    className={`hover:bg-accent/30 transition-colors ${selected.has(tournament.id) ? 'bg-muted/20' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="px-2.5 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(tournament.id)}
                        onChange={e => handleSelectRow(tournament.id, e.target.checked)}
                        className="rounded-sm border-border accent-foreground cursor-pointer"
                      />
                    </td>

                    {/* Name */}
                    <td className="px-2.5 py-2">
                      <span className="text-sm font-medium text-foreground">
                        {tournament.tournament_name || "Untitled"}
                      </span>
                      {tournament.tournament_type && (
                        <span className="ml-1.5 text-[10px] text-muted-foreground">{tournament.tournament_type}</span>
                      )}
                    </td>

                    {/* Organizer — sm+ */}
                    <td className="hidden sm:table-cell px-2.5 py-2 text-xs text-muted-foreground">
                      {tournament.organizer || "—"}
                    </td>

                    {/* Location — sm+ */}
                    <td className="hidden sm:table-cell px-2.5 py-2 text-xs text-muted-foreground">
                      {tournament.location || "—"}
                    </td>

                    {/* Date */}
                    <td className="px-2.5 py-2 text-xs text-muted-foreground tabular-nums">
                      {formatDate(tournament.date)}
                    </td>

                    {/* Stats — md+ */}
                    <td className="hidden md:table-cell px-2.5 py-2">
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {tournament.rounds && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{tournament.rounds}R</span>
                          </div>
                        )}
                        {tournament.average_elo && (
                          <div>Avg {tournament.average_elo}</div>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-2.5 py-2">
                      {confirmDeleteId === tournament.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-destructive font-medium">Delete?</span>
                          <button
                            onClick={() => handleDelete(tournament.id)}
                            disabled={!!deleting}
                            className="h-6 px-2 rounded-sm bg-destructive text-destructive-foreground text-[10px] font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="h-6 px-2 rounded-sm border border-border text-[10px] text-foreground hover:bg-accent transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5">
                          <button
                            title="View"
                            onClick={() => window.open(`/tournaments/${tournament.id}`, "_blank")}
                            className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Edit"
                            onClick={() => handleEdit(tournament)}
                            className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => setConfirmDeleteId(tournament.id)}
                            disabled={deleting === tournament.id}
                            className="p-1.5 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                          >
                            {deleting === tournament.id
                              ? <span className="w-3.5 h-3.5 border-2 border-destructive border-t-transparent rounded-full animate-spin inline-block" />
                              : <Trash2 className="w-3.5 h-3.5" />
                            }
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-muted-foreground tabular-nums">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="h-7 px-2.5 rounded-sm border border-border bg-card text-xs text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1
                  : currentPage <= 3 ? i + 1
                  : currentPage >= totalPages - 2 ? totalPages - 4 + i
                  : currentPage - 2 + i
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`h-7 w-7 rounded-sm border text-xs transition-colors ${
                      currentPage === p
                        ? 'bg-foreground text-background border-foreground'
                        : 'border-border bg-card text-foreground hover:bg-accent'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-7 px-2.5 rounded-sm border border-border bg-card text-xs text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <TournamentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tournament={editingTournament as any}
        onSuccess={handleModalSuccess}
      />
    </>
  )
}
