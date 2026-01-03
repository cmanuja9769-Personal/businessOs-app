"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoiceHeader } from "@/components/invoices/invoice-header"
import { InvoiceTable } from "@/components/invoices/invoice-table"
import { DocumentTypeSelector } from "@/components/invoices/document-type-selector"
import { ParentInvoiceSelector } from "@/components/invoices/parent-invoice-selector"
import { Save, Send, FileText, Loader2 } from "lucide-react"
import { createInvoice, updateInvoice, generateInvoiceNumber, getInvoices } from "@/app/invoices/actions"
import { getCustomers } from "@/app/customers/actions"
import { getItems } from "@/app/items/actions"
import { getSettings } from "@/app/settings/actions"
import { toast } from "sonner"
import type { ICustomer, IItem, IInvoice, IInvoiceItem, BillingMode, PricingMode, PackingType, DocumentType } from "@/types"
import { DOCUMENT_TYPE_CONFIG } from "@/types"
import { calculateInvoiceTotals } from "@/lib/invoice-calculations"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface InvoiceFormProps {
  invoice?: IInvoice // If provided, we're in edit mode
}

export function InvoiceForm({ invoice }: InvoiceFormProps) {
  const router = useRouter()
  const isEditMode = !!invoice
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [customers, setCustomers] = useState<ICustomer[]>([])
  const [items, setItems] = useState<IItem[]>([])
  const [allInvoices, setAllInvoices] = useState<IInvoice[]>([])

  // Invoice state
  const [documentType, setDocumentType] = useState<DocumentType>(invoice?.documentType || "invoice")
  const [invoiceNo, setInvoiceNo] = useState(invoice?.invoiceNo || "")
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null)
  const [invoiceDate, setInvoiceDate] = useState(
    invoice?.invoiceDate
      ? new Date(invoice.invoiceDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  )
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate
      ? new Date(invoice.dueDate).toISOString().split("T")[0]
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  )
  const [validityDate, setValidityDate] = useState(
    invoice?.validityDate
      ? new Date(invoice.validityDate).toISOString().split("T")[0]
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  )
  const [billingMode, setBillingMode] = useState<BillingMode>(invoice?.billingMode || "gst")
  const [pricingMode, setPricingMode] = useState<PricingMode>("sale")
  const [packingType, setPackingType] = useState<PackingType>("loose")
  const [invoiceItems, setInvoiceItems] = useState<IInvoiceItem[]>(invoice?.items || [])
  const [notes, setNotes] = useState(invoice?.notes || "")
  const [parentInvoice, setParentInvoice] = useState<IInvoice | null>(null)
  const [customFieldsConfig, setCustomFieldsConfig] = useState({ field1Enabled: false, field1Label: "", field2Enabled: false, field2Label: "" })

  useEffect(() => {
    async function loadData() {
      try {
        const [customersData, itemsData, invoicesData, settingsData] = await Promise.all([
          getCustomers(),
          getItems(),
          getInvoices(),
          getSettings(),
        ])
        
        setCustomers(customersData)
        setItems(itemsData)
        setAllInvoices(invoicesData)
        setCustomFieldsConfig({
          field1Enabled: settingsData.customField1Enabled,
          field1Label: settingsData.customField1Label,
          field2Enabled: settingsData.customField2Enabled,
          field2Label: settingsData.customField2Label,
        })

        if (isEditMode && invoice) {
          // Find and set the customer in edit mode
          const customer = customersData.find((c) => c.id === invoice.customerId)
          setSelectedCustomer(customer || null)
          
          // If this is a credit/debit note, load parent invoice
          if (invoice.parentDocumentId && (invoice.documentType === "credit_note" || invoice.documentType === "debit_note")) {
            const parent = invoicesData.find((inv) => inv.id === invoice.parentDocumentId)
            if (parent) {
              setParentInvoice(parent)
            }
          }
        } else {
          // Generate invoice number for new invoice
          const invoiceNumber = await generateInvoiceNumber(documentType)
          setInvoiceNo(invoiceNumber)
        }
      } catch (error) {
        toast.error("Failed to load data")
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [isEditMode, invoice, documentType])

  // Regenerate invoice number when document type changes
  useEffect(() => {
    if (!isEditMode) {
      generateInvoiceNumber(documentType).then(setInvoiceNo)
    }
  }, [documentType, isEditMode])

  // When parent invoice is selected for credit/debit notes, load its items
  useEffect(() => {
    if (parentInvoice && (documentType === "credit_note" || documentType === "debit_note")) {
      setSelectedCustomer(
        customers.find((c) => c.id === parentInvoice.customerId) || null
      )
      setInvoiceItems(parentInvoice.items)
      setBillingMode(parentInvoice.billingMode)
    }
  }, [parentInvoice, documentType, customers])

  const totals = calculateInvoiceTotals(invoiceItems, billingMode)

  const handleSave = async (status?: "draft" | "sent") => {
    if (!selectedCustomer) {
      toast.error("Please select a customer")
      return
    }

    if (invoiceItems.length === 0) {
      toast.error("Please add at least one item")
      return
    }

    // Validate credit/debit notes have parent invoice
    if ((documentType === "credit_note" || documentType === "debit_note") && !parentInvoice && !invoice?.parentDocumentId) {
      toast.error(`Please select an original invoice for this ${DOCUMENT_TYPE_CONFIG[documentType].label}`)
      return
    }

    setIsSaving(true)
    try {
      const invoiceData = {
        invoiceNo,
        documentType,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.contactNo,
        customerAddress: selectedCustomer.address || "",
        customerGst: selectedCustomer.gstinNo || "",
        invoiceDate: new Date(invoiceDate),
        dueDate: new Date(dueDate),
        ...(DOCUMENT_TYPE_CONFIG[documentType].requiresValidity && {
          validityDate: new Date(validityDate),
        }),
        billingMode,
        pricingMode,
        items: invoiceItems,
        ...totals,
        paidAmount: invoice?.paidAmount || 0,
        balance: totals.total - (invoice?.paidAmount || 0),
        gstEnabled: billingMode === "gst",
        notes,
        status: status || invoice?.status || "draft",
        discountType: "percentage" as const,
        ...(parentInvoice && { parentDocumentId: parentInvoice.id }),
      }

      if (isEditMode && invoice) {
        const result = await updateInvoice(invoice.id, invoiceData)
        if (!result.success) {
          toast.error(result.error || "Failed to update invoice")
          return
        }
        toast.success(`${DOCUMENT_TYPE_CONFIG[documentType].label} updated successfully`)
        router.push(`/invoices/${invoice.id}`)
      } else {
        const result = await createInvoice(invoiceData)
        if (!result.success) {
          toast.error(result.error || "Failed to create invoice")
          return
        }
        toast.success(`${DOCUMENT_TYPE_CONFIG[documentType].label} ${status === "draft" ? "saved as draft" : "created"} successfully`)
        router.push("/invoices")
      }
    } catch (error) {
      console.error("Error in handleSave:", error)
      toast.error(`Failed to ${isEditMode ? "update" : "save"} ${DOCUMENT_TYPE_CONFIG[documentType].label}`)
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
      {/* Document Type Selector - Only show for new documents */}
      {!isEditMode && (
        <Card>
          <CardContent className="pt-6">
            <DocumentTypeSelector
              value={documentType}
              onChange={setDocumentType}
            />
          </CardContent>
        </Card>
      )}

      {/* Parent Invoice Selector - For credit/debit notes */}
      {(documentType === "credit_note" || documentType === "debit_note") && !isEditMode && (
        <Card>
          <CardContent className="pt-6">
            <ParentInvoiceSelector
              invoices={allInvoices}
              selectedInvoiceId={parentInvoice?.id}
              onSelect={setParentInvoice}
              documentType={documentType}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {DOCUMENT_TYPE_CONFIG[documentType].label} Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {/* Validity Date - For quotations and proforma invoices */}
          {DOCUMENT_TYPE_CONFIG[documentType].requiresValidity && (
            <div className="space-y-2">
              <Label htmlFor="validity-date">Validity Date</Label>
              <Input
                id="validity-date"
                type="date"
                value={validityDate}
                onChange={(e) => setValidityDate(e.target.value)}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                This {DOCUMENT_TYPE_CONFIG[documentType].label.toLowerCase()} is valid until this date
              </p>
            </div>
          )}
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
        <Button
          variant="outline"
          onClick={() => router.push(isEditMode && invoice ? `/invoices/${invoice.id}` : "/invoices")}
          disabled={isSaving}
        >
          Cancel
        </Button>
        {isEditMode ? (
          <Button onClick={() => handleSave()} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Update {DOCUMENT_TYPE_CONFIG[documentType].label}
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => handleSave("draft")} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save as Draft
            </Button>
            <Button onClick={() => handleSave("sent")} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Create {DOCUMENT_TYPE_CONFIG[documentType].label}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
