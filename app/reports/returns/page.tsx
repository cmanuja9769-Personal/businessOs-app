"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  RotateCcw, 
  Filter,
  IndianRupee,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight
} from "lucide-react"
import Link from "next/link"
import { format, startOfMonth, endOfMonth } from "date-fns"

interface ReturnEntry {
  id: string
  returnNo: string
  originalInvoiceNo: string
  partyName: string
  date: string
  type: 'credit_note' | 'debit_note'
  amount: number
  reason: string
  status: 'pending' | 'processed'
}

export default function ReturnsReportPage() {
  const [returns, setReturns] = useState<ReturnEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [typeFilter, setTypeFilter] = useState<string>("all")

  useEffect(() => {
    fetchReturns()
  }, [])

  const fetchReturns = async () => {
    setLoading(true)
    try {
      // Fetch credit notes and debit notes from invoices API
      const response = await fetch('/api/invoices')
      if (!response.ok) throw new Error('Failed to fetch')
      
      const invoices = await response.json()
      
      // Filter for credit notes and debit notes
      const returnEntries: ReturnEntry[] = invoices
        .filter((inv: any) => inv.documentType === 'credit_note' || inv.documentType === 'debit_note')
        .map((inv: any) => ({
          id: inv.id,
          returnNo: inv.invoiceNo,
          originalInvoiceNo: inv.notes?.includes('INV-') ? inv.notes.match(/INV-\d+/)?.[0] : '-',
          partyName: inv.customerName,
          date: inv.invoiceDate,
          type: inv.documentType as 'credit_note' | 'debit_note',
          amount: inv.total,
          reason: inv.notes || 'Not specified',
          status: inv.status === 'paid' ? 'processed' as const : 'pending' as const
        }))

      setReturns(returnEntries)
    } catch (error) {
      console.error('Failed to fetch returns:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredReturns = returns.filter(ret => {
    const retDate = new Date(ret.date)
    const fromDate = new Date(dateFrom)
    const toDate = new Date(dateTo)
    toDate.setHours(23, 59, 59, 999)

    const dateMatch = retDate >= fromDate && retDate <= toDate
    const typeMatch = typeFilter === "all" || ret.type === typeFilter

    return dateMatch && typeMatch
  })

  const creditNotes = filteredReturns.filter(r => r.type === 'credit_note')
  const debitNotes = filteredReturns.filter(r => r.type === 'debit_note')

  const totalCreditNotes = creditNotes.reduce((sum, r) => sum + r.amount, 0)
  const totalDebitNotes = debitNotes.reduce((sum, r) => sum + r.amount, 0)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value)
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
              <RotateCcw className="h-6 w-6 text-orange-600" />
              Returns Report
            </h1>
            <p className="text-sm text-muted-foreground">Credit notes & debit notes summary</p>
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
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="credit_note">Credit Notes (Sales Return)</SelectItem>
                  <SelectItem value="debit_note">Debit Notes (Purchase Return)</SelectItem>
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
                <p className="text-xs text-muted-foreground">Total Returns</p>
                <p className="text-2xl font-bold">{filteredReturns.length}</p>
                <p className="text-xs text-muted-foreground">entries</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <RotateCcw className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Credit Notes</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalCreditNotes)}</p>
                <p className="text-xs text-muted-foreground">{creditNotes.length} notes</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10">
                <ArrowDownLeft className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Debit Notes</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalDebitNotes)}</p>
                <p className="text-xs text-muted-foreground">{debitNotes.length} notes</p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <ArrowUpRight className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Net Impact</p>
                <p className={`text-2xl font-bold ${totalDebitNotes - totalCreditNotes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalDebitNotes - totalCreditNotes)}
                </p>
                <p className="text-xs text-muted-foreground">on business</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <IndianRupee className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Returns ({filteredReturns.length})</TabsTrigger>
          <TabsTrigger value="credit">Credit Notes ({creditNotes.length})</TabsTrigger>
          <TabsTrigger value="debit">Debit Notes ({debitNotes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <ReturnTable returns={filteredReturns} loading={loading} formatCurrency={formatCurrency} />
        </TabsContent>
        <TabsContent value="credit">
          <ReturnTable returns={creditNotes} loading={loading} formatCurrency={formatCurrency} />
        </TabsContent>
        <TabsContent value="debit">
          <ReturnTable returns={debitNotes} loading={loading} formatCurrency={formatCurrency} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ReturnTable({ 
  returns, 
  loading, 
  formatCurrency 
}: { 
  returns: ReturnEntry[]
  loading: boolean
  formatCurrency: (value: number) => string 
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
                  <TableHead>Return No</TableHead>
                  <TableHead>Original Doc</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No return entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  returns.map((ret) => (
                    <TableRow key={ret.id}>
                      <TableCell className="font-mono">{ret.returnNo}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{ret.originalInvoiceNo}</TableCell>
                      <TableCell>{ret.partyName}</TableCell>
                      <TableCell>{format(new Date(ret.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={ret.type === 'credit_note' ? 'destructive' : 'default'}>
                          {ret.type === 'credit_note' ? 'Credit Note' : 'Debit Note'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(ret.amount)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{ret.reason}</TableCell>
                      <TableCell>
                        <Badge variant={ret.status === 'processed' ? 'secondary' : 'outline'}>
                          {ret.status}
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
  )
}
