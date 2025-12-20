import { getInvoices } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, FileText, Eye, Edit } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { DeleteInvoiceButton } from "@/components/invoices/delete-invoice-button"

export default async function InvoicesPage() {
  const invoices = await getInvoices()

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "sent":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      case "overdue":
        return "bg-red-500/10 text-red-700 dark:text-red-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-1">Manage and track all your sales invoices</p>
        </div>
        <Link href="/invoices/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              All Invoices ({invoices.length})
            </CardTitle>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="search" placeholder="Search invoices..." className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No invoices yet</h3>
              <p className="text-muted-foreground mb-4">Create your first invoice to get started</p>
              <Link href="/invoices/new">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Invoice
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono font-medium">{invoice.invoiceNo}</TableCell>
                    <TableCell>{invoice.customerName}</TableCell>
                    <TableCell>{format(new Date(invoice.invoiceDate), "dd MMM yyyy")}</TableCell>
                    <TableCell>{format(new Date(invoice.dueDate), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-semibold">₹{invoice.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(invoice.status)}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/invoices/${invoice.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link href={`/invoices/${invoice.id}/edit`}>
                          <Button variant="ghost" size="icon">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <DeleteInvoiceButton invoiceId={invoice.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
