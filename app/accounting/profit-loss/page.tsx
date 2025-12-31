// Profit & Loss Statement

"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export default function ProfitLossPage() {
  const statement = {
    revenue: 500000,
    otherIncome: 25000,
    totalIncome: 525000,
    cogs: 200000,
    grossProfit: 325000,
    operatingExpenses: 100000,
    ebitda: 225000,
    depreciation: 15000,
    ebit: 210000,
    interestExpense: 10000,
    taxExpense: 50000,
    netProfit: 150000,
  }

  const profitMargin = ((statement.netProfit / statement.totalIncome) * 100).toFixed(2)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Profit & Loss Statement</h1>
          <p className="text-gray-500">For the period ending {new Date().toLocaleDateString()}</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{statement.revenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(statement.cogs + statement.operatingExpenses + statement.taxExpense).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{statement.netProfit.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{profitMargin}% margin</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Statement Details</CardTitle>
          <CardDescription>Complete P&L breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span>Revenue from Sales</span>
              <span className="font-semibold">₹{statement.revenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>Other Income</span>
              <span className="font-semibold">₹{statement.otherIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 font-semibold text-lg bg-blue-50 px-2 rounded">
              <span>Total Income</span>
              <span>₹{statement.totalIncome.toLocaleString()}</span>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex justify-between items-center py-2 border-b">
                <span>Cost of Goods Sold</span>
                <span className="font-semibold">₹{statement.cogs.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 font-semibold text-lg bg-yellow-50 px-2 rounded">
                <span>Gross Profit</span>
                <span>₹{statement.grossProfit.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex justify-between items-center py-2 border-b">
                <span>Operating Expenses</span>
                <span className="font-semibold">₹{statement.operatingExpenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>Depreciation</span>
                <span className="font-semibold">₹{statement.depreciation.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 font-semibold text-lg bg-purple-50 px-2 rounded">
                <span>EBIT (Operating Profit)</span>
                <span>₹{statement.ebit.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex justify-between items-center py-2 border-b">
                <span>Interest Expense</span>
                <span className="font-semibold">₹{statement.interestExpense.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>Tax Expense</span>
                <span className="font-semibold">₹{statement.taxExpense.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 text-2xl font-bold text-green-600 bg-green-50 px-2 rounded">
                <span>Net Profit</span>
                <span>₹{statement.netProfit.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
