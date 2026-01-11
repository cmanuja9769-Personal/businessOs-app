"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  TrendingUp, 
  Filter,
  Loader2,
  IndianRupee,
  BarChart3,
  Percent,
  CheckCircle2
} from "lucide-react"
import Link from "next/link"
import { format, endOfMonth, startOfYear } from "date-fns"

interface ProfitLossData {
  revenue: {
    sales: number
    otherIncome: number
    total: number
  }
  costOfGoodsSold: {
    openingStock: number
    purchases: number
    closingStock: number
    total: number
  }
  grossProfit: number
  expenses: {
    category: string
    amount: number
  }[]
  totalExpenses: number
  operatingProfit: number
  taxesProvision: number
  netProfit: number
}

export default function ProfitLossPage() {
  const [data, setData] = useState<ProfitLossData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(format(startOfYear(new Date()), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))

  useEffect(() => {
    fetchProfitLossData()
  }, [dateFrom, dateTo])

  const fetchProfitLossData = async () => {
    setLoading(true)
    try {
      // Fetch invoices and purchases
      const [invoicesRes, purchasesRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/purchases')
      ])

      const invoices = invoicesRes.ok ? await invoicesRes.json() : []
      const purchases = purchasesRes.ok ? await purchasesRes.json() : []

      const fromDate = new Date(dateFrom)
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)

      // Filter for date range
      const periodInvoices = invoices.filter((inv: any) => {
        const d = new Date(inv.invoiceDate)
        return d >= fromDate && d <= toDate
      })
      const periodPurchases = purchases.filter((pur: any) => {
        const d = new Date(pur.date)
        return d >= fromDate && d <= toDate
      })

      // Calculate revenue
      const totalSales = periodInvoices.reduce((s: number, inv: any) => s + (inv.subtotal || 0), 0)
      const otherIncome = 0 // Can be extended

      // Calculate COGS
      const totalPurchases = periodPurchases.reduce((s: number, pur: any) => s + (pur.subtotal || 0), 0)
      const openingStock = 50000 // Mock - in real app, calculate from inventory
      const closingStock = 45000 // Mock
      const cogs = openingStock + totalPurchases - closingStock

      // Calculate gross profit
      const grossProfit = totalSales + otherIncome - cogs

      // Expenses (mock data - in real app, fetch from expense records)
      const expenses = [
        { category: 'Salaries & Wages', amount: grossProfit * 0.15 },
        { category: 'Rent', amount: grossProfit * 0.05 },
        { category: 'Utilities', amount: grossProfit * 0.02 },
        { category: 'Marketing & Advertising', amount: grossProfit * 0.03 },
        { category: 'Office Supplies', amount: grossProfit * 0.01 },
        { category: 'Insurance', amount: grossProfit * 0.02 },
        { category: 'Depreciation', amount: grossProfit * 0.02 },
        { category: 'Other Expenses', amount: grossProfit * 0.01 }
      ]

      const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
      const operatingProfit = grossProfit - totalExpenses
      const taxesProvision = Math.max(0, operatingProfit * 0.30) // 30% tax
      const netProfit = operatingProfit - taxesProvision

      setData({
        revenue: {
          sales: totalSales,
          otherIncome,
          total: totalSales + otherIncome
        },
        costOfGoodsSold: {
          openingStock,
          purchases: totalPurchases,
          closingStock,
          total: cogs
        },
        grossProfit,
        expenses,
        totalExpenses,
        operatingProfit,
        taxesProvision,
        netProfit
      })
    } catch (error) {
      console.error('Failed to fetch P&L data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(value)
  }

  const grossMargin = data && data.revenue.total > 0 
    ? ((data.grossProfit / data.revenue.total) * 100) 
    : 0

  const netMargin = data && data.revenue.total > 0 
    ? ((data.netProfit / data.revenue.total) * 100) 
    : 0

  return (
    <div className="p-4 sm:p-6 space-y-6 report-container">
      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block report-header">
        <h1>Profit & Loss Statement</h1>
        <div className="date-range">{format(new Date(dateFrom), 'dd MMM yyyy')} - {format(new Date(dateTo), 'dd MMM yyyy')}</div>
      </div>

      {/* Print P&L Statement */}
      {data && (
        <table className="hidden print:table print-table">
          <thead>
            <tr>
              <th colSpan={2} style={{ textAlign: 'center', fontSize: '12pt' }}>PROFIT & LOSS STATEMENT</th>
            </tr>
          </thead>
          <tbody>
            {/* Revenue Section */}
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <td colSpan={2} style={{ fontWeight: 'bold' }}>REVENUE</td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '20px' }}>Sales Revenue</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(data.revenue.sales)}</td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '20px' }}>Other Income</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(data.revenue.otherIncome)}</td>
            </tr>
            <tr style={{ fontWeight: 'bold', borderTop: '1px solid #333' }}>
              <td>Total Revenue</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(data.revenue.total)}</td>
            </tr>

            {/* COGS Section */}
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <td colSpan={2} style={{ fontWeight: 'bold' }}>COST OF GOODS SOLD</td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '20px' }}>Opening Stock</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(data.costOfGoodsSold.openingStock)}</td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '20px' }}>Add: Purchases</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(data.costOfGoodsSold.purchases)}</td>
            </tr>
            <tr>
              <td style={{ paddingLeft: '20px' }}>Less: Closing Stock</td>
              <td style={{ textAlign: 'right' }}>({formatCurrency(data.costOfGoodsSold.closingStock)})</td>
            </tr>
            <tr style={{ fontWeight: 'bold', borderTop: '1px solid #333' }}>
              <td>Total COGS</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(data.costOfGoodsSold.total)}</td>
            </tr>

            {/* Gross Profit */}
            <tr style={{ fontWeight: 'bold', backgroundColor: '#e5e7eb' }}>
              <td>GROSS PROFIT</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(data.grossProfit)}</td>
            </tr>

            {/* Expenses */}
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <td colSpan={2} style={{ fontWeight: 'bold' }}>OPERATING EXPENSES</td>
            </tr>
            {data.expenses.map((exp, i) => (
              <tr key={i}>
                <td style={{ paddingLeft: '20px' }}>{exp.category}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(exp.amount)}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 'bold', borderTop: '1px solid #333' }}>
              <td>Total Operating Expenses</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(data.totalExpenses)}</td>
            </tr>

            {/* Operating Profit */}
            <tr style={{ fontWeight: 'bold', backgroundColor: '#e5e7eb' }}>
              <td>OPERATING PROFIT</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(data.operatingProfit)}</td>
            </tr>

            {/* Taxes */}
            <tr>
              <td style={{ paddingLeft: '20px' }}>Less: Tax Provision (30%)</td>
              <td style={{ textAlign: 'right' }}>({formatCurrency(data.taxesProvision)})</td>
            </tr>

            {/* Net Profit */}
            <tr style={{ fontWeight: 'bold', fontSize: '11pt', backgroundColor: '#d1fae5', borderTop: '2px solid #333' }}>
              <td>NET PROFIT</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(data.netProfit)}</td>
            </tr>
          </tbody>
        </table>
      )}

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
              <TrendingUp className="h-6 w-6 text-emerald-600" />
              Profit & Loss Statement
            </h1>
            <p className="text-sm text-muted-foreground">Income statement for the period</p>
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(data.revenue.total)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Gross Profit</p>
                    <p className="text-2xl font-bold">{formatCurrency(data.grossProfit)}</p>
                    <p className="text-xs text-muted-foreground">{grossMargin.toFixed(1)}% margin</p>
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
                    <p className="text-xs text-muted-foreground">Operating Profit</p>
                    <p className={`text-2xl font-bold ${data.operatingProfit >= 0 ? '' : 'text-red-600'}`}>
                      {formatCurrency(data.operatingProfit)}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Percent className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-emerald-500/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Net Profit</p>
                    <p className={`text-2xl font-bold ${data.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(data.netProfit)}
                    </p>
                    <p className="text-xs text-muted-foreground">{netMargin.toFixed(1)}% margin</p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <IndianRupee className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* P&L Statement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Profit & Loss Statement
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {format(new Date(dateFrom), 'dd MMM yyyy')} to {format(new Date(dateTo), 'dd MMM yyyy')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {/* Revenue Section */}
                  <TableRow className="bg-blue-50 dark:bg-blue-950/20">
                    <TableCell colSpan={2} className="font-bold text-blue-700">Revenue</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Sales Revenue</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.revenue.sales)}</TableCell>
                  </TableRow>
                  {data.revenue.otherIncome > 0 && (
                    <TableRow>
                      <TableCell className="pl-8">Other Income</TableCell>
                      <TableCell className="text-right">{formatCurrency(data.revenue.otherIncome)}</TableCell>
                    </TableRow>
                  )}
                  <TableRow className="font-bold">
                    <TableCell>Total Revenue</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.revenue.total)}</TableCell>
                  </TableRow>

                  {/* COGS Section */}
                  <TableRow className="bg-red-50 dark:bg-red-950/20">
                    <TableCell colSpan={2} className="font-bold text-red-700">Cost of Goods Sold</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Opening Stock</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.costOfGoodsSold.openingStock)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Add: Purchases</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.costOfGoodsSold.purchases)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Less: Closing Stock</TableCell>
                    <TableCell className="text-right">({formatCurrency(data.costOfGoodsSold.closingStock)})</TableCell>
                  </TableRow>
                  <TableRow className="font-bold">
                    <TableCell>Total COGS</TableCell>
                    <TableCell className="text-right text-red-600">({formatCurrency(data.costOfGoodsSold.total)})</TableCell>
                  </TableRow>

                  {/* Gross Profit */}
                  <TableRow className="font-bold bg-green-50 dark:bg-green-950/20 text-lg">
                    <TableCell className="text-green-700">Gross Profit</TableCell>
                    <TableCell className="text-right text-green-700">{formatCurrency(data.grossProfit)}</TableCell>
                  </TableRow>

                  {/* Operating Expenses */}
                  <TableRow className="bg-orange-50 dark:bg-orange-950/20">
                    <TableCell colSpan={2} className="font-bold text-orange-700">Operating Expenses</TableCell>
                  </TableRow>
                  {data.expenses.map((exp, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="pl-8">{exp.category}</TableCell>
                      <TableCell className="text-right">{formatCurrency(exp.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell>Total Operating Expenses</TableCell>
                    <TableCell className="text-right text-orange-600">({formatCurrency(data.totalExpenses)})</TableCell>
                  </TableRow>

                  {/* Operating Profit */}
                  <TableRow className="font-bold text-lg">
                    <TableCell>Operating Profit (EBIT)</TableCell>
                    <TableCell className={`text-right ${data.operatingProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(data.operatingProfit)}
                    </TableCell>
                  </TableRow>

                  {/* Taxes */}
                  <TableRow>
                    <TableCell className="pl-8">Less: Tax Provision (30%)</TableCell>
                    <TableCell className="text-right">({formatCurrency(data.taxesProvision)})</TableCell>
                  </TableRow>

                  {/* Net Profit */}
                  <TableRow className="font-bold text-xl bg-emerald-100 dark:bg-emerald-950/30">
                    <TableCell className="text-emerald-700">Net Profit</TableCell>
                    <TableCell className={`text-right ${data.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {formatCurrency(data.netProfit)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Net Profit Highlight */}
          <Card className={`bg-gradient-to-br ${data.netProfit >= 0 ? 'from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border-emerald-200' : 'from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 border-red-200'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className={`text-sm font-medium ${data.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {data.netProfit >= 0 ? 'Net Profit for the Period' : 'Net Loss for the Period'}
                  </p>
                  <p className={`text-4xl font-bold ${data.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(data.netProfit)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Net margin: {netMargin.toFixed(1)}%
                  </p>
                </div>
                <CheckCircle2 className={`h-16 w-16 ${data.netProfit >= 0 ? 'text-emerald-500/30' : 'text-red-500/30'}`} />
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No data available for the selected period
          </CardContent>
        </Card>
      )}
    </div>
  )
}
