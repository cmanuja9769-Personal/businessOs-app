import { getInvoice } from "@/app/invoices/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Download } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PrintButton } from "@/components/ui/print-button"

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await getInvoice(id)

  if (!invoice) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Invoice not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Invoice {invoice.invoiceNo}</h1>
            <p className="text-muted-foreground">{invoice.customerName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
          <PrintButton />
        </div>
      </div>

      <Card className="print:shadow-none">
        <CardContent className="p-8">
          <div className="space-y-8">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">INVOICE</h2>
                <p className="text-sm text-muted-foreground mt-1">Invoice No: {invoice.invoiceNo}</p>
              </div>
              <div className="text-right">
                <p className="text-sm">
                  <span className="text-muted-foreground">Date:</span>{" "}
                  {format(new Date(invoice.invoiceDate), "dd MMM yyyy")}
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Due Date:</span>{" "}
                  {format(new Date(invoice.dueDate), "dd MMM yyyy")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold mb-2">Bill To:</h3>
                <p className="font-medium">{invoice.customerName}</p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Rate</TableHead>
                  {invoice.billingMode === "gst" && <TableHead>GST</TableHead>}
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.itemName}</TableCell>
                    <TableCell>
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell>₹{item.rate.toFixed(2)}</TableCell>
                    {invoice.billingMode === "gst" && <TableCell>{item.gstRate}%</TableCell>}
                    <TableCell className="text-right">₹{item.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>₹{invoice.subtotal.toFixed(2)}</span>
                </div>
                {invoice.billingMode === "gst" && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">CGST:</span>
                      <span>₹{invoice.cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">SGST:</span>
                      <span>₹{invoice.sgst.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span>₹{invoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div className="pt-6 border-t">
                <h3 className="font-semibold mb-2">Notes:</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
