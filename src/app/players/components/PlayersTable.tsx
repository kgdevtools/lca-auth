"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Search, Filter, Users, Trophy } from "lucide-react"
import { getPlayersForListing } from "../server-actions"

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
}

export type FilterType =
  | "all"
  | "rated"
  | "unrated"
  | "u20"
  | "u18"
  | "u16"
  | "u14"
  | "u12"
  | "u10"
  | "male"
  | "female"
  | "lsg"
  | "lvt"
  | "lwt"
  | "lcp"
  | "lmg"
  | "rsa"

interface ActiveFilters {
  rating: FilterType | null
  age: FilterType | null
  gender: FilterType | null
  federation: FilterType | null
}

export default function PlayersTable() {
  const [players, setPlayers] = useState<Player[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    rating: null,
    age: null,
    gender: null,
    federation: null,
  })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  useEffect(() => {
    async function fetchPlayers() {
      try {
        const result = await getPlayersForListing()

        if (result.error) {
          console.error("Error fetching players:", result.error)
          setPlayers([])
          setFilteredPlayers([])
          return
        }

        if (!result.data || !Array.isArray(result.data)) {
          setPlayers([])
          setFilteredPlayers([])
          return
        }

        // Sort by average performance rating (desc), then by surname
        const sortedData = result.data.sort((a, b) => {
          if (a.avg_performance_rating && b.avg_performance_rating) {
            return b.avg_performance_rating - a.avg_performance_rating
          }
          if (a.avg_performance_rating && !b.avg_performance_rating) return -1
          if (!a.avg_performance_rating && b.avg_performance_rating) return 1

          // Both have no rating, sort alphabetically
          const nameA = `${a.surname || ""} ${a.firstname || ""}`.trim()
          const nameB = `${b.surname || ""} ${b.firstname || ""}`.trim()
          return nameA.localeCompare(nameB)
        })

        setPlayers(sortedData)
        setFilteredPlayers(sortedData)
      } catch (error) {
        console.error("Error fetching players:", error)
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
      const [year, month, day] = bdate.split("/").map(Number)
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

  // Helper function to determine if a filter is active
  const isFilterActive = (type: FilterType): boolean => {
    return Object.values(activeFilters).includes(type)
  }

  // Helper function to toggle a filter
  const toggleFilter = (type: FilterType, category: keyof ActiveFilters) => {
    setActiveFilters((prev) => ({
      ...prev,
      [category]: prev[category] === type ? null : type,
    }))
  }

  useEffect(() => {
    let filtered = [...players]

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter((player) => {
        const fullName = `${player.firstname || ""} ${player.surname || ""}`.toLowerCase()
        const normalizedName = (player.normalized_name || "").toLowerCase()
        const federation = (player.federation || "").toLowerCase()
        const uniqueNo = (player.unique_no || "").toLowerCase()
        const limId = (player.lim_id || "").toLowerCase()

        return (
          fullName.includes(search) ||
          normalizedName.includes(search) ||
          federation.includes(search) ||
          uniqueNo.includes(search) ||
          limId.includes(search)
        )
      })
    }

    // Apply rating filters
    if (activeFilters.rating) {
      switch (activeFilters.rating) {
        case "rated":
          filtered = filtered.filter(
            (player) => player.avg_performance_rating !== null && player.avg_performance_rating > 0,
          )
          break
        case "unrated":
          filtered = filtered.filter(
            (player) => player.avg_performance_rating === null || player.avg_performance_rating === 0,
          )
          break
      }
    }

    // Apply age filters
    if (activeFilters.age) {
      filtered = filtered.filter((player) => {
        const age = calculateAge(player.bdate)
        if (age === null) return false

        switch (activeFilters.age) {
          case "u20":
            return age >= 17 && age <= 19
          case "u18":
            return age >= 15 && age <= 17
          case "u16":
            return age >= 13 && age <= 15
          case "u14":
            return age >= 11 && age <= 13
          case "u12":
            return age >= 9 && age <= 11
          case "u10":
            return age >= 7 && age <= 9
          default:
            return true
        }
      })
    }

    // Apply gender filters
    if (activeFilters.gender) {
      filtered = filtered.filter((player) => {
        switch (activeFilters.gender) {
          case "male":
            return player.sex?.toLowerCase() === "male" || player.sex?.toLowerCase() === "m"
          case "female":
            return player.sex?.toLowerCase() === "female" || player.sex?.toLowerCase() === "f"
          default:
            return true
        }
      })
    }

    // Apply federation filters
    if (activeFilters.federation) {
      filtered = filtered.filter((player) => {
        return player.federation?.toLowerCase() === activeFilters.federation?.toLowerCase()
      })
    }

    // Always sort by average performance rating (desc), then by surname
    filtered.sort((a, b) => {
      if (a.avg_performance_rating && b.avg_performance_rating) {
        return b.avg_performance_rating - a.avg_performance_rating
      }
      if (a.avg_performance_rating && !b.avg_performance_rating) return -1
      if (!a.avg_performance_rating && b.avg_performance_rating) return 1

      // Both have no rating, sort alphabetically
      const nameA = `${a.surname || ""} ${a.firstname || ""}`.trim()
      const nameB = `${b.surname || ""} ${b.firstname || ""}`.trim()
      return nameA.localeCompare(nameB)
    })

    setFilteredPlayers(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [searchTerm, activeFilters, players])

  const FilterButton = ({
    type,
    label,
    category,
  }: { type: FilterType; label: string; category: keyof ActiveFilters }) => (
    <Button
      variant={isFilterActive(type) ? "default" : "outline"}
      size="sm"
      onClick={() => toggleFilter(type, category)}
      className="text-xs h-7 px-2.5"
    >
      {label}
    </Button>
  )

  const ClearFiltersButton = () => {
    const hasActiveFilters = Object.values(activeFilters).some((filter) => filter !== null)

    if (!hasActiveFilters) return null

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          setActiveFilters({
            rating: null,
            age: null,
            gender: null,
            federation: null,
          })
        }
        className="text-xs h-7 px-2.5 text-muted-foreground hover:text-foreground"
      >
        Clear All Filters
      </Button>
    )
  }

  // Pagination
  const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPlayers = filteredPlayers.slice(startIndex, endIndex)

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] text-xs">Rank</TableHead>
                <TableHead className="text-xs">Player</TableHead>
                <TableHead className="text-right text-xs">CF Rating</TableHead>
                <TableHead className="text-right text-xs">Avg Performance</TableHead>
                <TableHead className="text-right text-xs">Events</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-3 w-6" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-3 w-40" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-3 w-10 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-3 w-10 ml-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-3 w-6 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search players by name, federation, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9 bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/10 dark:bg-muted/20 border border-border rounded-lg">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground mr-2">Filters:</span>

          <ClearFiltersButton />

          <div className="flex items-center gap-1 ml-3">
            <span className="text-xs text-muted-foreground/80">Rating:</span>
            <FilterButton type="rated" label="Rated" category="rating" />
            <FilterButton type="unrated" label="Unrated" category="rating" />
          </div>

          <div className="flex items-center gap-1 ml-3">
            <span className="text-xs text-muted-foreground/80">Age:</span>
            <FilterButton type="u20" label="U20" category="age" />
            <FilterButton type="u18" label="U18" category="age" />
            <FilterButton type="u16" label="U16" category="age" />
            <FilterButton type="u14" label="U14" category="age" />
            <FilterButton type="u12" label="U12" category="age" />
            <FilterButton type="u10" label="U10" category="age" />
          </div>

          <div className="flex items-center gap-1 ml-3">
            <span className="text-xs text-muted-foreground/80">Gender:</span>
            <FilterButton type="male" label="Male" category="gender" />
            <FilterButton type="female" label="Female" category="gender" />
          </div>

          <div className="flex items-center gap-1 ml-3">
            <span className="text-xs text-muted-foreground/80">Federation:</span>
            <FilterButton type="lsg" label="LSG" category="federation" />
            <FilterButton type="lvt" label="LVT" category="federation" />
            <FilterButton type="lwt" label="LWT" category="federation" />
            <FilterButton type="lcp" label="LCP" category="federation" />
            <FilterButton type="lmg" label="LMG" category="federation" />
            <FilterButton type="rsa" label="RSA" category="federation" />
          </div>
        </div>

        {/* Results summary */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground/80">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>
              Showing {currentPlayers.length} of {filteredPlayers.length} players
            </span>
          </div>
          {filteredPlayers.length !== players.length && <span>({players.length} total in database)</span>}
        </div>
      </div>

      {/* Players Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30 dark:bg-muted/50">
            <TableRow className="border-b border-border">
              <TableHead className="w-[50px] font-semibold text-xs text-foreground/90 py-2">Rank</TableHead>
              <TableHead className="font-semibold text-xs text-foreground/90 py-2">Player</TableHead>
              <TableHead className="text-right font-semibold text-xs text-foreground/90 py-2">CF Rating</TableHead>
              <TableHead className="text-right font-semibold text-xs text-foreground/90 py-2">
                Avg Performance
              </TableHead>
              <TableHead className="text-right font-semibold text-xs text-foreground/90 py-2">Events</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentPlayers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 text-muted-foreground/30" />
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">No players found</h3>
                      <p className="text-xs text-muted-foreground/60">
                        {searchTerm ? "Try adjusting your search or filters" : "No players match the current filters"}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              currentPlayers.map((player, index) => {
                const globalRank = startIndex + index + 1
                const fullName = `${player.firstname || ""} ${player.surname || ""}`.trim()
                const age = calculateAge(player.bdate)

                return (
                  <TableRow
                    key={player.id}
                    className="hover:bg-muted/20 dark:hover:bg-muted/30 group border-b border-border"
                  >
                    <TableCell className="font-medium text-xs text-muted-foreground py-2">#{globalRank}</TableCell>

                    <TableCell className="py-2">
                      <Link href={`/players/${player.id}`} className="block group/link">
                        <div className="space-y-0.5">
                          <div className="text-sm font-semibold text-foreground group-hover/link:text-primary transition-colors cursor-pointer">
                            {fullName || player.normalized_name || "Unknown Player"}
                          </div>
                          {player.normalized_name && fullName !== player.normalized_name && (
                            <div className="text-xs text-muted-foreground/70">{player.normalized_name}</div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                            {player.unique_no && <span>#{player.unique_no}</span>}
                            {player.lim_id && <span>LIM:{player.lim_id}</span>}
                            {player.federation && <span>• {player.federation}</span>}
                            {age && <span>• {age} yrs</span>}
                            {player.sex && <span>• {player.sex}</span>}
                          </div>
                        </div>
                      </Link>
                    </TableCell>

                    <TableCell className="text-right py-2">
                      {player.cf_rating ? (
                        <span className="text-sm font-semibold text-foreground">{player.cf_rating}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right py-2">
                      {player.avg_performance_rating ? (
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-semibold text-primary">
                            {player.avg_performance_rating.toFixed(1)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right py-2">
                      {player.performance_count ? (
                        <Badge variant="secondary" className="text-xs h-5 px-1.5">
                          <Trophy className="h-2.5 w-2.5 mr-1" />
                          {player.performance_count}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <div className="text-xs text-muted-foreground/80">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-7 px-2.5 text-xs"
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="w-7 h-7 text-xs"
                >
                  {pageNum}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-7 px-2.5 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
