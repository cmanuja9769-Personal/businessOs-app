"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoiceHeader } from "@/components/invoices/invoice-header"
import { InvoiceTable } from "@/components/invoices/invoice-table"
import { Save, FileText, Loader2 } from "lucide-react"
import { updateInvoice } from "@/app/invoices/actions"
import { getCustomers } from "@/app/customers/actions"
import { getItems } from "@/app/items/actions"
import { toast } from "sonner"
import type { ICustomer, IItem, IInvoice, IInvoiceItem, BillingMode, PricingMode } from "@/types"
import { calculateInvoiceTotals } from "@/lib/invoice-calculations"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface InvoiceEditorProps {
  invoice: IInvoice
}

export function InvoiceEditor({ invoice }: InvoiceEditorProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [customers, setCustomers] = useState<ICustomer[]>([])
  const [items, setItems] = useState<IItem[]>([])

  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null)
  const [invoiceDate, setInvoiceDate] = useState(invoice.invoiceDate.toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState(invoice.dueDate.toISOString().split("T")[0])
  const [billingMode, setBillingMode] = useState<BillingMode>(invoice.billingMode)
  const [pricingMode, setPricingMode] = useState<PricingMode>("sale")
  const [invoiceItems, setInvoiceItems] = useState<IInvoiceItem[]>(invoice.items)
  const [notes, setNotes] = useState(invoice.notes || "")

  useEffect(() => {
    async function loadData() {
      try {
        const [customersData, itemsData] = await Promise.all([getCustomers(), getItems()])
        setCustomers(customersData)
        setItems(itemsData)

        const customer = customersData.find((c) => c.id === invoice.customerId)
        setSelectedCustomer(customer || null)
      } catch (error) {
        toast.error("Failed to load data")
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [invoice.customerId])

  const totals = calculateInvoiceTotals(invoiceItems, billingMode)

  const handleSave = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer")
      return
    }

    if (invoiceItems.length === 0) {
      toast.error("Please add at least one item")
      return
    }

    setIsSaving(true)
    try {
      const invoiceData = {
        invoiceNo: invoice.invoiceNo,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        billingMode,
        items: invoiceItems,
        ...totals,
        notes,
        status: invoice.status,
      }

      await updateInvoice(invoice.id, invoiceData)
      toast.success("Invoice updated successfully")
      router.push(`/invoices/${invoice.id}`)
    } catch (error) {
      toast.error("Failed to update invoice")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Invoice Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceHeader
            invoiceNo={invoice.invoiceNo}
            customers={customers}
            selectedCustomer={selectedCustomer}
            onCustomerChange={setSelectedCustomer}
            invoiceDate={invoiceDate}
            onInvoiceDateChange={setInvoiceDate}
            dueDate={dueDate}
            onDueDateChange={setDueDate}
            billingMode={billingMode}
            onBillingModeChange={setBillingMode}
            pricingMode={pricingMode}
            onPricingModeChange={setPricingMode}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceTable
            items={items}
            invoiceItems={invoiceItems}
            onItemsChange={setInvoiceItems}
            billingMode={billingMode}
            pricingMode={pricingMode}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes / Terms & Conditions</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes, payment terms, or conditions..."
                rows={4}
              />
            </div>

            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
              </div>
              {billingMode === "gst" && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CGST:</span>
                    <span className="font-medium">₹{totals.cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SGST:</span>
                    <span className="font-medium">₹{totals.sgst.toFixed(2)}</span>
                  </div>
                  {totals.cess > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cess:</span>
                      <span className="font-medium">₹{totals.cess.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              {totals.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="font-medium text-green-600">-₹{totals.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-3 border-t border-border">
                <span>Total Amount:</span>
                <span className="text-primary">₹{totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push(`/invoices/${invoice.id}`)} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Update Invoice
        </Button>
      </div>
    </div>
  )
}
