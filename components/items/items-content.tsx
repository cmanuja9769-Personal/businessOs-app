"use client"

import { useState, useMemo } from "react"
import type { IItem } from "@/types"
import { ItemForm } from "@/components/items/item-form"
import { ItemUploadBtn } from "@/components/items/item-upload-btn"
import { ItemBulkExportBtn } from "@/components/items/item-bulk-export-btn"
import { AddStockDialog } from "@/components/items/add-stock-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Edit, Package, Barcode, ChevronLeft, ChevronRight, AlertTriangle, Plus } from "lucide-react"
import { DeleteItemButton } from "@/components/items/delete-item-button"
import Link from "next/link"
import { ItemsFilters } from "@/components/items/items-filters"

type ItemsContentProps = {
  items: IItem[]
  godowns: Array<{ id: string; name: string }>
  initialFilters: {
    q: string
    unit: string
    category: string
    godown: string
    stock: string
    sort: string
    dir: string
  }
}

export function ItemsContent({ items, godowns, initialFilters }: ItemsContentProps) {
  const [filters, setFilters] = useState(initialFilters)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  const unitOptions = useMemo(
    () => Array.from(new Set(items.map((i) => (i.unit || "").toUpperCase()).filter(Boolean))).sort(),
    [items]
  )

  const categoryOptions = useMemo(
    () => Array.from(new Set(items.map((i) => i.category || "").filter(Boolean))).sort(),
    [items]
  )

  const filteredItems = useMemo(() => {
    const { q, unit, category, godown, stock, sort, dir } = filters
    return items
      .filter((item) => {
        if (q) {
          // Split search query into keywords and check if ALL keywords are present
          const keywords = q.toLowerCase().split(/\s+/).filter(Boolean)
          const itemNameLower = item.name.toLowerCase()
          const itemCodeLower = (item.itemCode || "").toLowerCase()
          const hsnCodeLower = (item.hsnCode || "").toLowerCase()
          const categoryLower = (item.category || "").toLowerCase()
          // Check if every keyword is found in item name, item code, HSN code, or category
          const matches = keywords.every(keyword => 
            itemNameLower.includes(keyword) || 
            itemCodeLower.includes(keyword) || 
            hsnCodeLower.includes(keyword) ||
            categoryLower.includes(keyword)
          )
          if (!matches) {
            return false
          }
        }
        if (unit && unit !== "all" && item.unit !== unit) return false
        if (category && category !== "all" && item.category !== category) return false
        return true
      })
      .filter((item) => {
        if (!godown) return true
        return (item.godownId || "") === godown
      })
      .filter((item) => {
        if (!stock || stock === "all") return true
        const stockStatus =
          item.stock <= item.minStock ? "low" : item.stock >= item.maxStock ? "high" : "normal"
        return stockStatus === stock
      })
      .sort((a, b) => {
        const m = dir === "asc" ? 1 : -1
        if (sort === "name") return m * a.name.localeCompare(b.name)
        if (sort === "godown") return m * (a.godownName || "").localeCompare(b.godownName || "")
        if (sort === "stock") return m * (a.stock - b.stock)
        if (sort === "saleprice") return m * (a.salePrice - b.salePrice)
        if (sort === "purchaseprice") return m * (a.purchasePrice - b.purchasePrice)
        return m * (a.updatedAt.getTime() - b.updatedAt.getTime())
      })
  }, [items, filters])

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [filters])

  // Calculate pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = filteredItems.slice(startIndex, endIndex)

  const handleFiltersChange = (newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Items & Inventory</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage your product catalog and stock levels
          </p>
        </div>
        <div className="flex flex-row gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
          <ItemBulkExportBtn items={items} godownNames={godowns.map((g) => g.name)} />
          <ItemUploadBtn godowns={godowns} />
          <ItemForm godowns={godowns} />
        </div>
      </div>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 sm:pb-4 shrink-0">
          <div className="flex flex-col gap-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Package className="w-5 h-5" />
              <span className="hidden sm:inline">All Items</span>
              <span className="sm:hidden">Items</span>
              <span className="text-muted-foreground">({filteredItems.length})</span>
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
        <CardContent className="flex-1 min-h-0 flex flex-col overflow-hidden p-0 sm:px-6 sm:pb-6">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No items found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting filters or add a new item</p>
              <ItemForm godowns={godowns} />
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <TooltipProvider delayDuration={300}>
              <Table containerClassName="flex-1 min-h-0 max-h-full" className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead resizable className="w-[250px] min-w-[180px]">Item Name</TableHead>
                    <TableHead resizable className="w-[90px] min-w-[70px]">HSN Code</TableHead>
                    <TableHead resizable className="w-[50px] min-w-[40px]">Unit</TableHead>
                    <TableHead resizable className="w-[80px] min-w-[70px] text-right">Purchase</TableHead>
                    <TableHead resizable className="w-[80px] min-w-[70px] text-right">Sale</TableHead>
                    <TableHead resizable className="w-[70px] min-w-[60px] text-right">Stock</TableHead>
                    <TableHead resizable className="w-[80px] min-w-[60px]">Godown</TableHead>
                    <TableHead resizable className="w-[50px] min-w-[40px] text-right">GST</TableHead>
                    <TableHead resizable className="w-[60px] min-w-[50px]">Status</TableHead>
                    <TableHead className="w-[120px] min-w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item, index) => {
                    const stockStatus =
                      item.stock <= item.minStock
                        ? "low"
                        : item.stock >= item.maxStock
                        ? "high"
                        : "normal"
                    return (
                      <TableRow key={`${item.id}-${index}`}>
                        <TableCell className="max-w-[180px] p-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="truncate">
                                <Link 
                                  href={`/items/${item.id}`}
                                  className="hover:text-primary hover:underline transition-colors font-medium"
                                >
                                  {item.name}
                                </Link>
                                {item.packagingUnit && item.perCartonQuantity && item.perCartonQuantity > 1 && (
                                  <span className="text-xs text-muted-foreground block truncate">
                                    1 {item.packagingUnit} = {item.perCartonQuantity} {item.unit}
                                  </span>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="font-medium">{item.name}</p>
                              {item.itemCode && <p className="text-xs text-muted-foreground">Code: {item.itemCode}</p>}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="max-w-[90px] p-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="font-mono text-xs truncate block">{item.hsnCode || "-"}</span>
                            </TooltipTrigger>
                            {item.hsnCode && (
                              <TooltipContent side="top">
                                <p>HSN: {item.hsnCode}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TableCell>
                        <TableCell className="max-w-[60px] p-2">
                          <Badge variant="outline" className="text-xs">
                            {item.unit}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm max-w-[100px] p-2">
                          ₹{item.purchasePrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-semibold text-right text-xs sm:text-sm max-w-[90px] p-2">
                          ₹{item.salePrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right max-w-[80px] p-2">
                          <div className="flex flex-col items-end">
                            <div className="flex items-center justify-end gap-1">
                              <span className="font-medium text-xs sm:text-sm truncate">
                                {item.stock} {item.packagingUnit || "CTN"}
                              </span>
                              {stockStatus === "low" && (
                                <AlertTriangle className="w-3 h-3 text-orange-500 flex-shrink-0" />
                              )}
                            </div>
                            {item.perCartonQuantity && item.perCartonQuantity > 1 && (
                              <span className="text-[10px] text-muted-foreground truncate">
                                = {(item.stock * item.perCartonQuantity).toLocaleString()} {item.unit}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[80px] p-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs truncate block">{item.godownName || "-"}</span>
                            </TooltipTrigger>
                            {item.godownName && (
                              <TooltipContent side="top">
                                <p>Godown: {item.godownName}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm max-w-[60px] p-2">
                          {item.gstRate}%
                        </TableCell>
                        <TableCell className="max-w-[80px] p-2">
                          {stockStatus === "low" ? (
                            <Badge variant="destructive" className="bg-orange-500 text-background text-[10px] px-1.5 py-0.5">
                              Low
                            </Badge>
                          ) : stockStatus === "high" ? (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                              Over
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] px-1.5 py-0.5"
                            >
                              OK
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right max-w-[130px] p-2">
                          <div className="flex items-center justify-end gap-0.5">
                            <AddStockDialog
                              item={item}
                              godowns={godowns}
                              trigger={
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50" title="Add Stock">
                                  <Plus className="w-3.5 h-3.5" />
                                </Button>
                              }
                            />
                            <Link href={`/items/barcode/${item.id}`}>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Print Barcode">
                                <Barcode className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                            <ItemForm
                              item={item}
                              godowns={godowns}
                              trigger={
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit Item">
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                              }
                            />
                            <DeleteItemButton itemId={item.id} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              </TooltipProvider>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t px-4 shrink-0">
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold">{startIndex + 1}</span> to{" "}
                    <span className="font-semibold">{Math.min(endIndex, filteredItems.length)}</span> of{" "}
                    <span className="font-semibold">{filteredItems.length}</span> items
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1 flex-wrap justify-center">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((page) => {
                          if (page <= 3 || page > totalPages - 3) return true
                          if (Math.abs(page - currentPage) <= 1) return true
                          return false
                        })
                        .map((page, idx, arr) => (
                          <div key={page} className="flex items-center gap-1">
                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                              <span className="text-muted-foreground">...</span>
                            )}
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="min-w-10"
                            >
                              {page}
                            </Button>
                          </div>
                        ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="gap-2"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}