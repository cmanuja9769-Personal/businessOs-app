"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  FileText, 
  Filter,
  Loader2,
  IndianRupee,
  Upload
} from "lucide-react"
import Link from "next/link"
import { format, endOfMonth, subMonths } from "date-fns"

interface GSTR1Entry {
  id: string
  invoiceNo: string
  invoiceDate: string
  customerName: string
  customerGstin: string
  placeOfSupply: string
  invoiceType: 'B2B' | 'B2C' | 'Export' | 'CDNR'
  taxableValue: number
  cgst: number
  sgst: number
  igst: number
  cess: number
  totalTax: number
  invoiceValue: number
}

export default function GSTR1Page() {
  const [entries, setEntries] = useState<GSTR1Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState("all")

  useEffect(() => {
    fetchGSTR1Data()
  }, [month])

  const fetchGSTR1Data = async () => {
    setLoading(true)
    try {
      const [year, monthNum] = month.split('-').map(Number)
      const monthStart = new Date(year, monthNum - 1, 1)
      const monthEnd = endOfMonth(monthStart)

      const response = await fetch('/api/invoices')
      if (!response.ok) throw new Error('Failed to fetch')
      
      const invoices = await response.json()
      
      // Filter invoices for the selected month and map to GSTR-1 format
      const gstr1Data: GSTR1Entry[] = invoices
        .filter((inv: any) => {
          const invDate = new Date(inv.invoiceDate)
          return invDate >= monthStart && invDate <= monthEnd
        })
        .map((inv: any) => {
          const hasGstin = inv.customerGstin && inv.customerGstin.length === 15
          const isInterState = inv.placeOfSupply !== inv.stateCode
          
          return {
            id: inv.id,
            invoiceNo: inv.invoiceNo,
            invoiceDate: inv.invoiceDate,
            customerName: inv.customerName,
            customerGstin: inv.customerGstin || 'N/A',
            placeOfSupply: inv.placeOfSupply || inv.state || 'N/A',
            invoiceType: hasGstin ? 'B2B' : 'B2C',
            taxableValue: inv.subtotal || 0,
            cgst: isInterState ? 0 : (inv.cgst || inv.totalTax / 2 || 0),
            sgst: isInterState ? 0 : (inv.sgst || inv.totalTax / 2 || 0),
            igst: isInterState ? (inv.igst || inv.totalTax || 0) : 0,
            cess: inv.cess || 0,
            totalTax: inv.totalTax || 0,
            invoiceValue: inv.total || 0
          }
        })

      setEntries(gstr1Data)
    } catch (error) {
      console.error('Failed to fetch GSTR-1 data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEntries = entries.filter(e => 
    invoiceTypeFilter === "all" || e.invoiceType === invoiceTypeFilter
  )

  const b2bEntries = entries.filter(e => e.invoiceType === 'B2B')
  const b2cEntries = entries.filter(e => e.invoiceType === 'B2C')

  const summary = {
    totalInvoices: entries.length,
    b2bCount: b2bEntries.length,
    b2cCount: b2cEntries.length,
    totalTaxable: entries.reduce((s, e) => s + e.taxableValue, 0),
    totalCgst: entries.reduce((s, e) => s + e.cgst, 0),
    totalSgst: entries.reduce((s, e) => s + e.sgst, 0),
    totalIgst: entries.reduce((s, e) => s + e.igst, 0),
    totalCess: entries.reduce((s, e) => s + e.cess, 0),
    totalTax: entries.reduce((s, e) => s + e.totalTax, 0),
    totalValue: entries.reduce((s, e) => s + e.invoiceValue, 0)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value)
  }

  const generateMonthOptions = () => {
    const options = []
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i)
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy')
      })
    }
    return options
  }

  const exportToCSV = () => {
    const headers = [
      'Invoice No', 'Invoice Date', 'Customer Name', 'GSTIN', 
      'Place of Supply', 'Type', 'Taxable Value', 'CGST', 'SGST', 
      'IGST', 'Cess', 'Total Tax', 'Invoice Value'
    ]
    const rows = filteredEntries.map(e => [
      e.invoiceNo,
      format(new Date(e.invoiceDate), 'dd/MM/yyyy'),
      e.customerName,
      e.customerGstin,
      e.placeOfSupply,
      e.invoiceType,
      e.taxableValue.toFixed(2),
      e.cgst.toFixed(2),
      e.sgst.toFixed(2),
      e.igst.toFixed(2),
      e.cess.toFixed(2),
      e.totalTax.toFixed(2),
      e.invoiceValue.toFixed(2)
    ])

    const csvContent = [
      `GSTR-1 Report - ${format(new Date(month + '-01'), 'MMMM yyyy')}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `gstr1-${month}.csv`
    link.click()
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 report-container">
      {/* Print Header */}
      <div className="hidden print:block report-header">
        <h1>GSTR-1 Report</h1>
        <div className="date-range">Return Period: {format(new Date(month + '-01'), 'MMMM yyyy')}</div>
        <div className="text-sm mt-1">Outward Supplies (Sales)</div>
      </div>

      {/* Print Summary */}
      <div className="hidden print:block summary-cards">
        <div>
          <div className="stat-label">Total Invoices</div>
          <div className="stat-value">{summary.totalInvoices}</div>
        </div>
        <div>
          <div className="stat-label">Taxable Value</div>
          <div className="stat-value">{formatCurrency(summary.totalTaxable)}</div>
        </div>
        <div>
          <div className="stat-label">Total Tax</div>
          <div className="stat-value">{formatCurrency(summary.totalTax)}</div>
        </div>
        <div>
          <div className="stat-label">Invoice Value</div>
          <div className="stat-value">{formatCurrency(summary.totalValue)}</div>
        </div>
      </div>

      {/* Print Table */}
      <table className="hidden print:table print-table">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Invoice No</th>
            <th>Date</th>
            <th>Customer</th>
            <th>GSTIN</th>
            <th>Type</th>
            <th style={{ textAlign: 'right' }}>Taxable</th>
            <th style={{ textAlign: 'right' }}>CGST</th>
            <th style={{ textAlign: 'right' }}>SGST</th>
            <th style={{ textAlign: 'right' }}>IGST</th>
            <th style={{ textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {filteredEntries.map((entry, index) => (
            <tr key={entry.id}>
              <td>{index + 1}</td>
              <td>{entry.invoiceNo}</td>
              <td>{format(new Date(entry.invoiceDate), 'dd/MM/yyyy')}</td>
              <td>{entry.customerName}</td>
              <td style={{ fontFamily: 'monospace', fontSize: '8pt' }}>{entry.customerGstin}</td>
              <td>{entry.invoiceType}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(entry.taxableValue)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(entry.cgst)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(entry.sgst)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(entry.igst)}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(entry.invoiceValue)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="totals-row">
            <td colSpan={6} style={{ textAlign: 'right', fontWeight: 'bold' }}>TOTAL:</td>
            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(summary.totalTaxable)}</td>
            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(summary.totalCgst)}</td>
            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(summary.totalSgst)}</td>
            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(summary.totalIgst)}</td>
            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(summary.totalValue)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Print Footer */}
      <div className="hidden print:block report-footer">
        <p>Generated on {format(new Date(), 'dd MMM yyyy, hh:mm a')} | B2B: {summary.b2bCount} | B2C: {summary.b2cCount}</p>
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
              <FileText className="h-6 w-6 text-blue-600" />
              GSTR-1 Report
            </h1>
            <p className="text-sm text-muted-foreground">Outward supplies - Sales invoices summary</p>
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
          <Button variant="default" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Export for Filing
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Period Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Return Period</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {generateMonthOptions().map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Invoice Type</Label>
              <Select value={invoiceTypeFilter} onValueChange={setInvoiceTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="B2B">B2B - Business to Business</SelectItem>
                  <SelectItem value="B2C">B2C - Business to Consumer</SelectItem>
                  <SelectItem value="Export">Export</SelectItem>
                  <SelectItem value="CDNR">Credit/Debit Notes</SelectItem>
                </SelectContent>
              </Select>
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
                <p className="text-xs text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold">{summary.totalInvoices}</p>
                <p className="text-xs text-muted-foreground">B2B: {summary.b2bCount} | B2C: {summary.b2cCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Taxable Value</p>
                <p className="text-xl font-bold">{formatCurrency(summary.totalTaxable)}</p>
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
              <p className="text-xs text-muted-foreground">CGST + SGST</p>
              <p className="text-xl font-bold">
                {formatCurrency(summary.totalCgst + summary.totalSgst)}
              </p>
              <p className="text-xs text-muted-foreground">
                C: {formatCurrency(summary.totalCgst)} | S: {formatCurrency(summary.totalSgst)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div>
              <p className="text-xs text-muted-foreground">IGST</p>
              <p className="text-xl font-bold">{formatCurrency(summary.totalIgst)}</p>
              <p className="text-xs text-muted-foreground">Interstate</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20">
          <CardContent className="pt-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Tax Liability</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(summary.totalTax)}</p>
              <p className="text-xs text-muted-foreground">Output tax</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Invoice Details</CardTitle>
            <Badge variant="outline">{filteredEntries.length} records</Badge>
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
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Taxable</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        No invoices found for {format(new Date(month + '-01'), 'MMMM yyyy')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono">{e.invoiceNo}</TableCell>
                        <TableCell>{format(new Date(e.invoiceDate), 'dd/MM/yy')}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{e.customerName}</TableCell>
                        <TableCell className="font-mono text-xs">{e.customerGstin}</TableCell>
                        <TableCell>
                          <Badge variant={e.invoiceType === 'B2B' ? 'default' : 'secondary'}>
                            {e.invoiceType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(e.taxableValue)}</TableCell>
                        <TableCell className="text-right">{e.cgst > 0 ? formatCurrency(e.cgst) : '-'}</TableCell>
                        <TableCell className="text-right">{e.sgst > 0 ? formatCurrency(e.sgst) : '-'}</TableCell>
                        <TableCell className="text-right">{e.igst > 0 ? formatCurrency(e.igst) : '-'}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(e.invoiceValue)}</TableCell>
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
