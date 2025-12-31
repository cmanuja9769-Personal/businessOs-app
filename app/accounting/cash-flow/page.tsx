// Cash Flow Statement

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, TrendingUp, TrendingDown } from "lucide-react"

export default function CashFlowPage() {
  const statement = {
    // Operating Activities
    netProfit: 150000,
    depreciation: 15000,
    changeInWorkingCapital: -20000,
    cashFromOperations: 145000,

    // Investing Activities
    capitalExpenditure: -50000,
    assetSales: 10000,
    cashFromInvesting: -40000,

    // Financing Activities
    borrowings: 30000,
    repayments: -20000,
    dividends: -10000,
    cashFromFinancing: 0,

    // Summary
    netCashFlow: 105000,
    openingCash: 50000,
    closingCash: 155000,
  }

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
            <div className="text-2xl font-bold">₹{statement.cashFromOperations.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Investing Cash Flow</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{statement.cashFromInvesting.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Financing Cash Flow</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{statement.cashFromFinancing.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Operating Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Operating Activities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span>Net Profit</span>
              <span className="font-semibold">₹{statement.netProfit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>Add: Depreciation</span>
              <span className="font-semibold">₹{statement.depreciation.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>Change in Working Capital</span>
              <span className="font-semibold">₹{statement.changeInWorkingCapital.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 text-lg font-bold bg-green-50 px-2 rounded">
              <span>Cash from Operations</span>
              <span>₹{statement.cashFromOperations.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Investing Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Investing Activities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span>Capital Expenditure</span>
              <span className="font-semibold">₹{statement.capitalExpenditure.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>Asset Sales</span>
              <span className="font-semibold">₹{statement.assetSales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 text-lg font-bold bg-red-50 px-2 rounded">
              <span>Cash from Investing</span>
              <span>₹{statement.cashFromInvesting.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span>Cash from Operating Activities</span>
            <span className="font-semibold">₹{statement.cashFromOperations.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span>Cash from Investing Activities</span>
            <span className="font-semibold">₹{statement.cashFromInvesting.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span>Cash from Financing Activities</span>
            <span className="font-semibold">₹{statement.cashFromFinancing.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center py-2 text-lg font-bold bg-blue-50 px-3 rounded">
            <span>Net Change in Cash</span>
            <span>₹{statement.netCashFlow.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b mt-4">
            <span>Opening Cash Balance</span>
            <span className="font-semibold">₹{statement.openingCash.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center py-3 text-xl font-bold bg-green-100 px-3 rounded">
            <span>Closing Cash Balance</span>
            <span>₹{statement.closingCash.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
