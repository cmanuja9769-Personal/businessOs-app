"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  Filter,
  Loader2,
  IndianRupee,
  Calculator,
  CheckCircle2
} from "lucide-react"
import Link from "next/link"
import { format, endOfMonth, subMonths } from "date-fns"
import type { ApiInvoiceResponse, ApiPurchaseResponse } from "@/types/api-responses"

interface GSTR3BData {
  outwardSupplies: {
    b2bTaxable: number
    b2cTaxable: number
    nilRatedExempt: number
    totalTaxable: number
    cgst: number
    sgst: number
    igst: number
    cess: number
    totalTax: number
  }
  inwardSupplies: {
    interStateItc: number
    intraStateItc: number
    importItc: number
    totalItc: number
    cgstItc: number
    sgstItc: number
    igstItc: number
    cessItc: number
  }
  taxPayable: {
    cgst: number
    sgst: number
    igst: number
    cess: number
    total: number
  }
}

export default function GSTR3BPage() {
  const [data, setData] = useState<GSTR3BData | null>(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))

  useEffect(() => {
    async function fetchGSTR3BData() {
    setLoading(true)
    try {
      const [year, monthNum] = month.split('-').map(Number)
      const monthStart = new Date(year, monthNum - 1, 1)
      const monthEnd = endOfMonth(monthStart)

      // Fetch both invoices and purchases
      const [invoicesRes, purchasesRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/purchases')
      ])

      const invoices = invoicesRes.ok ? await invoicesRes.json() : []
      const purchases = purchasesRes.ok ? await purchasesRes.json() : []

      // Filter for the selected month
const monthInvoices = invoices.filter((inv: ApiInvoiceResponse) => {
          const invDate = new Date(inv.invoiceDate)
          return invDate >= monthStart && invDate <= monthEnd
        })

        const monthPurchases = purchases.filter((pur: ApiPurchaseResponse) => {
        const purDate = new Date(pur.date)
        return purDate >= monthStart && purDate <= monthEnd
      })

      // Calculate outward supplies
      let outwardCgst = 0, outwardSgst = 0, outwardIgst = 0, outwardCess = 0
      let b2bTaxable = 0, b2cTaxable = 0

        monthInvoices.forEach((inv: ApiInvoiceResponse) => {
        const hasGstin = inv.customerGstin && inv.customerGstin.length === 15
        const isInterState = inv.placeOfSupply !== inv.stateCode
        const taxable = inv.subtotal || 0
        const tax = inv.totalTax || 0

        if (hasGstin) {
          b2bTaxable += taxable
        } else {
          b2cTaxable += taxable
        }

        if (isInterState) {
          outwardIgst += tax
        } else {
          outwardCgst += tax / 2
          outwardSgst += tax / 2
        }
        outwardCess += inv.cess || 0
      })

      // Calculate inward supplies (ITC)
      let inwardCgst = 0, inwardSgst = 0, inwardIgst = 0, inwardCess = 0
      let interStateItc = 0, intraStateItc = 0

        monthPurchases.forEach((pur: ApiPurchaseResponse) => {
        const hasGstin = pur.supplierGstin && pur.supplierGstin.length === 15
        if (!hasGstin) return // ITC only for registered suppliers

        const isInterState = pur.placeOfSupply !== pur.stateCode
        const tax = pur.totalTax || 0

        if (isInterState) {
          inwardIgst += tax
          interStateItc += tax
        } else {
          inwardCgst += tax / 2
          inwardSgst += tax / 2
          intraStateItc += tax
        }
        inwardCess += pur.cess || 0
      })

      // Calculate tax payable
      const cgstPayable = Math.max(0, outwardCgst - inwardCgst)
      const sgstPayable = Math.max(0, outwardSgst - inwardSgst)
      const igstPayable = Math.max(0, outwardIgst - inwardIgst)
      const cessPayable = Math.max(0, outwardCess - inwardCess)

      setData({
        outwardSupplies: {
          b2bTaxable,
          b2cTaxable,
          nilRatedExempt: 0,
          totalTaxable: b2bTaxable + b2cTaxable,
          cgst: outwardCgst,
          sgst: outwardSgst,
          igst: outwardIgst,
          cess: outwardCess,
          totalTax: outwardCgst + outwardSgst + outwardIgst + outwardCess
        },
        inwardSupplies: {
          interStateItc,
          intraStateItc,
          importItc: 0,
          totalItc: interStateItc + intraStateItc,
          cgstItc: inwardCgst,
          sgstItc: inwardSgst,
          igstItc: inwardIgst,
          cessItc: inwardCess
        },
        taxPayable: {
          cgst: cgstPayable,
          sgst: sgstPayable,
          igst: igstPayable,
          cess: cessPayable,
          total: cgstPayable + sgstPayable + igstPayable + cessPayable
        }
      })
    } catch (error) {
      console.error('Failed to fetch GSTR-3B data:', error)
    } finally {
      setLoading(false)
    }
  }
    fetchGSTR3BData()
  }, [month])

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
              <Calculator className="h-6 w-6 text-orange-600" />
              GSTR-3B Summary
            </h1>
            <p className="text-sm text-muted-foreground">Monthly tax liability summary</p>
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

      {/* Period Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Return Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Label>Select Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {generateMonthOptions().map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          {/* Tax Summary Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="border-blue-500/20">
              <CardContent className="pt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Output Tax</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(data.outwardSupplies.totalTax)}</p>
                  <p className="text-xs text-muted-foreground">On sales</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-500/20">
              <CardContent className="pt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Input Tax Credit</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(data.inwardSupplies.cgstItc + data.inwardSupplies.sgstItc + data.inwardSupplies.igstItc)}</p>
                  <p className="text-xs text-muted-foreground">On purchases</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-500/20 lg:col-span-2">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Net Tax Payable</p>
                    <p className="text-3xl font-bold text-orange-600">{formatCurrency(data.taxPayable.total)}</p>
                    <p className="text-xs text-muted-foreground">After ITC adjustment</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/10">
                    <IndianRupee className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 3.1 Outward Supplies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded text-xs font-mono">3.1</span>
                Outward Supplies (Sales)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nature of Supplies</TableHead>
                    <TableHead className="text-right">Taxable Value</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-right">Cess</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>(a) Outward taxable (B2B)</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.outwardSupplies.b2bTaxable)}</TableCell>
                    <TableCell className="text-right" colSpan={4}></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>(b) Outward taxable (B2C)</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.outwardSupplies.b2cTaxable)}</TableCell>
                    <TableCell className="text-right" colSpan={4}></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>(c) Nil rated, exempted</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.outwardSupplies.nilRatedExempt)}</TableCell>
                    <TableCell className="text-right" colSpan={4}></TableCell>
                  </TableRow>
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total Outward Supplies</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.outwardSupplies.totalTaxable)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.outwardSupplies.cgst)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.outwardSupplies.sgst)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.outwardSupplies.igst)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.outwardSupplies.cess)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 4. Input Tax Credit */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="px-2 py-0.5 bg-green-500/10 text-green-600 rounded text-xs font-mono">4</span>
                Eligible ITC (Input Tax Credit)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-right">Cess</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>(A) ITC Available (whether in full or part)</TableCell>
                    <TableCell className="text-right" colSpan={4}></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">(1) From registered suppliers</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.inwardSupplies.cgstItc)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.inwardSupplies.sgstItc)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.inwardSupplies.igstItc)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.inwardSupplies.cessItc)}</TableCell>
                  </TableRow>
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total ITC Available</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.inwardSupplies.cgstItc)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.inwardSupplies.sgstItc)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.inwardSupplies.igstItc)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.inwardSupplies.cessItc)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 6.1 Tax Payable */}
          <Card className="border-orange-500/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="px-2 py-0.5 bg-orange-500/10 text-orange-600 rounded text-xs font-mono">6.1</span>
                Payment of Tax
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-right">Cess</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>(1) Tax payable</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.outwardSupplies.cgst)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.outwardSupplies.sgst)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.outwardSupplies.igst)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.outwardSupplies.cess)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>(2) Paid through ITC</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(data.inwardSupplies.cgstItc)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(data.inwardSupplies.sgstItc)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(data.inwardSupplies.igstItc)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(data.inwardSupplies.cessItc)}</TableCell>
                  </TableRow>
                  <TableRow className="font-bold bg-orange-500/10">
                    <TableCell className="text-orange-700">Tax payable in cash</TableCell>
                    <TableCell className="text-right text-orange-700">{formatCurrency(data.taxPayable.cgst)}</TableCell>
                    <TableCell className="text-right text-orange-700">{formatCurrency(data.taxPayable.sgst)}</TableCell>
                    <TableCell className="text-right text-orange-700">{formatCurrency(data.taxPayable.igst)}</TableCell>
                    <TableCell className="text-right text-orange-700">{formatCurrency(data.taxPayable.cess)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Final Summary */}
          <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">Total Tax Liability for {format(new Date(month + '-01'), 'MMMM yyyy')}</p>
                  <p className="text-4xl font-bold text-orange-600">{formatCurrency(data.taxPayable.total)}</p>
                  <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                    <span>CGST: {formatCurrency(data.taxPayable.cgst)}</span>
                    <span>SGST: {formatCurrency(data.taxPayable.sgst)}</span>
                    <span>IGST: {formatCurrency(data.taxPayable.igst)}</span>
                  </div>
                </div>
                <CheckCircle2 className="h-16 w-16 text-orange-500/30" />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
