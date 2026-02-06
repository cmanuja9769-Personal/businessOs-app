"use client"

import { useState, useMemo, useCallback } from "react"

const EDGE_PAGE_COUNT = 3
const ADJACENT_PAGE_COUNT = 1
const DEFAULT_ITEMS_PER_PAGE = 50

interface UsePaginationOptions {
  totalItems: number
  itemsPerPage?: number
  initialPage?: number
}

interface UsePaginationReturn {
  currentPage: number
  totalPages: number
  startIndex: number
  endIndex: number
  setCurrentPage: (page: number) => void
  goToNextPage: () => void
  goToPreviousPage: () => void
  resetToFirstPage: () => void
  canGoNext: boolean
  canGoPrevious: boolean
  visiblePages: number[]
}

export function usePagination({
  totalItems,
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
  initialPage = 1,
}: UsePaginationOptions): UsePaginationReturn {
  const [currentPage, setCurrentPageRaw] = useState(initialPage)

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))

  // Clamp page to valid range
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)

  const setCurrentPage = useCallback(
    (page: number) => {
      setCurrentPageRaw(Math.max(1, Math.min(page, totalPages)))
    },
    [totalPages]
  )

  const goToNextPage = useCallback(() => {
    setCurrentPageRaw((prev) => Math.min(prev + 1, totalPages))
  }, [totalPages])

  const goToPreviousPage = useCallback(() => {
    setCurrentPageRaw((prev) => Math.max(prev - 1, 1))
  }, [])

  const resetToFirstPage = useCallback(() => {
    setCurrentPageRaw(1)
  }, [])

  const visiblePages = useMemo(() => {
    return Array.from({ length: totalPages }, (_, i) => i + 1).filter((page) => {
      // Always show first and last few pages
      if (page <= EDGE_PAGE_COUNT || page > totalPages - EDGE_PAGE_COUNT) return true
      // Show pages adjacent to current
      if (Math.abs(page - safePage) <= ADJACENT_PAGE_COUNT) return true
      return false
    })
  }, [totalPages, safePage])

  return {
    currentPage: safePage,
    totalPages,
    startIndex,
    endIndex,
    setCurrentPage,
    goToNextPage,
    goToPreviousPage,
    resetToFirstPage,
    canGoNext: safePage < totalPages,
    canGoPrevious: safePage > 1,
    visiblePages,
  }
}
