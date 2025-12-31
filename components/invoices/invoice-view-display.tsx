"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import type { IInvoice } from "@/types"
import type { ISettings } from "@/app/settings/actions"

interface InvoiceViewDisplayProps {
  invoice: IInvoice
  settings: ISettings
}

export function InvoiceViewDisplay({ invoice, settings }: InvoiceViewDisplayProps) {
  const statusColors = {
    draft: "bg-slate-100 text-slate-800",
    sent: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    partially_paid: "bg-yellow-100 text-yellow-800",
    overdue: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
    converted: "bg-purple-100 text-purple-800",
  }

  return (
    <div className="space-y-6 print:hidden">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold">{invoice.invoiceNo}</h1>
                <Badge className={statusColors[invoice.status as keyof typeof statusColors] || "bg-gray-100"}>
                  {invoice.status.replace("_", " ").toUpperCase()}
                </Badge>
                {invoice.irn && (
                  <Badge variant="outline" className="gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      />
                    </svg>
                    E-Invoiced
                  </Badge>
                )}
              </div>
              <p className="text-lg text-muted-foreground font-medium">{invoice.customerName}</p>
            </div>
            <div className="text-right space-y-1 flex-shrink-0">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold">Invoice Date:</span> {format(invoice.invoiceDate, "dd MMM yyyy")}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold">Due Date:</span> {format(invoice.dueDate, "dd MMM yyyy")}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Customer & Business Info */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">From</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-semibold text-base">{settings.businessName}</p>
            {settings.businessAddress && <p className="text-muted-foreground">{settings.businessAddress}</p>}
            {settings.businessPhone && <p className="text-muted-foreground">Phone: {settings.businessPhone}</p>}
            {settings.businessEmail && <p className="text-muted-foreground">Email: {settings.businessEmail}</p>}
            {settings.businessGst && <p className="font-medium mt-2">GSTIN: {settings.businessGst}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Bill To</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-semibold text-base">{invoice.customerName}</p>
            {invoice.customerAddress && <p className="text-muted-foreground">{invoice.customerAddress}</p>}
            {invoice.customerPhone && <p className="text-muted-foreground">Phone: {invoice.customerPhone}</p>}
            {invoice.customerGst && <p className="font-medium mt-2">GSTIN: {invoice.customerGst}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-primary/20">
                  <th className="text-left py-3 px-3 font-semibold">#</th>
                  <th className="text-left py-3 px-3 font-semibold">Description</th>
                  <th className="text-center py-3 px-3 font-semibold">Qty</th>
                  <th className="text-center py-3 px-3 font-semibold">Unit</th>
                  <th className="text-right py-3 px-3 font-semibold">Rate</th>
                  {invoice.gstEnabled && <th className="text-center py-3 px-3 font-semibold">GST%</th>}
                  <th className="text-right py-3 px-3 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-3 text-muted-foreground">{index + 1}</td>
                    <td className="py-3 px-3 font-medium">{item.itemName}</td>
                    <td className="py-3 px-3 text-center">{item.quantity}</td>
                    <td className="py-3 px-3 text-center text-muted-foreground text-xs">{item.unit}</td>
                    <td className="py-3 px-3 text-right">
                      {settings.currencySymbol}
                      {item.rate.toFixed(2)}
                    </td>
                    {invoice.gstEnabled && <td className="py-3 px-3 text-center">{item.gstRate}%</td>}
                    <td className="py-3 px-3 text-right font-medium">
                      {settings.currencySymbol}
                      {item.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Totals Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              {invoice.notes && (
                <div className="space-y-2">
                  <Label className="font-semibold">Notes</Label>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
            </div>

            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">
                  {settings.currencySymbol}
                  {invoice.subtotal.toFixed(2)}
                </span>
              </div>
              {invoice.gstEnabled && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CGST (9%):</span>
                    <span>
                      {settings.currencySymbol}
                      {invoice.cgst.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SGST (9%):</span>
                    <span>
                      {settings.currencySymbol}
                      {invoice.sgst.toFixed(2)}
                    </span>
                  </div>
                  {invoice.igst > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IGST (18%):</span>
                      <span>
                        {settings.currencySymbol}
                        {invoice.igst.toFixed(2)}
                      </span>
                    </div>
                  )}
                </>
              )}
              {invoice.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="text-green-600 font-medium">
                    -{settings.currencySymbol}
                    {invoice.discount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="border-t border-border pt-3 mt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span className="text-primary text-xl">
                    {settings.currencySymbol}
                    {invoice.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Info */}
      {settings.bankName && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p>
                <span className="font-semibold">Bank:</span> {settings.bankName}
              </p>
              <p>
                <span className="font-semibold">Account:</span> {settings.bankAccountNo}
              </p>
            </div>
            <div className="space-y-2">
              <p>
                <span className="font-semibold">IFSC:</span> {settings.bankIfsc}
              </p>
              {settings.upiId && (
                <p>
                  <span className="font-semibold">UPI:</span> {settings.upiId}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* E-Invoice Info */}
      {invoice.irn && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  />
                </svg>
                E-Invoice
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">IRN</Label>
                <p className="text-sm font-mono mt-1">{invoice.irn}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">E-Invoice Date</Label>
                <p className="text-sm mt-1">
                  {invoice.eInvoiceDate ? format(new Date(invoice.eInvoiceDate), "dd MMM yyyy HH:mm") : "-"}
                </p>
              </div>
            </div>
            {invoice.qrCode && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">QR Code</Label>
                <img
                  src={invoice.qrCode || "/placeholder.svg"}
                  alt="E-Invoice QR Code"
                  className="w-48 h-48 border rounded"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
