import { getInvoices } from "@/app/invoices/actions"
import { getPurchases } from "@/app/purchases/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react"
import { format } from "date-fns"
import { PaymentForm } from "@/components/payments/payment-form"

export default async function PaymentsPage() {
  const invoices = await getInvoices()
  const purchases = await getPurchases()

  // Calculate payment statistics
  const unpaidInvoices = invoices.filter((inv) => inv.status !== "paid")
  const unpaidPurchases = purchases.filter((pur) => pur.status !== "paid")

  const totalReceivables = unpaidInvoices.reduce((sum, inv) => sum + inv.balance, 0)
  const totalPayables = unpaidPurchases.reduce((sum, pur) => sum + pur.balance, 0)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "partial":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
      case "unpaid":
        return "bg-red-500/10 text-red-700 dark:text-red-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Management</h1>
        <p className="text-muted-foreground mt-1">Track receivables, payables, and record payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalReceivables.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {unpaidInvoices.length} unpaid invoice{unpaidInvoices.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Payables</CardTitle>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalPayables.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {unpaidPurchases.length} unpaid purchase{unpaidPurchases.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Net Position</CardTitle>
            <Wallet className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(totalReceivables - totalPayables).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalReceivables > totalPayables ? "Positive" : "Negative"} cash flow
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Receivables and Payables */}
      <Tabs defaultValue="receivables" className="space-y-4">
        <TabsList>
          <TabsTrigger value="receivables">Receivables</TabsTrigger>
          <TabsTrigger value="payables">Payables</TabsTrigger>
        </TabsList>

        <TabsContent value="receivables" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Outstanding Receivables ({unpaidInvoices.length})
                </CardTitle>
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="search" placeholder="Search invoices..." className="pl-9" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {unpaidInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <DollarSign className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">All invoices are paid</h3>
                  <p className="text-muted-foreground">No outstanding receivables at this time</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono font-medium">{invoice.invoiceNo}</TableCell>
                        <TableCell>{invoice.customerName}</TableCell>
                        <TableCell>{format(new Date(invoice.invoiceDate), "dd MMM yyyy")}</TableCell>
                        <TableCell className="font-semibold">₹{invoice.total.toFixed(2)}</TableCell>
                        <TableCell className="text-green-600">₹{invoice.paidAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-red-600 font-semibold">₹{invoice.balance.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getStatusColor(invoice.status)}>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <PaymentForm invoiceId={invoice.id} maxAmount={invoice.balance}>
                            <Button size="sm" variant="default">
                              <DollarSign className="w-4 h-4 mr-1" />
                              Record Payment
                            </Button>
                          </PaymentForm>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payables" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Outstanding Payables ({unpaidPurchases.length})
                </CardTitle>
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="search" placeholder="Search purchases..." className="pl-9" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {unpaidPurchases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <DollarSign className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">All purchases are paid</h3>
                  <p className="text-muted-foreground">No outstanding payables at this time</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidPurchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="font-mono font-medium">{purchase.purchaseNo}</TableCell>
                        <TableCell>{purchase.supplierName}</TableCell>
                        <TableCell>{format(new Date(purchase.date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="font-semibold">₹{purchase.total.toFixed(2)}</TableCell>
                        <TableCell className="text-green-600">₹{purchase.paidAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-red-600 font-semibold">₹{purchase.balance.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getStatusColor(purchase.status)}>
                            {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <PaymentForm purchaseId={purchase.id} maxAmount={purchase.balance}>
                            <Button size="sm" variant="default">
                              <DollarSign className="w-4 h-4 mr-1" />
                              Record Payment
                            </Button>
                          </PaymentForm>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
