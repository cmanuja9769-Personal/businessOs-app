// Balance Sheet Report

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export default function BalanceSheetPage() {
  const statement = {
    currentAssets: 350000,
    fixedAssets: 150000,
    otherAssets: 50000,
    totalAssets: 550000,
    currentLiabilities: 150000,
    longTermLiabilities: 100000,
    totalLiabilities: 250000,
    equity: 250000,
    retainedEarnings: 50000,
    totalEquity: 300000,
  }

  const isBalanced = Math.abs(statement.totalAssets - (statement.totalLiabilities + statement.totalEquity)) < 0.01

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Balance Sheet</h1>
          <p className="text-gray-500">As on {new Date().toLocaleDateString()}</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{statement.totalAssets.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Liabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{statement.totalLiabilities.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Equity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{statement.totalEquity.toLocaleString()}</div>
            <p className={`text-xs mt-1 ${isBalanced ? "text-green-600" : "text-red-600"}`}>
              {isBalanced ? "✓ Balanced" : "✗ Not balanced"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Assets Section */}
        <Card>
          <CardHeader>
            <CardTitle>ASSETS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Current Assets</h4>
              <div className="flex justify-between items-center pl-4 py-1 border-l-2">
                <span className="text-sm">Cash & Bank Balances</span>
                <span>₹{(statement.currentAssets * 0.4).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pl-4 py-1 border-l-2">
                <span className="text-sm">Accounts Receivable</span>
                <span>₹{(statement.currentAssets * 0.35).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pl-4 py-1 border-l-2">
                <span className="text-sm">Inventory</span>
                <span>₹{(statement.currentAssets * 0.25).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pl-4 py-2 font-semibold bg-blue-50 rounded">
                <span>Total Current Assets</span>
                <span>₹{statement.currentAssets.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Fixed Assets</h4>
              <div className="flex justify-between items-center pl-4 py-1 border-l-2">
                <span className="text-sm">Plant & Equipment</span>
                <span>₹{(statement.fixedAssets * 0.6).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pl-4 py-1 border-l-2">
                <span className="text-sm">Furniture & Fixtures</span>
                <span>₹{(statement.fixedAssets * 0.4).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pl-4 py-2 font-semibold bg-blue-50 rounded">
                <span>Total Fixed Assets</span>
                <span>₹{statement.fixedAssets.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-2 text-lg font-bold bg-blue-100 px-3 rounded">
              <span>TOTAL ASSETS</span>
              <span>₹{statement.totalAssets.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Liabilities & Equity Section */}
        <Card>
          <CardHeader>
            <CardTitle>LIABILITIES & EQUITY</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Current Liabilities</h4>
              <div className="flex justify-between items-center pl-4 py-1 border-l-2">
                <span className="text-sm">Accounts Payable</span>
                <span>₹{(statement.currentLiabilities * 0.6).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pl-4 py-1 border-l-2">
                <span className="text-sm">GST Payable</span>
                <span>₹{(statement.currentLiabilities * 0.4).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pl-4 py-2 font-semibold bg-red-50 rounded">
                <span>Total Current Liabilities</span>
                <span>₹{statement.currentLiabilities.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Long Term Liabilities</h4>
              <div className="flex justify-between items-center pl-4 py-1 border-l-2">
                <span className="text-sm">Loans & Advances</span>
                <span>₹{statement.longTermLiabilities.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pl-4 py-2 font-semibold bg-red-50 rounded">
                <span>Total Long Term Liabilities</span>
                <span>₹{statement.longTermLiabilities.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-2 text-lg font-bold bg-red-100 px-3 rounded">
              <span>TOTAL LIABILITIES</span>
              <span>₹{statement.totalLiabilities.toLocaleString()}</span>
            </div>

            <div className="space-y-2 mt-4">
              <h4 className="font-semibold text-sm">Equity</h4>
              <div className="flex justify-between items-center pl-4 py-1 border-l-2">
                <span className="text-sm">Owner Equity</span>
                <span>₹{statement.equity.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pl-4 py-1 border-l-2">
                <span className="text-sm">Retained Earnings</span>
                <span>₹{statement.retainedEarnings.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pl-4 py-2 font-semibold bg-green-50 rounded">
                <span>Total Equity</span>
                <span>₹{statement.totalEquity.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-2 text-lg font-bold bg-green-100 px-3 rounded">
              <span>TOTAL LIAB. + EQUITY</span>
              <span>₹{(statement.totalLiabilities + statement.totalEquity).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
