"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoiceHeader } from "@/components/invoices/invoice-header"
import { InvoiceTable } from "@/components/invoices/invoice-table"
import { Save, Send, FileText, Loader2 } from "lucide-react"
import { createInvoice, generateInvoiceNumber } from "@/app/invoices/actions"
import { getCustomers } from "@/app/customers/actions"
import { getItems } from "@/app/items/actions"
import { getSettings } from "@/app/settings/actions"
import { toast } from "sonner"
import type { ICustomer, IItem, IInvoiceItem, BillingMode, PricingMode, PackingType } from "@/types"
import { calculateInvoiceTotals } from "@/lib/invoice-calculations"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export function InvoiceBuilder() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [customers, setCustomers] = useState<ICustomer[]>([])
  const [items, setItems] = useState<IItem[]>([])

  // Invoice state
  const [invoiceNo, setInvoiceNo] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null)
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
  const [billingMode, setBillingMode] = useState<BillingMode>("gst")
  const [pricingMode, setPricingMode] = useState<PricingMode>("sale") // Added pricing mode state
  const [packingType, setPackingType] = useState<PackingType>("loose") // Added packing type state
  const [invoiceItems, setInvoiceItems] = useState<IInvoiceItem[]>([])
  const [notes, setNotes] = useState("")
  const [customFieldsConfig, setCustomFieldsConfig] = useState({ field1Enabled: false, field1Label: "", field2Enabled: false, field2Label: "" })

  useEffect(() => {
    async function loadData() {
      try {
        const [customersData, itemsData, invoiceNumber, settingsData] = await Promise.all([
          getCustomers(),
          getItems(),
          generateInvoiceNumber(),
          getSettings(),
        ])
        setCustomers(customersData)
        setItems(itemsData)
        setInvoiceNo(invoiceNumber)
        setCustomFieldsConfig({
          field1Enabled: settingsData.customField1Enabled,
          field1Label: settingsData.customField1Label,
          field2Enabled: settingsData.customField2Enabled,
          field2Label: settingsData.customField2Label,
        })
      } catch (error) {
        toast.error("Failed to load data")
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const totals = calculateInvoiceTotals(invoiceItems, billingMode)

  const handleSave = async (status: "draft" | "sent") => {
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
        invoiceNo,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        billingMode,
        items: invoiceItems,
        ...totals,
        notes,
        status,
      }

      await createInvoice(invoiceData)
      toast.success(`Invoice ${status === "draft" ? "saved as draft" : "created"} successfully`)
      router.push("/invoices")
    } catch (error) {
      toast.error("Failed to save invoice")
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
            invoiceNo={invoiceNo}
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
            packingType={packingType}
            onPackingTypeChange={setPackingType}
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
            packingType={packingType}
            customField1Enabled={customFieldsConfig.field1Enabled}
            customField1Label={customFieldsConfig.field1Label}
            customField2Enabled={customFieldsConfig.field2Enabled}
            customField2Label={customFieldsConfig.field2Label}
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
        <Button variant="outline" onClick={() => router.push("/invoices")} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="outline" onClick={() => handleSave("draft")} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save as Draft
        </Button>
        <Button onClick={() => handleSave("sent")} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          Create Invoice
        </Button>
      </div>
    </div>
  )
}
