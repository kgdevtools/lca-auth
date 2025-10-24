"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Player {
  UNIQUE_NO: string | null
  name: string | null
  FED: string | null
  SEX: string | null
  RATING: string | null
}

interface ComboboxProps {
  value: string
  onValueChange: (value: string) => void
  onPlayerSelect?: (player: Player) => void
  placeholder?: string
  className?: string
}

export function PlayerCombobox({ value, onValueChange, onPlayerSelect, placeholder = "Search players...", className }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [players, setPlayers] = React.useState<Player[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Debounced search function
  const searchPlayers = React.useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setPlayers([])
        return
      }

      setLoading(true)
      try {
        const response = await fetch(`/api/players/search?q=${encodeURIComponent(query)}`)
        const data = await response.json()
        setPlayers(data.players || [])
      } catch (error) {
        console.error('Error searching players:', error)
        setPlayers([])
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Debounce the search
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchPlayers(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchPlayers])

  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null)

  const handleSelect = (player: Player, index: number) => {
    console.log('Player selected:', player.name) // Debug log
    const displayValue = player.name || ""
    
    // Show visual feedback that item was clicked
    setSelectedIndex(index)
    
    // Update the value immediately for visual feedback
    onValueChange(displayValue)
    
    // Clear search and results
    setSearchQuery("")
    setPlayers([])
    
    // Close dropdown with a slight delay for better UX
    setTimeout(() => {
      setOpen(false)
      setSelectedIndex(null) // Reset selection state
    }, 200)
    
    // Call the player select callback if provided
    if (onPlayerSelect) {
      onPlayerSelect(player)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search players..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {loading && (
              <div className="p-2 text-sm text-muted-foreground">Searching...</div>
            )}
            {!loading && players.length === 0 && searchQuery.length >= 2 && (
              <CommandEmpty>No players found.</CommandEmpty>
            )}
            {!loading && searchQuery.length < 2 && (
              <div className="p-2 text-sm text-muted-foreground">Type at least 2 characters to search</div>
            )}
            {players.length > 0 && (
              <CommandGroup>
                {players.map((player, index) => (
                  <CommandItem
                    key={`${player.UNIQUE_NO}-${index}`}
                    value={player.name || ""}
                    onSelect={() => handleSelect(player, index)}
                    className={cn(
                      "group flex flex-col items-start p-3 cursor-pointer transition-all duration-200 rounded-md border border-transparent focus:outline-none focus:ring-2 focus:ring-accent/20",
                      selectedIndex === index 
                        ? "bg-primary/10 border-primary/30 ring-2 ring-primary/20" 
                        : "hover:bg-accent/50 active:bg-accent/70 focus:bg-accent/60 hover:border-accent/20 focus:border-accent/30"
                    )}
                    onClick={(e) => {
                      console.log('Click detected on:', player.name) // Debug log
                      e.preventDefault()
                      e.stopPropagation()
                      handleSelect(player, index)
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 transition-all duration-200",
                            selectedIndex === index 
                              ? "opacity-100 text-primary scale-110" 
                              : value === player.name 
                                ? "opacity-100" 
                                : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col flex-1">
                          <div className="font-bold text-sm text-black dark:text-white group-hover:text-primary transition-colors">
                            {player.name}
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-muted-foreground group-hover:text-foreground/80 transition-colors">
                            {player.UNIQUE_NO && (
                              <span className="bg-muted px-2 py-1 rounded group-hover:bg-accent/20 transition-colors">
                                #{player.UNIQUE_NO}
                              </span>
                            )}
                            {player.FED && (
                              <span>🇺🇳 {player.FED}</span>
                            )}
                            {player.SEX && (
                              <span>{player.SEX === 'M' ? '♂' : player.SEX === 'F' ? '♀' : player.SEX}</span>
                            )}
                            {player.RATING && (
                              <span className="font-semibold text-primary group-hover:text-primary/80 transition-colors">
                                {player.RATING}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
