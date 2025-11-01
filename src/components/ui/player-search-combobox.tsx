'use client'

import * as React from "react"
import { Check, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { searchPlayers, PlayerSearchResult } from "@/app/user/tournament-actions"

interface PlayerSearchComboboxProps {
  value: string
  onValueChange: (value: string) => void
  onPlayerSelect?: (player: PlayerSearchResult) => void
  placeholder?: string
  className?: string
}

export function PlayerSearchCombobox({
  value,
  onValueChange,
  onPlayerSelect,
  placeholder = "Search for a player...",
  className
}: PlayerSearchComboboxProps) {
  const [isFocused, setIsFocused] = React.useState(false)
  const [players, setPlayers] = React.useState<PlayerSearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Debounced search based on input value
  React.useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (value.length >= 2) {
        setLoading(true)
        try {
          const results = await searchPlayers(value)
          setPlayers(results)
        } catch (error) {
          console.error('Error searching players:', error)
          setPlayers([])
        } finally {
          setLoading(false)
        }
      } else {
        setPlayers([])
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [value])

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (player: PlayerSearchResult) => {
    onValueChange(player.name)
    if (onPlayerSelect) {
      onPlayerSelect(player)
    }
    setIsFocused(false)
    setHighlightedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isFocused || players.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => (prev < players.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault()
      handleSelect(players[highlightedIndex])
    } else if (e.key === 'Escape') {
      setIsFocused(false)
      setHighlightedIndex(-1)
    }
  }

  const showDropdown = isFocused && (loading || players.length > 0 || value.length >= 2)

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full border rounded-md px-3 py-2 pr-8 bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onValueChange('')
              inputRef.current?.focus()
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && value.length >= 2 && players.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No players found.
            </div>
          )}

          {!loading && value.length < 2 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search.
            </div>
          )}

          {!loading && players.length > 0 && (
            <div className="py-1">
              {players.map((player, index) => (
                <button
                  key={`${player.name}-${player.unique_no}`}
                  type="button"
                  onClick={() => handleSelect(player)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    "w-full px-3 py-2 text-left flex items-start gap-2 hover:bg-accent cursor-pointer transition-colors",
                    highlightedIndex === index && "bg-accent",
                    value === player.name && "bg-accent/50"
                  )}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 mt-0.5 shrink-0",
                      value === player.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">{player.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {player.rating && `Rating: ${player.rating}`}
                      {player.unique_no && ` | ID: ${player.unique_no}`}
                      {player.fed && ` | ${player.fed}`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
