// Trial Balance Report

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export default function TrialBalancePage() {
  const [trialBalance, setTrialBalance] = useState<any[]>([])
  const [totals, setTotals] = useState({ totalDebit: 0, totalCredit: 0 })

  useEffect(() => {
    // Fetch trial balance data
    const fetchData = async () => {
      // Implementation will fetch from API
      setTrialBalance([])
      setTotals({ totalDebit: 0, totalCredit: 0 })
    }
    fetchData()
  }, [])

  const isBalanced = Math.abs(totals.totalDebit - totals.totalCredit) < 0.01

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Trial Balance</h1>
          <p className="text-gray-500">Verify debit and credit balances</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trial Balance</CardTitle>
          <CardDescription>As on {new Date().toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trialBalance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No accounting data available
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {trialBalance.map((account) => (
                    <TableRow key={account.accountCode}>
                      <TableCell className="font-mono">{account.accountCode}</TableCell>
                      <TableCell>{account.accountName}</TableCell>
                      <TableCell className="text-right">
                        {account.debitBalance > 0 ? `₹${account.debitBalance.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {account.creditBalance > 0 ? `₹${account.creditBalance.toFixed(2)}` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right">₹{totals.totalDebit.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{totals.totalCredit.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={4} className={isBalanced ? "text-green-600 font-semibold" : "text-red-600"}>
                      {isBalanced ? "✓ Trial balance is balanced" : "✗ Trial balance does not balance"}
                    </TableCell>
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
