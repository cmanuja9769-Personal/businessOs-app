import { getInvoice } from "@/app/invoices/actions"
import { InvoiceForm } from "@/components/invoices/invoice-form"
import { notFound } from "next/navigation"

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await getInvoice(id)

  if (!invoice) {
    notFound()
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Invoice</h1>
        <p className="text-muted-foreground mt-1">Update invoice details and line items</p>
      </div>
      <InvoiceForm invoice={invoice} />
    </div>
  )
}
