"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import type { IItem } from "@/types"
import { ItemForm } from "@/components/items/item-form"
import { ItemUploadBtn } from "@/components/items/item-upload-btn"
import { ItemBulkExportBtn } from "@/components/items/item-bulk-export-btn"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Package } from "lucide-react"
import { ItemsFilters } from "@/components/items/items-filters"
import { ItemMobileCard } from "@/components/items/item-mobile-card"
import { ItemDesktopRow } from "@/components/items/item-desktop-row"
import { PageHeader } from "@/components/ui/page-header"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import { DataPagination } from "@/components/ui/data-pagination"
import { usePagination } from "@/hooks/use-pagination"
import { getStockStatus } from "@/lib/stock-utils"

const ITEMS_PER_PAGE = 50

type ItemsFilterState = {
  q: string
  unit: string
  category: string
  godown: string
  stock: string
  sort: string
  dir: string
}

type ItemsContentProps = {
  items: IItem[]
  godowns: Array<{ id: string; name: string }>
  initialFilters: ItemsFilterState
}

function matchesSearchQuery(item: IItem, query: string): boolean {
  if (!query) return true

  const keywords = query.toLowerCase().split(/\s+/).filter(Boolean)
  const searchableFields = [
    item.name.toLowerCase(),
    (item.itemCode || "").toLowerCase(),
    (item.hsnCode || "").toLowerCase(),
    (item.category || "").toLowerCase(),
  ]

  return keywords.every((keyword) =>
    searchableFields.some((field) => field.includes(keyword))
  )
}

function filterAndSortItems(items: IItem[], filters: ItemsFilterState): IItem[] {
  const { q, unit, category, godown, stock, sort, dir } = filters

  const filtered = items.filter((item) => {
    if (!matchesSearchQuery(item, q)) return false
    if (unit && unit !== "all" && item.unit !== unit) return false
    if (category && category !== "all" && item.category !== category) return false
    if (godown && (item.godownId || "") !== godown) return false
    if (stock && stock !== "all" && getStockStatus(item) !== stock) return false
    return true
  })

  const multiplier = dir === "asc" ? 1 : -1

  return filtered.sort((a, b) => {
    switch (sort) {
      case "name":
        return multiplier * a.name.localeCompare(b.name)
      case "godown":
        return multiplier * (a.godownName || "").localeCompare(b.godownName || "")
      case "stock":
        return multiplier * (a.stock - b.stock)
      case "saleprice":
        return multiplier * (a.salePrice - b.salePrice)
      case "purchaseprice":
        return multiplier * (a.purchasePrice - b.purchasePrice)
      default:
        return multiplier * (a.updatedAt.getTime() - b.updatedAt.getTime())
    }
  })
}

export function ItemsContent({ items, godowns, initialFilters }: ItemsContentProps) {
  const [filters, setFilters] = useState<ItemsFilterState>(initialFilters)

  const unitOptions = useMemo(
    () => Array.from(new Set(items.map((i) => (i.unit || "").toUpperCase()).filter(Boolean))).sort(),
    [items]
  )

  const categoryOptions = useMemo(
    () => Array.from(new Set(items.map((i) => i.category || "").filter(Boolean))).sort(),
    [items]
  )

  const filteredItems = useMemo(
    () => filterAndSortItems(items, filters),
    [items, filters]
  )

  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    setCurrentPage,
    goToNextPage,
    goToPreviousPage,
    resetToFirstPage,
    canGoNext,
    canGoPrevious,
    visiblePages,
  } = usePagination({
    totalItems: filteredItems.length,
    itemsPerPage: ITEMS_PER_PAGE,
  })

  // Reset to page 1 when filters change (useEffect, not useMemo — side effects belong in effects)
  useEffect(() => {
    resetToFirstPage()
  }, [filters, resetToFirstPage])

  const paginatedItems = useMemo(
    () => filteredItems.slice(startIndex, endIndex),
    [filteredItems, startIndex, endIndex]
  )

  const handleFiltersChange = useCallback(
    (newFilters: Partial<ItemsFilterState>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }))
    },
    []
  )

  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 h-full flex flex-col overflow-hidden">
      <PageHeader
        title="Items & Inventory"
        description="Manage your product catalog and stock levels"
        actions={
          <>
            <ItemBulkExportBtn items={items} godownNames={godowns.map((g) => g.name)} />
            <ItemUploadBtn godowns={godowns} />
            <ItemForm godowns={godowns} />
          </>
        }
      />

      {/* Items Card */}
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="px-4 shrink-0">
          <div className="flex flex-col gap-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">All Items</span>
              <span className="sm:hidden">Items</span>
              <span className="text-muted-foreground font-normal">({filteredItems.length})</span>
            </CardTitle>
            <ItemsFilters
              q={filters.q}
              unit={filters.unit}
              category={filters.category}
              godown={filters.godown}
              stock={filters.stock}
              sort={filters.sort}
              dir={filters.dir}
              unitOptions={unitOptions}
              categoryOptions={categoryOptions}
              godownOptions={godowns}
              onFiltersChange={handleFiltersChange}
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col overflow-hidden px-4 pb-4 pt-0">
          {filteredItems.length === 0 ? (
            <DataEmptyState
              icon={Package}
              title="No items found"
              description="Try adjusting filters or add a new item"
              action={<ItemForm godowns={godowns} />}
            />
          ) : (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <TooltipProvider delayDuration={300}>
                {/* Mobile Card View */}
                <div className="md:hidden flex-1 min-h-0 overflow-y-auto space-y-2">
                  {paginatedItems.map((item) => (
                    <ItemMobileCard key={`mobile-${item.id}`} item={item} godowns={godowns} />
                  ))}
                </div>
                {/* Desktop Table View */}
                <Table containerClassName="hidden md:block flex-1 min-h-0 max-h-full" className="table-fixed w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead resizable className="w-[15.625rem] min-w-[11.25rem]">Item Name</TableHead>
                      <TableHead resizable className="w-[5.625rem] min-w-[4.375rem]">HSN Code</TableHead>
                      <TableHead resizable className="w-[3.125rem] min-w-[2.5rem]">Unit</TableHead>
                      <TableHead resizable className="w-[5rem] min-w-[4.375rem] text-right">Purchase</TableHead>
                      <TableHead resizable className="w-[5rem] min-w-[4.375rem] text-right">Sale</TableHead>
                      <TableHead resizable className="w-[4.375rem] min-w-[3.75rem] text-right">Stock</TableHead>
                      <TableHead resizable className="w-[5rem] min-w-[3.75rem]">Godown</TableHead>
                      <TableHead resizable className="w-[3.125rem] min-w-[2.5rem] text-right">GST</TableHead>
                      <TableHead resizable className="w-[3.75rem] min-w-[3.125rem]">Status</TableHead>
                      <TableHead className="w-[7.5rem] min-w-[6.25rem] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item) => (
                      <ItemDesktopRow key={item.id} item={item} godowns={godowns} />
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>

              <DataPagination
                currentPage={currentPage}
                totalPages={totalPages}
                startIndex={startIndex}
                endIndex={endIndex}
                totalItems={filteredItems.length}
                visiblePages={visiblePages}
                canGoNext={canGoNext}
                canGoPrevious={canGoPrevious}
                onPageChange={setCurrentPage}
                onNextPage={goToNextPage}
                onPreviousPage={goToPreviousPage}
                itemLabel="items"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}