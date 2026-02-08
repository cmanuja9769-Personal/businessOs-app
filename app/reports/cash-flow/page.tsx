"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  Wallet, 
  Filter,
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react"
import Link from "next/link"
import { format, startOfMonth, endOfMonth } from "date-fns"
import type { ApiPaymentResponse } from "@/types/api-responses"

interface CashFlowCategory {
  name: string
  items: {
    description: string
    amount: number
    type: 'inflow' | 'outflow'
  }[]
  total: number
}

interface CashFlowData {
  openingBalance: number
  operatingActivities: CashFlowCategory
  investingActivities: CashFlowCategory
  financingActivities: CashFlowCategory
  closingBalance: number
}

export default function CashFlowPage() {
  const [data, setData] = useState<CashFlowData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))

  const fetchCashFlowData = useCallback(async () => {
    setLoading(true)
    try {
      const [, , paymentsRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/purchases'),
        fetch('/api/payments')
      ])

      const payments = paymentsRes.ok ? await paymentsRes.json() : []

      const fromDate = new Date(dateFrom)
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)

      // Filter for date range
      const periodPayments = payments.filter((pay: ApiPaymentResponse) => {
        const d = new Date(pay.paymentDate || pay.date || "")
        return d >= fromDate && d <= toDate
      })

      const salesReceipts = periodPayments
        .filter((p: ApiPaymentResponse) => p.type === 'receipt' || p.type === 'incoming')
        .reduce((s: number, p: ApiPaymentResponse) => s + (p.amount || 0), 0)
      
      const purchasePayments = periodPayments
        .filter((p: ApiPaymentResponse) => p.type === 'payment' || p.type === 'outgoing')
        .reduce((s: number, p: ApiPaymentResponse) => s + (p.amount || 0), 0)

      const operatingActivities: CashFlowCategory = {
        name: 'Operating Activities',
        items: [
          { description: 'Receipts from customers', amount: salesReceipts, type: 'inflow' },
          { description: 'Payments to suppliers', amount: purchasePayments, type: 'outflow' },
          { description: 'Operating expenses', amount: 0, type: 'outflow' },
          { description: 'Salaries & wages', amount: 0, type: 'outflow' }
        ],
        total: salesReceipts - purchasePayments
      }

      const investingActivities: CashFlowCategory = {
        name: 'Investing Activities',
        items: [
          { description: 'Purchase of fixed assets', amount: 0, type: 'outflow' },
          { description: 'Sale of fixed assets', amount: 0, type: 'inflow' }
        ],
        total: 0
      }

      const financingActivities: CashFlowCategory = {
        name: 'Financing Activities',
        items: [
          { description: 'Loan received', amount: 0, type: 'inflow' },
          { description: 'Loan repayment', amount: 0, type: 'outflow' },
          { description: 'Capital introduced', amount: 0, type: 'inflow' },
          { description: 'Drawings', amount: 0, type: 'outflow' }
        ],
        total: 0
      }

      // Mock opening balance - in real app, calculate from previous period
      const openingBalance = 100000

      const netCashChange = operatingActivities.total + investingActivities.total + financingActivities.total
      const closingBalance = openingBalance + netCashChange

      setData({
        openingBalance,
        operatingActivities,
        investingActivities,
        financingActivities,
        closingBalance
      })
    } catch (error) {
      console.error('Failed to fetch cash flow data:', error)
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    fetchCashFlowData()
  }, [fetchCashFlowData])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(Math.abs(value))
  }

  const renderCashFlowSection = (category: CashFlowCategory) => (
    <Card key={category.name}>
      <CardHeader>
        <CardTitle className="text-base">{category.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {category.items.filter(item => item.amount !== 0).map((item, idx) => (
              <TableRow key={idx}>
                <TableCell className="flex items-center gap-2">
                  {item.type === 'inflow' ? (
                    <ArrowDownLeft className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-red-600" />
                  )}
                  {item.description}
                </TableCell>
                <TableCell className={`text-right font-medium ${item.type === 'inflow' ? 'text-green-600' : 'text-red-600'}`}>
                  {item.type === 'inflow' ? '+' : '-'}{formatCurrency(item.amount)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold bg-muted/50">
              <TableCell>Net Cash from {category.name}</TableCell>
              <TableCell className={`text-right ${category.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {category.total >= 0 ? '+' : ''}{formatCurrency(category.total)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )

  const netChange = data ? 
    data.operatingActivities.total + data.investingActivities.total + data.financingActivities.total : 0

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
              <Wallet className="h-6 w-6 text-teal-600" />
              Cash Flow Statement
            </h1>
            <p className="text-sm text-muted-foreground">Inflows and outflows of cash</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
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
            Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && !data && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No data available for the selected period
          </CardContent>
        </Card>
      )}

      {!loading && data && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Opening Balance</p>
                  <p className="text-2xl font-bold">{formatCurrency(data.openingBalance)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Cash Inflows</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(
                        data.operatingActivities.items.filter(i => i.type === 'inflow').reduce((s, i) => s + i.amount, 0) +
                        data.investingActivities.items.filter(i => i.type === 'inflow').reduce((s, i) => s + i.amount, 0) +
                        data.financingActivities.items.filter(i => i.type === 'inflow').reduce((s, i) => s + i.amount, 0)
                      )}
                    </p>
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
                    <p className="text-xs text-muted-foreground">Cash Outflows</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(
                        data.operatingActivities.items.filter(i => i.type === 'outflow').reduce((s, i) => s + i.amount, 0) +
                        data.investingActivities.items.filter(i => i.type === 'outflow').reduce((s, i) => s + i.amount, 0) +
                        data.financingActivities.items.filter(i => i.type === 'outflow').reduce((s, i) => s + i.amount, 0)
                      )}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-teal-500/20">
              <CardContent className="pt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Closing Balance</p>
                  <p className="text-2xl font-bold text-teal-600">{formatCurrency(data.closingBalance)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cash Flow Sections */}
          <div className="space-y-4">
            {renderCashFlowSection(data.operatingActivities)}
            {renderCashFlowSection(data.investingActivities)}
            {renderCashFlowSection(data.financingActivities)}
          </div>

          {/* Net Change Summary */}
          <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20 border-teal-200">
            <CardContent className="pt-6">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Opening Cash Balance</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(data.openingBalance)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Net Change in Cash</TableCell>
                    <TableCell className={`text-right font-medium ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {netChange >= 0 ? '+' : ''}{formatCurrency(netChange)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="text-lg font-bold">
                    <TableCell className="text-teal-700">Closing Cash Balance</TableCell>
                    <TableCell className="text-right text-teal-700">{formatCurrency(data.closingBalance)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
