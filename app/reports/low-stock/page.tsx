"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  AlertTriangle, 
  Filter,
  Loader2,
  Package,
  Bell,
  ShoppingCart
} from "lucide-react"
import Link from "next/link"
import { ReportActionBar } from "@/components/reports/report-action-bar"
import { exportToCSV as exportCSVUtil, downloadReportPDF } from "@/lib/export-utils"
import { type ReportColumn } from "@/components/reports/compact-report-pdf"

interface LowStockItem {
  id: string
  name: string
  sku: string
  currentStock: number
  reorderLevel: number
  optimalStock: number
  shortfall: number
  unit: string
  category: string
  lastPurchaseDate?: string
  supplier?: string
}

export default function LowStockPage() {
  const [items, setItems] = useState<LowStockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [severityFilter, setSeverityFilter] = useState("all")

  useEffect(() => {
    const fetchLowStockItems = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/items')
        if (!response.ok) throw new Error('Failed to fetch')
        
        const allItems = await response.json()
        
        const lowStockItems: LowStockItem[] = allItems
          .filter((item: Record<string, unknown>) => {
            const currentStock = Number(item.current_stock) || 0
            const reorderLevel = Number(item.min_stock) || 10
            return currentStock <= reorderLevel
          })
          .map((item: Record<string, unknown>) => ({
            id: item.id as string,
            name: (item.name as string) || "",
            sku: (item.item_code as string) || "-",
            currentStock: Number(item.current_stock) || 0,
            reorderLevel: Number(item.min_stock) || 10,
            optimalStock: Number(item.max_stock) || 50,
            shortfall: 0,
            unit: (item.unit as string) || "pcs",
            category: (item.category as string) || "Uncategorized",
            lastPurchaseDate: undefined,
            supplier: undefined,
          }))
          .map((item: LowStockItem) => ({
            ...item,
            shortfall: Math.max(0, item.optimalStock - item.currentStock)
          }))

        setItems(lowStockItems)
      } catch (error) {
        console.error('Failed to fetch low stock items:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLowStockItems()
  }, [])

  const getSeverity = (item: LowStockItem) => {
    const stockPercentage = (item.currentStock / item.reorderLevel) * 100
    if (item.currentStock === 0) return { level: 'critical', label: 'Out of Stock', color: 'bg-red-600 text-white' }
    if (stockPercentage <= 25) return { level: 'high', label: 'Critical', color: 'bg-red-500/10 text-red-700' }
    if (stockPercentage <= 50) return { level: 'medium', label: 'Low', color: 'bg-orange-500/10 text-orange-700' }
    return { level: 'low', label: 'Reorder Soon', color: 'bg-yellow-500/10 text-yellow-700' }
  }

  const categories = [...new Set(items.map(i => i.category))]

  const filteredItems = items.filter(item => {
    const searchMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const categoryMatch = categoryFilter === "all" || item.category === categoryFilter
    const severity = getSeverity(item)
    const severityMatch = severityFilter === "all" || severity.level === severityFilter
    return searchMatch && categoryMatch && severityMatch
  })

  const summary = {
    outOfStock: items.filter(i => i.currentStock === 0).length,
    critical: items.filter(i => i.currentStock > 0 && (i.currentStock / i.reorderLevel) <= 0.25).length,
    low: items.filter(i => {
      const pct = i.currentStock / i.reorderLevel
      return pct > 0.25 && pct <= 0.5
    }).length,
    reorderSoon: items.filter(i => {
      const pct = i.currentStock / i.reorderLevel
      return pct > 0.5 && pct <= 1
    }).length
  }

  const totalShortfall = filteredItems.reduce((sum, i) => sum + i.shortfall, 0)

  const lowStockPdfColumns: ReportColumn[] = [
    { key: "name", header: "Item Name", width: "30%", bold: true },
    { key: "supplier", header: "Supplier Name", width: "22%" },
    { key: "currentStock", header: "Current Stock", width: "16%", align: "right" },
    { key: "minStock", header: "Min Stock", width: "16%", align: "right" },
    { key: "deficit", header: "Deficit", width: "16%", align: "right" },
  ]

  const handleExportPDF = async () => {
    const data = filteredItems.map((i) => ({
      name: i.name,
      supplier: i.supplier || "-",
      currentStock: i.currentStock,
      minStock: i.reorderLevel,
      deficit: i.shortfall,
    }))
    const { CompactReportPDF } = await import("@/components/reports/compact-report-pdf")
    const React = await import("react")
    await downloadReportPDF(
      React.createElement(CompactReportPDF, {
        title: "Low Stock Alert",
        subtitle: `${filteredItems.length} items below reorder level | Total shortfall: ${totalShortfall} units`,
        dateRange: `As of ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`,
        columns: lowStockPdfColumns,
        data,
      }),
      `low-stock-${new Date().toISOString().split("T")[0]}.pdf`,
    )
  }

  const handleExportCSV = () => {
    const csvColumns = [
      { key: "name", header: "Item Name" },
      { key: "sku", header: "SKU" },
      { key: "category", header: "Category" },
      { key: "currentStock", header: "Current Stock" },
      { key: "reorderLevel", header: "Reorder Level" },
      { key: "shortfall", header: "Shortfall" },
      { key: "unit", header: "Unit" },
      { key: "supplier", header: "Supplier" },
    ] as const
    exportCSVUtil(
      filteredItems as unknown as Record<string, unknown>[],
      `low-stock-${new Date().toISOString().split("T")[0]}.csv`,
      csvColumns,
      { titleRows: ["Low Stock Report"] },
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              Low Stock Alert
            </h1>
            <p className="text-sm text-muted-foreground">Items below reorder level</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ReportActionBar
            onExportPDF={handleExportPDF}
            onExportCSV={handleExportCSV}
            disabled={filteredItems.length === 0}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="border-red-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{summary.outOfStock}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-600/10">
                <Package className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-400/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-500">{summary.critical}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10">
                <Bell className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">{summary.low}</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Reorder Soon</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.reorderSoon}</p>
              </div>
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <ShoppingCart className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Shortfall</p>
                <p className="text-2xl font-bold text-purple-600">{totalShortfall.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">units needed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search item name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="critical">Out of Stock</SelectItem>
                  <SelectItem value="high">Critical</SelectItem>
                  <SelectItem value="medium">Low</SelectItem>
                  <SelectItem value="low">Reorder Soon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">Reorder Level</TableHead>
                    <TableHead className="text-right">Optimal</TableHead>
                    <TableHead className="text-right">Shortfall</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex flex-col items-center text-muted-foreground">
                          <Package className="h-10 w-10 mb-2 opacity-50" />
                          <p>No low stock items found</p>
                          <p className="text-sm">All items are above reorder level</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => {
                      const severity = getSeverity(item)
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell className={`text-right font-bold ${item.currentStock === 0 ? 'text-red-600' : ''}`}>
                            {item.currentStock} {item.unit}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {item.reorderLevel} {item.unit}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {item.optimalStock} {item.unit}
                          </TableCell>
                          <TableCell className="text-right text-orange-600 font-medium">
                            {item.shortfall} {item.unit}
                          </TableCell>
                          <TableCell>
                            <Badge className={severity.color}>
                              {severity.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link href={`/purchases/new?itemId=${item.id}`}>
                              <Button variant="outline" size="sm" className="h-7 text-xs">
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Reorder
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
