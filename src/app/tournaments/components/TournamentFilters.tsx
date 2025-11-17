"use client"

import * as React from "react"
import { Search } from "lucide-react"

export interface TournamentFiltersState {
  search: string
  location: string
  period: string
}

interface TournamentFiltersProps {
  onSearch: (filters: Partial<TournamentFiltersState>) => void
}

// Location categories with fuzzy keyword matching
export const LOCATION_CATEGORIES = {
  Polokwane: ['polokwane', 'plk', 'flora park', 'florapark', 'seshego'],
  Mankweng: ['mankweng', 'turfloop', 'paledi', 'ul', 'university of limpopo'],
  Waterberg: ['waterberg', 'lwt', 'mokopane', 'bela-bela', 'bela bela', 'naboomspruit', 'mookgophong'],
  Limpopo: [], // Special case: includes Polokwane, Mankweng, Waterberg, and tournaments with "Limpopo" or "Capricorn District" in location
}

// Period definitions
export const PERIODS = [
  { label: '1 Oct 2024 - 30 Sept 2025', value: '2024-2025', start: '2024-10-01', end: '2025-09-30' },
  { label: '1 Oct 2025 - 30 Sept 2026', value: '2025-2026', start: '2025-10-01', end: '2026-09-30' },
]

export function TournamentFilters({ onSearch }: TournamentFiltersProps) {
  const [search, setSearch] = React.useState("")
  const [location, setLocation] = React.useState("ALL")
  const [period, setPeriod] = React.useState("ALL")

  const apply = React.useCallback(
    (next: Partial<TournamentFiltersState> = {}) => {
      const payload: TournamentFiltersState = {
        search,
        location,
        period,
        ...next,
      }
      onSearch(payload)
    },
    [search, location, period, onSearch],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    apply()
  }

  const handleReset = () => {
    setSearch("")
    setLocation("ALL")
    setPeriod("ALL")
    onSearch({ search: "", location: "ALL", period: "ALL" })
  }

  // Debounce search input
  React.useEffect(() => {
    const id = setTimeout(() => {
      apply({ search })
    }, 300)
    return () => clearTimeout(id)
  }, [search, apply])

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 text-xs rounded-md border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-muted"}`}
    >
      {children}
    </button>
  )

  return (
    <div className="w-full bg-card border-2 border-border rounded-md p-3 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Search tournaments by name, location, or arbiter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 py-1.5 text-sm border-2 border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-4 py-1.5 h-9 text-sm border-2 border-border rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 whitespace-nowrap"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 h-9 text-sm border-2 border-border rounded-md bg-muted text-foreground hover:bg-muted/80 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground">Period:</span>
            <Chip
              active={period === "ALL"}
              onClick={() => {
                setPeriod("ALL")
                apply({ period: "ALL" })
              }}
            >
              ALL
            </Chip>
            {PERIODS.map((p) => (
              <Chip
                key={p.value}
                active={period === p.value}
                onClick={() => {
                  const next = period === p.value ? "ALL" : p.value
                  setPeriod(next)
                  apply({ period: next })
                }}
              >
                {p.label}
              </Chip>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground">Location:</span>
            <Chip
              active={location === "ALL"}
              onClick={() => {
                setLocation("ALL")
                apply({ location: "ALL" })
              }}
            >
              ALL
            </Chip>
            {Object.keys(LOCATION_CATEGORIES).map((loc) => (
              <Chip
                key={loc}
                active={location === loc}
                onClick={() => {
                  const next = location === loc ? "ALL" : loc
                  setLocation(next)
                  apply({ location: next })
                }}
              >
                {loc}
              </Chip>
            ))}
            <Chip
              active={location === "Other"}
              onClick={() => {
                const next = location === "Other" ? "ALL" : "Other"
                setLocation(next)
                apply({ location: next })
              }}
            >
              Other
            </Chip>
          </div>
        </div>
      </form>
    </div>
  )
}
