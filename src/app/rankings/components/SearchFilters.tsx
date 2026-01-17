"use client"

import * as React from "react"
import { Search, ChevronDown, ChevronUp, Filter } from "lucide-react"

// Period definitions (same as tournaments)
const PERIODS = [
  { label: "1 Oct 2024 - 30 Sept 2025", value: "2024-2025", start: "2024-10-01", end: "2025-09-30" },
  { label: "1 Oct 2025 - 30 Sept 2026", value: "2025-2026", start: "2025-10-01", end: "2026-09-30" },
]

export interface SearchFiltersState {
  name: string
  fed: string
  rating: string
  gender: string
  ageGroup: string
  events: string
  period: string
}

interface SearchFiltersProps {
  onSearch: (filters: Partial<SearchFiltersState>) => void
  fedOptions: string[]
  initialState?: Partial<SearchFiltersState>
}

export function SearchFilters({ onSearch, fedOptions, initialState }: SearchFiltersProps) {
  const [name, setName] = React.useState(initialState?.name ?? "")
  const [fed, setFed] = React.useState(initialState?.fed ?? "ALL")
  const [rating, setRating] = React.useState(initialState?.rating ?? "ALL")
  const [gender, setGender] = React.useState(initialState?.gender ?? "ALL")
  const [ageGroup, setAgeGroup] = React.useState(initialState?.ageGroup ?? "ALL")
  const [events, setEvents] = React.useState(initialState?.events ?? "ALL")
  const [period, setPeriod] = React.useState(initialState?.period ?? "ALL")
  const [isExpanded, setIsExpanded] = React.useState(false)

  const apply = React.useCallback(
    (next: Partial<SearchFiltersState> = {}) => {
      const payload: SearchFiltersState = {
        name,
        fed,
        rating,
        gender,
        ageGroup,
        events,
        period,
        ...next,
      }
      onSearch(payload)
    },
    [name, fed, rating, gender, ageGroup, events, period, onSearch],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    apply()
  }

  const handleReset = () => {
    setName("")
    setFed("ALL")
    setRating("ALL")
    setGender("ALL")
    setAgeGroup("ALL")
    setEvents("ALL")
    setPeriod("ALL")
    onSearch({ name: "", fed: "ALL", rating: "ALL", gender: "ALL", ageGroup: "ALL", events: "ALL", period: "ALL" })
  }

  // Debounce name input
  React.useEffect(() => {
    const id = setTimeout(() => {
      apply({ name })
    }, 300)
    return () => clearTimeout(id)
  }, [name, apply])

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 text-xs rounded-md border ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-muted"}`}
    >
      {children}
    </button>
  )

  // Count active filters
  const activeFiltersCount = React.useMemo(() => {
    let count = 0
    if (name.trim()) count++
    if (fed !== "ALL") count++
    if (rating !== "ALL") count++
    if (gender !== "ALL") count++
    if (ageGroup !== "ALL") count++
    if (events !== "ALL") count++
    if (period !== "ALL") count++
    return count
  }, [name, fed, rating, gender, ageGroup, events, period])

  return (
    <div className="w-full bg-card border-2 border-border rounded-lg shadow-md overflow-hidden">
      {/* Sticky Header Stub */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-card to-muted/30 hover:from-muted/40 hover:to-muted/50 transition-all duration-200 cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Filter className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-semibold text-foreground">Search & Filter Rankings</span>
            <span className="text-xs text-muted-foreground">
              {activeFiltersCount > 0
                ? `${activeFiltersCount} active filter${activeFiltersCount > 1 ? "s" : ""}`
                : "Click to expand filters"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <span className="px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
              {activeFiltersCount}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </div>
      </button>

      {/* Collapsible Content */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        } overflow-hidden`}
      >
        <form onSubmit={handleSubmit} className="p-4 space-y-3 border-t-2 border-border">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search players by name, federation, or ID..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
          <div className="space-y-2.5">
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
              <span className="text-xs font-semibold text-muted-foreground">Rating:</span>
              <Chip
                active={rating === "RATED"}
                onClick={() => {
                  const next = rating === "RATED" ? "ALL" : "RATED"
                  setRating(next)
                  apply({ rating: next })
                }}
              >
                Rated
              </Chip>
              <Chip
                active={rating === "UNRATED"}
                onClick={() => {
                  const next = rating === "UNRATED" ? "ALL" : "UNRATED"
                  setRating(next)
                  apply({ rating: next })
                }}
              >
                Unrated
              </Chip>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground">Age:</span>
              {["ADT", "SNR", "VET", "U20", "U18", "U16", "U14", "U12", "U10"].map((a) => (
                <Chip
                  key={a}
                  active={ageGroup === a}
                  onClick={() => {
                    const next = ageGroup === a ? "ALL" : a
                    setAgeGroup(next)
                    apply({ ageGroup: next })
                  }}
                >
                  {a}
                </Chip>
              ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground">Events:</span>
              {["1", "2+", "3+", "4+", "5+", "6+"].map((e) => (
                <Chip
                  key={e}
                  active={events === e}
                  onClick={() => {
                    const next = events === e ? "ALL" : e
                    setEvents(next)
                    apply({ events: next })
                  }}
                >
                  {e}
                </Chip>
              ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground">Gender:</span>
              <Chip
                active={gender === "Male"}
                onClick={() => {
                  const next = gender === "Male" ? "ALL" : "Male"
                  setGender(next)
                  apply({ gender: next })
                }}
              >
                Male
              </Chip>
              <Chip
                active={gender === "Female"}
                onClick={() => {
                  const next = gender === "Female" ? "ALL" : "Female"
                  setGender(next)
                  apply({ gender: next })
                }}
              >
                Female
              </Chip>
            </div>

            <div className="flex items-start gap-3 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground leading-7">Federation:</span>
              <Chip
                active={fed === "ALL"}
                onClick={() => {
                  setFed("ALL")
                  apply({ fed: "ALL" })
                }}
              >
                ALL
              </Chip>
              <Chip
                active={fed === "Limpopo"}
                onClick={() => {
                  setFed("Limpopo")
                  apply({ fed: "Limpopo" })
                }}
              >
                Limpopo
              </Chip>
              {fedOptions.map((f) => (
                <Chip
                  key={f}
                  active={fed === f}
                  onClick={() => {
                    setFed(f)
                    apply({ fed: f })
                  }}
                >
                  {f}
                </Chip>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
