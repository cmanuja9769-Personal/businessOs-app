import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { BookOpen, TrendingUp, Scale, FileText } from "lucide-react"
import Link from "next/link"
import { getAccountingDashboard, getTrialBalanceData, getJournalEntriesData } from "./actions"
import { formatCurrency } from "@/lib/format-utils"

export default async function AccountingPage() {
  const [stats, trialBalance, journalEntries] = await Promise.all([
    getAccountingDashboard(),
    getTrialBalanceData(),
    getJournalEntriesData("posted"),
  ])

  const accountsByType = new Map<string, typeof trialBalance>()
  for (const acc of trialBalance) {
    const list = accountsByType.get(acc.accountType) || []
    list.push(acc)
    accountsByType.set(acc.accountType, list)
  }

  const typeOrder = ["asset", "liability", "equity", "income", "expense"]
  const typeLabels: Record<string, string> = {
    asset: "Assets",
    liability: "Liabilities",
    equity: "Equity",
    income: "Income",
    expense: "Expenses",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financial Accounting</h1>
        <p className="text-gray-500">Double-entry bookkeeping and financial statements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chart of Accounts</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.accountCount}</div>
            <p className="text-xs text-muted-foreground">active accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Journal Entries</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.journalEntryCount}</div>
            <p className="text-xs text-muted-foreground">posted entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assets</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAssets)}</div>
            <p className="text-xs text-muted-foreground">total assets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <Scale className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.netProfit)}</div>
            <p className="text-xs text-muted-foreground">this period</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="journal">Journal Entries</TabsTrigger>
          <TabsTrigger value="reports">Financial Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Chart of Accounts</CardTitle>
              <CardDescription>All accounts grouped by type</CardDescription>
            </CardHeader>
            <CardContent>
              {trialBalance.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No accounts found. Seed chart of accounts from settings.</p>
              ) : (
                <div className="space-y-6">
                  {typeOrder.map((type) => {
                    const accounts = accountsByType.get(type)
                    if (!accounts || accounts.length === 0) return null
                    return (
                      <div key={type}>
                        <h3 className="font-semibold text-sm mb-2 text-muted-foreground uppercase tracking-wide">{typeLabels[type]}</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Code</TableHead>
                              <TableHead>Account Name</TableHead>
                              <TableHead className="text-right">Debit</TableHead>
                              <TableHead className="text-right">Credit</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accounts.map((acc) => (
                              <TableRow key={acc.accountCode}>
                                <TableCell className="font-mono text-sm">{acc.accountCode}</TableCell>
                                <TableCell>{acc.accountName}</TableCell>
                                <TableCell className="text-right">{acc.debitBalance > 0 ? formatCurrency(acc.debitBalance) : "-"}</TableCell>
                                <TableCell className="text-right">{acc.creditBalance > 0 ? formatCurrency(acc.creditBalance) : "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journal">
          <Card>
            <CardHeader>
              <CardTitle>Journal Entries</CardTitle>
              <CardDescription>Recent posted journal entries</CardDescription>
            </CardHeader>
            <CardContent>
              {journalEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No journal entries found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entry No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journalEntries.slice(0, 20).map((entry: Record<string, unknown>) => (
                      <TableRow key={entry.id as string}>
                        <TableCell className="font-mono text-sm">{entry.entry_no as string}</TableCell>
                        <TableCell>{new Date(entry.entry_date as string).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{entry.entry_type as string}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[15rem] truncate">{(entry.description as string) || "-"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(entry.total_debit))}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(entry.total_credit))}</TableCell>
                        <TableCell>
                          <Badge variant={(entry.status as string) === "posted" ? "default" : "secondary"} className="capitalize">
                            {entry.status as string}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <div className="grid gap-4 md:grid-cols-2">
            <Link href="/accounting/trial-balance">
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">Trial Balance</CardTitle>
                  <CardDescription>Verify debit and credit balances across all accounts</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/accounting/profit-loss">
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">Profit & Loss</CardTitle>
                  <CardDescription>Revenue, expenses, and net profit for the period</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/accounting/balance-sheet">
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">Balance Sheet</CardTitle>
                  <CardDescription>Assets, liabilities, and equity as on date</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/accounting/cash-flow">
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">Cash Flow Statement</CardTitle>
                  <CardDescription>Cash inflows and outflows from operations</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
