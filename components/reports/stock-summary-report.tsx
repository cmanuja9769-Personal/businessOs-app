'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  Filter, 
  Package, 
  TrendingDown, 
  TrendingUp, 
  Warehouse,
  Search,
  Calendar,
  ChevronDown,
  ChevronRight,
  Printer,
  FileSpreadsheet
} from 'lucide-react'
import { format } from 'date-fns'

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
  stock_status_flag: 'low' | 'normal' | 'surplus'
  locations: Array<{
    warehouseId: string
    warehouseName: string
    quantity: number
    location?: string
  }>
}

interface StockReportFilters {
  includeZeroStock: boolean
  asOfDate: string
  warehouseIds: string[]
  categories: string[]
  stockStatus: 'all' | 'low' | 'surplus'
  brand: string
  searchTerm: string
}

interface StockReportSummary {
  totalItems: number
  totalStockValue: number
  lowStockItems: number
  surplusStockItems: number
}

interface Warehouse {
  id: string
  name: string
  code: string
}

export default function StockReportComponent() {
  const [loading, setLoading] = useState(false)
  const [stockData, setStockData] = useState<StockItem[]>([])
  const [summary, setSummary] = useState<StockReportSummary>({
    totalItems: 0,
    totalStockValue: 0,
    lowStockItems: 0,
    surplusStockItems: 0
  })
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [availableBrands, setAvailableBrands] = useState<string[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [showItemCode, setShowItemCode] = useState(false)
  
  const [filters, setFilters] = useState<StockReportFilters>({
    includeZeroStock: false,
    asOfDate: format(new Date(), 'yyyy-MM-dd'),
    warehouseIds: [],
    categories: [],
    stockStatus: 'all',
    brand: '',
    searchTerm: ''
  })

  // Load initial data
  useEffect(() => {
    loadWarehouses()
    loadMetadata()
    fetchStockReport()
  }, [])

  const loadWarehouses = async () => {
    try {
      const response = await fetch('/api/warehouses')
      if (response.ok) {
        const data = await response.json()
        setWarehouses(data)
      }
    } catch (error) {
      console.error('Failed to load warehouses:', error)
    }
  }

  const loadMetadata = async () => {
    try {
      // Load categories
      const catResponse = await fetch('/api/items/categories')
      if (catResponse.ok) {
        const categories = await catResponse.json()
        setAvailableCategories(categories)
      }

      // Load brands
      const brandResponse = await fetch('/api/items/brands')
      if (brandResponse.ok) {
        const brands = await brandResponse.json()
        setAvailableBrands(brands)
      }
    } catch (error) {
      console.error('Failed to load metadata:', error)
    }
  }

  const fetchStockReport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        includeZeroStock: filters.includeZeroStock.toString(),
        asOfDate: filters.asOfDate,
        stockStatus: filters.stockStatus,
        searchTerm: filters.searchTerm
      })

      if (filters.warehouseIds.length > 0) {
        params.append('warehouseIds', filters.warehouseIds.join(','))
      }

      if (filters.categories.length > 0) {
        params.append('categories', filters.categories.join(','))
      }

      if (filters.brand) {
        params.append('brand', filters.brand)
      }

      const response = await fetch(`/api/reports/stock?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch stock report')
      }

      const result = await response.json()
      setStockData(result.data)
      setSummary(result.summary)
    } catch (error) {
      console.error('Failed to fetch stock report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof StockReportFilters, value: string | string[] | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    fetchStockReport()
  }

  const resetFilters = () => {
    setFilters({
      includeZeroStock: false,
      asOfDate: format(new Date(), 'yyyy-MM-dd'),
      warehouseIds: [],
      categories: [],
      stockStatus: 'all',
      brand: '',
      searchTerm: ''
    })
  }

  const toggleRowExpansion = (itemId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const formatQuantity = (item: StockItem) => {
    // IMPORTANT: In this app, stock is stored in cartons (CTN).
    // `unit` is the inside unit (PKT/BOX/PCS), and `per_carton_quantity` is how many inside units per 1 CTN.
    const cartonQty = item.calculated_stock
    const packagingUnit = (item.packaging_unit || 'CTN').toUpperCase()
    const perCarton = item.per_carton_quantity || 0
    const innerUnit = (item.unit || 'PKT').toLowerCase()

    // If we don't know the carton packing, just show carton quantity.
    if (perCarton <= 1) {
      return `${cartonQty} ${packagingUnit}`
    }

    // Examples:
    // - 1 CTN (1 ctn × 500 pkt)
    // - 10 CTN (10 ctn × 1000 pkt)
    return `${cartonQty} ${packagingUnit} (${cartonQty} ctn × ${perCarton} ${innerUnit})`
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value)
  }

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case 'low':
        return <Badge variant="destructive" className="gap-1"><TrendingDown className="h-3 w-3" /> Low Stock</Badge>
      case 'surplus':
        return <Badge variant="default" className="gap-1"><TrendingUp className="h-3 w-3" /> Surplus</Badge>
      default:
        return <Badge variant="secondary">Normal</Badge>
    }
  }

  const exportToExcel = () => {
    // Convert data to CSV
    const headers = ['Item Code', 'Item Name', 'Category', 'Packaging Unit', 'Inner Unit', 'Per CTN Qty', 'Stock Quantity', 'Stock Value', 'Status']
    const rows = stockData.map(item => [
      item.item_code || '',
      item.name,
      item.category || '',
      item.packaging_unit || 'CTN',
      item.unit,
      (item.per_carton_quantity ?? '').toString(),
      formatQuantity(item),
      item.stock_value.toString(),
      item.stock_status_flag
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `stock-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
  }

  const printReport = () => {
    window.print()
  }

  // Format date for display
  const formatDateDisplay = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy')
  }

  return (
    <div className="space-y-6 p-6 report-container">
      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block report-header">
        <h1>Stock Summary Report</h1>
        <div className="date-range">As of {formatDateDisplay(filters.asOfDate)}</div>
        <div className="text-sm mt-2">
          {filters.categories.length > 0 && `Categories: ${filters.categories.join(', ')} | `}
          {filters.stockStatus !== 'all' && `Status: ${filters.stockStatus} | `}
          {filters.includeZeroStock ? 'Including zero stock' : 'Excluding zero stock'}
        </div>
      </div>

      {/* Header with Summary Cards - Hidden on print */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Summary Report</h1>
          <p className="text-muted-foreground">
            Comprehensive inventory overview with real-time stock tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToExcel} variant="outline" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
          <Button onClick={printReport} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              {filters.includeZeroStock ? 'Including zero stock' : 'With stock only'}
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
            <p className="text-xs text-muted-foreground">
              At purchase price
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Below minimum threshold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Surplus Stock</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.surplusStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Above optimal levels
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <CardDescription>Refine your stock report with multiple filter options</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={resetFilters} variant="ghost" size="sm">
                Reset
              </Button>
              <Button onClick={applyFilters} size="sm" disabled={loading}>
                {loading ? 'Loading...' : 'Apply Filters'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Include Zero Stock Toggle */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Checkbox
                  checked={filters.includeZeroStock}
                  onCheckedChange={(checked) => handleFilterChange('includeZeroStock', checked)}
                />
                Include Zero Stock Items
              </Label>
              <p className="text-xs text-muted-foreground">
                Show all items even with 0 balance
              </p>
            </div>

            {/* Show Item Code Toggle */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Checkbox
                  checked={showItemCode}
                  onCheckedChange={(checked) => setShowItemCode(checked === true)}
                />
                Show Item Code
              </Label>
              <p className="text-xs text-muted-foreground">
                Display item code column
              </p>
            </div>

            {/* Date Filter */}
            <div className="space-y-2">
              <Label htmlFor="asOfDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                As of Date
              </Label>
              <Input
                id="asOfDate"
                type="date"
                value={filters.asOfDate}
                onChange={(e) => handleFilterChange('asOfDate', e.target.value)}
              />
            </div>

            {/* Stock Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="stockStatus">Stock Status</Label>
              <Select
                value={filters.stockStatus}
                onValueChange={(value) => handleFilterChange('stockStatus', value)}
              >
                <SelectTrigger id="stockStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="low">Low Stock Only</SelectItem>
                  <SelectItem value="surplus">Surplus Stock Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Term */}
            <div className="space-y-2">
              <Label htmlFor="searchTerm" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Item
              </Label>
              <Input
                id="searchTerm"
                placeholder="Name or code..."
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              />
            </div>

            {/* Warehouse Filter */}
            <div className="space-y-2">
              <Label htmlFor="warehouse">Warehouse/Godown</Label>
              <Select
                value={filters.warehouseIds[0] || 'all'}
                onValueChange={(value) => 
                  handleFilterChange('warehouseIds', value === 'all' ? [] : [value])
                }
              >
                <SelectTrigger id="warehouse">
                  <SelectValue placeholder="All Warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Warehouses</SelectItem>
                  {warehouses.map(wh => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={filters.categories[0] || 'all'}
                onValueChange={(value) => 
                  handleFilterChange('categories', value === 'all' ? [] : [value])
                }
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {availableCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Brand Filter */}
            <div className="space-y-2">
              <Label htmlFor="brand">Brand/Manufacturer</Label>
              <Select
                value={filters.brand || 'all'}
                onValueChange={(value) => 
                  handleFilterChange('brand', value === 'all' ? '' : value)
                }
              >
                <SelectTrigger id="brand">
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {availableBrands.map(brand => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Summary - Only visible when printing */}
      <div className="hidden print:block summary-cards">
        <div>
          <div className="stat-label">Total Items</div>
          <div className="stat-value">{summary.totalItems}</div>
        </div>
        <div>
          <div className="stat-label">Total Stock Value</div>
          <div className="stat-value">{formatCurrency(summary.totalStockValue)}</div>
        </div>
        <div>
          <div className="stat-label">Low Stock Items</div>
          <div className="stat-value">{summary.lowStockItems}</div>
        </div>
        <div>
          <div className="stat-label">Surplus Items</div>
          <div className="stat-value">{summary.surplusStockItems}</div>
        </div>
      </div>

      {/* Print Table - Clean table for printing */}
      <table className="hidden print:table print-table">
        <thead>
          <tr>
            <th>S.No</th>
            {showItemCode && <th>Item Code</th>}
            <th>Item Name</th>
            <th>Category</th>
            <th>Godown</th>
            <th style={{ textAlign: 'right' }}>Stock Quantity</th>
            <th style={{ textAlign: 'right' }}>Stock Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {stockData.map((item, index) => (
            <tr key={item.id}>
              <td>{index + 1}</td>
              {showItemCode && <td>{item.item_code || '-'}</td>}
              <td>{item.name}</td>
              <td>{item.category || '-'}</td>
              <td>
                {item.locations?.length
                  ? item.locations
                      .map((l) => `${l.warehouseName}: ${l.quantity} ${(item.packaging_unit || 'CTN').toUpperCase()}`)
                      .join(' | ')
                  : '-'}
              </td>
              <td style={{ textAlign: 'right' }}>{formatQuantity(item)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(item.stock_value)}</td>
              <td>{item.stock_status_flag.toUpperCase()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="totals-row">
            <td colSpan={showItemCode ? 5 : 4} style={{ textAlign: 'right', fontWeight: 'bold' }}>TOTAL:</td>
            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
              {stockData.reduce((sum, item) => sum + item.calculated_stock, 0)} CTN
            </td>
            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
              {formatCurrency(summary.totalStockValue)}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      {/* Print Footer */}
      <div className="hidden print:block report-footer">
        <p>Generated on {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
      </div>

      {/* Stock Table - Screen only */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Stock Details</CardTitle>
          <CardDescription>
            {stockData.length} items found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  {showItemCode && <TableHead>Item Code</TableHead>}
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock Quantity</TableHead>
                  <TableHead className="text-right">Stock Value</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={showItemCode ? 7 : 6} className="text-center py-8">
                      Loading stock data...
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
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(item.id)}
                            className="h-6 w-6 p-0"
                          >
                            {expandedRows.has(item.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        {showItemCode && (
                          <TableCell className="font-mono text-sm">
                            {item.item_code || '-'}
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category || '-'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatQuantity(item)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.stock_value)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStockStatusBadge(item.stock_status_flag)}
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Row - Warehouse Breakdown */}
                      {expandedRows.has(item.id) && item.locations.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={showItemCode ? 7 : 6} className="bg-muted/30">
                            <div className="py-3 px-4">
                              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                <Warehouse className="h-4 w-4" />
                                Warehouse Breakdown
                              </h4>
                              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                                {item.locations.map((loc, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-background"
                                  >
                                    <div>
                                      <p className="font-medium text-sm">{loc.warehouseName}</p>
                                      {loc.location && (
                                        <p className="text-xs text-muted-foreground">
                                          Location: {loc.location}
                                        </p>
                                      )}
                                    </div>
                                    <Badge variant="outline" className="font-mono">
                                      {loc.quantity} {(item.packaging_unit || 'CTN').toUpperCase()}
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
