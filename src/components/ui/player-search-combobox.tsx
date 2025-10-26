'use client'

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [players, setPlayers] = React.useState<PlayerSearchResult[]>([])
  const [loading, setLoading] = React.useState(false)

  // Debounced search
  React.useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setLoading(true)
        const results = await searchPlayers(searchQuery)
        setPlayers(results)
        setLoading(false)
      } else {
        setPlayers([])
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

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
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput 
            placeholder="Type at least 2 characters..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          {!loading && searchQuery.length >= 2 && players.length === 0 && (
            <CommandEmpty>No players found.</CommandEmpty>
          )}
          {!loading && players.length > 0 && (
            <CommandGroup>
              {players.map((player) => (
                <CommandItem
                  key={player.name}
                  value={player.name}
                  onSelect={() => {
                    onValueChange(player.name)
                    if (onPlayerSelect) {
                      onPlayerSelect(player)
                    }
                    setOpen(false)
                    setSearchQuery("")
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === player.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{player.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {player.rating && `Rating: ${player.rating}`}
                      {player.fed && ` | ${player.fed}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}