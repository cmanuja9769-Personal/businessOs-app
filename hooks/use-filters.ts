"use client"

import { useState, useCallback } from "react"

export function useFilters<T extends Record<string, string>>(initialFilters: T) {
  const [filters, setFilters] = useState<T>(initialFilters)

  const updateFilters = useCallback((updates: Partial<T>) => {
    setFilters((prev) => ({ ...prev, ...updates }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(initialFilters)
  }, [initialFilters])

  const clearFilter = useCallback((key: keyof T) => {
    setFilters((prev) => ({ ...prev, [key]: "" }))
  }, [])

  return {
    filters,
    setFilters,
    updateFilters,
    resetFilters,
    clearFilter,
  }
}
