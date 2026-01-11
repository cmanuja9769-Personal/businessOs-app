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
  BookOpen, 
  Filter,
  IndianRupee,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  User
} from "lucide-react"
import Link from "next/link"
import { format, startOfYear, endOfMonth } from "date-fns"

interface Party {
  id: string
  name: string
  type: 'customer' | 'supplier'
  phone?: string
  gstin?: string
}

interface LedgerEntry {
  id: string
  date: string
  type: 'invoice' | 'payment' | 'credit_note' | 'debit_note' | 'opening'
  documentNo: string
  description: string
  debit: number
  credit: number
  balance: number
}

export default function PartyLedgerPage() {
  const [parties, setParties] = useState<Party[]>([])
  const [selectedParty, setSelectedParty] = useState<string>("")
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState(format(startOfYear(new Date()), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [partyType, setPartyType] = useState<string>("all")

  useEffect(() => {
    fetchParties()
  }, [])

  useEffect(() => {
    if (selectedParty) {
      fetchLedger()
    }
  }, [selectedParty, dateFrom, dateTo])

  const fetchParties = async () => {
    try {
      // Fetch both customers and suppliers
      const [customersRes, suppliersRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/suppliers')
      ])

      const customers = customersRes.ok ? await customersRes.json() : []
      const suppliers = suppliersRes.ok ? await suppliersRes.json() : []

      const allParties: Party[] = [
        ...customers.map((c: {id: string; name: string}) => ({ ...c, type: 'customer' as const })),
        ...suppliers.map((s: {id: string; name: string}) => ({ ...s, type: 'supplier' as const }))
      ]
      setParties(allParties)
    } catch (error) {
      console.error('Failed to fetch parties:', error)
    }
  }

  const fetchLedger = async () => {
    setLoading(true)
    try {
      const party = parties.find(p => p.id === selectedParty)
      if (!party) return

      const fromDate = new Date(dateFrom)
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)

      const entries: LedgerEntry[] = []
      let runningBalance = 0

      // Fetch invoices/purchases and payments
      if (party.type === 'customer') {
        // Fetch invoices for customer
        const invoicesRes = await fetch('/api/invoices')
        const invoices = invoicesRes.ok ? await invoicesRes.json() : []
        
        // Fetch payments
        const paymentsRes = await fetch('/api/payments')
        const payments = paymentsRes.ok ? await paymentsRes.json() : []

        // Filter invoices for this customer
        const customerInvoices = invoices.filter((inv: any) => {
          const invDate = new Date(inv.invoiceDate)
          return inv.customerId === selectedParty && invDate >= fromDate && invDate <= toDate
        })

        // Filter payments for this customer's invoices
        const customerPayments = payments.filter((pay: any) => {
          const payDate = new Date(pay.paymentDate)
          const inv = invoices.find((i: any) => i.id === pay.invoiceId)
          return inv?.customerId === selectedParty && payDate >= fromDate && payDate <= toDate
        })

        // Create ledger entries from invoices (debit - amounts owed)
        customerInvoices.forEach((inv: any) => {
          runningBalance += inv.total
          entries.push({
            id: `inv-${inv.id}`,
            date: inv.invoiceDate,
            type: 'invoice',
            documentNo: inv.invoiceNo,
            description: `Sales Invoice`,
            debit: inv.total,
            credit: 0,
            balance: runningBalance
          })
        })

        // Create ledger entries from payments (credit - amounts received)
        customerPayments.forEach((pay: any) => {
          runningBalance -= pay.amount
          entries.push({
            id: `pay-${pay.id}`,
            date: pay.paymentDate,
            type: 'payment',
            documentNo: pay.referenceNo || 'Payment',
            description: `Payment Received - ${pay.paymentMethod || 'Cash'}`,
            debit: 0,
            credit: pay.amount,
            balance: runningBalance
          })
        })
      } else {
        // Supplier - fetch purchases
        const purchasesRes = await fetch('/api/purchases')
        const purchases = purchasesRes.ok ? await purchasesRes.json() : []
        
        // Fetch payments
        const paymentsRes = await fetch('/api/payments')
        const payments = paymentsRes.ok ? await paymentsRes.json() : []

        // Filter purchases for this supplier
        const supplierPurchases = purchases.filter((pur: any) => {
          const purDate = new Date(pur.date)
          return pur.supplierId === selectedParty && purDate >= fromDate && purDate <= toDate
        })

        // Filter payments for this supplier's purchases
        const supplierPayments = payments.filter((pay: any) => {
          const payDate = new Date(pay.paymentDate)
          const pur = purchases.find((p: any) => p.id === pay.purchaseId)
          return pur?.supplierId === selectedParty && payDate >= fromDate && payDate <= toDate
        })

        // Create ledger entries from purchases (credit - amounts we owe)
        supplierPurchases.forEach((pur: any) => {
          runningBalance -= pur.total
          entries.push({
            id: `pur-${pur.id}`,
            date: pur.date,
            type: 'invoice',
            documentNo: pur.purchaseNo,
            description: `Purchase Invoice`,
            debit: 0,
            credit: pur.total,
            balance: runningBalance
          })
        })

        // Create ledger entries from payments (debit - amounts we paid)
        supplierPayments.forEach((pay: any) => {
          runningBalance += pay.amount
          entries.push({
            id: `pay-${pay.id}`,
            date: pay.paymentDate,
            type: 'payment',
            documentNo: pay.referenceNo || 'Payment',
            description: `Payment Made - ${pay.paymentMethod || 'Cash'}`,
            debit: pay.amount,
            credit: 0,
            balance: runningBalance
          })
        })
      }

      // Sort entries by date
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Recalculate running balance after sort
      let balance = 0
      entries.forEach(entry => {
        balance += entry.debit - entry.credit
        entry.balance = balance
      })

      setLedgerEntries(entries)
    } catch (error) {
      console.error('Failed to fetch ledger:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredParties = parties.filter(p => {
    const typeMatch = partyType === "all" || p.type === partyType
    return typeMatch
  })

  const selectedPartyData = parties.find(p => p.id === selectedParty)
  const totalDebit = ledgerEntries.reduce((sum, e) => sum + e.debit, 0)
  const totalCredit = ledgerEntries.reduce((sum, e) => sum + e.credit, 0)
  const closingBalance = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].balance : 0

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(Math.abs(value))
  }

  const exportToCSV = () => {
    if (!selectedPartyData) return

    const headers = ['Date', 'Document No', 'Description', 'Debit', 'Credit', 'Balance']
    const rows = ledgerEntries.map(entry => [
      format(new Date(entry.date), 'dd/MM/yyyy'),
      entry.documentNo,
      entry.description,
      entry.debit.toFixed(2),
      entry.credit.toFixed(2),
      entry.balance.toFixed(2)
    ])

    const csvContent = [
      `Party Ledger: ${selectedPartyData.name}`,
      `Period: ${dateFrom} to ${dateTo}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `party-ledger-${selectedPartyData.name}-${dateFrom}-to-${dateTo}.csv`
    link.click()
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
              <BookOpen className="h-6 w-6 text-purple-600" />
              Party Ledger
            </h1>
            <p className="text-sm text-muted-foreground">Detailed debit/credit history per party</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm" disabled={!selectedParty}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => window.print()} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Party Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Select Party
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Party Type</Label>
              <Select value={partyType} onValueChange={setPartyType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Parties</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                  <SelectItem value="supplier">Suppliers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Select Party</Label>
              <Select value={selectedParty} onValueChange={setSelectedParty}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a party..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredParties.map(party => (
                    <SelectItem key={party.id} value={party.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {party.type === 'customer' ? 'C' : 'S'}
                        </Badge>
                        {party.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

      {selectedParty && selectedPartyData && (
        <>
          {/* Party Info & Summary */}
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
                      {selectedPartyData.type === 'customer' ? 'Customer' : 'Supplier'}
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
                    <p className={`text-2xl font-bold ${closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(closingBalance)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {closingBalance >= 0 ? 'Receivable' : 'Payable'}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <IndianRupee className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ledger Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ledger Statement</CardTitle>
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
                          {ledgerEntries.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>{format(new Date(entry.date), 'dd MMM yyyy')}</TableCell>
                              <TableCell className="font-mono">{entry.documentNo}</TableCell>
                              <TableCell>{entry.description}</TableCell>
                              <TableCell className="text-right">
                                {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                              </TableCell>
                              <TableCell className={`text-right font-medium ${entry.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(entry.balance)}
                                <span className="text-xs ml-1">
                                  {entry.balance >= 0 ? 'Dr' : 'Cr'}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                          {/* Totals Row */}
                          <TableRow className="font-bold bg-muted/50">
                            <TableCell colSpan={3}>Totals</TableCell>
                            <TableCell className="text-right">{formatCurrency(totalDebit)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(totalCredit)}</TableCell>
                            <TableCell className={`text-right ${closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(closingBalance)}
                            </TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedParty && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a party to view ledger</p>
              <p className="text-sm">Choose a customer or supplier from the dropdown above</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
