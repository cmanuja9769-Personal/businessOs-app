import { getCustomers } from "../actions"
import { getInvoices } from "@/app/invoices/actions"
import { CustomerForm } from "@/components/customers/customer-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Mail, Phone, MapPin, FileText, IndianRupee, TrendingUp, TrendingDown } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

function InvoiceStatusBadge({ status }: { readonly status: string }) {
  if (status === "paid") {
    return (
      <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
        Paid
      </Badge>
    )
  }
  if (status === "sent") {
    return (
      <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
        Sent
      </Badge>
    )
  }
  if (status === "unpaid" || status === "partial" || status === "overdue") {
    let label = "Unpaid"
    if (status === "overdue") label = "Overdue"
    else if (status === "partial") label = "Partial"
    return (
      <Badge variant="secondary" className="bg-orange-500/10 text-orange-700 dark:text-orange-400">
        {label}
      </Badge>
    )
  }
  return <Badge variant="secondary">{status}</Badge>
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [customers, allInvoices] = await Promise.all([getCustomers(), getInvoices()])

  const customer = customers.find((c) => c.id === id)
  if (!customer) {
    notFound()
  }

  // Filter invoices for this customer
  const customerInvoices = allInvoices.filter((inv) => inv.customerId === customer.id)

  // Calculate financial summary
  const totalInvoiced = customerInvoices.reduce((sum, inv) => sum + inv.total, 0)
  const totalPaid = customerInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0)
  const totalBalance = customerInvoices.reduce((sum, inv) => sum + inv.balance, 0)
  const pendingInvoices = customerInvoices.filter((inv) => inv.status === "unpaid" || inv.status === "sent" || inv.status === "partial" || inv.status === "overdue")
  const paidInvoices = customerInvoices.filter((inv) => inv.status === "paid")

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
            <p className="text-muted-foreground mt-1">Customer Profile & Transaction History</p>
          </div>
        </div>
        <CustomerForm
          customer={customer}
          trigger={
            <Button>
              Edit Customer
            </Button>
          }
        />
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-muted-foreground" />
              <span className="text-2xl font-bold">₹{totalInvoiced.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{customerInvoices.length} invoice(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">₹{totalPaid.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{paidInvoices.length} paid invoice(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-orange-600" />
              <span className="text-2xl font-bold text-orange-600">₹{totalBalance.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{pendingInvoices.length} pending invoice(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payment Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {totalInvoiced > 0 ? ((totalPaid / totalInvoiced) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Payment completion rate</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Details */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">{customer.contactNo || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{customer.email || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground">{customer.address || "—"}</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">GSTIN</p>
              {customer.gstinNo ? (
                <Badge variant="outline" className="font-mono text-xs">{customer.gstinNo}</Badge>
              ) : (
                <p className="text-sm text-muted-foreground">Not registered</p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Member Since</p>
              <p className="text-sm text-muted-foreground">
                {customer.createdAt.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Invoice History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Invoice History
              </CardTitle>
              <Link href={`/invoices/new?customerId=${customer.id}`}>
                <Button size="sm">Create Invoice</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {customerInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No invoices yet</h3>
                <p className="text-muted-foreground mb-4">Create the first invoice for this customer</p>
                <Link href={`/invoices/new?customerId=${customer.id}`}>
                  <Button>Create Invoice</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {customerInvoices.map((invoice) => (
                  <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <p className="font-mono font-semibold">{invoice.invoiceNo}</p>
                          <InvoiceStatusBadge status={invoice.status} />
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>
                            {invoice.invoiceDate.toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span>•</span>
                          <span>{invoice.items.length} item(s)</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">₹{invoice.total.toFixed(2)}</p>
                        {invoice.balance > 0 && (
                          <p className="text-sm text-orange-600">₹{invoice.balance.toFixed(2)} due</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Invoice Table */}
      {customerInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono font-medium">
                      <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                        {invoice.invoiceNo}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {invoice.invoiceDate.toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      {invoice.dueDate.toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>{invoice.items.length}</TableCell>
                    <TableCell className="font-semibold">₹{invoice.total.toFixed(2)}</TableCell>
                    <TableCell className="text-green-600">₹{invoice.paidAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-orange-600 font-semibold">₹{invoice.balance.toFixed(2)}</TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
