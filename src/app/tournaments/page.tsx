"use client"

import * as React from "react"
import Link from "next/link"
import { getTournaments, Tournament } from "./server-actions"
import { listTournaments, type TournamentMeta } from "../view/actions"
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

// Function to check if a tournament name matches a tournament_meta alias using fuzzy matching
function fuzzyMatchTournamentNames(tournamentName: string, alias: string): boolean {
  // Clean and normalize both names for comparison
  const cleanName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/,/g, ' ')  // Replace commas with spaces
      .replace(/\s+/g, ' ')  // Normalize multiple spaces
      .replace(/\b(u\/?(\d+))\b/g, 'u$2')  // Normalize "U/10", "U10", "u/10" to "u10"
      .replace(/\b&\b/g, 'and')  // Replace "&" with "and"
      .trim()
  }

  const cleanTournamentName = cleanName(tournamentName)
  const cleanAlias = cleanName(alias)

  // Extract key components from both names
  const extractKeyComponents = (name: string) => {
    // Extract main tournament identifiers: location, tournament number, year
    const locationMatch = name.match(/(capricorn|polokwane|limpopo|district|qualifying)/gi)
    const numberMatch = name.match(/\b(\d{1,2})\b/g)  // Tournament number
    const yearMatch = name.match(/\b(202[0-9]|203[0])\b/)  // Tournament year
    
    return {
      location: locationMatch ? locationMatch.map(l => l.toLowerCase()).join(' ') : '',
      number: numberMatch ? numberMatch.map(n => parseInt(n)).sort((a, b) => b - a)[0] : null,
      year: yearMatch ? parseInt(yearMatch[0]) : null,
    }
  }

  const tournamentComponents = extractKeyComponents(cleanTournamentName)
  const aliasComponents = extractKeyComponents(cleanAlias)

  // Check if the main components match
  const locationMatch = tournamentComponents.location && aliasComponents.location && 
                        tournamentComponents.location.includes(aliasComponents.location.substring(0, 3)) // Match first 3 chars of location
  
  const numberMatch = tournamentComponents.number !== null && aliasComponents.number !== null && 
                      tournamentComponents.number === aliasComponents.number
  
  const yearMatch = tournamentComponents.year !== null && aliasComponents.year !== null && 
                    tournamentComponents.year === aliasComponents.year

  // Additional check: see if the alias appears as a substring in the tournament name or vice versa
  const directMatch = cleanTournamentName.includes(cleanAlias.substring(0, Math.min(20, cleanAlias.length))) || 
                     cleanAlias.includes(cleanTournamentName.substring(0, Math.min(20, cleanTournamentName.length)))

  // Enhanced check: for multi-section tournaments like "Capricorn District Qualifying Tournament 8, 2025 U/10 & 8"
  // vs "Capricorn District Tournament 8 2025", we should match on the common parts
  const commonTerms = ['capricorn', 'district', 'tournament', 'qualifying'];
  
  // Count how many common terms both have
  const commonTermMatches = commonTerms.filter(term => 
    cleanTournamentName.includes(term) && cleanAlias.includes(term)
  ).length;

  // Match if at least 2 out of 3 main components match, or if there's a direct substring match,
  // or if they share at least 2 common terms (like "capricorn", "district", "tournament")
  const componentMatches = (locationMatch ? 1 : 0) + (numberMatch ? 1 : 0) + (yearMatch ? 1 : 0)
  
  return componentMatches >= 2 || directMatch || commonTermMatches >= 2
}

export default function TournamentsPage() {
  const [allData, setAllData] = React.useState<Tournament[]>([])
  const [data, setData] = React.useState<Tournament[]>([])
  const [loading, setLoading] = React.useState(true)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [tournamentsWithGames, setTournamentsWithGames] = React.useState<Set<string>>(new Set())
  const tournamentsGridRef = React.useRef<HTMLDivElement>(null)

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

  // Load tournaments and check which ones have games (exist in tournaments_meta)
  React.useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const allTournaments = await getTournaments()
        setAllData(allTournaments)
        setData(allTournaments)
        
        // Get tournaments from tournaments_meta (these are the ones with games)
        const { tournaments: metaTournaments } = await listTournaments()
        
        // Create a set of tournament names that have games by fuzzy matching
        const gamesTournaments = new Set<string>()
        
        for (const tournament of allTournaments) {
          if (tournament.tournament_name) {
            for (const metaTournament of metaTournaments) {
              // Simple fuzzy matching: if the tournament name contains the alias or vice versa
              if (metaTournament.alias && 
                  (tournament.tournament_name.toLowerCase().includes(metaTournament.alias.toLowerCase()) ||
                   metaTournament.alias.toLowerCase().includes(tournament.tournament_name.toLowerCase()) ||
                   fuzzyMatchTournamentNames(tournament.tournament_name, metaTournament.alias))) {
                gamesTournaments.add(tournament.tournament_name)
                break
              }
            }
          }
        }
        
        setTournamentsWithGames(gamesTournaments)
      } catch (error) {
        console.error("Error loading tournaments", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const prevFiltersRef = React.useRef<TournamentFiltersState>(filters)

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

    // Only reset to page 1 if filters actually changed
    const filtersChanged =
      prevFiltersRef.current.search !== filters.search ||
      prevFiltersRef.current.location !== filters.location ||
      prevFiltersRef.current.period !== filters.period

    if (filtersChanged) {
      setCurrentPage(1)
      prevFiltersRef.current = filters
    }
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
        <div ref={tournamentsGridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {tournamentsPage.map((t: Tournament) => {
            const hasGames = t.tournament_name ? tournamentsWithGames.has(t.tournament_name) : false;
            
            return (
              <Link
                key={t.id}
                href={`/tournaments/${t.id}`}
                className="group relative flex flex-col h-full rounded-lg border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:bg-accent/50"
              >
                <div className="p-4 sm:p-5 flex flex-col h-full">
                  {/* Header */}
                  <div className="mb-4 relative">
                    <h2 className="font-bold tracking-tight text-base sm:text-lg text-foreground group-hover:text-primary line-clamp-2 leading-tight mb-2 pr-6">
                      {t.tournament_name ?? "Untitled Tournament"}
                    </h2>
                    {t.tournament_type && (
                      <span className="inline-block text-xs font-medium text-primary px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
                        {t.tournament_type}
                      </span>
                    )}
                    {/* Chessboard badge for tournaments with games */}
                    {hasGames && (
                      <div
                        className="absolute -top-2 -right-2 w-8 h-8 flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 hover:opacity-100"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Navigate to the view page with this tournament selected
                          // For now, we'll navigate to the view page directly
                          // In the future, we can implement logic to select this specific tournament
                          window.location.href = `/view`;
                        }}
                        title="View tournament games"
                      >
                        <img
                          src="/chess-board-custom.svg"
                          alt="Chess board icon"
                          width={24}
                          height={24}
                          className="opacity-90 transition-all duration-200"
                        />
                      </div>
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
            )
          })}
        </div>
      )}

      {/* Enhanced Pagination */}
      {data.length > 0 && (
        <div className="flex items-center justify-between mt-8 gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                goToPage(1)
              }}
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
              type="button"
              onClick={(e) => {
                e.preventDefault()
                goToPage(currentPage - 1)
              }}
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
              type="button"
              onClick={(e) => {
                e.preventDefault()
                goToPage(currentPage + 1)
              }}
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
              type="button"
              onClick={(e) => {
                e.preventDefault()
                goToPage(totalPages)
              }}
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