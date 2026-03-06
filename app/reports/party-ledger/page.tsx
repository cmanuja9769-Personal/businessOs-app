"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  BookOpen,
  IndianRupee,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  User,
  FileDown,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { format, endOfMonth } from "date-fns"
import { ReportFilter, getDefaultFilters, type ReportFilters } from "@/components/reports/report-filter"
import { type ReportColumn } from "@/components/reports/compact-report-pdf"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import { ClientErrorBoundary } from "@/components/ui/client-error-boundary"
import { downloadReportPDF } from "@/lib/export-utils"
import { ExportOverlay } from "@/components/ui/export-overlay"
import { yieldToMain } from "@/lib/export-utils"

const ISO_DATE = "yyyy-MM-dd"
const DISPLAY_DATE = "dd MMM yyyy"
const COLOR_POSITIVE = "text-green-600"
const COLOR_NEGATIVE = "text-red-600"

interface Party {
  id: string
  name: string
  type: "customer" | "supplier"
  phone?: string
  gstin?: string
  opening_balance?: number
}

interface LedgerEntry {
  date: string
  type: string
  documentNo: string
  description: string
  debit: number
  credit: number
  balance: number
}

function buildOpeningEntry(openingBalance: number, dateFrom: string): LedgerEntry | null {
  if (openingBalance === 0) return null
  return {
    date: dateFrom,
    type: "Opening",
    documentNo: "-",
    description: "Opening Balance B/F",
    debit: openingBalance > 0 ? openingBalance : 0,
    credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
    balance: openingBalance,
  }
}

function applyRunningBalance(entries: LedgerEntry[], startBalance: number, apiData: LedgerEntry[]): void {
  let runningBalance = startBalance
  for (const row of apiData) {
    runningBalance += row.debit - row.credit
    entries.push({ ...row, balance: runningBalance })
  }
}

export default function PartyLedgerPage() {
  const [parties, setParties] = useState<Party[]>([])
  const [selectedParty, setSelectedParty] = useState<string>("")
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [partyType, setPartyType] = useState<string>("all")
  const [filters, setFilters] = useState<ReportFilters>(() => {
    const now = new Date()
    const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
    return getDefaultFilters({
      dateFrom: format(new Date(fyStartYear, 3, 1), ISO_DATE),
      dateTo: format(endOfMonth(new Date()), ISO_DATE),
    })
  })

  useEffect(() => {
    const fetchParties = async () => {
      try {
        const [customersRes, suppliersRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/suppliers"),
        ])

        const customers = customersRes.ok ? await customersRes.json() : []
        const suppliers = suppliersRes.ok ? await suppliersRes.json() : []

        const allParties: Party[] = [
          ...customers.map((c: Party) => ({ ...c, type: "customer" as const })),
          ...suppliers.map((s: Party) => ({ ...s, type: "supplier" as const })),
        ]
        setParties(allParties)
      } catch (error) {
        console.error("Failed to fetch parties:", error)
      }
    }

    fetchParties()
  }, [])

  const fetchLedger = useCallback(async () => {
    const party = parties.find((p) => p.id === selectedParty)
    if (!party) return

    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({
        partyId: selectedParty,
        partyType: party.type,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      })

      const res = await fetch(`/api/reports/party-ledger?${params}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Server returned ${res.status}`)
      }

      const { data } = await res.json()
      const entries: LedgerEntry[] = []
      const openingBalance = party.opening_balance || 0

      const openingEntry = buildOpeningEntry(openingBalance, filters.dateFrom)
      if (openingEntry) entries.push(openingEntry)

      applyRunningBalance(entries, openingBalance, data)

      setLedgerEntries(entries)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch ledger data"
      console.error("Failed to fetch ledger:", error)
      setFetchError(message)
    } finally {
      setLoading(false)
    }
  }, [parties, selectedParty, filters.dateFrom, filters.dateTo])

  useEffect(() => {
    if (selectedParty && parties.length > 0) fetchLedger()
  }, [selectedParty, parties, fetchLedger])

  const filteredParties = useMemo(() => {
    return parties.filter((p) => partyType === "all" || p.type === partyType)
  }, [parties, partyType])

  const selectedPartyData = parties.find((p) => p.id === selectedParty)
  const totalDebit = ledgerEntries.reduce((sum, e) => sum + e.debit, 0)
  const totalCredit = ledgerEntries.reduce((sum, e) => sum + e.credit, 0)
  const closingBalance = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].balance : 0

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(Math.abs(value))

  const filterFields = useMemo(
    () => [{ type: "date-range" as const, key: "dateFrom" as const, label: "Date Range" }],
    []
  )

  const pdfColumns: ReportColumn[] = [
    { key: "date", header: "Date", width: "12%" },
    { key: "documentNo", header: "Document No", width: "14%", bold: true },
    { key: "description", header: "Description", width: "28%" },
    { key: "debit", header: "Debit", width: "14%", align: "right" },
    { key: "credit", header: "Credit", width: "14%", align: "right" },
    { key: "balance", header: "Balance", width: "18%", align: "right" },
  ]

  const handleDownloadPDF = async () => {
    if (!selectedPartyData) return
    setPdfGenerating(true)
    try {
      const dateRange = `${format(new Date(filters.dateFrom), DISPLAY_DATE)} - ${format(new Date(filters.dateTo), DISPLAY_DATE)}`

      const pdfData = ledgerEntries.map((entry) => ({
        date: format(new Date(entry.date), "dd/MM/yyyy"),
        documentNo: entry.documentNo,
        description: entry.description,
        debit: entry.debit > 0 ? entry.debit : "",
        credit: entry.credit > 0 ? entry.credit : "",
        balance: entry.balance,
      }))

      const pdfTotals = {
        date: "",
        documentNo: "",
        description: "Totals",
        debit: totalDebit,
        credit: totalCredit,
        balance: closingBalance,
      }

      const { CompactReportPDF } = await import("@/components/reports/compact-report-pdf")
      await yieldToMain()
      await downloadReportPDF(
        <CompactReportPDF
          title={`Party Ledger: ${selectedPartyData.name}`}
          subtitle={`${selectedPartyData.type === "customer" ? "Customer" : "Supplier"} | ${selectedPartyData.gstin || "No GSTIN"} | Closing: ${formatCurrency(closingBalance)} ${closingBalance >= 0 ? "Dr" : "Cr"}`}
          dateRange={dateRange}
          columns={pdfColumns}
          data={pdfData}
          totals={pdfTotals}
          highlightRow={(row) => {
            const bal = row.balance as number
            if (bal < 0) return "red"
            return null
          }}
        />,
        `party-ledger-${selectedPartyData.name.replace(/[^a-zA-Z0-9]/g, "-")}-${format(new Date(), ISO_DATE)}.pdf`,
      )
    } catch (error) {
      console.error("PDF generation failed:", error)
    } finally {
      setPdfGenerating(false)
    }
  }

  const exportToCSV = () => {
    if (!selectedPartyData) return

    const headers = ["Date", "Document No", "Description", "Debit", "Credit", "Balance"]
    const rows = ledgerEntries.map((entry) => [
      format(new Date(entry.date), "dd/MM/yyyy"),
      entry.documentNo,
      entry.description,
      entry.debit.toFixed(2),
      entry.credit.toFixed(2),
      entry.balance.toFixed(2),
    ])

    const csvContent = [
      `Party Ledger: ${selectedPartyData.name}`,
      `Period: ${filters.dateFrom} to ${filters.dateTo}`,
      "",
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `party-ledger-${selectedPartyData.name.replace(/[^a-zA-Z0-9]/g, "-")}-${filters.dateFrom}-to-${filters.dateTo}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <ClientErrorBoundary fallbackTitle="Party ledger encountered an error">
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
              <BookOpen className="h-6 w-6 text-purple-600" />
              Party Ledger
            </h1>
            <p className="text-sm text-muted-foreground">Statement of account with running balance</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportOverlay visible={pdfGenerating} />
          <Button onClick={handleDownloadPDF} variant="outline" size="sm" disabled={!selectedParty || pdfGenerating}>
            {pdfGenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
            {pdfGenerating ? "Generating..." : "PDF"}
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm" disabled={!selectedParty}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Party Type</Label>
              <Select value={partyType} onValueChange={(v) => { setPartyType(v); setSelectedParty(""); setLedgerEntries([]) }}>
                <SelectTrigger className="h-9 w-[9rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parties</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                  <SelectItem value="supplier">Suppliers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[14rem]">
              <Label className="text-xs">Select Party</Label>
              <Select value={selectedParty} onValueChange={setSelectedParty}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Choose a party..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredParties.map((party) => (
                    <SelectItem key={party.id} value={party.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[0.625rem]">
                          {party.type === "customer" ? "C" : "S"}
                        </Badge>
                        {party.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <ReportFilter
        fields={filterFields}
        filters={filters}
        onFiltersChange={setFilters}
        onApply={() => { if (selectedParty) fetchLedger() }}
        loading={loading}
      />

      {selectedParty && selectedPartyData && (
        <>
          <div className="grid gap-4 lg:grid-cols-4">
            <Card className="lg:col-span-1">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <User className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{selectedPartyData.name}</p>
                    <Badge variant="outline" className="text-xs">
                      {selectedPartyData.type === "customer" ? "Customer" : "Supplier"}
                    </Badge>
                  </div>
                </div>
                {selectedPartyData.gstin && (
                  <p className="text-xs text-muted-foreground">GSTIN: {selectedPartyData.gstin}</p>
                )}
                {selectedPartyData.phone && (
                  <p className="text-xs text-muted-foreground">Phone: {selectedPartyData.phone}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Debit</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalDebit)}</p>
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
                    <p className="text-xs text-muted-foreground">Total Credit</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalCredit)}</p>
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
                    <p className="text-xs text-muted-foreground">Closing Balance</p>
                    <p className={`text-2xl font-bold ${closingBalance >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE}`}>
                      {formatCurrency(closingBalance)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {closingBalance >= 0 ? "Receivable" : "Payable"}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <IndianRupee className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-4">
              {(() => {
                if (loading) {
                  return (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )
                }
                if (fetchError) {
                  return (
                    <DataEmptyState
                      icon={<AlertCircle className="h-12 w-12" />}
                      title="Failed to load ledger"
                      description={fetchError}
                      action={
                        <Button variant="outline" size="sm" onClick={() => void fetchLedger()}>
                          Retry
                        </Button>
                      }
                    />
                  )
                }
                return (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Document No</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No transactions found for the selected period
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {ledgerEntries.map((entry, idx) => (
                            <TableRow
                              key={`${entry.date}-${entry.documentNo}-${idx}`}
                              className={entry.type === "Opening" ? "bg-blue-50/50 dark:bg-blue-950/20 font-medium" : ""}
                            >
                              <TableCell>{format(new Date(entry.date), DISPLAY_DATE)}</TableCell>
                              <TableCell className="font-mono">{entry.documentNo}</TableCell>
                              <TableCell>{entry.description}</TableCell>
                              <TableCell className="text-right">
                                {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                              </TableCell>
                              <TableCell className={`text-right font-medium ${entry.balance >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE}`}>
                                {formatCurrency(entry.balance)}
                                <span className="text-xs ml-1">{entry.balance >= 0 ? "Dr" : "Cr"}</span>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-muted/50">
                            <TableCell colSpan={3}>Totals</TableCell>
                            <TableCell className="text-right">{formatCurrency(totalDebit)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(totalCredit)}</TableCell>
                            <TableCell className={`text-right ${closingBalance >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE}`}>
                              {formatCurrency(closingBalance)}
                              <span className="text-xs ml-1">{closingBalance >= 0 ? "Dr" : "Cr"}</span>
                            </TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )
              })()}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedParty && (
        <Card>
          <CardContent className="py-12">
            <DataEmptyState
              icon={<BookOpen className="h-12 w-12" />}
              title="Select a party to view ledger"
              description="Choose a customer or supplier from the dropdown above to see their transaction history"
            />
          </CardContent>
        </Card>
      )}
    </div>
    </ClientErrorBoundary>
  )
}
