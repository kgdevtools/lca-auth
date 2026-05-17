"use client"

import * as React from "react"
import { Search, ChevronDown, ChevronUp, Filter, X } from "lucide-react"

const PERIODS = [
  { label: "2024-2025", value: "2024-2025" },
  { label: "2025-2026", value: "2025-2026" },
]

const AGE_GROUPS = [
  { label: "All Ages", value: "ALL" },
  { label: "Adult (20-49)", value: "ADT" },
  { label: "Senior (50+)", value: "SNR" },
  { label: "Veteran (60+)", value: "VET" },
  { label: "U20", value: "U20" },
  { label: "U18", value: "U18" },
  { label: "U16", value: "U16" },
  { label: "U14", value: "U14" },
  { label: "U12", value: "U12" },
  { label: "U10", value: "U10" },
]

const RATING_OPTIONS = [
  { label: "All Ratings", value: "ALL" },
  { label: "Rated", value: "RATED" },
  { label: "Unrated", value: "UNRATED" },
]

const GENDER_OPTIONS = [
  { label: "All Genders", value: "ALL" },
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
]

const EVENTS_OPTIONS = [
  { label: "All Events", value: "ALL" },
  { label: "1 Event", value: "1" },
  { label: "2+ Events", value: "2+" },
  { label: "3+ Events", value: "3+" },
  { label: "4+ Events", value: "4+" },
  { label: "5+ Events", value: "5+" },
  { label: "6+ Events", value: "6+" },
]

interface SearchFiltersState {
  name: string
  fed: string
  rating: string
  gender: string
  ageGroup: string
  events: string
  period: string
  juniors: string
  qualified: string
}

interface SearchFiltersProps {
  onSearch: (filters: Partial<SearchFiltersState>) => void
  fedOptions: string[]
  initialState?: Partial<SearchFiltersState>
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
  placeholder?: string
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selected = options.find((o) => o.value === value)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-9 px-3 py-1.5 text-sm border-2 border-border rounded-md bg-background text-foreground flex items-center justify-between gap-2 hover:border-primary/50 transition-colors"
      >
        <span className="truncate">{selected?.label ?? placeholder ?? "Select..."}</span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="fixed z-[9999] border-2 border-border rounded-md bg-background shadow-lg max-h-60 overflow-auto" style={{ top: ref.current?.getBoundingClientRect().bottom ? `${ref.current?.getBoundingClientRect().bottom + 4}px` : 'auto', left: ref.current?.getBoundingClientRect().left ? `${ref.current?.getBoundingClientRect().left}px` : 'auto', minWidth: ref.current?.offsetWidth }}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={`w-full px-3 py-2 text-sm text-left hover:bg-muted ${value === opt.value ? "bg-primary/10 text-primary font-medium" : "text-foreground"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function SearchFilters({ onSearch, fedOptions, initialState }: SearchFiltersProps) {
  const [name, setName] = React.useState(initialState?.name ?? "")
  const [fed, setFed] = React.useState(initialState?.fed ?? "Limpopo")
  const [rating, setRating] = React.useState(initialState?.rating ?? "ALL")
  const [gender, setGender] = React.useState(initialState?.gender ?? "ALL")
  const [ageGroup, setAgeGroup] = React.useState(initialState?.ageGroup ?? "ALL")
  const [events, setEvents] = React.useState(initialState?.events ?? "ALL")
  const [period, setPeriod] = React.useState(initialState?.period ?? "2025-2026")
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
        juniors: "ALL",
        qualified: ageGroup === "QUALIFIED" ? "yes" : ageGroup === "NOT_QUALIFIED" ? "no" : "ALL",
        ...next,
      }
      onSearch(payload)
    },
    [name, fed, rating, gender, ageGroup, events, period, onSearch],
  )

  const handleAgeGroupChange = (value: string) => {
    setAgeGroup(value)
    onSearch({ ageGroup: value, juniors: "ALL", qualified: "ALL" })
  }

  const handleReset = () => {
    setName("")
    setFed("Limpopo")
    setRating("ALL")
    setGender("ALL")
    setAgeGroup("ALL")
    setEvents("ALL")
    setPeriod("2025-2026")
    onSearch({ name: "", fed: "Limpopo", rating: "ALL", gender: "ALL", ageGroup: "ALL", events: "ALL", period: "2025-2026", qualified: "ALL", juniors: "ALL" })
  }

  React.useEffect(() => {
    const id = setTimeout(() => {
      apply({ name })
    }, 300)
    return () => clearTimeout(id)
  }, [name, apply])

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

  const activeFilterLabels = React.useMemo(() => {
    const labels: string[] = []
    if (fed !== "ALL") labels.push("Federation")
    if (ageGroup !== "ALL") labels.push("Age")
    if (rating !== "ALL") labels.push("Rating")
    if (gender !== "ALL") labels.push("Gender")
    if (events !== "ALL") labels.push("Events")
    if (period !== "ALL") labels.push("Period")
    return labels
  }, [fed, ageGroup, rating, gender, events, period])

  const fedSelectOptions = [
    { label: "Limpopo + CSA + RSA", value: "Limpopo" },
    { label: "All Federations", value: "ALL" },
    ...fedOptions.map((f) => ({ label: f, value: f })),
  ]

  return (
    <div className="w-full bg-card border-2 border-border rounded-lg shadow-md overflow-hidden">
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
                ? `${activeFilterLabels.join(", ")} filter${activeFilterLabels.length > 1 ? "s" : ""} selected`
                : "Click to expand filters"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <span className="px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">{activeFiltersCount}</span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </div>
      </button>

      <div className={`transition-all duration-300 ease-in-out ${isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"}`}>
        <form className="p-4 space-y-3 border-t-2 border-border">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search players by name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 py-1.5 text-sm border-2 border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 h-9 text-sm border-2 border-border rounded-md bg-muted text-foreground hover:bg-muted/80 transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Reset
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Period</label>
              <Select value={period} onChange={(v) => { setPeriod(v); apply({ period: v }) }} options={[{ label: "All Periods", value: "ALL" }, ...PERIODS]} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Federation</label>
              <Select value={fed} onChange={(v) => { setFed(v); apply({ fed: v }) }} options={fedSelectOptions} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Age Group</label>
              <Select value={ageGroup} onChange={handleAgeGroupChange} options={AGE_GROUPS} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Rating</label>
              <Select value={rating} onChange={(v) => { setRating(v); apply({ rating: v }) }} options={RATING_OPTIONS} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Gender</label>
              <Select value={gender} onChange={(v) => { setGender(v); apply({ gender: v }) }} options={GENDER_OPTIONS} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Events</label>
              <Select value={events} onChange={(v) => { setEvents(v); apply({ events: v }) }} options={EVENTS_OPTIONS} />
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}