import { getInvoices } from "@/app/invoices/actions"
import { getPurchases } from "@/app/purchases/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GlassCard } from "@/components/ui/glass-card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge, type DocumentStatus } from "@/components/ui/status-badge"
import { PageHeader } from "@/components/ui/page-header"
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

  return (
    <div className="p-4 sm:p-6 space-y-4 flex flex-col md:h-[calc(100vh-64px)] md:overflow-hidden">
      <PageHeader
        title="Payment Management"
        description="Track receivables, payables, and record payments"
      />

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 shrink-0">
        <GlassCard glow className="relative overflow-hidden group">
          <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-[0.07] blur-2xl bg-emerald-500" />
          <div className="flex items-start justify-between gap-2 relative">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[0.6875rem] font-medium text-muted-foreground uppercase tracking-wider">Total Receivables</p>
              <div className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400">₹{totalReceivables.toFixed(2)}</div>
              <p className="text-[0.6875rem] text-muted-foreground/80">{unpaidInvoices.length} unpaid invoice{unpaidInvoices.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="p-2 rounded-2xl neo-inset bg-emerald-500/10 flex-shrink-0">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
        </GlassCard>

        <GlassCard glow className="relative overflow-hidden group">
          <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-[0.07] blur-2xl bg-red-500" />
          <div className="flex items-start justify-between gap-2 relative">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[0.6875rem] font-medium text-muted-foreground uppercase tracking-wider">Total Payables</p>
              <div className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-400">₹{totalPayables.toFixed(2)}</div>
              <p className="text-[0.6875rem] text-muted-foreground/80">{unpaidPurchases.length} unpaid purchase{unpaidPurchases.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="p-2 rounded-2xl neo-inset bg-red-500/10 flex-shrink-0">
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
          </div>
        </GlassCard>

        <GlassCard glow className="relative overflow-hidden group">
          <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-[0.07] blur-2xl bg-blue-500" />
          <div className="flex items-start justify-between gap-2 relative">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[0.6875rem] font-medium text-muted-foreground uppercase tracking-wider">Net Position</p>
              <div className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400">₹{(totalReceivables - totalPayables).toFixed(2)}</div>
              <p className="text-[0.6875rem] text-muted-foreground/80">{totalReceivables > totalPayables ? "Positive" : "Negative"} cash flow</p>
            </div>
            <div className="p-2 rounded-2xl neo-inset bg-blue-500/10 flex-shrink-0">
              <Wallet className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Tabs for Receivables and Payables */}
      <Tabs defaultValue="receivables" className="md:flex-1 md:min-h-0 flex flex-col md:overflow-hidden">
        <TabsList className="shrink-0">
          <TabsTrigger value="receivables">Receivables</TabsTrigger>
          <TabsTrigger value="payables">Payables</TabsTrigger>
        </TabsList>

        <TabsContent value="receivables" className="md:flex-1 md:min-h-0 md:overflow-hidden mt-4">
          <Card className="md:h-full flex flex-col md:overflow-hidden">
            <CardHeader className="shrink-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Outstanding Receivables ({unpaidInvoices.length})
                </CardTitle>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="search" placeholder="Search invoices..." className="pl-9" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="md:flex-1 md:min-h-0 md:overflow-hidden p-0 sm:px-6 sm:pb-6">
              {unpaidInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <DollarSign className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">All invoices are paid</h3>
                  <p className="text-muted-foreground">No outstanding receivables at this time</p>
                </div>
              ) : (
                <Table containerClassName="flex-1 min-h-0 max-h-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead resizable className="w-[6.25rem] min-w-[5rem]">Invoice</TableHead>
                      <TableHead resizable className="w-[11.25rem] min-w-[7.5rem]">Customer</TableHead>
                      <TableHead resizable className="w-[6.25rem] min-w-[5rem]">Date</TableHead>
                      <TableHead resizable className="w-[5.625rem] min-w-[4.375rem]">Total</TableHead>
                      <TableHead resizable className="w-[5rem] min-w-[3.75rem]">Paid</TableHead>
                      <TableHead resizable className="w-[5rem] min-w-[3.75rem]">Balance</TableHead>
                      <TableHead resizable className="w-[4.375rem] min-w-[3.75rem]">Status</TableHead>
                      <TableHead className="w-[8.75rem] min-w-[7.5rem] text-right">Action</TableHead>
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
                          <StatusBadge status={invoice.status as DocumentStatus} />
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

        <TabsContent value="payables" className="md:flex-1 md:min-h-0 md:overflow-hidden mt-4">
          <Card className="md:h-full flex flex-col md:overflow-hidden">
            <CardHeader className="shrink-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Outstanding Payables ({unpaidPurchases.length})
                </CardTitle>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="search" placeholder="Search purchases..." className="pl-9" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="md:flex-1 md:min-h-0 md:overflow-hidden p-0 sm:px-6 sm:pb-6">
              {unpaidPurchases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <DollarSign className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">All purchases are paid</h3>
                  <p className="text-muted-foreground">No outstanding payables at this time</p>
                </div>
              ) : (
                <Table containerClassName="flex-1 min-h-0 max-h-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead resizable className="w-[6.25rem] min-w-[5rem]">PO Number</TableHead>
                      <TableHead resizable className="w-[11.25rem] min-w-[7.5rem]">Supplier</TableHead>
                      <TableHead resizable className="w-[6.25rem] min-w-[5rem]">Date</TableHead>
                      <TableHead resizable className="w-[5.625rem] min-w-[4.375rem]">Total</TableHead>
                      <TableHead resizable className="w-[5rem] min-w-[3.75rem]">Paid</TableHead>
                      <TableHead resizable className="w-[5rem] min-w-[3.75rem]">Balance</TableHead>
                      <TableHead resizable className="w-[4.375rem] min-w-[3.75rem]">Status</TableHead>
                      <TableHead className="w-[8.75rem] min-w-[7.5rem] text-right">Action</TableHead>
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
                          <StatusBadge status={purchase.status as DocumentStatus} />
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
