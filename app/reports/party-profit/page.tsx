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
  IndianRupee, 
  Filter,
  Loader2,
  TrendingUp,
  TrendingDown,
  Users,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { format, startOfYear, endOfMonth } from "date-fns"
import type { ApiInvoiceResponse, ApiInvoiceItemResponse } from "@/types/api-responses"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import { ClientErrorBoundary } from "@/components/ui/client-error-boundary"
import { ReportActionBar } from "@/components/reports/report-action-bar"
import { exportToCSV as exportCSVUtil, downloadReportPDF } from "@/lib/export-utils"
import { type ReportColumn } from "@/components/reports/compact-report-pdf"

interface PartyProfit {
  partyId: string
  partyName: string
  partyType: 'customer' | 'supplier'
  totalSales: number
  totalCost: number
  grossProfit: number
  profitMargin: number
  transactionCount: number
}

function calculateItemsCost(items: ApiInvoiceItemResponse[] | undefined): number {
  if (!items) return 0
  return items.reduce((sum: number, item: ApiInvoiceItemResponse) => {
    return sum + (item.purchasePrice || 0) * (item.quantity || 0)
  }, 0)
}

export default function PartyProfitPage() {
  const [partyProfits, setPartyProfits] = useState<PartyProfit[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState(format(startOfYear(new Date()), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [sortBy, setSortBy] = useState<string>("profit")

  useEffect(() => {
    async function fetchPartyProfits() {
    setLoading(true)
    setFetchError(null)
    try {
      const response = await fetch('/api/invoices')
      if (!response.ok) throw new Error(`Server returned ${response.status}: ${response.statusText}`)
      
      const invoices = await response.json()
      if (!Array.isArray(invoices)) {
        throw new Error(invoices?.error || 'Invalid response format')
      }
      
      // Group invoices by customer and calculate profits
      const customerMap = new Map<string, PartyProfit>()
      
      invoices.forEach((inv: ApiInvoiceResponse) => {
        const invDate = new Date(inv.invoiceDate)
        const fromDate = new Date(dateFrom)
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        
        if (invDate < fromDate || invDate > toDate) return
        
        const customerId = inv.customerId || ''
        const existing = customerMap.get(customerId) || {
          partyId: customerId,
          partyName: inv.customerName,
          partyType: 'customer' as const,
          totalSales: 0,
          totalCost: 0,
          grossProfit: 0,
          profitMargin: 0,
          transactionCount: 0
        }
        
        const itemsCost = calculateItemsCost(inv.items)
        
        existing.totalSales += inv.subtotal || 0
        existing.totalCost += itemsCost
        existing.transactionCount += 1
        
        customerMap.set(customerId, existing)
      })
      
      // Calculate profit and margin for each
      const profits = Array.from(customerMap.values()).map(p => ({
        ...p,
        grossProfit: p.totalSales - p.totalCost,
        profitMargin: p.totalSales > 0 ? ((p.totalSales - p.totalCost) / p.totalSales) * 100 : 0
      }))
      
      setPartyProfits(profits)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch party profits'
      console.error('Failed to fetch party profits:', error)
      setFetchError(message)
    } finally {
      setLoading(false)
    }
  }
    fetchPartyProfits()
  }, [dateFrom, dateTo])

  const sortedProfits = [...partyProfits].sort((a, b) => {
    switch (sortBy) {
      case "profit": return b.grossProfit - a.grossProfit
      case "sales": return b.totalSales - a.totalSales
      case "margin": return b.profitMargin - a.profitMargin
      case "transactions": return b.transactionCount - a.transactionCount
      default: return 0
    }
  })

  const totals = partyProfits.reduce((acc, p) => ({
    sales: acc.sales + p.totalSales,
    cost: acc.cost + p.totalCost,
    profit: acc.profit + p.grossProfit,
    transactions: acc.transactions + p.transactionCount
  }), { sales: 0, cost: 0, profit: 0, transactions: 0 })

  const avgMargin = totals.sales > 0 ? ((totals.profit / totals.sales) * 100) : 0

  function getMarginBadgeClass(margin: number) {
    if (margin >= 30) return "bg-green-500/10 text-green-700"
    if (margin >= 15) return "bg-yellow-500/10 text-yellow-700"
    return "bg-red-500/10 text-red-700"
  }

  function getPerformanceBadge(margin: number) {
    if (margin >= 30) return <Badge className="bg-green-500/10 text-green-700">High Performer</Badge>
    if (margin >= 15) return <Badge className="bg-yellow-500/10 text-yellow-700">Average</Badge>
    if (margin > 0) return <Badge className="bg-orange-500/10 text-orange-700">Low Margin</Badge>
    return <Badge className="bg-red-500/10 text-red-700">Loss</Badge>
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(value)
  }

  const partyProfitPdfColumns: ReportColumn[] = [
    { key: "partyName", header: "Customer", width: "28%", bold: true },
    { key: "txnCount", header: "Txns", width: "10%", align: "right" },
    { key: "sales", header: "Sales", width: "16%", align: "right" },
    { key: "cost", header: "Cost", width: "16%", align: "right" },
    { key: "profit", header: "Profit", width: "16%", align: "right" },
    { key: "margin", header: "Margin", width: "14%", align: "right" },
  ]

  const handleExportPDF = async () => {
    const data = sortedProfits.map((p) => ({
      partyName: p.partyName,
      txnCount: p.transactionCount,
      sales: p.totalSales,
      cost: p.totalCost,
      profit: p.grossProfit,
      margin: `${p.profitMargin.toFixed(1)}%`,
    }))
    const pdfTotals = {
      partyName: "Total",
      txnCount: sortedProfits.reduce((s, p) => s + p.transactionCount, 0),
      sales: sortedProfits.reduce((s, p) => s + p.totalSales, 0),
      cost: sortedProfits.reduce((s, p) => s + p.totalCost, 0),
      profit: sortedProfits.reduce((s, p) => s + p.grossProfit, 0),
    }
    const { CompactReportPDF } = await import("@/components/reports/compact-report-pdf")
    const React = await import("react")
    await downloadReportPDF(
      React.createElement(CompactReportPDF, {
        title: "Party-wise Profit Report",
        subtitle: `${sortedProfits.length} customers | Total Profit: ${formatCurrency(pdfTotals.profit as number)}`,
        dateRange: `${format(new Date(dateFrom), "dd MMM yyyy")} - ${format(new Date(dateTo), "dd MMM yyyy")}`,
        columns: partyProfitPdfColumns,
        data,
        totals: pdfTotals,
      }),
      `party-profit-${dateFrom}-to-${dateTo}.pdf`,
    )
  }

  const handleExportCSV = () => {
    const csvColumns = [
      { key: "partyName", header: "Customer" },
      { key: "totalSales", header: "Total Sales", format: (v: unknown) => ((v as number) || 0).toFixed(2) },
      { key: "totalCost", header: "Total Cost", format: (v: unknown) => ((v as number) || 0).toFixed(2) },
      { key: "grossProfit", header: "Gross Profit", format: (v: unknown) => ((v as number) || 0).toFixed(2) },
      { key: "profitMargin", header: "Margin %", format: (v: unknown) => `${((v as number) || 0).toFixed(1)}%` },
      { key: "transactionCount", header: "Transactions" },
    ] as const
    exportCSVUtil(
      sortedProfits as unknown as Record<string, unknown>[],
      `party-profit-${dateFrom}-to-${dateTo}.csv`,
      csvColumns,
      { titleRows: ["Party-wise Profit Report", `Period: ${dateFrom} to ${dateTo}`] },
    )
  }

  return (
    <ClientErrorBoundary fallbackTitle="Party profit report encountered an error">
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
              <IndianRupee className="h-6 w-6 text-green-600" />
              Party-wise Profit
            </h1>
            <p className="text-sm text-muted-foreground">Profit analysis by customer</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ReportActionBar
            onExportPDF={handleExportPDF}
            onExportCSV={handleExportCSV}
            disabled={sortedProfits.length === 0}
          />
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
          <div className="grid gap-4 sm:grid-cols-3">
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
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profit">Highest Profit</SelectItem>
                  <SelectItem value="sales">Highest Sales</SelectItem>
                  <SelectItem value="margin">Best Margin</SelectItem>
                  <SelectItem value="transactions">Most Transactions</SelectItem>
                </SelectContent>
              </Select>
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
                <p className="text-xs text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.sales)}</p>
                <p className="text-xs text-muted-foreground">{totals.transactions} transactions</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.cost)}</p>
                <p className="text-xs text-muted-foreground">Cost of goods</p>
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
                <p className="text-xs text-muted-foreground">All customers</p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <IndianRupee className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg. Margin</p>
                <p className="text-2xl font-bold">{avgMargin.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">{partyProfits.length} customers</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="pt-6">
          {(() => {
            if (loading) {
              return (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )
            }
            if (fetchError) {
              return (
                <DataEmptyState
                  icon={<AlertCircle className="h-12 w-12" />}
                  title="Failed to load profit data"
                  description={fetchError}
                  action={
                    <Button variant="outline" size="sm" onClick={() => {
                      setFetchError(null)
                      setLoading(true)
                      fetch('/api/invoices').then(r => r.json()).then(() => window.location.reload())
                    }}>
                      Retry
                    </Button>
                  }
                />
              )
            }
            return (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">Gross Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-center">Transactions</TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedProfits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No profit data found for the selected period
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedProfits.map((p, index) => (
                      <TableRow key={p.partyId}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium">{p.partyName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.totalSales)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(p.totalCost)}</TableCell>
                        <TableCell className={`text-right font-medium ${p.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(p.grossProfit)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant="secondary" 
                            className={getMarginBadgeClass(p.profitMargin)}
                          >
                            {p.profitMargin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{p.transactionCount}</TableCell>
                        <TableCell>
                          {getPerformanceBadge(p.profitMargin)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )
          })()}
        </CardContent>
      </Card>
    </div>
    </ClientErrorBoundary>
  )
}
