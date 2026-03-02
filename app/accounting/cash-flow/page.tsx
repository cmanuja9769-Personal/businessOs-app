"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, TrendingUp, TrendingDown } from "lucide-react"
import { getCashFlowData } from "../actions"
import { formatCurrency } from "@/lib/format-utils"

interface CashFlowData {
  readonly operatingActivities: number
  readonly investingActivities: number
  readonly financingActivities: number
  readonly netCashFlow: number
  readonly openingCash: number
  readonly closingCash: number
}

const EMPTY_CF: CashFlowData = {
  operatingActivities: 0, investingActivities: 0, financingActivities: 0,
  netCashFlow: 0, openingCash: 0, closingCash: 0,
}

export default function CashFlowPage() {
  const [cf, setCf] = useState<CashFlowData>(EMPTY_CF)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = new Date()
        const fyStart = now.getMonth() >= 3
          ? new Date(now.getFullYear(), 3, 1)
          : new Date(now.getFullYear() - 1, 3, 1)
        const data = await getCashFlowData(fyStart.toISOString(), now.toISOString())
        setCf(data)
      } catch {
        setCf(EMPTY_CF)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cash Flow Statement</h1>
          <p className="text-gray-500">For the period ending {new Date().toLocaleDateString()}</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Operating Cash Flow</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(cf.operatingActivities)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Investing Cash Flow</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(cf.investingActivities)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Financing Cash Flow</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(cf.financingActivities)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Operating Activities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span>Cash Receipts from Customers</span>
            <span className="font-semibold">{formatCurrency(Math.max(0, cf.operatingActivities))}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span>Cash Paid to Suppliers</span>
            <span className="font-semibold">{formatCurrency(Math.min(0, -cf.operatingActivities + cf.operatingActivities))}</span>
          </div>
          <div className="flex justify-between items-center py-2 text-lg font-bold bg-green-50 px-2 rounded">
            <span>Net Cash from Operations</span>
            <span>{formatCurrency(cf.operatingActivities)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span>Cash from Operating Activities</span>
            <span className="font-semibold">{formatCurrency(cf.operatingActivities)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span>Cash from Investing Activities</span>
            <span className="font-semibold">{formatCurrency(cf.investingActivities)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span>Cash from Financing Activities</span>
            <span className="font-semibold">{formatCurrency(cf.financingActivities)}</span>
          </div>
          <div className="flex justify-between items-center py-2 text-lg font-bold bg-blue-50 px-3 rounded">
            <span>Net Change in Cash</span>
            <span>{formatCurrency(cf.netCashFlow)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b mt-4">
            <span>Opening Cash Balance</span>
            <span className="font-semibold">{formatCurrency(cf.openingCash)}</span>
          </div>
          <div className="flex justify-between items-center py-3 text-xl font-bold bg-green-100 px-3 rounded">
            <span>Closing Cash Balance</span>
            <span>{formatCurrency(cf.closingCash)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
