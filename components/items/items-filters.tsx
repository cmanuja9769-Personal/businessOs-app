"use client"

import type React from "react"

import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useCallback, useTransition, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ItemsFiltersProps = {
  q: string
  unit: string
  category: string
  godown: string
  stock: string
  sort: string
  dir: string
  unitOptions: string[]
  categoryOptions: string[]
  godownOptions: Array<{ id: string; name: string }>
  onFiltersChange?: (filters: {
    q?: string
    unit?: string
    category?: string
    godown?: string
    stock?: string
    sort?: string
    dir?: string
  }) => void
}

export function ItemsFilters({ q, unit, category, godown, stock, sort, dir, unitOptions, categoryOptions, godownOptions, onFiltersChange }: ItemsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(q)
  const [showFilters, setShowFilters] = useState(false)

  const updateFilters = useCallback(
    (updates: Record<string, string>) => {
      if (onFiltersChange) {
        // Client-side mode: normalize sentinel values used by Radix Select
        // (Radix doesn't allow empty string values for SelectItem)
        const normalized = Object.fromEntries(
          Object.entries(updates).map(([key, value]) => {
            if ((key === "unit" || key === "category" || key === "godown") && value === "all") return [key, ""]
            return [key, value]
          }),
        )

        onFiltersChange(normalized)
        return
      }

      // Server-side mode: use router navigation
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== "all" && value !== "") {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      })

      startTransition(() => {
        router.push(`/items?${params.toString()}`, { scroll: false })
      })
    },
    [router, searchParams, onFiltersChange],
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== q) {
        if (onFiltersChange) {
          onFiltersChange({ q: searchValue })
        } else {
          updateFilters({ q: searchValue })
        }
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValue, q, onFiltersChange, updateFilters])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value)
  }

  return (
    <div className="w-full space-y-1.5">
      {/* Search bar always visible */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search items..."
          value={searchValue}
          onChange={handleSearchChange}
          className="pl-9 w-full text-sm h-8"
          title="Search by name, code, HSN, category, barcode"
        />
      </div>

      {/* Mobile filter toggle */}
      <div className="flex sm:hidden">
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="w-full text-xs h-7">
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Button>
      </div>

      {/* Filters - hidden on mobile by default, visible on sm+ */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-7 gap-1.5 overflow-hidden transition-all ${
          showFilters ? "max-h-40" : "max-h-0 sm:max-h-8"
        } sm:max-h-none`}
      >
        <Select value={unit || "all"} onValueChange={(v) => updateFilters({ unit: v })} disabled={isPending}>
          <SelectTrigger className="w-full text-xs h-8" title="Filter by unit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Units</SelectItem>
            {unitOptions.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category || "all"} onValueChange={(v) => updateFilters({ category: v })} disabled={isPending}>
          <SelectTrigger className="w-full text-xs sm:text-sm" title="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoryOptions.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={godown || "all"} onValueChange={(v) => updateFilters({ godown: v })} disabled={isPending}>
          <SelectTrigger className="w-full text-xs sm:text-sm" title="Filter by godown">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Godowns</SelectItem>
            {godownOptions.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={stock || "all"} onValueChange={(v) => updateFilters({ stock: v })} disabled={isPending}>
          <SelectTrigger className="w-full text-xs sm:text-sm" title="Filter by stock status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="normal">In Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="high">Overstock</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => updateFilters({ sort: v })} disabled={isPending}>
          <SelectTrigger className="w-full text-xs sm:text-sm" title="Sort by">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Updated</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="godown">Godown</SelectItem>
            <SelectItem value="stock">Stock</SelectItem>
            <SelectItem value="saleprice">Sale Price</SelectItem>
            <SelectItem value="purchaseprice">Purc. Price</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dir} onValueChange={(v) => updateFilters({ dir: v })} disabled={isPending}>
          <SelectTrigger className="w-full text-xs sm:text-sm" title="Sort direction">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
