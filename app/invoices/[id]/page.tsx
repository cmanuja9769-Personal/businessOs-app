import { getInvoice } from "@/app/invoices/actions"
import { getSettings } from "@/app/settings/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Edit } from "lucide-react"
import Link from "next/link"
import { GenerateEInvoiceButton } from "@/components/invoices/generate-einvoice-button"
import { GenerateEWayBillButton } from "@/components/invoices/generate-ewaybill-button"
import { EWayBillStatusCard } from "@/components/invoices/e-waybill-status-card"
import { DOCUMENT_TYPE_CONFIG } from "@/types"
import { SendInvoiceEmailDialog } from "@/components/invoices/send-invoice-email-dialog"
import { InvoiceViewDisplay } from "@/components/invoices/invoice-view-display"
import { InvoicePDFButtons } from "@/components/invoices/invoice-pdf-buttons"

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await getInvoice(id)

  if (!invoice) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">Invoice not found</p>
              <Link href="/invoices">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Invoices
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const settings = await getSettings()

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between print:hidden gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/invoices">
            <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="space-y-0.5 sm:space-y-1">
            <h1 className="text-lg sm:text-2xl font-bold">{invoice.invoiceNo}</h1>
            <p className="text-xs sm:text-base text-muted-foreground">{invoice.customerName}</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {DOCUMENT_TYPE_CONFIG[invoice.documentType].canBeEInvoiced && !invoice.irn && invoice.status !== "draft" && (
            <GenerateEInvoiceButton
              invoiceId={invoice.id}
              invoiceNo={invoice.invoiceNo}
              customerGst={invoice.customerGst}
              gstEnabled={invoice.gstEnabled}
              status={invoice.status}
              irn={invoice.irn}
              customerName={invoice.customerName}
              total={invoice.total}
            />
          )}
          {!invoice.ewaybillNo && invoice.status !== "draft" && (
            <GenerateEWayBillButton
              invoiceId={invoice.id}
              invoiceNo={invoice.invoiceNo}
              total={invoice.total}
              status={invoice.status}
              ewaybillNo={invoice.ewaybillNo}
              customerName={invoice.customerName}
              gstEnabled={invoice.gstEnabled}
            />
          )}
          <Link href={`/invoices/${id}/edit`}>
            <Button variant="outline" className="gap-2 bg-transparent">
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          </Link>
          <InvoicePDFButtons invoice={invoice} settings={settings} />
          <SendInvoiceEmailDialog invoice={invoice} />
        </div>
      </div>

      {/* E-Way Bill Status Card */}
      {invoice.ewaybillNo && (
        <EWayBillStatusCard invoice={invoice} />
      )}

      {/* Professional View */}
      <InvoiceViewDisplay invoice={invoice} settings={settings} />
    </div>
  )
}
