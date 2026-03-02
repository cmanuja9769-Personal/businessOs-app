"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { getProfitLossData } from "../actions"
import type { ProfitLossData, AccountBalance } from "@/lib/accounting/financial-reports"
import { formatCurrency } from "@/lib/format-utils"

const EMPTY_PNL: ProfitLossData = {
  revenueItems: [], revenue: 0, otherIncomeItems: [], otherIncome: 0,
  totalIncome: 0, cogsItems: [], cogs: 0, grossProfit: 0,
  expenseItems: [], operatingExpenses: 0, depreciation: 0,
  ebit: 0, interestExpense: 0, taxExpense: 0, netProfit: 0,
}

function LineItems({ items, label }: { readonly items: readonly AccountBalance[]; readonly label: string }) {
  if (items.length === 0) {
    return (
      <div className="flex justify-between items-center py-2 border-b">
        <span>{label}</span>
        <span className="font-semibold">{formatCurrency(0)}</span>
      </div>
    )
  }

  return (
    <>
      {items.map((item) => (
        <div key={item.accountCode} className="flex justify-between items-center py-2 border-b">
          <span>{item.accountName}</span>
          <span className="font-semibold">{formatCurrency(item.balance)}</span>
        </div>
      ))}
    </>
  )
}

export default function ProfitLossPage() {
  const [statement, setStatement] = useState<ProfitLossData>(EMPTY_PNL)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const now = new Date()
        const fyStart = now.getMonth() >= 3
          ? new Date(now.getFullYear(), 3, 1)
          : new Date(now.getFullYear() - 1, 3, 1)
        const data = await getProfitLossData(fyStart.toISOString(), now.toISOString())
        setStatement(data)
      } catch {
        setStatement(EMPTY_PNL)
      }
    }
    fetchData()
  }, [])

  const profitMargin = statement.totalIncome > 0
    ? ((statement.netProfit / statement.totalIncome) * 100).toFixed(2)
    : "0.00"

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
            <div className="text-2xl font-bold">{formatCurrency(statement.revenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(statement.cogs + statement.operatingExpenses + statement.taxExpense)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${statement.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(statement.netProfit)}
            </div>
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
            <LineItems items={statement.revenueItems} label="Revenue from Sales" />
            <LineItems items={statement.otherIncomeItems} label="Other Income" />
            <div className="flex justify-between items-center py-2 font-semibold text-lg bg-blue-50 px-2 rounded">
              <span>Total Income</span>
              <span>{formatCurrency(statement.totalIncome)}</span>
            </div>

            <div className="mt-6 space-y-2">
              <LineItems items={statement.cogsItems} label="Cost of Goods Sold" />
              <div className="flex justify-between items-center py-2 font-semibold text-lg bg-yellow-50 px-2 rounded">
                <span>Gross Profit</span>
                <span>{formatCurrency(statement.grossProfit)}</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <LineItems items={statement.expenseItems} label="Operating Expenses" />
              <div className="flex justify-between items-center py-2 font-semibold text-lg bg-purple-50 px-2 rounded">
                <span>EBIT (Operating Profit)</span>
                <span>{formatCurrency(statement.ebit)}</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex justify-between items-center py-2 border-b">
                <span>Interest Expense</span>
                <span className="font-semibold">{formatCurrency(statement.interestExpense)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>Tax Expense</span>
                <span className="font-semibold">{formatCurrency(statement.taxExpense)}</span>
              </div>
              <div className={`flex justify-between items-center py-2 text-2xl font-bold px-2 rounded ${statement.netProfit >= 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"}`}>
                <span>Net Profit</span>
                <span>{formatCurrency(statement.netProfit)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
