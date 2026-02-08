"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  TrendingUp,
  IndianRupee,
  FileText,
  Loader2,
  FileDown,
  FileSpreadsheet,
  LayoutList,
  LayoutGrid,
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { pdf } from "@react-pdf/renderer"
import { ReportFilter, getDefaultFilters, type ReportFilters } from "@/components/reports/report-filter"
import { CompactReportPDF, type ReportColumn, type ReportGroup } from "@/components/reports/compact-report-pdf"

interface InvoiceItem {
  id: string
  itemName: string
  quantity: number
  rate: number
  amount: number
  hsnCode?: string
  gstRate?: number
  cgstAmount?: number
  sgstAmount?: number
  igstAmount?: number
}

interface Invoice {
  id: string
  invoiceNo: string
  customerName: string
  customerGstin?: string
  invoiceDate: string
  total: number
  paidAmount: number
  balance: number
  status: "paid" | "unpaid" | "partial" | "cancelled"
  gstEnabled: boolean
  cgst: number
  sgst: number
  igst: number
  taxableAmount?: number
  invoice_items?: InvoiceItem[]
}

export default function SalesReportPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [filters, setFilters] = useState<ReportFilters>(getDefaultFilters)
  const [viewMode, setViewMode] = useState<"summary" | "itemwise">("summary")

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/invoices")
      if (response.ok) {
        const data = await response.json()
        setInvoices(data)
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const invDateStr = inv.invoiceDate.slice(0, 10)
      const dateMatch = invDateStr >= filters.dateFrom && invDateStr <= filters.dateTo
      const statusMatch = filters.paymentStatus === "all" || inv.status === filters.paymentStatus
      const searchMatch =
        !filters.search ||
        inv.invoiceNo.toLowerCase().includes(filters.search.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(filters.search.toLowerCase()) ||
        (inv.customerGstin || "").toLowerCase().includes(filters.search.toLowerCase())

      return dateMatch && statusMatch && searchMatch
    })
  }, [invoices, filters])

  const activeInvoices = useMemo(() => filteredInvoices.filter((i) => i.status !== "cancelled"), [filteredInvoices])
  const cancelledInvoices = useMemo(() => filteredInvoices.filter((i) => i.status === "cancelled"), [filteredInvoices])

  const totals = useMemo(() => {
    return activeInvoices.reduce(
      (acc, inv) => ({
        total: acc.total + inv.total,
        paid: acc.paid + inv.paidAmount,
        balance: acc.balance + inv.balance,
        taxable: acc.taxable + (inv.taxableAmount || inv.total - (inv.cgst || 0) - (inv.sgst || 0) - (inv.igst || 0)),
        cgst: acc.cgst + (inv.cgst || 0),
        sgst: acc.sgst + (inv.sgst || 0),
        igst: acc.igst + (inv.igst || 0),
      }),
      { total: 0, paid: 0, balance: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0 }
    )
  }, [activeInvoices])

  const itemWiseData = useMemo(() => {
    if (viewMode !== "itemwise") return []
    const rows: Array<Record<string, unknown>> = []
    for (const inv of activeInvoices) {
      for (const item of inv.invoice_items || []) {
        rows.push({
          invoiceNo: inv.invoiceNo,
          date: format(new Date(inv.invoiceDate), "dd/MM/yyyy"),
          customerName: inv.customerName,
          gstin: inv.customerGstin || "-",
          itemName: item.itemName,
          hsn: item.hsnCode || "-",
          qty: item.quantity,
          rate: item.rate,
          amount: item.amount,
          gstRate: item.gstRate ? `${item.gstRate}%` : "-",
          cgst: item.cgstAmount || 0,
          sgst: item.sgstAmount || 0,
          igst: item.igstAmount || 0,
        })
      }
    }
    return rows
  }, [activeInvoices, viewMode])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(value)

  const filterFields = useMemo(
    () => [
      { type: "date-range" as const, key: "dateFrom" as const, label: "Date Range" },
      { type: "search" as const, key: "search" as const, label: "Search", placeholder: "Invoice No / Customer / GSTIN..." },
      {
        type: "select" as const,
        key: "paymentStatus" as const,
        label: "Status",
        options: [
          { value: "all", label: "All" },
          { value: "paid", label: "Paid" },
          { value: "unpaid", label: "Unpaid" },
          { value: "partial", label: "Partial" },
          { value: "cancelled", label: "Cancelled" },
        ],
      },
    ],
    []
  )

  const summaryPdfColumns: ReportColumn[] = [
    { key: "invoiceNo", header: "Invoice No", width: "12%", bold: true },
    { key: "date", header: "Date", width: "10%" },
    { key: "customerName", header: "Customer", width: "20%" },
    { key: "gstin", header: "GSTIN", width: "14%" },
    { key: "taxable", header: "Taxable", width: "11%", align: "right" },
    { key: "gst", header: "GST", width: "11%", align: "right" },
    { key: "total", header: "Total", width: "11%", align: "right" },
    { key: "status", header: "Status", width: "11%", align: "center" },
  ]

  const itemWisePdfColumns: ReportColumn[] = [
    { key: "invoiceNo", header: "Inv No", width: "10%" },
    { key: "date", header: "Date", width: "9%" },
    { key: "customerName", header: "Customer", width: "14%" },
    { key: "itemName", header: "Item", width: "16%" },
    { key: "hsn", header: "HSN", width: "7%" },
    { key: "qty", header: "Qty", width: "6%", align: "right" },
    { key: "rate", header: "Rate", width: "8%", align: "right" },
    { key: "amount", header: "Amount", width: "10%", align: "right" },
    { key: "cgst", header: "CGST", width: "7%", align: "right" },
    { key: "sgst", header: "SGST", width: "7%", align: "right" },
    { key: "igst", header: "IGST", width: "6%", align: "right" },
  ]

  const handleDownloadPDF = async () => {
    setPdfGenerating(true)
    try {
      const dateRange = `${format(new Date(filters.dateFrom), "dd MMM yyyy")} - ${format(new Date(filters.dateTo), "dd MMM yyyy")}`
      const isItemWise = viewMode === "itemwise"
      const columns = isItemWise ? itemWisePdfColumns : summaryPdfColumns

      const data: Record<string, unknown>[] = isItemWise
        ? itemWiseData
        : activeInvoices.map((inv) => ({
            invoiceNo: inv.invoiceNo,
            date: format(new Date(inv.invoiceDate), "dd/MM/yyyy"),
            customerName: inv.customerName,
            gstin: inv.customerGstin || "-",
            taxable: inv.taxableAmount || inv.total - (inv.cgst || 0) - (inv.sgst || 0) - (inv.igst || 0),
            gst: (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0),
            total: inv.total,
            status: inv.status.toUpperCase(),
          }))

      const pdfTotals: Record<string, unknown> = isItemWise
        ? {
            invoiceNo: "Total",
            amount: itemWiseData.reduce((s, r) => s + (r.amount as number), 0),
            cgst: itemWiseData.reduce((s, r) => s + (r.cgst as number), 0),
            sgst: itemWiseData.reduce((s, r) => s + (r.sgst as number), 0),
            igst: itemWiseData.reduce((s, r) => s + (r.igst as number), 0),
          }
        : {
            invoiceNo: "Total",
            taxable: totals.taxable,
            gst: totals.cgst + totals.sgst + totals.igst,
            total: totals.total,
            status: `${activeInvoices.length} invoices`,
          }

      const blob = await pdf(
        <CompactReportPDF
          title={isItemWise ? "Sales Register - Item Wise" : "Sales & GST Register"}
          subtitle={`${activeInvoices.length} invoices | ${cancelledInvoices.length > 0 ? `${cancelledInvoices.length} cancelled excluded` : ""}`}
          dateRange={dateRange}
          columns={columns}
          data={data}
          totals={pdfTotals}
          highlightRow={(row) => {
            if (String(row.status).toLowerCase() === "cancelled") return "red"
            return null
          }}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `sales-register-${format(new Date(), "yyyy-MM-dd")}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("PDF generation failed:", error)
    } finally {
      setPdfGenerating(false)
    }
  }

  const exportToCSV = () => {
    const headers = ["Invoice No", "Customer", "GSTIN", "Date", "Taxable", "CGST", "SGST", "IGST", "Total", "Paid", "Balance", "Status"]
    const rows = activeInvoices.map((inv) => [
      inv.invoiceNo,
      inv.customerName,
      inv.customerGstin || "",
      format(new Date(inv.invoiceDate), "dd/MM/yyyy"),
      (inv.taxableAmount || inv.total - (inv.cgst || 0) - (inv.sgst || 0) - (inv.igst || 0)).toFixed(2),
      (inv.cgst || 0).toFixed(2),
      (inv.sgst || 0).toFixed(2),
      (inv.igst || 0).toFixed(2),
      inv.total.toFixed(2),
      inv.paidAmount.toFixed(2),
      inv.balance.toFixed(2),
      inv.status,
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `sales-report-${filters.dateFrom}-to-${filters.dateTo}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: "bg-green-500/10 text-green-700",
      partial: "bg-yellow-500/10 text-yellow-700",
      unpaid: "bg-red-500/10 text-red-700",
      cancelled: "bg-gray-500/10 text-gray-500 line-through",
    }
    return (
      <Badge variant="secondary" className={styles[status] || ""}>
        {status}
      </Badge>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/reports">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              Sales & GST Register
            </h1>
            <p className="text-sm text-muted-foreground">Invoice-wise and item-wise sales with GST breakdown</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md border overflow-hidden">
            <Button
              variant={viewMode === "summary" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-8"
              onClick={() => setViewMode("summary")}
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1" />
              Summary
            </Button>
            <Button
              variant={viewMode === "itemwise" ? "default" : "ghost"}
              size="sm"
              className="rounded-none h-8"
              onClick={() => setViewMode("itemwise")}
            >
              <LayoutList className="h-3.5 w-3.5 mr-1" />
              Item-wise
            </Button>
          </div>
          <Button onClick={handleDownloadPDF} variant="outline" size="sm" disabled={pdfGenerating || activeInvoices.length === 0}>
            {pdfGenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
            PDF
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm" disabled={activeInvoices.length === 0}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>
      </div>

      <ReportFilter
        fields={filterFields}
        filters={filters}
        onFiltersChange={setFilters}
        onApply={fetchInvoices}
        loading={loading}
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.total)}</p>
                <p className="text-xs text-muted-foreground">{activeInvoices.length} invoices</p>
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
                <p className="text-xs text-muted-foreground">Amount Received</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.paid)}</p>
                <p className="text-xs text-muted-foreground">
                  {totals.total > 0 ? ((totals.paid / totals.total) * 100).toFixed(1) : 0}% collected
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
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.balance)}</p>
                <p className="text-xs text-muted-foreground">
                  {activeInvoices.filter((i) => i.status !== "paid").length} pending
                </p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10">
                <FileText className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total GST</p>
                <p className="text-2xl font-bold">{formatCurrency(totals.cgst + totals.sgst + totals.igst)}</p>
                <p className="text-xs text-muted-foreground">
                  CGST: {formatCurrency(totals.cgst)} | SGST: {formatCurrency(totals.sgst)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <IndianRupee className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {cancelledInvoices.length > 0 && (
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          {cancelledInvoices.length} cancelled invoice(s) excluded from totals
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : viewMode === "summary" ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Taxable</TableHead>
                    <TableHead className="text-right">GST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No invoices found for the selected filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const isCancelled = inv.status === "cancelled"
                      const taxable = inv.taxableAmount || inv.total - (inv.cgst || 0) - (inv.sgst || 0) - (inv.igst || 0)
                      const gst = (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0)
                      return (
                        <TableRow key={inv.id} className={isCancelled ? "opacity-50" : ""}>
                          <TableCell className={`font-mono ${isCancelled ? "line-through" : ""}`}>{inv.invoiceNo}</TableCell>
                          <TableCell className={isCancelled ? "line-through" : ""}>{inv.customerName}</TableCell>
                          <TableCell className="text-xs font-mono">{inv.customerGstin || "-"}</TableCell>
                          <TableCell>{format(new Date(inv.invoiceDate), "dd MMM yyyy")}</TableCell>
                          <TableCell className="text-right">{formatCurrency(taxable)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(gst)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(inv.total)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(inv.paidAmount)}</TableCell>
                          <TableCell>{getStatusBadge(inv.status)}</TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>HSN</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemWiseData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                        No item data found
                      </TableCell>
                    </TableRow>
                  ) : (
                    itemWiseData.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{String(row.invoiceNo)}</TableCell>
                        <TableCell className="text-xs">{String(row.date)}</TableCell>
                        <TableCell className="text-sm">{String(row.customerName)}</TableCell>
                        <TableCell className="font-medium text-sm">{String(row.itemName)}</TableCell>
                        <TableCell className="text-xs font-mono">{String(row.hsn)}</TableCell>
                        <TableCell className="text-right">{String(row.qty)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.rate as number)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(row.amount as number)}</TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(row.cgst as number)}</TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(row.sgst as number)}</TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(row.igst as number)}</TableCell>
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
