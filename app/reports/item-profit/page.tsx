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
  Download, 
  Printer, 
  IndianRupee, 
  Filter,
  Loader2,
  TrendingUp,
  TrendingDown,
  Package
} from "lucide-react"
import Link from "next/link"
import { format, startOfMonth, endOfMonth } from "date-fns"

interface ItemProfit {
  id: string
  name: string
  sku: string
  category: string
  unitsSold: number
  totalRevenue: number
  totalCost: number
  grossProfit: number
  profitMargin: number
  avgSellingPrice: number
  avgCostPrice: number
}

export default function ItemProfitPage() {
  const [itemProfits, setItemProfits] = useState<ItemProfit[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<string>("profit")
  const [categoryFilter, setCategoryFilter] = useState("all")

  useEffect(() => {
    fetchItemProfits()
  }, [dateFrom, dateTo])

  const fetchItemProfits = async () => {
    setLoading(true)
    try {
      // Fetch invoices to calculate item-wise profits
      const response = await fetch('/api/invoices')
      if (!response.ok) throw new Error('Failed to fetch')
      
      const invoices = await response.json()
      
      // Group by item and calculate profits
      const itemMap = new Map<string, ItemProfit>()
      
      invoices.forEach((inv: any) => {
        const invDate = new Date(inv.invoiceDate)
        const fromDate = new Date(dateFrom)
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        
        if (invDate < fromDate || invDate > toDate) return
        
        inv.items?.forEach((item: any) => {
          const existing = itemMap.get(item.itemId) || {
            id: item.itemId,
            name: item.name || item.itemName,
            sku: item.sku || '-',
            category: item.category || 'Uncategorized',
            unitsSold: 0,
            totalRevenue: 0,
            totalCost: 0,
            grossProfit: 0,
            profitMargin: 0,
            avgSellingPrice: 0,
            avgCostPrice: 0
          }
          
          const qty = item.quantity || 0
          const sellingPrice = item.price || 0
          const costPrice = item.purchasePrice || item.costPrice || (sellingPrice * 0.7) // Estimate if not available
          
          existing.unitsSold += qty
          existing.totalRevenue += qty * sellingPrice
          existing.totalCost += qty * costPrice
          
          itemMap.set(item.itemId, existing)
        })
      })
      
      // Calculate profit and averages for each item
      const profits = Array.from(itemMap.values()).map(p => ({
        ...p,
        grossProfit: p.totalRevenue - p.totalCost,
        profitMargin: p.totalRevenue > 0 ? ((p.totalRevenue - p.totalCost) / p.totalRevenue) * 100 : 0,
        avgSellingPrice: p.unitsSold > 0 ? p.totalRevenue / p.unitsSold : 0,
        avgCostPrice: p.unitsSold > 0 ? p.totalCost / p.unitsSold : 0
      }))
      
      setItemProfits(profits)
    } catch (error) {
      console.error('Failed to fetch item profits:', error)
    } finally {
      setLoading(false)
    }
  }

  const categories = [...new Set(itemProfits.map(i => i.category))]

  const filteredProfits = itemProfits
    .filter(item => {
      const searchMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase())
      const categoryMatch = categoryFilter === "all" || item.category === categoryFilter
      return searchMatch && categoryMatch
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "profit": return b.grossProfit - a.grossProfit
        case "revenue": return b.totalRevenue - a.totalRevenue
        case "margin": return b.profitMargin - a.profitMargin
        case "units": return b.unitsSold - a.unitsSold
        default: return 0
      }
    })

  const totals = filteredProfits.reduce((acc, p) => ({
    units: acc.units + p.unitsSold,
    revenue: acc.revenue + p.totalRevenue,
    cost: acc.cost + p.totalCost,
    profit: acc.profit + p.grossProfit
  }), { units: 0, revenue: 0, cost: 0, profit: 0 })

  const avgMargin = totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100) : 0

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(value)
  }

  const exportToCSV = () => {
    const headers = ['Item Name', 'SKU', 'Category', 'Units Sold', 'Revenue', 'Cost', 'Profit', 'Margin %']
    const rows = filteredProfits.map(p => [
      p.name,
      p.sku,
      p.category,
      p.unitsSold.toString(),
      p.totalRevenue.toFixed(2),
      p.totalCost.toFixed(2),
      p.grossProfit.toFixed(2),
      p.profitMargin.toFixed(1) + '%'
    ])

    const csvContent = [
      `Item-wise Profit Report`,
      `Period: ${dateFrom} to ${dateTo}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `item-profit-${dateFrom}-to-${dateTo}.csv`
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
              <Package className="h-6 w-6 text-green-600" />
              Item-wise Profit & Loss
            </h1>
            <p className="text-sm text-muted-foreground">Margin analysis per product</p>
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
          <div className="grid gap-4 sm:grid-cols-5">
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
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profit">Highest Profit</SelectItem>
                  <SelectItem value="revenue">Highest Revenue</SelectItem>
                  <SelectItem value="margin">Best Margin</SelectItem>
                  <SelectItem value="units">Most Units</SelectItem>
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
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Units Sold</p>
                <p className="text-2xl font-bold">{totals.units.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.revenue)}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold text-muted-foreground">{formatCurrency(totals.cost)}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Gross Profit</p>
                <p className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totals.profit)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <IndianRupee className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div>
              <p className="text-xs text-muted-foreground">Avg. Margin</p>
              <p className="text-2xl font-bold">{avgMargin.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">{filteredProfits.length} items</p>
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
                    <TableHead>#</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No sales data found for the selected period
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProfits.map((p, index) => (
                      <TableRow key={p.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                        <TableCell>{p.category}</TableCell>
                        <TableCell className="text-right">{p.unitsSold}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.totalRevenue)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(p.totalCost)}</TableCell>
                        <TableCell className={`text-right font-medium ${p.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(p.grossProfit)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant="secondary" 
                            className={
                              p.profitMargin >= 30 
                                ? "bg-green-500/10 text-green-700"
                                : p.profitMargin >= 15
                                  ? "bg-yellow-500/10 text-yellow-700"
                                  : p.profitMargin > 0
                                    ? "bg-orange-500/10 text-orange-700"
                                    : "bg-red-500/10 text-red-700"
                            }
                          >
                            {p.profitMargin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
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
