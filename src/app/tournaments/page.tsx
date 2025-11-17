"use client"

import * as React from "react"
import Link from "next/link"
import { getTournaments, Tournament } from "./server-actions"
import { TournamentFilters, TournamentFiltersState, LOCATION_CATEGORIES, PERIODS } from "./components/TournamentFilters"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Calendar, MapPin, Users, Trophy } from "lucide-react"

// Helper function to check if location matches category keywords
function matchesLocationCategory(location: string | null, category: string): boolean {
  if (!location) return false

  const locationLower = location.toLowerCase()

  if (category === "Limpopo") {
    // Limpopo includes Polokwane, Mankweng, Waterberg, plus "Limpopo" or "Capricorn District"
    const limpopoKeywords = ['limpopo', 'capricorn district', 'capricorn']
    const hasLimpopoKeyword = limpopoKeywords.some(keyword => locationLower.includes(keyword))

    if (hasLimpopoKeyword) return true

    // Check if it matches any of the sub-categories
    return matchesLocationCategory(location, "Polokwane") ||
           matchesLocationCategory(location, "Mankweng") ||
           matchesLocationCategory(location, "Waterberg")
  }

  if (category === "Other") {
    // Other is everything that doesn't match any category
    return !matchesLocationCategory(location, "Polokwane") &&
           !matchesLocationCategory(location, "Mankweng") &&
           !matchesLocationCategory(location, "Waterberg") &&
           !matchesLocationCategory(location, "Limpopo")
  }

  const keywords = LOCATION_CATEGORIES[category as keyof typeof LOCATION_CATEGORIES]
  if (!keywords) return false

  return keywords.some(keyword => locationLower.includes(keyword))
}

// Helper function to check if date is in period
function isInPeriod(date: string | null, periodValue: string): boolean {
  if (!date) return false

  const period = PERIODS.find(p => p.value === periodValue)
  if (!period) return false

  return date >= period.start && date <= period.end
}

export default function TournamentsPage() {
  const [allData, setAllData] = React.useState<Tournament[]>([])
  const [data, setData] = React.useState<Tournament[]>([])
  const [loading, setLoading] = React.useState(true)
  const [currentPage, setCurrentPage] = React.useState(1)

  // Responsive page sizes
  const [pageSize, setPageSize] = React.useState(25)

  // Update page size based on screen width
  React.useEffect(() => {
    const updatePageSize = () => {
      if (window.innerWidth < 768) {
        setPageSize(10) // Mobile
      } else if (window.innerWidth < 1024) {
        setPageSize(15) // Tablet
      } else {
        setPageSize(25) // Desktop
      }
    }

    updatePageSize()
    window.addEventListener('resize', updatePageSize)
    return () => window.removeEventListener('resize', updatePageSize)
  }, [])

  const [filters, setFilters] = React.useState<TournamentFiltersState>({
    search: "",
    location: "ALL",
    period: "ALL",
  })

  React.useEffect(() => {
    setLoading(true)
    getTournaments()
      .then((tournaments) => {
        setAllData(tournaments)
        setData(tournaments)
      })
      .catch((err) => console.error("Error fetching tournaments", err))
      .finally(() => setLoading(false))
  }, [])

  // Apply client-side filters
  React.useEffect(() => {
    let rows = [...allData]
    const { search = "", location = "ALL", period = "ALL" } = filters

    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (t) =>
          (t.tournament_name ?? "").toLowerCase().includes(q) ||
          (t.location ?? "").toLowerCase().includes(q) ||
          (t.chief_arbiter ?? "").toLowerCase().includes(q) ||
          (t.organizer ?? "").toLowerCase().includes(q) ||
          (t.id ?? "").toLowerCase().includes(q),
      )
    }

    if (location && location !== "ALL") {
      rows = rows.filter((t) => matchesLocationCategory(t.location, location))
    }

    if (period && period !== "ALL") {
      rows = rows.filter((t) => isInPeriod(t.date, period))
    }

    setData(rows)
    setCurrentPage(1) // Reset to first page when filters change
  }, [filters, allData])

  const handleSearch = (next: Partial<TournamentFiltersState>) => {
    setFilters((prev) => ({ ...prev, ...next }))
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize))
  const from = (currentPage - 1) * pageSize
  const to = from + pageSize
  const tournamentsPage = data.slice(from, to)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <main className="min-h-dvh p-4 sm:p-6 lg:p-8 mx-auto max-w-[90rem]">
        <div className="mb-6 sm:mb-8">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="mb-6">
          <div className="h-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh p-4 sm:p-6 lg:p-8 mx-auto max-w-[90rem]">
      <div className="mb-6 sm:mb-8 space-y-3">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl lg:text-4xl xl:text-5xl tracking-tight">
          Limpopo Chess Academy's Tournaments Database
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-4xl">
          This database contains tournaments played in and around Limpopo Province, as well as select tournaments where
          Limpopo players participated. We regularly update and improve the database, and are continuously working to include
          historical tournament data from previous years.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <TournamentFilters onSearch={handleSearch} />
      </div>

      {/* Results count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{from + 1}</span> -{" "}
          <span className="font-semibold text-foreground">{Math.min(to, data.length)}</span> of{" "}
          <span className="font-semibold text-foreground">{data.length}</span> tournaments
        </p>
        <p className="text-xs text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>
      </div>

      {/* Tournament cards grid - Changed from 5 to 4 columns */}
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4">
          <Trophy className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No tournaments found</h2>
          <p className="text-muted-foreground">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {tournamentsPage.map((t: Tournament) => (
            <Link
              key={t.id}
              href={`/tournaments/${t.id}`}
              className="group relative flex flex-col h-full rounded-lg border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:bg-accent/50"
            >
              <div className="p-4 sm:p-5 flex flex-col h-full">
                {/* Header */}
                <div className="mb-4">
                  <h2 className="font-bold tracking-tight text-base sm:text-lg text-foreground group-hover:text-primary line-clamp-2 leading-tight mb-2">
                    {t.tournament_name ?? "Untitled Tournament"}
                  </h2>
                  {t.tournament_type && (
                    <span className="inline-block text-xs font-medium text-primary px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
                      {t.tournament_type}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-2.5 flex-grow text-xs sm:text-sm">
                  {t.location && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                      <span className="line-clamp-1 text-muted-foreground">{t.location}</span>
                    </div>
                  )}
                  {t.date && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                      <span className="text-primary font-medium">{t.date}</span>
                    </div>
                  )}
                  {t.chief_arbiter && (
                    <div className="flex items-start gap-2">
                      <Users className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Chief Arbiter</p>
                        <p className="line-clamp-1 text-foreground font-medium">{t.chief_arbiter}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2 text-xs">
                  {t.rounds !== null && (
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{t.rounds}</span> rounds
                    </span>
                  )}
                  {t.average_elo !== null && (
                    <span className="text-muted-foreground">
                      Avg: <span className="font-semibold text-foreground">{t.average_elo}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Glow border effect */}
              <div className="absolute inset-0 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100 pointer-events-none">
                <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <div className="absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Enhanced Pagination */}
      {data.length > 0 && (
        <div className="flex items-center justify-between mt-8 gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className={`inline-flex items-center justify-center h-9 w-9 rounded-md border shadow-sm transition-colors ${
                currentPage === 1
                  ? "pointer-events-none opacity-50 bg-muted"
                  : "bg-card hover:bg-accent hover:text-accent-foreground"
              }`}
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`inline-flex items-center justify-center h-9 px-3 rounded-md border shadow-sm transition-colors ${
                currentPage === 1
                  ? "pointer-events-none opacity-50 bg-muted"
                  : "bg-card hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium hidden sm:inline">Previous</span>
            </button>
          </div>

          <span className="text-sm font-medium text-muted-foreground">
            Page <span className="text-foreground">{currentPage}</span> of <span className="text-foreground">{totalPages}</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`inline-flex items-center justify-center h-9 px-3 rounded-md border shadow-sm transition-colors ${
                currentPage === totalPages
                  ? "pointer-events-none opacity-50 bg-muted"
                  : "bg-card hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <span className="text-sm font-medium hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className={`inline-flex items-center justify-center h-9 w-9 rounded-md border shadow-sm transition-colors ${
                currentPage === totalPages
                  ? "pointer-events-none opacity-50 bg-muted"
                  : "bg-card hover:bg-accent hover:text-accent-foreground"
              }`}
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
