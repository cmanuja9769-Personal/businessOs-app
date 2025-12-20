import { InvoiceBuilder } from "@/components/invoices/invoice-builder"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function NewInvoicePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/invoices">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Invoice</h1>
          <p className="text-muted-foreground mt-1">Generate a new invoice for your customer</p>
        </div>
      </div>

      <InvoiceBuilder />
    </div>
  )
}
