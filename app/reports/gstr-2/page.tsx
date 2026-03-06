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
  FileText, 
  Filter,
  Loader2,
  IndianRupee,
  Truck
} from "lucide-react"
import Link from "next/link"
import { format, endOfMonth, subMonths } from "date-fns"
import type { ApiPurchaseResponse } from "@/types/api-responses"
import { ReportActionBar } from "@/components/reports/report-action-bar"
import { exportToCSV as exportCSVUtil, downloadReportPDF } from "@/lib/export-utils"
import { type ReportColumn } from "@/components/reports/compact-report-pdf"

interface GSTR2Entry {
  id: string
  purchaseNo: string
  purchaseDate: string
  supplierName: string
  supplierGstin: string
  placeOfSupply: string
  invoiceType: 'B2B' | 'Import' | 'CDNR'
  taxableValue: number
  cgst: number
  sgst: number
  igst: number
  cess: number
  totalTax: number
  invoiceValue: number
  itcEligible: boolean
}

export default function GSTR2Page() {
  const [entries, setEntries] = useState<GSTR2Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState("all")

  useEffect(() => {
    async function fetchGSTR2Data() {
    setLoading(true)
    try {
      const [year, monthNum] = month.split('-').map(Number)
      const monthStart = new Date(year, monthNum - 1, 1)
      const monthEnd = endOfMonth(monthStart)

      const response = await fetch('/api/purchases')
      if (!response.ok) throw new Error('Failed to fetch')
      
      const purchases = await response.json()
      
      // Filter purchases for the selected month and map to GSTR-2 format
      const gstr2Data: GSTR2Entry[] = purchases
        .filter((pur: ApiPurchaseResponse) => {
          const purDate = new Date(pur.date)
          return purDate >= monthStart && purDate <= monthEnd
        })
        .map((pur: ApiPurchaseResponse) => {
          const isInterState = pur.placeOfSupply !== pur.stateCode
          
          return {
            id: pur.id,
            purchaseNo: pur.purchaseNo || '',
            purchaseDate: pur.date,
            supplierName: pur.supplierName,
            supplierGstin: pur.supplierGstin || 'N/A',
            placeOfSupply: pur.placeOfSupply || pur.state || 'N/A',
            invoiceType: 'B2B',
            taxableValue: pur.subtotal ?? 0,
            cgst: isInterState ? 0 : (pur.cgst ?? (pur.totalTax ?? 0) / 2),
            sgst: isInterState ? 0 : (pur.sgst ?? (pur.totalTax ?? 0) / 2),
            igst: isInterState ? (pur.igst ?? pur.totalTax ?? 0) : 0,
            cess: pur.cess ?? 0,
            totalTax: pur.totalTax ?? 0,
            invoiceValue: pur.total ?? 0,
            itcEligible: pur.supplierGstin && pur.supplierGstin.length === 15
          }
        })

      setEntries(gstr2Data)
    } catch (error) {
      console.error('Failed to fetch GSTR-2 data:', error)
    } finally {
      setLoading(false)
    }
  }
    fetchGSTR2Data()
  }, [month])

  const filteredEntries = entries.filter(e => 
    invoiceTypeFilter === "all" || e.invoiceType === invoiceTypeFilter
  )

  const eligibleEntries = entries.filter(e => e.itcEligible)

  const summary = {
    totalPurchases: entries.length,
    itcEligibleCount: eligibleEntries.length,
    totalTaxable: entries.reduce((s, e) => s + e.taxableValue, 0),
    totalCgst: entries.reduce((s, e) => s + e.cgst, 0),
    totalSgst: entries.reduce((s, e) => s + e.sgst, 0),
    totalIgst: entries.reduce((s, e) => s + e.igst, 0),
    totalCess: entries.reduce((s, e) => s + e.cess, 0),
    totalTax: entries.reduce((s, e) => s + e.totalTax, 0),
    totalValue: entries.reduce((s, e) => s + e.invoiceValue, 0),
    eligibleITC: eligibleEntries.reduce((s, e) => s + e.totalTax, 0)
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

  const gstr2PdfColumns: ReportColumn[] = [
    { key: "purchaseNo", header: "Purchase No", width: "10%", bold: true },
    { key: "date", header: "Date", width: "9%" },
    { key: "supplierName", header: "Supplier", width: "15%" },
    { key: "gstin", header: "GSTIN", width: "14%" },
    { key: "taxable", header: "Taxable", width: "11%", align: "right" },
    { key: "cgst", header: "CGST", width: "8%", align: "right" },
    { key: "sgst", header: "SGST", width: "8%", align: "right" },
    { key: "igst", header: "IGST", width: "8%", align: "right" },
    { key: "total", header: "Invoice Val", width: "10%", align: "right" },
    { key: "itc", header: "ITC", width: "7%" },
  ]

  const handleExportPDF = async () => {
    const monthLabel = format(new Date(month + "-01"), "MMMM yyyy")
    const data = filteredEntries.map((e) => ({
      purchaseNo: e.purchaseNo,
      date: format(new Date(e.purchaseDate), "dd/MM/yyyy"),
      supplierName: e.supplierName,
      gstin: e.supplierGstin,
      taxable: e.taxableValue,
      cgst: e.cgst,
      sgst: e.sgst,
      igst: e.igst,
      total: e.invoiceValue,
      itc: e.itcEligible ? "Yes" : "No",
    }))
    const pdfTotals = {
      purchaseNo: "Total",
      taxable: summary.totalTaxable,
      cgst: summary.totalCgst,
      sgst: summary.totalSgst,
      igst: summary.totalIgst,
      total: summary.totalValue,
    }
    const { CompactReportPDF } = await import("@/components/reports/compact-report-pdf")
    const React = await import("react")
    await downloadReportPDF(
      React.createElement(CompactReportPDF, {
        title: "GSTR-2 Report",
        subtitle: `Total Purchases: ${summary.totalPurchases} | ITC Eligible: ${summary.itcEligibleCount} | Total Tax: ${formatCurrency(summary.totalTax)}`,
        dateRange: monthLabel,
        columns: gstr2PdfColumns,
        data,
        totals: pdfTotals,
      }),
      `gstr2-${month}.pdf`,
    )
  }

  const handleExportCSV = () => {
    const csvColumns = [
      { key: "purchaseNo", header: "Purchase No" },
      { key: "purchaseDate", header: "Date", format: (_: unknown, row: Record<string, unknown>) => format(new Date(row.purchaseDate as string), "dd/MM/yyyy") },
      { key: "supplierName", header: "Supplier" },
      { key: "supplierGstin", header: "GSTIN" },
      { key: "placeOfSupply", header: "Place of Supply" },
      { key: "taxableValue", header: "Taxable", format: (v: unknown) => ((v as number) || 0).toFixed(2) },
      { key: "cgst", header: "CGST", format: (v: unknown) => ((v as number) || 0).toFixed(2) },
      { key: "sgst", header: "SGST", format: (v: unknown) => ((v as number) || 0).toFixed(2) },
      { key: "igst", header: "IGST", format: (v: unknown) => ((v as number) || 0).toFixed(2) },
      { key: "cess", header: "Cess", format: (v: unknown) => ((v as number) || 0).toFixed(2) },
      { key: "totalTax", header: "Total Tax", format: (v: unknown) => ((v as number) || 0).toFixed(2) },
      { key: "invoiceValue", header: "Invoice Value", format: (v: unknown) => ((v as number) || 0).toFixed(2) },
      { key: "itcEligible", header: "ITC Eligible", format: (v: unknown) => (v ? "Yes" : "No") },
    ] as const
    exportCSVUtil(
      filteredEntries as unknown as Record<string, unknown>[],
      `gstr2-${month}.csv`,
      csvColumns,
      { titleRows: [`GSTR-2 Report - ${format(new Date(month + "-01"), "MMMM yyyy")}`] },
    )
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
              <Truck className="h-6 w-6 text-purple-600" />
              GSTR-2 Report
            </h1>
            <p className="text-sm text-muted-foreground">Inward supplies - Purchase invoices summary</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ReportActionBar
            onExportPDF={handleExportPDF}
            onExportCSV={handleExportCSV}
            disabled={filteredEntries.length === 0}
          />
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
                  <SelectItem value="Import">Import</SelectItem>
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
                <p className="text-xs text-muted-foreground">Total Purchases</p>
                <p className="text-2xl font-bold">{summary.totalPurchases}</p>
                <p className="text-xs text-muted-foreground">ITC Eligible: {summary.itcEligibleCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <FileText className="h-5 w-5 text-purple-600" />
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
              <div className="p-2 rounded-lg bg-blue-500/10">
                <IndianRupee className="h-5 w-5 text-blue-600" />
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
        <Card className="border-green-500/20">
          <CardContent className="pt-4">
            <div>
              <p className="text-xs text-muted-foreground">Eligible ITC</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(summary.eligibleITC)}</p>
              <p className="text-xs text-muted-foreground">Input Tax Credit</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Purchase Details</CardTitle>
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
                    <TableHead>Purchase No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead className="text-right">Taxable</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>ITC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        No purchases found for {format(new Date(month + '-01'), 'MMMM yyyy')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono">{e.purchaseNo}</TableCell>
                        <TableCell>{format(new Date(e.purchaseDate), 'dd/MM/yy')}</TableCell>
                        <TableCell className="max-w-[9.375rem] truncate">{e.supplierName}</TableCell>
                        <TableCell className="font-mono text-xs">{e.supplierGstin}</TableCell>
                        <TableCell className="text-right">{formatCurrency(e.taxableValue)}</TableCell>
                        <TableCell className="text-right">{e.cgst > 0 ? formatCurrency(e.cgst) : '-'}</TableCell>
                        <TableCell className="text-right">{e.sgst > 0 ? formatCurrency(e.sgst) : '-'}</TableCell>
                        <TableCell className="text-right">{e.igst > 0 ? formatCurrency(e.igst) : '-'}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(e.invoiceValue)}</TableCell>
                        <TableCell>
                          <Badge variant={e.itcEligible ? 'default' : 'secondary'} className={e.itcEligible ? 'bg-green-500/10 text-green-700' : ''}>
                            {e.itcEligible ? 'Eligible' : 'N/A'}
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
