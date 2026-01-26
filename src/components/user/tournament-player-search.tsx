"use client"

import React, { useState, useEffect, useRef } from 'react'

export default function PlayerSearch({ onSelect }: { onSelect?: (name: string) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current)
    if (!query || query.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    // debounce
    timer.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error(err)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [query])

  function choose(name: string) {
    setSelected(name)
    setQuery(name)
    setResults([])
    if (onSelect) onSelect(name)
  }

  return (
    <div className="relative">
      <input
        className="w-full rounded-md border px-3 py-2 bg-background text-sm"
        placeholder="Search players (min 2 chars)"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setSelected(null) }}
      />

      {loading && <div className="absolute right-2 top-2 text-xs text-muted-foreground">Searching...</div>}

      {results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-card border rounded-md shadow-sm max-h-60 overflow-auto">
          {results.map((r, idx) => (
            <li
              key={`${r.name}-${idx}`}
              onClick={() => choose(r.name)}
              className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
            >
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-muted-foreground">{r.UNIQUE_NO ? `ID: ${r.UNIQUE_NO}` : ''} {r.RATING ? ` • ${r.RATING}` : ''} {r.FED ? ` • ${r.FED}` : ''}</div>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="mt-2 text-sm text-muted-foreground">Selected: <span className="font-medium">{selected}</span></div>
      )}
    </div>
  )
}
