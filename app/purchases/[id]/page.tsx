import { getPurchase } from "@/app/purchases/actions"
import { getPaymentsByPurchase } from "@/app/payments/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge, type DocumentStatus } from "@/components/ui/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Download, Edit, DollarSign } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { PaymentForm } from "@/components/payments/payment-form"
import { PrintButton } from "@/components/ui/print-button"

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const purchase = await getPurchase(id)
  const payments = await getPaymentsByPurchase(id)

  if (!purchase) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Purchase not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/purchases">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Purchase Order {purchase.purchaseNo}</h1>
            <p className="text-muted-foreground">{purchase.supplierName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/purchases/${id}/edit`}>
            <Button variant="outline" className="gap-2 bg-transparent">
              <Edit className="w-4 h-4" />
              Edit
            </Button>
          </Link>
          <Button variant="outline" className="gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
          <PrintButton />
        </div>
      </div>

      {/* Purchase Details */}
      <Card className="print:shadow-none">
        <CardContent className="p-8">
          <div className="space-y-8">
            {/* Header Section */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">PURCHASE ORDER</h2>
                <p className="text-sm text-muted-foreground mt-1">PO No: {purchase.purchaseNo}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-sm">
                  <span className="text-muted-foreground">Date:</span> {format(new Date(purchase.date), "dd MMM yyyy")}
                </p>
                <StatusBadge status={purchase.status as DocumentStatus} />
              </div>
            </div>

            {/* Supplier Info */}
            <div>
              <h3 className="font-semibold mb-2">Supplier Details:</h3>
              <div className="space-y-1">
                <p className="font-medium">{purchase.supplierName}</p>
                {purchase.supplierPhone && <p className="text-sm text-muted-foreground">{purchase.supplierPhone}</p>}
                {purchase.supplierAddress && (
                  <p className="text-sm text-muted-foreground">{purchase.supplierAddress}</p>
                )}
                {purchase.supplierGst && <p className="text-sm text-muted-foreground">GSTIN: {purchase.supplierGst}</p>}
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h3 className="font-semibold mb-3">Line Items:</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>HSN</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Discount</TableHead>
                    {purchase.gstEnabled && <TableHead>Tax</TableHead>}
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchase.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-xs">{item.hsn || "-"}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>₹{item.rate.toFixed(2)}</TableCell>
                      <TableCell>
                        {(() => {
                          if (item.discount <= 0) return "-"
                          const suffix = item.discountType === "percentage" ? "%" : "₹"
                          return `${item.discount}${suffix}`
                        })()}
                      </TableCell>
                      {purchase.gstEnabled && <TableCell>{item.taxRate}%</TableCell>}
                      <TableCell className="text-right font-semibold">₹{item.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>₹{purchase.subtotal.toFixed(2)}</span>
                </div>
                {purchase.gstEnabled && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">CGST:</span>
                      <span>₹{purchase.cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">SGST:</span>
                      <span>₹{purchase.sgst.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span>₹{purchase.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {purchase.notes && (
              <div className="pt-6 border-t">
                <h3 className="font-semibold mb-2">Notes:</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{purchase.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Section */}
      <div className="grid gap-6 md:grid-cols-2 print:hidden">
        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="font-semibold">₹{purchase.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="font-semibold text-green-600">₹{purchase.paidAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t">
              <span className="font-medium">Outstanding Balance:</span>
              <span className="font-bold text-red-600">₹{purchase.balance.toFixed(2)}</span>
            </div>

            {purchase.balance > 0 && (
              <div className="pt-3">
                <PaymentForm purchaseId={purchase.id} maxAmount={purchase.balance}>
                  <Button className="w-full gap-2">
                    <DollarSign className="w-4 h-4" />
                    Record Payment
                  </Button>
                </PaymentForm>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No payments recorded yet</p>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">₹{payment.amount.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.paymentDate), "dd MMM yyyy")} • {payment.paymentMethod}
                      </p>
                    </div>
                    {payment.referenceNumber && (
                      <span className="text-xs text-muted-foreground">Ref: {payment.referenceNumber}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
