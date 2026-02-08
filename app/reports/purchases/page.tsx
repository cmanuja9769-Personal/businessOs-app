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
  ShoppingCart, 
  Filter,
  Search,
  IndianRupee,
  FileText,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"

interface Purchase {
  id: string
  purchaseNo: string
  supplierName: string
  date: string
  total: number
  paidAmount: number
  balance: number
  status: 'paid' | 'unpaid' | 'partial'
}

export default function PurchaseReportPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchPurchases = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/purchases')
        if (response.ok) {
          const data = await response.json()
          setPurchases(data)
        }
      } catch (error) {
        console.error('Failed to fetch purchases:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPurchases()
  }, [])

  // Filter purchases
  const filteredPurchases = purchases.filter(pur => {
    const purDate = new Date(pur.date)
    const fromDate = new Date(dateFrom)
    const toDate = new Date(dateTo)
    toDate.setHours(23, 59, 59, 999)

    const dateMatch = purDate >= fromDate && purDate <= toDate
    const statusMatch = statusFilter === "all" || pur.status === statusFilter
    const searchMatch = 
      pur.purchaseNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pur.supplierName.toLowerCase().includes(searchTerm.toLowerCase())

    return dateMatch && statusMatch && searchMatch
  })

  // Calculate totals
  const totals = filteredPurchases.reduce((acc, pur) => ({
    total: acc.total + pur.total,
    paid: acc.paid + pur.paidAmount,
    balance: acc.balance + pur.balance,
  }), { total: 0, paid: 0, balance: 0 })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value)
  }

  function getStatusBadgeClass(status: string) {
    if (status === 'paid') return "bg-green-500/10 text-green-700"
    if (status === 'partial') return "bg-yellow-500/10 text-yellow-700"
    return "bg-red-500/10 text-red-700"
  }

  const exportToCSV = () => {
    const headers = ['PO Number', 'Supplier', 'Date', 'Total', 'Paid', 'Balance', 'Status']
    const rows = filteredPurchases.map(pur => [
      pur.purchaseNo,
      pur.supplierName,
      format(new Date(pur.date), 'dd/MM/yyyy'),
      pur.total.toFixed(2),
      pur.paidAmount.toFixed(2),
      pur.balance.toFixed(2),
      pur.status,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `purchase-report-${dateFrom}-to-${dateTo}.csv`
    link.click()
  }

  const setQuickDate = (period: string) => {
    const now = new Date()
    switch (period) {
      case 'thisMonth':
        setDateFrom(format(startOfMonth(now), 'yyyy-MM-dd'))
        setDateTo(format(endOfMonth(now), 'yyyy-MM-dd'))
        break
      case 'lastMonth':
        const lastMonth = subMonths(now, 1)
        setDateFrom(format(startOfMonth(lastMonth), 'yyyy-MM-dd'))
        setDateTo(format(endOfMonth(lastMonth), 'yyyy-MM-dd'))
        break
      case 'last3Months':
        setDateFrom(format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd'))
        setDateTo(format(endOfMonth(now), 'yyyy-MM-dd'))
        break
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 report-container">
      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block report-header">
        <h1>Purchase Report</h1>
        <div className="date-range">{format(new Date(dateFrom), 'dd MMM yyyy')} - {format(new Date(dateTo), 'dd MMM yyyy')}</div>
        {statusFilter !== 'all' && <div className="text-sm">Status: {statusFilter}</div>}
      </div>

      {/* Print Summary */}
      <div className="hidden print:block summary-cards">
        <div>
          <div className="stat-label">Total Purchases</div>
          <div className="stat-value">{formatCurrency(totals.total)}</div>
        </div>
        <div>
          <div className="stat-label">Amount Paid</div>
          <div className="stat-value">{formatCurrency(totals.paid)}</div>
        </div>
        <div>
          <div className="stat-label">Pending Payment</div>
          <div className="stat-value">{formatCurrency(totals.balance)}</div>
        </div>
      </div>

      {/* Print Table */}
      <table className="hidden print:table print-table">
        <thead>
          <tr>
            <th>S.No</th>
            <th>PO Number</th>
            <th>Supplier</th>
            <th>Date</th>
            <th style={{ textAlign: 'right' }}>Total</th>
            <th style={{ textAlign: 'right' }}>Paid</th>
            <th style={{ textAlign: 'right' }}>Balance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredPurchases.map((pur, index) => (
            <tr key={pur.id}>
              <td>{index + 1}</td>
              <td>{pur.purchaseNo}</td>
              <td>{pur.supplierName}</td>
              <td>{format(new Date(pur.date), 'dd/MM/yyyy')}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(pur.total)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(pur.paidAmount)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(pur.balance)}</td>
              <td>{pur.status.toUpperCase()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="totals-row">
            <td colSpan={4} style={{ textAlign: 'right', fontWeight: 'bold' }}>TOTAL:</td>
            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(totals.total)}</td>
            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(totals.paid)}</td>
            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(totals.balance)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      {/* Print Footer */}
      <div className="hidden print:block report-footer">
        <p>Generated on {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
      </div>

      {/* Header - Screen only */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
              Purchase Report
            </h1>
            <p className="text-sm text-muted-foreground">Vendor bills and purchase orders</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="PO/Supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quick Select</Label>
              <Select onValueChange={setQuickDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="last3Months">Last 3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards - Screen only */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 print:hidden">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Purchases</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.total)}</p>
                <p className="text-xs text-muted-foreground">{filteredPurchases.length} orders</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <IndianRupee className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Amount Paid</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.paid)}</p>
                <p className="text-xs text-muted-foreground">
                  {totals.total > 0 ? ((totals.paid / totals.total) * 100).toFixed(1) : 0}% settled
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <ShoppingCart className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Payable</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.balance)}</p>
                <p className="text-xs text-muted-foreground">
                  {filteredPurchases.filter(p => p.status !== 'paid').length} pending
                </p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10">
                <FileText className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table - Screen only */}
      <Card className="print:hidden">
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
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No purchase orders found for the selected filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPurchases.map((pur) => (
                      <TableRow key={pur.id}>
                        <TableCell className="font-mono">{pur.purchaseNo}</TableCell>
                        <TableCell>{pur.supplierName}</TableCell>
                        <TableCell>{format(new Date(pur.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(pur.total)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(pur.paidAmount)}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(pur.balance)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={getStatusBadgeClass(pur.status)}
                          >
                            {pur.status}
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
