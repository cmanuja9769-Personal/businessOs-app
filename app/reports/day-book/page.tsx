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
  Calendar, 
  Filter,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Receipt
} from "lucide-react"
import Link from "next/link"
import { format, startOfDay, endOfDay } from "date-fns"

interface DayBookEntry {
  id: string
  time: string
  type: 'sale' | 'purchase' | 'payment_in' | 'payment_out' | 'expense' | 'credit_note' | 'debit_note'
  documentNo: string
  partyName: string
  description: string
  debit: number
  credit: number
}

export default function DayBookPage() {
  const [entries, setEntries] = useState<DayBookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [typeFilter, setTypeFilter] = useState("all")

  useEffect(() => {
    fetchDayBookEntries()
  }, [selectedDate])

  const fetchDayBookEntries = async () => {
    setLoading(true)
    try {
      const dayStart = startOfDay(new Date(selectedDate))
      const dayEnd = endOfDay(new Date(selectedDate))

      // Fetch all transaction types
      const [invoicesRes, purchasesRes, paymentsRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/purchases'),
        fetch('/api/payments')
      ])

      const invoices = invoicesRes.ok ? await invoicesRes.json() : []
      const purchases = purchasesRes.ok ? await purchasesRes.json() : []
      const payments = paymentsRes.ok ? await paymentsRes.json() : []

      const dayBookEntries: DayBookEntry[] = []

      // Add sales
      invoices.forEach((inv: any) => {
        const invDate = new Date(inv.invoiceDate)
        if (invDate >= dayStart && invDate <= dayEnd) {
          dayBookEntries.push({
            id: inv.id,
            time: format(invDate, 'HH:mm'),
            type: 'sale',
            documentNo: inv.invoiceNo,
            partyName: inv.customerName,
            description: `Sales Invoice`,
            debit: inv.total || 0,
            credit: 0
          })
        }
      })

      // Add purchases
      purchases.forEach((pur: any) => {
        const purDate = new Date(pur.date)
        if (purDate >= dayStart && purDate <= dayEnd) {
          dayBookEntries.push({
            id: pur.id,
            time: format(purDate, 'HH:mm'),
            type: 'purchase',
            documentNo: pur.purchaseNo,
            partyName: pur.supplierName,
            description: `Purchase Invoice`,
            debit: 0,
            credit: pur.total || 0
          })
        }
      })

      // Add payments
      payments.forEach((pay: any) => {
        const payDate = new Date(pay.paymentDate || pay.date)
        if (payDate >= dayStart && payDate <= dayEnd) {
          const isIncoming = pay.type === 'receipt' || pay.type === 'incoming'
          dayBookEntries.push({
            id: pay.id,
            time: format(payDate, 'HH:mm'),
            type: isIncoming ? 'payment_in' : 'payment_out',
            documentNo: pay.paymentNo || pay.referenceNo,
            partyName: pay.partyName || pay.customerName || pay.supplierName || '-',
            description: `${isIncoming ? 'Payment Received' : 'Payment Made'} - ${pay.paymentMode || 'Cash'}`,
            debit: isIncoming ? (pay.amount || 0) : 0,
            credit: isIncoming ? 0 : (pay.amount || 0)
          })
        }
      })

      // Sort by time
      dayBookEntries.sort((a, b) => a.time.localeCompare(b.time))

      setEntries(dayBookEntries)
    } catch (error) {
      console.error('Failed to fetch day book entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'sale':
        return { label: 'Sale', color: 'bg-green-500/10 text-green-700', icon: ArrowUpRight }
      case 'purchase':
        return { label: 'Purchase', color: 'bg-red-500/10 text-red-700', icon: ArrowDownLeft }
      case 'payment_in':
        return { label: 'Receipt', color: 'bg-blue-500/10 text-blue-700', icon: ArrowDownLeft }
      case 'payment_out':
        return { label: 'Payment', color: 'bg-orange-500/10 text-orange-700', icon: ArrowUpRight }
      case 'expense':
        return { label: 'Expense', color: 'bg-purple-500/10 text-purple-700', icon: Receipt }
      case 'credit_note':
        return { label: 'Credit Note', color: 'bg-pink-500/10 text-pink-700', icon: FileText }
      case 'debit_note':
        return { label: 'Debit Note', color: 'bg-indigo-500/10 text-indigo-700', icon: FileText }
      default:
        return { label: type, color: 'bg-gray-500/10 text-gray-700', icon: FileText }
    }
  }

  const filteredEntries = entries.filter(e => 
    typeFilter === "all" || e.type === typeFilter
  )

  const totals = filteredEntries.reduce((acc, e) => ({
    debit: acc.debit + e.debit,
    credit: acc.credit + e.credit
  }), { debit: 0, credit: 0 })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value)
  }

  const exportToCSV = () => {
    const headers = ['Time', 'Type', 'Document No', 'Party', 'Description', 'Debit', 'Credit']
    const rows = filteredEntries.map(e => [
      e.time,
      getTypeInfo(e.type).label,
      e.documentNo,
      e.partyName,
      e.description,
      e.debit.toFixed(2),
      e.credit.toFixed(2)
    ])

    const csvContent = [
      `Day Book - ${format(new Date(selectedDate), 'dd MMMM yyyy')}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `day-book-${selectedDate}.csv`
    link.click()
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 report-container">
      {/* Print Header */}
      <div className="hidden print:block report-header">
        <h1>Day Book</h1>
        <div className="date-range">{format(new Date(selectedDate), 'dd MMMM yyyy')}</div>
      </div>

      {/* Print Summary */}
      <div className="hidden print:block summary-cards">
        <div>
          <div className="stat-label">Total Entries</div>
          <div className="stat-value">{filteredEntries.length}</div>
        </div>
        <div>
          <div className="stat-label">Total Debit</div>
          <div className="stat-value">{formatCurrency(totals.debit)}</div>
        </div>
        <div>
          <div className="stat-label">Total Credit</div>
          <div className="stat-value">{formatCurrency(totals.credit)}</div>
        </div>
        <div>
          <div className="stat-label">Net Balance</div>
          <div className="stat-value">{formatCurrency(totals.debit - totals.credit)}</div>
        </div>
      </div>

      {/* Print Table */}
      <table className="hidden print:table print-table">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Time</th>
            <th>Type</th>
            <th>Document No</th>
            <th>Party Name</th>
            <th>Description</th>
            <th style={{ textAlign: 'right' }}>Debit (₹)</th>
            <th style={{ textAlign: 'right' }}>Credit (₹)</th>
          </tr>
        </thead>
        <tbody>
          {filteredEntries.map((entry, index) => (
            <tr key={entry.id}>
              <td>{index + 1}</td>
              <td>{entry.time}</td>
              <td>{getTypeInfo(entry.type).label}</td>
              <td>{entry.documentNo}</td>
              <td>{entry.partyName}</td>
              <td>{entry.description}</td>
              <td style={{ textAlign: 'right' }}>{entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</td>
              <td style={{ textAlign: 'right' }}>{entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="totals-row">
            <td colSpan={6} style={{ textAlign: 'right', fontWeight: 'bold' }}>TOTAL:</td>
            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(totals.debit)}</td>
            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(totals.credit)}</td>
          </tr>
          <tr>
            <td colSpan={6} style={{ textAlign: 'right', fontWeight: 'bold' }}>NET BALANCE:</td>
            <td colSpan={2} style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(totals.debit - totals.credit)}</td>
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
              <Calendar className="h-6 w-6 text-blue-600" />
              Day Book
            </h1>
            <p className="text-sm text-muted-foreground">All transactions for a single day</p>
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
            Select Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="sale">Sales</SelectItem>
                  <SelectItem value="purchase">Purchases</SelectItem>
                  <SelectItem value="payment_in">Receipts</SelectItem>
                  <SelectItem value="payment_out">Payments</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Debit</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.debit)}</p>
                <p className="text-xs text-muted-foreground">Money In</p>
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
                <p className="text-xs text-muted-foreground">Total Credit</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.credit)}</p>
                <p className="text-xs text-muted-foreground">Money Out</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10">
                <ArrowUpRight className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Net Balance</p>
                <p className={`text-2xl font-bold ${totals.debit - totals.credit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totals.debit - totals.credit)}
                </p>
                <p className="text-xs text-muted-foreground">{filteredEntries.length} transactions</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day Book Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Transactions on {format(new Date(selectedDate), 'EEEE, dd MMMM yyyy')}
            </CardTitle>
            <Badge variant="outline">{filteredEntries.length} entries</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Document No</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No transactions recorded on this date
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {filteredEntries.map((entry) => {
                        const typeInfo = getTypeInfo(entry.type)
                        return (
                          <TableRow key={entry.id}>
                            <TableCell className="font-mono text-xs">{entry.time}</TableCell>
                            <TableCell>
                              <Badge className={typeInfo.color}>
                                {typeInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono">{entry.documentNo}</TableCell>
                            <TableCell>{entry.partyName}</TableCell>
                            <TableCell className="text-muted-foreground">{entry.description}</TableCell>
                            <TableCell className="text-right text-green-600">
                              {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {/* Totals Row */}
                      <TableRow className="font-bold bg-muted/50">
                        <TableCell colSpan={5}>Day Total</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(totals.debit)}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(totals.credit)}</TableCell>
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
