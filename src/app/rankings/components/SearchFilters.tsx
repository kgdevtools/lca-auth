"use client"

import * as React from "react"
import { Search } from "lucide-react"

export interface SearchFiltersState {
  name: string
  confidence: string
  tournament: string
}

interface SearchFiltersProps {
  onSearch: (filters: SearchFiltersState) => void
  tournamentOptions: { id: string; name: string }[]
}

export function SearchFilters({ onSearch, tournamentOptions }: SearchFiltersProps) {
  const [name, setName] = React.useState("")
  const [confidence, setConfidence] = React.useState("ALL")
  const [tournament, setTournament] = React.useState("ALL")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch({ name, confidence, tournament })
  }

  return (
    <div className="w-full bg-card border-2 border-border rounded-md p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mobile: Stack vertically, Desktop: Horizontal layout */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              placeholder="Search by name (e.g., Phankga Mminatau)..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm border-2 border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col xs:flex-row gap-3 sm:gap-2">
            {/* <select
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
              className="h-10 px-3 text-sm border-2 border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors min-w-0"
            >
              <option value="ALL">All Confidence</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>

            <select
              value={tournament}
              onChange={(e) => setTournament(e.target.value)}
              className="h-10 px-3 text-sm border-2 border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors min-w-0"
            >
              <option value="ALL">All Tournaments</option>
              {tournamentOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select> */}

            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-4 py-2 h-10 text-sm border-2 border-border rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 whitespace-nowrap"
            >
              <Search className="h-4 w-4" />
              <span className="hidden xs:inline">Apply</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
