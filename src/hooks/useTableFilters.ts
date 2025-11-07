import { useState, useCallback, useMemo } from 'react'
import type { FilterOptions } from '@/types/admin'

/**
 * Hook for managing table filters
 */
export function useTableFilters() {
  const [filters, setFilters] = useState<FilterOptions>({})

  // Update a single filter
  const updateFilter = useCallback((key: keyof FilterOptions, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])

  // Clear a specific filter
  const clearFilter = useCallback((key: keyof FilterOptions) => {
    setFilters((prev) => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
  }, [])

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).length > 0
  }, [filters])

  // Get count of active filters
  const activeFilterCount = useMemo(() => {
    return Object.keys(filters).filter((key) => {
      const value = filters[key as keyof FilterOptions]
      return value !== undefined && value !== null && value !== ''
    }).length
  }, [filters])

  return {
    filters,
    updateFilter,
    clearFilters,
    clearFilter,
    hasActiveFilters,
    activeFilterCount,
  }
}
