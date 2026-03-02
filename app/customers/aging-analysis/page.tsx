"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp } from "lucide-react"
import { formatCurrency } from "@/lib/format-utils"
import { getAgingAnalysis } from "./actions"
import type { AgingAnalysisData, CustomerAgingRow } from "./actions"

const EMPTY_DATA: AgingAnalysisData = {
  summary: { current: 0, days31to60: 0, days61to90: 0, over90: 0, total: 0 },
  customers: [],
}

const BUCKET_CONFIG = [
  { key: "current" as const, label: "Current (0-30)", color: "text-green-600" },
  { key: "days31to60" as const, label: "31-60 Days", color: "text-yellow-600" },
  { key: "days61to90" as const, label: "61-90 Days", color: "text-orange-600" },
  { key: "over90" as const, label: ">90 Days", color: "text-red-600" },
  { key: "total" as const, label: "Total Outstanding", color: "text-red-600" },
]

export default function AgingAnalysisPage() {
  const [data, setData] = useState<AgingAnalysisData>(EMPTY_DATA)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getAgingAnalysis()
        setData(result)
      } catch {
        setData(EMPTY_DATA)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Aging Analysis</h1>
        <p className="text-gray-500">Outstanding amounts by age buckets</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {BUCKET_CONFIG.map((bucket) => (
          <Card key={bucket.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{bucket.label}</CardTitle>
              <TrendingUp className={`h-4 w-4 ${bucket.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.summary[bucket.key])}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer-wise Aging</CardTitle>
          <CardDescription>Detailed breakdown by customer</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Current (0-30)</TableHead>
                <TableHead className="text-right">31-60 Days</TableHead>
                <TableHead className="text-right">61-90 Days</TableHead>
                <TableHead className="text-right">&gt;90 Days</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No outstanding invoices found
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {data.customers.map((customer: CustomerAgingRow) => (
                    <TableRow key={customer.customerId}>
                      <TableCell className="font-medium">{customer.customerName}</TableCell>
                      <TableCell className="text-right">{customer.current > 0 ? formatCurrency(customer.current) : "-"}</TableCell>
                      <TableCell className="text-right">{customer.days31to60 > 0 ? formatCurrency(customer.days31to60) : "-"}</TableCell>
                      <TableCell className="text-right">{customer.days61to90 > 0 ? formatCurrency(customer.days61to90) : "-"}</TableCell>
                      <TableCell className="text-right">{customer.over90 > 0 ? formatCurrency(customer.over90) : "-"}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(customer.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.summary.current)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.summary.days31to60)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.summary.days61to90)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.summary.over90)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.summary.total)}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
