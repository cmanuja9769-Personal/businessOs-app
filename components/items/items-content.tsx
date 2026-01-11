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
          const hsnCodeLower = (item.hsnCode || "").toLowerCase()
          // Check if every keyword is found in either item name or HSN code
          if (!keywords.every(keyword => itemNameLower.includes(keyword) || hsnCodeLower.includes(keyword))) {
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
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Items & Inventory</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage your product catalog and stock levels
          </p>
        </div>
        <div className="flex flex-col xs:flex-row gap-3 w-full sm:w-auto flex-wrap">
          <ItemBulkExportBtn items={items} godownNames={godowns.map((g) => g.name)} />
          <ItemUploadBtn godowns={godowns} />
          <ItemForm godowns={godowns} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 sm:pb-4">
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
        <CardContent className="overflow-x-auto">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No items found</h3>
              <p className="text-muted-foreground mb-4">Try adjusting filters or add a new item</p>
              <ItemForm godowns={godowns} />
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Item Name</TableHead>
                    <TableHead className="min-w-[80px]">HSN Code</TableHead>
                    <TableHead className="min-w-[60px]">Unit</TableHead>
                    <TableHead className="min-w-[90px] text-right">Purchase Price</TableHead>
                    <TableHead className="min-w-[80px] text-right">Sale Price</TableHead>
                    <TableHead className="min-w-[60px] text-right">Stock</TableHead>
                    <TableHead className="min-w-[80px]">Godown</TableHead>
                    <TableHead className="min-w-[70px] text-right">GST Rate</TableHead>
                    <TableHead className="min-w-[80px]">Status</TableHead>
                    <TableHead className="min-w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item) => {
                    const stockStatus =
                      item.stock <= item.minStock
                        ? "low"
                        : item.stock >= item.maxStock
                        ? "high"
                        : "normal"
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium truncate" title={item.name}>
                          <Link 
                            href={`/items/${item.id}`}
                            className="hover:text-primary hover:underline transition-colors"
                          >
                            {item.name}
                          </Link>
                          {item.packagingUnit && item.perCartonQuantity && item.perCartonQuantity > 1 && (
                            <span className="text-xs text-muted-foreground block">
                              1 {item.packagingUnit} = {item.perCartonQuantity} {item.unit}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs" title={item.hsnCode || ""}>
                          {item.hsnCode || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {item.unit}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm" title={`₹${item.purchasePrice.toFixed(2)}`}>
                          ₹{item.purchasePrice.toFixed(2)}
                        </TableCell>
                        <TableCell
                          className="font-semibold text-right text-xs sm:text-sm"
                          title={`₹${item.salePrice.toFixed(2)}`}
                        >
                          ₹{item.salePrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <div className="flex items-center justify-end gap-1">
                              <span className="font-medium text-xs sm:text-sm" title={`Stock: ${item.stock} ${item.packagingUnit || "CTN"}`}>
                                {item.stock} {item.packagingUnit || "CTN"}
                              </span>
                              {stockStatus === "low" && (
                                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 flex-shrink-0" />
                              )}
                            </div>
                            {item.perCartonQuantity && item.perCartonQuantity > 1 && (
                              <span className="text-[10px] text-muted-foreground">
                                = {(item.stock * item.perCartonQuantity).toLocaleString()} {item.unit}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs" title={item.godownName || "No Godown"}>
                          {item.godownName || "-"}
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm" title={`${item.gstRate}%`}>
                          {item.gstRate}%
                        </TableCell>
                        <TableCell>
                          {stockStatus === "low" ? (
                            <Badge variant="destructive" className="bg-orange-500 text-background text-xs">
                              Low Stock
                            </Badge>
                          ) : stockStatus === "high" ? (
                            <Badge variant="secondary" className="text-xs">
                              Overstock
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-green-500/10 text-green-700 dark:text-green-400 text-xs"
                            >
                              In Stock
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <AddStockDialog
                              item={item}
                              godowns={godowns}
                              trigger={
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" title="Add Stock">
                                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                                </Button>
                              }
                            />
                            <Link href={`/items/barcode/${item.id}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Print Barcode">
                                <Barcode className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                            </Link>
                            <ItemForm
                              item={item}
                              godowns={godowns}
                              trigger={
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit Item">
                                  <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
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