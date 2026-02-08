"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  Package, 
  Filter,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  Layers
} from "lucide-react"
import Link from "next/link"
import { format, startOfMonth, endOfMonth } from "date-fns"

interface StockMovement {
  id: string
  itemId: string
  itemName: string
  sku: string
  openingQty: number
  inwardQty: number
  outwardQty: number
  closingQty: number
  unit: string
}

export default function StockDetailPage() {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [searchTerm, setSearchTerm] = useState("")
  const [warehouseFilter, setWarehouseFilter] = useState("all")

  const fetchStockMovements = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/items')
      if (!response.ok) throw new Error('Failed to fetch')

      const allItems = await response.json()
      if (!Array.isArray(allItems) || allItems.length === 0) {
        setMovements([])
        return
      }

      const ledgerRes = await fetch(
        `/api/reports/stock?dateFrom=${dateFrom}&dateTo=${dateTo}` +
        (warehouseFilter !== "all" ? `&warehouseIds=${warehouseFilter}` : "")
      )

      let ledgerMap: Record<string, { inward: number; outward: number }> = {}
      if (ledgerRes.ok) {
        const report = await ledgerRes.json()
        if (Array.isArray(report.data)) {
          for (const row of report.data) {
            ledgerMap[row.itemId] = {
              inward: row.totalIn ?? 0,
              outward: row.totalOut ?? 0,
            }
          }
        }
      }

      const rows: StockMovement[] = allItems.map((item: Record<string, unknown>) => {
        const currentStock = Number(item.current_stock) || 0
        const ledger = ledgerMap[item.id as string]
        const inward = ledger?.inward ?? 0
        const outward = ledger?.outward ?? 0
        const opening = currentStock - inward + outward

        return {
          id: item.id as string,
          itemId: item.id as string,
          itemName: (item.name as string) || "",
          sku: (item.item_code as string) || "-",
          openingQty: Math.max(opening, 0),
          inwardQty: inward,
          outwardQty: outward,
          closingQty: currentStock,
          unit: (item.unit as string) || "pcs",
        }
      })

      setMovements(rows)
    } catch (error) {
      console.error('Failed to fetch stock movements:', error)
      setMovements([])
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, warehouseFilter])

  useEffect(() => {
    void fetchStockMovements()
  }, [fetchStockMovements])

  const filteredMovements = movements.filter(m => {
    const searchMatch = m.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        m.sku.toLowerCase().includes(searchTerm.toLowerCase())
    return searchMatch
  })

  const totals = filteredMovements.reduce((acc, m) => ({
    opening: acc.opening + m.openingQty,
    inward: acc.inward + m.inwardQty,
    outward: acc.outward + m.outwardQty,
    closing: acc.closing + m.closingQty
  }), { opening: 0, inward: 0, outward: 0, closing: 0 })

  const exportToCSV = () => {
    const headers = ['Item Name', 'SKU', 'Unit', 'Opening', 'Inward', 'Outward', 'Closing']
    const rows = filteredMovements.map(m => [
      m.itemName,
      m.sku,
      m.unit,
      m.openingQty.toString(),
      m.inwardQty.toString(),
      m.outwardQty.toString(),
      m.closingQty.toString()
    ])

    const csvContent = [
      `Stock Detail Report`,
      `Period: ${dateFrom} to ${dateTo}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `stock-detail-${dateFrom}-to-${dateTo}.csv`
    link.click()
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
              <Layers className="h-6 w-6 text-blue-600" />
              Stock Detail Report
            </h1>
            <p className="text-sm text-muted-foreground">Opening + Inward - Outward = Closing</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => window.print()} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
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
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Opening Stock</p>
                <p className="text-2xl font-bold">{totals.opening.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">units</p>
              </div>
              <div className="p-2 rounded-lg bg-gray-500/10">
                <Package className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Inward</p>
                <p className="text-2xl font-bold text-green-600">+{totals.inward.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">units received</p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <ArrowDownLeft className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Outward</p>
                <p className="text-2xl font-bold text-red-600">-{totals.outward.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">units issued</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10">
                <ArrowUpRight className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Closing Stock</p>
                <p className="text-2xl font-bold">{totals.closing.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">units</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Layers className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right text-green-600">Inward (+)</TableHead>
                    <TableHead className="text-right text-red-600">Outward (-)</TableHead>
                    <TableHead className="text-right">Closing</TableHead>
                    <TableHead>Movement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No stock movements found
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {filteredMovements.map((m) => {
                        const netChange = m.inwardQty - m.outwardQty
                        return (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">{m.itemName}</TableCell>
                            <TableCell className="font-mono text-xs">{m.sku}</TableCell>
                            <TableCell>{m.unit}</TableCell>
                            <TableCell className="text-right">{m.openingQty}</TableCell>
                            <TableCell className="text-right text-green-600">+{m.inwardQty}</TableCell>
                            <TableCell className="text-right text-red-600">-{m.outwardQty}</TableCell>
                            <TableCell className="text-right font-bold">{m.closingQty}</TableCell>
                            <TableCell>
                              {netChange > 0 ? (
                                <Badge className="bg-green-500/10 text-green-700">
                                  <ArrowDownLeft className="h-3 w-3 mr-1" />
                                  +{netChange}
                                </Badge>
                              ) : netChange < 0 ? (
                                <Badge className="bg-red-500/10 text-red-700">
                                  <ArrowUpRight className="h-3 w-3 mr-1" />
                                  {netChange}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">No Change</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {/* Totals Row */}
                      <TableRow className="font-bold bg-muted/50">
                        <TableCell colSpan={3}>Totals</TableCell>
                        <TableCell className="text-right">{totals.opening}</TableCell>
                        <TableCell className="text-right text-green-600">+{totals.inward}</TableCell>
                        <TableCell className="text-right text-red-600">-{totals.outward}</TableCell>
                        <TableCell className="text-right">{totals.closing}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </>
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
