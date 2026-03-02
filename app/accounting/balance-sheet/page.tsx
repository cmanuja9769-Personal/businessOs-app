"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { getBalanceSheetData } from "../actions"
import type { AccountBalance, BalanceSheetData } from "@/lib/accounting/financial-reports"
import { formatCurrency } from "@/lib/format-utils"

const EMPTY_BS: BalanceSheetData = {
  currentAssets: [], fixedAssets: [], otherAssets: [], totalAssets: 0,
  currentLiabilities: [], longTermLiabilities: [], totalLiabilities: 0,
  equityAccounts: [], totalEquity: 0,
}

function AccountLineItems({ items }: { readonly items: readonly AccountBalance[] }) {
  if (items.length === 0) {
    return (
      <div className="flex justify-between items-center pl-4 py-1 border-l-2">
        <span className="text-sm text-muted-foreground">No entries</span>
        <span className="text-muted-foreground">-</span>
      </div>
    )
  }

  return (
    <>
      {items.map((item) => (
        <div key={item.accountCode} className="flex justify-between items-center pl-4 py-1 border-l-2">
          <span className="text-sm">{item.accountName}</span>
          <span>{formatCurrency(item.balance)}</span>
        </div>
      ))}
    </>
  )
}

function sumAccountItems(items: readonly AccountBalance[]): number {
  return items.reduce((sum, item) => sum + item.balance, 0)
}

export default function BalanceSheetPage() {
  const [statement, setStatement] = useState<BalanceSheetData>(EMPTY_BS)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getBalanceSheetData()
        setStatement(data)
      } catch {
        setStatement(EMPTY_BS)
      }
    }
    fetchData()
  }, [])

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
            <div className="text-2xl font-bold">{formatCurrency(statement.totalAssets)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Liabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(statement.totalLiabilities)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Equity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(statement.totalEquity)}</div>
            <p className={`text-xs mt-1 ${isBalanced ? "text-green-600" : "text-red-600"}`}>
              {isBalanced ? "Balanced" : "Not balanced"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ASSETS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Current Assets</h4>
              <AccountLineItems items={statement.currentAssets} />
              <div className="flex justify-between items-center pl-4 py-2 font-semibold bg-blue-50 rounded">
                <span>Total Current Assets</span>
                <span>{formatCurrency(sumAccountItems(statement.currentAssets))}</span>
              </div>
            </div>

            {statement.fixedAssets.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Fixed Assets</h4>
                <AccountLineItems items={statement.fixedAssets} />
                <div className="flex justify-between items-center pl-4 py-2 font-semibold bg-blue-50 rounded">
                  <span>Total Fixed Assets</span>
                  <span>{formatCurrency(sumAccountItems(statement.fixedAssets))}</span>
                </div>
              </div>
            )}

            {statement.otherAssets.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Other Assets</h4>
                <AccountLineItems items={statement.otherAssets} />
                <div className="flex justify-between items-center pl-4 py-2 font-semibold bg-blue-50 rounded">
                  <span>Total Other Assets</span>
                  <span>{formatCurrency(sumAccountItems(statement.otherAssets))}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center py-2 text-lg font-bold bg-blue-100 px-3 rounded">
              <span>TOTAL ASSETS</span>
              <span>{formatCurrency(statement.totalAssets)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>LIABILITIES & EQUITY</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Current Liabilities</h4>
              <AccountLineItems items={statement.currentLiabilities} />
              <div className="flex justify-between items-center pl-4 py-2 font-semibold bg-red-50 rounded">
                <span>Total Current Liabilities</span>
                <span>{formatCurrency(sumAccountItems(statement.currentLiabilities))}</span>
              </div>
            </div>

            {statement.longTermLiabilities.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Long Term Liabilities</h4>
                <AccountLineItems items={statement.longTermLiabilities} />
                <div className="flex justify-between items-center pl-4 py-2 font-semibold bg-red-50 rounded">
                  <span>Total Long Term Liabilities</span>
                  <span>{formatCurrency(sumAccountItems(statement.longTermLiabilities))}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center py-2 text-lg font-bold bg-red-100 px-3 rounded">
              <span>TOTAL LIABILITIES</span>
              <span>{formatCurrency(statement.totalLiabilities)}</span>
            </div>

            <div className="space-y-2 mt-4">
              <h4 className="font-semibold text-sm">Equity</h4>
              <AccountLineItems items={statement.equityAccounts} />
              <div className="flex justify-between items-center pl-4 py-2 font-semibold bg-green-50 rounded">
                <span>Total Equity</span>
                <span>{formatCurrency(statement.totalEquity)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-2 text-lg font-bold bg-green-100 px-3 rounded">
              <span>TOTAL LIAB. + EQUITY</span>
              <span>{formatCurrency(statement.totalLiabilities + statement.totalEquity)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
