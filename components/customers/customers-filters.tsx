"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useCallback, useTransition, useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type CustomersFiltersProps = {
  q: string
  gstin: string
  sort: string
  dir: string
}

export function CustomersFilters({ q, gstin, sort, dir }: CustomersFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(q)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== q) {
        updateFilters({ q: searchValue })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValue])

  const updateFilters = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "all" && value !== "") {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    startTransition(() => {
      router.push(`/customers?${params.toString()}`, { scroll: false })
    })
  }, [router, searchParams])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value)
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search customers..."
          value={searchValue}
          onChange={handleSearchChange}
          className="pl-9"
          title="Search by name, ID, contact, email, address, GSTIN"
        />
      </div>

      <Select value={gstin || "all"} onValueChange={(v) => updateFilters({ gstin: v })} disabled={isPending}>
        <SelectTrigger className="text-sm" title="Filter by GSTIN">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="with">With GSTIN</SelectItem>
          <SelectItem value="without">Without GSTIN</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sort} onValueChange={(v) => updateFilters({ sort: v })} disabled={isPending}>
        <SelectTrigger className="text-sm" title="Sort by">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="updated">Sort: Updated</SelectItem>
          <SelectItem value="name">Sort: Name</SelectItem>
          <SelectItem value="contact">Sort: Contact</SelectItem>
        </SelectContent>
      </Select>

      <Select value={dir} onValueChange={(v) => updateFilters({ dir: v })} disabled={isPending}>
        <SelectTrigger className="text-sm" title="Sort direction">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asc">Ascending</SelectItem>
          <SelectItem value="desc">Descending</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
