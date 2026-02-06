import { getInvoices } from "./actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { InvoicePreviewCard } from "@/components/invoices/invoice-preview-card"
import { PageHeader } from "@/components/ui/page-header"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import { CardHeaderWithSearch } from "@/components/ui/card-header-with-search"
import { Plus, FileText } from "lucide-react"
import Link from "next/link"

export default async function InvoicesPage() {
  const invoices = await getInvoices()

  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 h-full flex flex-col overflow-hidden">
      <PageHeader
        title="Invoices"
        description="Manage and track all your sales invoices"
        actions={
          <Link href="/invoices/new">
            <Button className="w-full sm:w-auto gap-2 h-9 text-sm">
              <Plus className="w-4 h-4" />
              New Invoice
            </Button>
          </Link>
        }
      />

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="py-3 px-4 shrink-0">
          <CardHeaderWithSearch
            icon={FileText}
            title="All Invoices"
            mobileTitle="Invoices"
            count={invoices.length}
            searchPlaceholder="Search invoices..."
          />
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-0">
          {invoices.length === 0 ? (
            <DataEmptyState
              icon={FileText}
              title="No invoices yet"
              description="Create your first invoice to get started"
              action={
                <Link href="/invoices/new">
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Invoice
                  </Button>
                </Link>
              }
            />
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
