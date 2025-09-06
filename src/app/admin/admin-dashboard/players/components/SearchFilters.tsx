'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface SearchFiltersProps {
  onFilter: (filters: any) => void;
  loading?: boolean;
  onSearchChange: (searchTerm: string) => void;
  searchSuggestions: any[];
  showSuggestions: boolean;
  onSuggestionSelect: (suggestion: any) => void;
}

export default function SearchFilters({ 
  onFilter, 
  loading,
  onSearchChange,
  searchSuggestions = [],
  showSuggestions: externalShowSuggestions = false,
  onSuggestionSelect
}: SearchFiltersProps) {
  const [filters, setFilters] = useState({
    search: '',
    bdateFrom: '',
    bdateTo: '',
    federation: '',
    sex: '',
    ratingFrom: '',
    ratingTo: ''
  })

  const [internalShowSuggestions, setInternalShowSuggestions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Use external showSuggestions if provided, otherwise use internal state
  const showSuggestions = externalShowSuggestions !== undefined 
    ? externalShowSuggestions 
    : internalShowSuggestions

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setInternalShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onFilter(filters)
  }

  const handleReset = () => {
    setFilters({
      search: '',
      bdateFrom: '',
      bdateTo: '',
      federation: '',
      sex: '',
      ratingFrom: '',
      ratingTo: ''
    })
    onFilter({})
    setInternalShowSuggestions(false)
  }

  const handleSearchInputChange = (value: string) => {
    setFilters({...filters, search: value})
    onSearchChange(value)
    setInternalShowSuggestions(true)
  }

  const handleSearchFocus = () => {
    setInternalShowSuggestions(true)
  }

  const handleSuggestionClick = (suggestion: any) => {
    onSuggestionSelect(suggestion)
    setFilters({...filters, search: suggestion.name})
    setInternalShowSuggestions(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name Search */}
      <div className="space-y-2" ref={searchRef}>
        <Label htmlFor="search">Player Name</Label>
        <div className="relative">
          <Input
            id="search"
            placeholder="Search by player name..."
            value={filters.search}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            onFocus={handleSearchFocus}
            className="pr-8"
          />
          {showSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {searchSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Birth Year Range - Single Row */}
        <div className="space-y-2">
          <Label>Birth Year Range</Label>
          <div className="flex gap-2">
            <Input
              placeholder="From (1990)"
              type="number"
              min="1900"
              max="2100"
              value={filters.bdateFrom}
              onChange={(e) => setFilters({...filters, bdateFrom: e.target.value})}
              className="flex-1"
            />
            <Input
              placeholder="To (2000)"
              type="number"
              min="1900"
              max="2100"
              value={filters.bdateTo}
              onChange={(e) => setFilters({...filters, bdateTo: e.target.value})}
              className="flex-1"
            />
          </div>
        </div>

        {/* Rating Range - Single Row */}
        <div className="space-y-2">
          <Label>Rating Range</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Min (1000)"
              type="number"
              min="0"
              value={filters.ratingFrom}
              onChange={(e) => setFilters({...filters, ratingFrom: e.target.value})}
              className="flex-1"
            />
            <Input
              placeholder="Max (2000)"
              type="number"
              min="0"
              value={filters.ratingTo}
              onChange={(e) => setFilters({...filters, ratingTo: e.target.value})}
              className="flex-1"
            />
          </div>
        </div>

        {/* Federation & Gender - Single Row */}
        <div className="space-y-2">
          <Label>Federation & Gender</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Fed (e.g., RSA)"
              value={filters.federation}
              onChange={(e) => setFilters({...filters, federation: e.target.value})}
              className="flex-1"
            />
            <Select
              value={filters.sex}
              onValueChange={(value) => setFilters({...filters, sex: value})}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={loading}
          className="min-w-20"
        >
          {loading ? 'Searching...' : 'Search'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={loading}
        >
          Reset
        </Button>
      </div>
    </form>
  )
}
