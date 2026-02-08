"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  TrendingDown,
  TrendingUp,
  Warehouse as WarehouseIcon,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FileDown,
  Loader2,
} from "lucide-react"
import { format } from "date-fns"
import { pdf } from "@react-pdf/renderer"
import { ReportFilter, getDefaultFilters, type ReportFilters } from "@/components/reports/report-filter"
import { CompactReportPDF, type ReportColumn, type ReportGroup } from "@/components/reports/compact-report-pdf"

interface StockItem {
  id: string
  item_code: string
  name: string
  category: string
  brand?: string
  unit: string
  packaging_unit?: string
  per_carton_quantity?: number
  purchase_price: number
  min_stock: number
  current_stock: number
  calculated_stock: number
  stock_value: number
  stock_status_flag: "low" | "normal" | "high"
  locations: Array<{
    warehouseId: string
    warehouseName: string
    quantity: number
    location?: string
  }>
}

interface StockReportSummary {
  totalItems: number
  totalStockValue: number
  lowStockItems: number
  overstockItems: number
}

interface WarehouseData {
  id: string
  name: string
  code: string
}

export default function StockReportComponent() {
  const [loading, setLoading] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [stockData, setStockData] = useState<StockItem[]>([])
  const [summary, setSummary] = useState<StockReportSummary>({
    totalItems: 0,
    totalStockValue: 0,
    lowStockItems: 0,
    overstockItems: 0,
  })
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [showItemCode, setShowItemCode] = useState(false)
  const [includeZeroStock, setIncludeZeroStock] = useState(false)
  const [filters, setFilters] = useState<ReportFilters>(() =>
    getDefaultFilters({ dateFrom: format(new Date(), "yyyy-MM-dd"), dateTo: format(new Date(), "yyyy-MM-dd") })
  )

  useEffect(() => {
    loadWarehouses()
    loadMetadata()
    fetchStockReport()
  }, [])

  const loadWarehouses = async () => {
    try {
      const response = await fetch("/api/warehouses")
      if (response.ok) {
        const data = await response.json()
        setWarehouses(data)
      }
    } catch (error) {
      console.error("Failed to load warehouses:", error)
    }
  }

  const loadMetadata = async () => {
    try {
      const catResponse = await fetch("/api/items/categories")
      if (catResponse.ok) setAvailableCategories(await catResponse.json())
    } catch (error) {
      console.error("Failed to load metadata:", error)
    }
  }

  const fetchStockReport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        includeZeroStock: includeZeroStock.toString(),
        asOfDate: filters.dateFrom,
        stockStatus: filters.stockStatus,
        searchTerm: filters.search,
      })

      if (filters.warehouseIds.length > 0) {
        params.append("warehouseIds", filters.warehouseIds.join(","))
      }
      if (filters.categories.length > 0) {
        params.append("categories", filters.categories.join(","))
      }

      const response = await fetch(`/api/reports/stock?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch stock report")

      const result = await response.json()
      setStockData(result.data)
      setSummary(result.summary)
    } catch (error) {
      console.error("Failed to fetch stock report:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleRowExpansion = (itemId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const formatQuantity = (item: StockItem) => {
    const cartonQty = item.calculated_stock
    const packagingUnit = (item.packaging_unit || "CTN").toUpperCase()
    const perCarton = item.per_carton_quantity || 0
    const innerUnit = (item.unit || "PKT").toLowerCase()

    if (perCarton <= 1) return `${cartonQty} ${packagingUnit}`
    return `${cartonQty} ${packagingUnit} (${cartonQty} ctn × ${perCarton} ${innerUnit})`
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(value)

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case "low":
        return <Badge variant="destructive" className="gap-1"><TrendingDown className="h-3 w-3" /> Low</Badge>
      case "high":
        return <Badge variant="default" className="gap-1"><TrendingUp className="h-3 w-3" /> Over</Badge>
      default:
        return <Badge variant="secondary">In Stock</Badge>
    }
  }

  const filterFields = useMemo(() => [
    { type: "search" as const, key: "search" as const, label: "Search", placeholder: "Item name or code..." },
    {
      type: "multi-select" as const,
      key: "warehouseIds" as const,
      label: "Warehouse",
      placeholder: "All Warehouses",
      options: warehouses.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` })),
    },
    {
      type: "multi-select" as const,
      key: "categories" as const,
      label: "Category",
      placeholder: "All Categories",
      options: availableCategories.map((c) => ({ value: c, label: c })),
    },
    {
      type: "select" as const,
      key: "stockStatus" as const,
      label: "Stock Status",
      options: [
        { value: "all", label: "All Items" },
        { value: "low", label: "Low Stock Only" },
        { value: "high", label: "Overstock Only" },
      ],
    },
  ], [warehouses, availableCategories])

  const pdfColumns: ReportColumn[] = useMemo(() => [
    { key: "name", header: "Item Name", width: "30%", bold: true },
    { key: "category", header: "Category", width: "14%" },
    { key: "quantity", header: "Qty", width: "18%", align: "right" },
    { key: "stock_value", header: "Value", width: "16%", align: "right" },
    { key: "purchase_price", header: "Rate", width: "12%", align: "right" },
    { key: "status", header: "Status", width: "10%", align: "center" },
  ], [])

  const pdfGroups: ReportGroup[] = useMemo(() => {
    const categoryMap = new Map<string, StockItem[]>()
    for (const item of stockData) {
      const cat = item.category || "Uncategorized"
      const list = categoryMap.get(cat) || []
      list.push(item)
      categoryMap.set(cat, list)
    }

    return Array.from(categoryMap.entries()).map(([label, items]) => ({
      label: `${label} (${items.length} items)`,
      rows: items.map((item) => ({
        name: item.name,
        category: item.category || "-",
        quantity: formatQuantity(item),
        stock_value: item.stock_value,
        purchase_price: item.purchase_price,
        status: item.stock_status_flag.toUpperCase(),
        calculated_stock: item.calculated_stock,
      })),
      subtotals: {
        name: `${label} Total`,
        category: "",
        quantity: `${items.reduce((s, i) => s + i.calculated_stock, 0)} CTN`,
        stock_value: items.reduce((s, i) => s + i.stock_value, 0),
        purchase_price: "",
        status: "",
      },
    }))
  }, [stockData])

  const pdfTotals = useMemo(() => ({
    name: "Grand Total",
    category: "",
    quantity: `${stockData.reduce((s, i) => s + i.calculated_stock, 0)} CTN`,
    stock_value: summary.totalStockValue,
    purchase_price: "",
    status: `${summary.totalItems} items`,
  }), [stockData, summary])

  const handleDownloadPDF = async () => {
    setPdfGenerating(true)
    try {
      const blob = await pdf(
        <CompactReportPDF
          title="Stock Summary Report"
          subtitle={`As of ${format(new Date(filters.dateFrom), "dd MMM yyyy")} | ${summary.totalItems} items`}
          columns={pdfColumns}
          data={[]}
          groups={pdfGroups}
          totals={pdfTotals}
          highlightRow={(row) => {
            const status = String(row.status).toLowerCase()
            if (status === "low") return "red"
            if ((row.calculated_stock as number) < 0) return "red"
            return null
          }}
        />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `stock-report-${format(new Date(), "yyyy-MM-dd")}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("PDF generation failed:", error)
    } finally {
      setPdfGenerating(false)
    }
  }

  const exportToCSV = () => {
    const headers = ["Item Code", "Item Name", "Category", "Packaging Unit", "Inner Unit", "Per CTN Qty", "Stock Quantity", "Stock Value", "Status"]
    const rows = stockData.map((item) => [
      item.item_code || "",
      item.name,
      item.category || "",
      item.packaging_unit || "CTN",
      item.unit,
      (item.per_carton_quantity ?? "").toString(),
      formatQuantity(item),
      item.stock_value.toString(),
      item.stock_status_flag,
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `stock-report-${format(new Date(), "yyyy-MM-dd")}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={includeZeroStock} onCheckedChange={(v) => setIncludeZeroStock(v === true)} />
            Include zero stock
          </Label>
          <Label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={showItemCode} onCheckedChange={(v) => setShowItemCode(v === true)} />
            Show item code
          </Label>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownloadPDF} variant="outline" size="sm" disabled={pdfGenerating || stockData.length === 0}>
            {pdfGenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
            PDF
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm" disabled={stockData.length === 0}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>
      </div>

      <ReportFilter
        fields={filterFields}
        filters={filters}
        onFiltersChange={setFilters}
        onApply={fetchStockReport}
        loading={loading}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              {includeZeroStock ? "Including zero stock" : "With stock only"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalStockValue)}</div>
            <p className="text-xs text-muted-foreground">At purchase price</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Below minimum threshold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overstock Items</CardTitle>
            <WarehouseIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.overstockItems}</div>
            <p className="text-xs text-muted-foreground">Above maximum threshold</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Stock Details</CardTitle>
          <CardDescription>{stockData.length} items found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[2.5rem]" />
                  {showItemCode && <TableHead>Code</TableHead>}
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={showItemCode ? 7 : 6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : stockData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showItemCode ? 7 : 6} className="text-center py-8 text-muted-foreground">
                      No items found with the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  stockData.map((item) => (
                    <React.Fragment key={item.id}>
                      <TableRow
                        className={`cursor-pointer hover:bg-muted/50 ${item.calculated_stock < 0 ? "bg-red-50 dark:bg-red-950/20" : ""}`}
                        onClick={() => toggleRowExpansion(item.id)}
                      >
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            {expandedRows.has(item.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        {showItemCode && <TableCell className="font-mono text-sm">{item.item_code || "-"}</TableCell>}
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category || "-"}</TableCell>
                        <TableCell className={`text-right font-mono ${item.calculated_stock < 0 ? "text-red-600 font-bold" : ""}`}>
                          {formatQuantity(item)}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.stock_value)}</TableCell>
                        <TableCell className="text-center">{getStockStatusBadge(item.stock_status_flag)}</TableCell>
                      </TableRow>

                      {expandedRows.has(item.id) && item.locations.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={showItemCode ? 7 : 6} className="bg-muted/30">
                            <div className="py-3 px-4">
                              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                <WarehouseIcon className="h-4 w-4" />
                                Warehouse Breakdown
                              </h4>
                              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                                {item.locations.map((loc, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                                    <div>
                                      <p className="font-medium text-sm">{loc.warehouseName}</p>
                                      {loc.location && <p className="text-xs text-muted-foreground">Location: {loc.location}</p>}
                                    </div>
                                    <Badge variant="outline" className="font-mono">
                                      {loc.quantity} {(item.packaging_unit || "CTN").toUpperCase()}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
