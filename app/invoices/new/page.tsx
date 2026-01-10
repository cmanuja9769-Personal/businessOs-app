import { InvoiceForm } from "@/components/invoices/invoice-form"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function NewInvoicePage() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <Link href="/invoices">
          <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Create New Invoice</h1>
          <p className="text-xs sm:text-base text-muted-foreground mt-0.5 sm:mt-1">Generate a new invoice for your customer</p>
        </div>
      </div>

      <InvoiceForm />
    </div>
  )
}
