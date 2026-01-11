"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  AlertTriangle, 
  IndianRupee,
  Loader2,
  Users,
  Truck,
  Clock,
  Phone
} from "lucide-react"
import Link from "next/link"
import { format, differenceInDays } from "date-fns"

interface OutstandingEntry {
  id: string
  partyId: string
  partyName: string
  partyType: 'customer' | 'supplier'
  phone?: string
  email?: string
  documentNo: string
  documentDate: string
  dueDate: string
  totalAmount: number
  paidAmount: number
  balance: number
  daysOverdue: number
}

export default function OutstandingReportPage() {
  const [entries, setEntries] = useState<OutstandingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [agingFilter, setAgingFilter] = useState<string>("all")

  useEffect(() => {
    fetchOutstanding()
  }, [])

  const fetchOutstanding = async () => {
    setLoading(true)
    try {
      // Fetch invoices and purchases for outstanding calculation
      const [invoicesRes, purchasesRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/purchases')
      ])

      const invoices = invoicesRes.ok ? await invoicesRes.json() : []
      const purchases = purchasesRes.ok ? await purchasesRes.json() : []

      const today = new Date()

      // Process receivables (from invoices)
      const receivables: OutstandingEntry[] = invoices
        .filter((inv: any) => inv.balance > 0)
        .map((inv: any) => {
          const dueDate = new Date(inv.dueDate || inv.invoiceDate)
          return {
            id: inv.id,
            partyId: inv.customerId,
            partyName: inv.customerName,
            partyType: 'customer' as const,
            phone: inv.customerPhone,
            email: inv.customerEmail,
            documentNo: inv.invoiceNo,
            documentDate: inv.invoiceDate,
            dueDate: inv.dueDate || inv.invoiceDate,
            totalAmount: inv.total,
            paidAmount: inv.paidAmount,
            balance: inv.balance,
            daysOverdue: Math.max(0, differenceInDays(today, dueDate))
          }
        })

      // Process payables (from purchases)
      const payables: OutstandingEntry[] = purchases
        .filter((pur: any) => pur.balance > 0)
        .map((pur: any) => {
          const dueDate = new Date(pur.dueDate || pur.date)
          return {
            id: pur.id,
            partyId: pur.supplierId,
            partyName: pur.supplierName,
            partyType: 'supplier' as const,
            phone: pur.supplierPhone,
            documentNo: pur.purchaseNo,
            documentDate: pur.date,
            dueDate: pur.dueDate || pur.date,
            totalAmount: pur.total,
            paidAmount: pur.paidAmount,
            balance: pur.balance,
            daysOverdue: Math.max(0, differenceInDays(today, dueDate))
          }
        })

      setEntries([...receivables, ...payables])
    } catch (error) {
      console.error('Failed to fetch outstanding:', error)
    } finally {
      setLoading(false)
    }
  }

  const receivables = entries.filter(e => e.partyType === 'customer')
  const payables = entries.filter(e => e.partyType === 'supplier')

  const filterByAging = (items: OutstandingEntry[]) => {
    if (agingFilter === "all") return items
    return items.filter(item => {
      switch (agingFilter) {
        case "current": return item.daysOverdue === 0
        case "1-30": return item.daysOverdue >= 1 && item.daysOverdue <= 30
        case "31-60": return item.daysOverdue >= 31 && item.daysOverdue <= 60
        case "61-90": return item.daysOverdue >= 61 && item.daysOverdue <= 90
        case "90+": return item.daysOverdue > 90
        default: return true
      }
    })
  }

  const getAgingBucket = (days: number) => {
    if (days === 0) return { label: 'Current', color: 'bg-green-500/10 text-green-700' }
    if (days <= 30) return { label: '1-30 Days', color: 'bg-yellow-500/10 text-yellow-700' }
    if (days <= 60) return { label: '31-60 Days', color: 'bg-orange-500/10 text-orange-700' }
    if (days <= 90) return { label: '61-90 Days', color: 'bg-red-500/10 text-red-700' }
    return { label: '90+ Days', color: 'bg-red-600/20 text-red-800' }
  }

  const calculateAgingSummary = (items: OutstandingEntry[]) => {
    return {
      current: items.filter(i => i.daysOverdue === 0).reduce((s, i) => s + i.balance, 0),
      days1_30: items.filter(i => i.daysOverdue >= 1 && i.daysOverdue <= 30).reduce((s, i) => s + i.balance, 0),
      days31_60: items.filter(i => i.daysOverdue >= 31 && i.daysOverdue <= 60).reduce((s, i) => s + i.balance, 0),
      days61_90: items.filter(i => i.daysOverdue >= 61 && i.daysOverdue <= 90).reduce((s, i) => s + i.balance, 0),
      days90Plus: items.filter(i => i.daysOverdue > 90).reduce((s, i) => s + i.balance, 0),
      total: items.reduce((s, i) => s + i.balance, 0)
    }
  }

  const receivablesSummary = calculateAgingSummary(receivables)
  const payablesSummary = calculateAgingSummary(payables)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value)
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 report-container">
      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block report-header">
        <h1>Outstanding Report</h1>
        <div className="date-range">As of {format(new Date(), 'dd MMM yyyy')}</div>
      </div>

      {/* Print Summary */}
      <div className="hidden print:block summary-cards">
        <div>
          <div className="stat-label">Total Receivables</div>
          <div className="stat-value">{formatCurrency(receivablesSummary.total)}</div>
        </div>
        <div>
          <div className="stat-label">Total Payables</div>
          <div className="stat-value">{formatCurrency(payablesSummary.total)}</div>
        </div>
        <div>
          <div className="stat-label">Net Position</div>
          <div className="stat-value">{formatCurrency(receivablesSummary.total - payablesSummary.total)}</div>
        </div>
      </div>

      {/* Print Tables */}
      <div className="hidden print:block">
        <h3 style={{ fontWeight: 'bold', marginTop: '20px', marginBottom: '10px' }}>RECEIVABLES (Customers)</h3>
        <table className="print-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Customer</th>
              <th>Invoice No</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ textAlign: 'right' }}>Paid</th>
              <th style={{ textAlign: 'right' }}>Balance</th>
              <th>Days Overdue</th>
            </tr>
          </thead>
          <tbody>
            {filterByAging(receivables).map((entry, index) => (
              <tr key={entry.id}>
                <td>{index + 1}</td>
                <td>{entry.partyName}</td>
                <td>{entry.documentNo}</td>
                <td>{format(new Date(entry.documentDate), 'dd/MM/yyyy')}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(entry.totalAmount)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(entry.paidAmount)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(entry.balance)}</td>
                <td>{entry.daysOverdue} days</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="totals-row">
              <td colSpan={6} style={{ textAlign: 'right', fontWeight: 'bold' }}>TOTAL:</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(receivablesSummary.total)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <h3 style={{ fontWeight: 'bold', marginTop: '30px', marginBottom: '10px' }}>PAYABLES (Suppliers)</h3>
        <table className="print-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Supplier</th>
              <th>PO No</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ textAlign: 'right' }}>Paid</th>
              <th style={{ textAlign: 'right' }}>Balance</th>
              <th>Days Overdue</th>
            </tr>
          </thead>
          <tbody>
            {filterByAging(payables).map((entry, index) => (
              <tr key={entry.id}>
                <td>{index + 1}</td>
                <td>{entry.partyName}</td>
                <td>{entry.documentNo}</td>
                <td>{format(new Date(entry.documentDate), 'dd/MM/yyyy')}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(entry.totalAmount)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(entry.paidAmount)}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(entry.balance)}</td>
                <td>{entry.daysOverdue} days</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="totals-row">
              <td colSpan={6} style={{ textAlign: 'right', fontWeight: 'bold' }}>TOTAL:</td>
              <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(payablesSummary.total)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

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
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              Outstanding Report
            </h1>
            <p className="text-sm text-muted-foreground">Receivables & payables with aging analysis</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={agingFilter} onValueChange={setAgingFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Aging filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="current">Current</SelectItem>
              <SelectItem value="1-30">1-30 Days</SelectItem>
              <SelectItem value="31-60">31-60 Days</SelectItem>
              <SelectItem value="61-90">61-90 Days</SelectItem>
              <SelectItem value="90+">90+ Days</SelectItem>
            </SelectContent>
          </Select>
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

      {/* Summary Cards - Screen only */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 print:hidden">
        <Card className="border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Receivables</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(receivablesSummary.total)}</p>
                <p className="text-xs text-muted-foreground">{receivables.length} customers</p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <Users className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Payables</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(payablesSummary.total)}</p>
                <p className="text-xs text-muted-foreground">{payables.length} suppliers</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10">
                <Truck className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Net Position</p>
                <p className={`text-2xl font-bold ${receivablesSummary.total - payablesSummary.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(receivablesSummary.total - payablesSummary.total)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {receivablesSummary.total - payablesSummary.total >= 0 ? 'Positive' : 'Negative'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <IndianRupee className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Overdue 90+ Days</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(receivablesSummary.days90Plus + payablesSummary.days90Plus)}
                </p>
                <p className="text-xs text-muted-foreground">Critical attention</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aging Analysis */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-600">Receivables Aging</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <AgingBar label="Current" amount={receivablesSummary.current} total={receivablesSummary.total} color="bg-green-500" />
              <AgingBar label="1-30 Days" amount={receivablesSummary.days1_30} total={receivablesSummary.total} color="bg-yellow-500" />
              <AgingBar label="31-60 Days" amount={receivablesSummary.days31_60} total={receivablesSummary.total} color="bg-orange-500" />
              <AgingBar label="61-90 Days" amount={receivablesSummary.days61_90} total={receivablesSummary.total} color="bg-red-500" />
              <AgingBar label="90+ Days" amount={receivablesSummary.days90Plus} total={receivablesSummary.total} color="bg-red-700" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-600">Payables Aging</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <AgingBar label="Current" amount={payablesSummary.current} total={payablesSummary.total} color="bg-green-500" />
              <AgingBar label="1-30 Days" amount={payablesSummary.days1_30} total={payablesSummary.total} color="bg-yellow-500" />
              <AgingBar label="31-60 Days" amount={payablesSummary.days31_60} total={payablesSummary.total} color="bg-orange-500" />
              <AgingBar label="61-90 Days" amount={payablesSummary.days61_90} total={payablesSummary.total} color="bg-red-500" />
              <AgingBar label="90+ Days" amount={payablesSummary.days90Plus} total={payablesSummary.total} color="bg-red-700" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Tabs */}
      <Tabs defaultValue="receivables" className="space-y-4">
        <TabsList>
          <TabsTrigger value="receivables" className="gap-2">
            <Users className="h-4 w-4" />
            Receivables ({filterByAging(receivables).length})
          </TabsTrigger>
          <TabsTrigger value="payables" className="gap-2">
            <Truck className="h-4 w-4" />
            Payables ({filterByAging(payables).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receivables">
          <OutstandingTable 
            entries={filterByAging(receivables)} 
            loading={loading} 
            formatCurrency={formatCurrency} 
            getAgingBucket={getAgingBucket}
            type="receivable"
          />
        </TabsContent>
        <TabsContent value="payables">
          <OutstandingTable 
            entries={filterByAging(payables)} 
            loading={loading} 
            formatCurrency={formatCurrency} 
            getAgingBucket={getAgingBucket}
            type="payable"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AgingBar({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const percentage = total > 0 ? (amount / total) * 100 : 0
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(value)
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{formatCurrency(amount)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function OutstandingTable({ 
  entries, 
  loading, 
  formatCurrency, 
  getAgingBucket,
  type
}: { 
  entries: OutstandingEntry[]
  loading: boolean
  formatCurrency: (value: number) => string
  getAgingBucket: (days: number) => { label: string; color: string }
  type: 'receivable' | 'payable'
}) {
  return (
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
                  <TableHead>{type === 'receivable' ? 'Customer' : 'Supplier'}</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Aging</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No outstanding {type === 'receivable' ? 'receivables' : 'payables'} found
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => {
                    const aging = getAgingBucket(entry.daysOverdue)
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{entry.partyName}</p>
                            {entry.phone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {entry.phone}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{entry.documentNo}</TableCell>
                        <TableCell>{format(new Date(entry.documentDate), 'dd MMM yy')}</TableCell>
                        <TableCell>{format(new Date(entry.dueDate), 'dd MMM yy')}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.totalAmount)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(entry.paidAmount)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(entry.balance)}</TableCell>
                        <TableCell>
                          <Badge className={aging.color}>
                            {aging.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            {type === 'receivable' ? 'Send Reminder' : 'Schedule Payment'}
                          </Button>
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
  )
}
