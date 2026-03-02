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
import type { ApiInvoiceResponse, ApiPurchaseResponse } from "@/types/api-responses"

const DISPLAY_DATE = "dd MMM yyyy"
const BOLD_HEADING = "text-2xl font-bold"
const BORDER_TOTAL = '1px solid #333'
const TEXT_DANGER = 'text-red-600'

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

function filterByDateRange<T>(
  items: T[],
  getDate: (item: T) => string,
  from: Date,
  to: Date,
): T[] {
  return items.filter((item) => {
    const d = new Date(getDate(item))
    return d >= from && d <= to
  })
}

function calculateStockValues(
  stockItems: Array<Record<string, number | null>>,
  totalSales: number,
  totalPurchases: number,
): { openingStock: number; closingStock: number; cogs: number } {
  const closingStock = stockItems.reduce((sum, item) => {
    const qty = item.current_stock || 0
    const price = item.purchase_price || 0
    return sum + (qty * price)
  }, 0)

  const estimatedOpening = closingStock + totalSales - totalPurchases
  const openingStock = estimatedOpening > 0 ? estimatedOpening : closingStock
  const cogs = openingStock + totalPurchases - closingStock

  return { openingStock, closingStock, cogs }
}

function buildProfitLossData(
  totalSales: number,
  totalPurchases: number,
  stockValues: { openingStock: number; closingStock: number; cogs: number },
): ProfitLossData {
  const otherIncome = 0
  const grossProfit = totalSales + otherIncome - stockValues.cogs
  const expenses: { category: string; amount: number }[] = []
  const totalExpenses = 0
  const operatingProfit = grossProfit - totalExpenses
  const taxesProvision = 0
  const netProfit = operatingProfit - taxesProvision

  return {
    revenue: { sales: totalSales, otherIncome, total: totalSales + otherIncome },
    costOfGoodsSold: {
      openingStock: stockValues.openingStock,
      purchases: totalPurchases,
      closingStock: stockValues.closingStock,
      total: stockValues.cogs,
    },
    grossProfit,
    expenses,
    totalExpenses,
    operatingProfit,
    taxesProvision,
    netProfit,
  }
}

async function loadProfitLossData(dateFrom: string, dateTo: string): Promise<ProfitLossData> {
  const [invoicesRes, purchasesRes, stockRes] = await Promise.all([
    fetch('/api/invoices'),
    fetch('/api/purchases'),
    fetch('/api/reports/stock')
  ])

  const invoices = invoicesRes.ok ? await invoicesRes.json() : []
  const purchases = purchasesRes.ok ? await purchasesRes.json() : []
  const stockData = stockRes.ok ? await stockRes.json() : { data: [] }

  const fromDate = new Date(dateFrom)
  const toDate = new Date(dateTo)
  toDate.setHours(23, 59, 59, 999)

  const periodInvoices = filterByDateRange(invoices, (inv: ApiInvoiceResponse) => inv.invoiceDate, fromDate, toDate)
  const periodPurchases = filterByDateRange(purchases, (pur: ApiPurchaseResponse) => pur.date, fromDate, toDate)

  const totalSales = periodInvoices.reduce((s: number, inv: ApiInvoiceResponse) => s + (inv.subtotal || 0), 0)
  const totalPurchases = periodPurchases.reduce((s: number, pur: ApiPurchaseResponse) => s + (pur.subtotal || 0), 0)

  const stockItems = stockData?.data || []
  const stockValues = calculateStockValues(stockItems, totalSales, totalPurchases)

  return buildProfitLossData(totalSales, totalPurchases, stockValues)
}

function computeMargin(profit: number, total: number): number {
  if (total <= 0) return 0
  return (profit / total) * 100
}

function getNetProfitStyles(netProfit: number) {
  if (netProfit >= 0) {
    return {
      cardGradient: 'from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border-emerald-200',
      textClass: 'text-emerald-700',
      label: 'Net Profit for the Period',
      amountClass: 'text-emerald-600',
      iconClass: 'text-emerald-500/30',
      tableClass: 'text-emerald-700',
    }
  }
  return {
    cardGradient: 'from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 border-red-200',
    textClass: 'text-red-700',
    label: 'Net Loss for the Period',
    amountClass: TEXT_DANGER,
    iconClass: 'text-red-500/30',
    tableClass: 'text-red-700',
  }
}

export default function ProfitLossPage() {
  const [data, setData] = useState<ProfitLossData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(format(startOfYear(new Date()), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const result = await loadProfitLossData(dateFrom, dateTo)
        setData(result)
      } catch (error) {
        console.error('Failed to fetch P&L data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [dateFrom, dateTo])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(value)
  }

  const grossMargin = data ? computeMargin(data.grossProfit, data.revenue.total) : 0

  const netMargin = data ? computeMargin(data.netProfit, data.revenue.total) : 0

  const netProfitStyles = data ? getNetProfitStyles(data.netProfit) : null

  return (
    <div className="p-4 sm:p-6 space-y-6 report-container">
      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block report-header">
        <h1>Profit & Loss Statement</h1>
        <div className="date-range">{format(new Date(dateFrom), DISPLAY_DATE)} - {format(new Date(dateTo), DISPLAY_DATE)}</div>
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
            <tr style={{ fontWeight: 'bold', borderTop: BORDER_TOTAL }}>
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
            <tr style={{ fontWeight: 'bold', borderTop: BORDER_TOTAL }}>
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
            <tr style={{ fontWeight: 'bold', borderTop: BORDER_TOTAL }}>
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
          {/* Key Metrics */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className={BOLD_HEADING}>{formatCurrency(data.revenue.total)}</p>
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
                    <p className={BOLD_HEADING}>{formatCurrency(data.grossProfit)}</p>
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
                    <p className={`${BOLD_HEADING} ${data.operatingProfit >= 0 ? '' : TEXT_DANGER}`}>
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
                    <p className={`${BOLD_HEADING} ${data.netProfit >= 0 ? 'text-emerald-600' : TEXT_DANGER}`}>
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
                  {format(new Date(dateFrom), DISPLAY_DATE)} to {format(new Date(dateTo), DISPLAY_DATE)}
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
                    <TableCell className={`text-right ${data.operatingProfit >= 0 ? 'text-green-600' : TEXT_DANGER}`}>
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
                    <TableCell className={`text-right ${getNetProfitStyles(data.netProfit).tableClass}`}>
                      {formatCurrency(data.netProfit)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Net Profit Highlight */}
          <Card className={`bg-gradient-to-br ${netProfitStyles!.cardGradient}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className={`text-sm font-medium ${netProfitStyles!.textClass}`}>
                    {netProfitStyles!.label}
                  </p>
                  <p className={`text-4xl font-bold ${netProfitStyles!.amountClass}`}>
                    {formatCurrency(data.netProfit)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Net margin: {netMargin.toFixed(1)}%
                  </p>
                </div>
                <CheckCircle2 className={`h-16 w-16 ${netProfitStyles!.iconClass}`} />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
