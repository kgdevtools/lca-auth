'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getPlayersData, searchAllPlayers } from '../server-actions'
import SearchFilters from './components/SearchFilters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'

// Utility: debounce
function debounce<F extends (...args: any[]) => void>(func: F, wait: number) {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<F>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Preprocess search term for normalized_name and reverse
function processSearchTerm(term: string) {
  const cleaned = term.toLowerCase().replace(/\s+/g, '')
  const parts = term.toLowerCase().trim().split(/\s+/)
  const reversed = parts.reverse().join('')
  return { cleaned, reversed }
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({})
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetchPlayers()
  }, [filters])

  const fetchPlayers = async () => {
    setLoading(true)
    setError('')
    try {
      const { players, error } = await getPlayersData(filters)
      if (error) {
        setError(error)
      } else {
        setPlayers(players)
      }
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  const handleFilter = (newFilters: any) => {
    setFilters(newFilters)
  }

  const handleSearchChange = useCallback(
    debounce(async (searchTerm: string) => {
      if (searchTerm.length < 2) {
        setSearchSuggestions([])
        setShowSuggestions(false)
        return
      }

      const { cleaned, reversed } = processSearchTerm(searchTerm)

      try {
        const { players } = await searchAllPlayers(searchTerm, cleaned, reversed)
        const uniquePlayers = players.filter((player: any, index: number, self: any[]) =>
          index === self.findIndex((p) => p.name === player.name)
        )
        setSearchSuggestions(uniquePlayers || [])
        setShowSuggestions(true)
      } catch {
        setSearchSuggestions([])
      }
    }, 300),
    []
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-2xl mx-auto px-0">
        {/* Header */}
        <div className="px-4 md:px-6 py-4 md:py-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Players Directory</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-5 w-5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Some players may not appear due to ongoing data migration. Unmatched records are being resolved.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-muted-foreground">Search and manage chess players</p>
        </div>

        {/* Search Filters */}
        <div className="px-4 md:px-6 mb-6">
          <Card className="rounded-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Search Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <SearchFilters
                onFilter={handleFilter}
                loading={loading}
                onSearchChange={handleSearchChange}
                searchSuggestions={searchSuggestions}
                showSuggestions={showSuggestions}
                onSuggestionSelect={(suggestion) => {
                  setFilters({ search: suggestion.name })
                  setShowSuggestions(false)
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Players Table */}
        <div className="px-0">
          <Card className="rounded-none md:rounded-sm border-x-0 md:border-x">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-lg">Players</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {loading ? 'Loading...' : `${players.length} player${players.length !== 1 ? 's' : ''} found`}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border-t">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 px-3 py-3">#</TableHead>
                      <TableHead className="px-3 py-3 min-w-[150px]">Name</TableHead>
                      <TableHead className="px-3 py-3 hidden md:table-cell">ID</TableHead>
                      <TableHead className="px-3 py-3 min-w-[100px]">Unique No</TableHead>
                      <TableHead className="px-3 py-3 hidden sm:table-cell">Birth</TableHead>
                      <TableHead className="px-3 py-3 w-16">Sex</TableHead>
                      <TableHead className="px-3 py-3 hidden lg:table-cell">Fed</TableHead>
                      <TableHead className="px-3 py-3 text-right min-w-[80px]">Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, index) => (
                        <TableRow key={index}>
                          {Array.from({ length: 8 }).map((_, i) => (
                            <TableCell key={i} className="px-3 py-3">
                              <Skeleton className="h-4 w-12" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : players.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                          {Object.keys(filters).length > 0 ? 'No players match your search criteria' : 'No players found in database'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      players.map((player, index) => (
                        <TableRow key={player.id} className="hover:bg-accent/50 group">
                          <TableCell className="px-3 py-3 font-medium text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="px-3 py-3">
                            <Link href={`/admin/admin-dashboard/players/${player.id}`} className="font-medium text-primary hover:underline">
                              {player.source_name}
                            </Link>
                          </TableCell>
                          <TableCell className="px-3 py-3 text-muted-foreground hidden md:table-cell">{player.id}</TableCell>
                          <TableCell className="px-3 py-3 font-mono text-sm">{player.unique_no || '-'}</TableCell>
                          <TableCell className="px-3 py-3 text-muted-foreground hidden sm:table-cell">{player.bdate || '-'}</TableCell>
                          <TableCell className="px-3 py-3">
                            <Badge variant={player.sex === 'F' ? 'secondary' : 'outline'}>{player.sex || '-'}</Badge>
                          </TableCell>
                          <TableCell className="px-3 py-3 hidden lg:table-cell">{player.fed || '-'}</TableCell>
                          <TableCell className="px-3 py-3 text-right font-medium tabular-nums">{player.cf_rating ?? '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
