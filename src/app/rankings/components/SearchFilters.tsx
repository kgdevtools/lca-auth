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
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        placeholder="Search player..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-9 w-64 px-3 py-1 text-sm border-2 rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />

      <select
        value={confidence}
        onChange={(e) => setConfidence(e.target.value)}
        className="h-9 px-2 text-sm border-2 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      >
        <option value="ALL">All Confidence</option>
        <option value="HIGH">HIGH</option>
        <option value="MEDIUM">MEDIUM</option>
        <option value="LOW">LOW</option>
      </select>

      <select
        value={tournament}
        onChange={(e) => setTournament(e.target.value)}
        className="h-9 px-2 text-sm border-2 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      >
        <option value="ALL">All Tournaments</option>
        {tournamentOptions.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="flex items-center gap-1 px-3 py-1.5 text-sm border-2 rounded-md bg-muted text-foreground hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <Search className="h-4 w-4" />
        Apply
      </button>
    </form>
  )
}
