import { useState, useCallback, useMemo } from 'react'

interface UsePaginationProps {
  initialPage?: number
  initialItemsPerPage?: number
  totalItems: number
}

interface UsePaginationReturn {
  page: number
  itemsPerPage: number
  totalPages: number
  nextPage: () => void
  prevPage: () => void
  goToPage: (page: number) => void
  changeItemsPerPage: (newItemsPerPage: number) => void
  hasNextPage: boolean
  hasPrevPage: boolean
  startIndex: number
  endIndex: number
}

/**
 * Hook for managing pagination state and calculations
 */
export function usePagination({
  initialPage = 1,
  initialItemsPerPage = 10,
  totalItems,
}: UsePaginationProps): UsePaginationReturn {
  const [page, setPage] = useState(initialPage)
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage)

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / itemsPerPage) || 1
  }, [totalItems, itemsPerPage])

  // Calculate start and end indices for current page
  const startIndex = useMemo(() => {
    return (page - 1) * itemsPerPage
  }, [page, itemsPerPage])

  const endIndex = useMemo(() => {
    return Math.min(startIndex + itemsPerPage, totalItems)
  }, [startIndex, itemsPerPage, totalItems])

  // Navigation functions
  const nextPage = useCallback(() => {
    setPage((prev) => Math.min(prev + 1, totalPages))
  }, [totalPages])

  const prevPage = useCallback(() => {
    setPage((prev) => Math.max(prev - 1, 1))
  }, [])

  const goToPage = useCallback(
    (newPage: number) => {
      const validPage = Math.max(1, Math.min(newPage, totalPages))
      setPage(validPage)
    },
    [totalPages]
  )

  const changeItemsPerPage = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setPage(1) // Reset to first page when changing items per page
  }, [])

  // Check if navigation is possible
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  return {
    page,
    itemsPerPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    changeItemsPerPage,
    hasNextPage,
    hasPrevPage,
    startIndex,
    endIndex,
  }
}
