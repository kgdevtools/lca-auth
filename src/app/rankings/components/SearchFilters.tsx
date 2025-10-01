"use client"

import * as React from "react"
import { Search } from "lucide-react"

export interface SearchFiltersState {
  name: string
  fed: string
  rating: string
  gender: string
  ageGroup: string
}

interface SearchFiltersProps {
  onSearch: (filters: SearchFiltersState) => void
  fedOptions: string[]
}

export function SearchFilters({ onSearch, fedOptions }: SearchFiltersProps) {
  const [name, setName] = React.useState("")
  const [fed, setFed] = React.useState("ALL")
  const [rating, setRating] = React.useState("ALL")
  const [gender, setGender] = React.useState("ALL")
  const [ageGroup, setAgeGroup] = React.useState("ALL")

  const apply = React.useCallback((next: Partial<SearchFiltersState> = {}) => {
    const payload: SearchFiltersState = {
      name,
      fed,
      rating,
      gender,
      ageGroup,
      ...next,
    }
    onSearch(payload)
  }, [name, fed, rating, gender, ageGroup, onSearch])

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
    onSearch({ name: "", fed: "ALL", rating: "ALL", gender: "ALL", ageGroup: "ALL" })
  }

  // Debounce name input
  React.useEffect(() => {
    const id = setTimeout(() => {
      apply({ name })
    }, 300)
    return () => clearTimeout(id)
  }, [name, apply])

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button type="button" onClick={onClick} className={`px-3 py-1.5 text-xs rounded-md border ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}>{children}</button>
  )

  return (
    <div className="w-full bg-card border-2 border-border rounded-md p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Search players by name, federation, or ID..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 pl-9 pr-3 py-2 text-sm border-2 border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-4 py-2 h-10 text-sm border-2 border-border rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 whitespace-nowrap"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 h-10 text-sm border-2 border-border rounded-md bg-muted text-foreground hover:bg-muted/80 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground">Rating:</span>
            <Chip active={rating === 'RATED'} onClick={() => { const next = rating === 'RATED' ? 'ALL' : 'RATED'; setRating(next); apply({ rating: next }) }}>Rated</Chip>
            <Chip active={rating === 'UNRATED'} onClick={() => { const next = rating === 'UNRATED' ? 'ALL' : 'UNRATED'; setRating(next); apply({ rating: next }) }}>Unrated</Chip>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground">Age:</span>
            {['U20','U18','U16','U14','U12','U10'].map((a) => (
              <Chip key={a} active={ageGroup === a} onClick={() => { const next = ageGroup === a ? 'ALL' : a; setAgeGroup(next); apply({ ageGroup: next }) }}>{a}</Chip>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground">Gender:</span>
            <Chip active={gender === 'Male'} onClick={() => { const next = gender === 'Male' ? 'ALL' : 'Male'; setGender(next); apply({ gender: next }) }}>Male</Chip>
            <Chip active={gender === 'Female'} onClick={() => { const next = gender === 'Female' ? 'ALL' : 'Female'; setGender(next); apply({ gender: next }) }}>Female</Chip>
          </div>

          <div className="flex items-start gap-3 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground leading-8">Federation:</span>
            <Chip active={fed === 'ALL'} onClick={() => { setFed('ALL'); apply({ fed: 'ALL' }) }}>ALL</Chip>
            <Chip active={fed === 'Limpopo'} onClick={() => { setFed('Limpopo'); apply({ fed: 'Limpopo' }) }}>Limpopo</Chip>
            {fedOptions.map((f) => (
              <Chip key={f} active={fed === f} onClick={() => { setFed(f); apply({ fed: f }) }}>{f}</Chip>
            ))}
          </div>
        </div>
      </form>
    </div>
  )
}
