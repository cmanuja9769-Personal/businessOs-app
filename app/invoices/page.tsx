import { getInvoices } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoicePreviewCard } from "@/components/invoices/invoice-preview-card"
import { Search, Plus, FileText } from "lucide-react"
import Link from "next/link"

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-1">Manage and track all your sales invoices</p>
        </div>
        <Link href="/invoices/new">
          <Button className="w-full sm:w-auto gap-2">
            <Plus className="w-4 h-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <span className="hidden sm:inline">All Invoices</span>
              <span className="sm:hidden">Invoices</span>
              <span className="text-muted-foreground">({invoices.length})</span>
            </CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="search" placeholder="Search invoices..." className="pl-9 w-full" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
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
            <div className="space-y-3 sm:space-y-4">
              {invoices.map((invoice) => (
                <InvoicePreviewCard
                  key={invoice.id}
                  id={invoice.id}
                  invoiceNo={invoice.invoiceNo}
                  customerName={invoice.customerName}
                  amount={invoice.total}
                  date={new Date(invoice.invoiceDate)}
                  dueDate={new Date(invoice.dueDate)}
                  status={invoice.status as "draft" | "sent" | "paid" | "overdue"}
                  documentType={invoice.documentType}
                  ewaybillNo={invoice.ewaybillNo}
                  ewaybillStatus={invoice.ewaybillStatus}
                  ewaybillValidUpto={invoice.ewaybillValidUpto}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
