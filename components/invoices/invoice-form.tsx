"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoiceHeader } from "@/components/invoices/invoice-header"
import { InvoiceTable } from "@/components/invoices/invoice-table"
import { DocumentTypeSelector } from "@/components/invoices/document-type-selector"
import { ParentInvoiceSelector } from "@/components/invoices/parent-invoice-selector"
import { InvoiceFormSkeleton } from "@/components/invoices/invoice-form-skeleton"
import { ClientErrorBoundary } from "@/components/ui/client-error-boundary"
import { Save, Send, FileText, Loader2, Keyboard } from "lucide-react"
import { createInvoice, updateInvoice, generateInvoiceNumber, getInvoices } from "@/app/invoices/actions"
import { getCustomers } from "@/app/customers/actions"
import { getItemsByIds, type LightweightItem } from "@/app/items/lightweight-actions"
import { getSettings, getOrganizationDetails } from "@/app/settings/actions"
import { toast } from "sonner"
import type { ICustomer, IItem, IInvoice, IInvoiceItem, BillingMode, PricingMode, PackingType, DocumentType } from "@/types"
import { DOCUMENT_TYPE_CONFIG } from "@/types"
import { calculateInvoiceTotals, isInterStateSale } from "@/lib/invoice-calculations"
import { numberToWords } from "@/lib/number-to-words"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface InvoiceFormProps {
  invoice?: IInvoice
}

function isCreditOrDebitNote(docType: DocumentType): docType is "credit_note" | "debit_note" {
  return docType === "credit_note" || docType === "debit_note"
}

function resolveEditModeData(
  inv: IInvoice,
  customersData: ICustomer[],
  invoicesData: IInvoice[]
): { customer: ICustomer | null; parent: IInvoice | null } {
  const customer = customersData.find((c) => c.id === inv.customerId) || null
  const needsParent = inv.parentDocumentId && isCreditOrDebitNote(inv.documentType)
  const parent = needsParent
    ? invoicesData.find((i) => i.id === inv.parentDocumentId) || null
    : null
  return { customer, parent }
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message
  return fallback
}

function validateInvoiceFormData(
  selectedCustomer: ICustomer | null,
  invoiceItems: readonly IInvoiceItem[],
  dueDate: string,
  invoiceDate: string,
  documentType: DocumentType,
  parentInvoice: IInvoice | null,
  existingParentDocId?: string
): string | null {
  if (!selectedCustomer) return "Please select a customer"
  if (invoiceItems.length === 0) return "Please add at least one item"
  const hasInvalidItems = invoiceItems.some(
    (item) => !item.itemId || item.quantity <= 0 || item.rate <= 0
  )
  if (hasInvalidItems) return "Please ensure all items have valid quantity and rate"
  if (new Date(dueDate) < new Date(invoiceDate)) return "Due date cannot be before invoice date"
  const needsParent = isCreditOrDebitNote(documentType) && !parentInvoice && !existingParentDocId
  if (needsParent) return `Please select an original invoice for this ${DOCUMENT_TYPE_CONFIG[documentType].label}`
  return null
}

function buildInvoicePayload(params: {
  invoiceNo: string
  documentType: DocumentType
  selectedCustomer: ICustomer
  invoiceDate: string
  dueDate: string
  validityDate: string
  billingMode: BillingMode
  pricingMode: PricingMode
  invoiceItems: IInvoiceItem[]
  totals: ReturnType<typeof calculateInvoiceTotals>
  paidAmount: number
  notes: string
  status: string
  parentInvoice: IInvoice | null
}) {
  return {
    invoiceNo: params.invoiceNo,
    documentType: params.documentType,
    customerId: params.selectedCustomer.id,
    customerName: params.selectedCustomer.name,
    customerPhone: params.selectedCustomer.contactNo,
    customerAddress: params.selectedCustomer.address || "",
    customerGst: params.selectedCustomer.gstinNo || "",
    invoiceDate: new Date(params.invoiceDate),
    dueDate: new Date(params.dueDate),
    ...(DOCUMENT_TYPE_CONFIG[params.documentType].requiresValidity && {
      validityDate: new Date(params.validityDate),
    }),
    billingMode: params.billingMode,
    pricingMode: params.pricingMode,
    items: params.invoiceItems,
    ...params.totals,
    paidAmount: params.paidAmount,
    balance: params.totals.grandTotal - params.paidAmount,
    gstEnabled: params.billingMode === "gst",
    notes: params.notes,
    status: params.status,
    discountType: "percentage" as const,
    ...(params.parentInvoice && { parentDocumentId: params.parentInvoice.id }),
  }
}

async function persistInvoice(
  isEditMode: boolean,
  invoice: IInvoice | undefined,
  invoiceData: unknown,
  documentType: DocumentType,
  status?: string
): Promise<{ success: boolean; message: string; redirectTo: string }> {
  if (isEditMode && invoice) {
    const result = await updateInvoice(invoice.id, invoiceData)
    if (!result.success) {
      return { success: false, message: result.error || "Failed to update invoice", redirectTo: "" }
    }
    return {
      success: true,
      message: `${DOCUMENT_TYPE_CONFIG[documentType].label} updated successfully`,
      redirectTo: `/invoices/${invoice.id}`,
    }
  }
  const result = await createInvoice(invoiceData)
  if (!result.success) {
    return { success: false, message: result.error || "Failed to create invoice", redirectTo: "" }
  }
  const statusLabel = status === "draft" ? "saved as draft" : "created"
  return {
    success: true,
    message: `${DOCUMENT_TYPE_CONFIG[documentType].label} ${statusLabel} successfully`,
    redirectTo: "/invoices",
  }
}

function GstTaxRows({ totals, interState }: {
  readonly totals: ReturnType<typeof calculateInvoiceTotals>
  readonly interState: boolean
}) {
  if (interState) {
    return (
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">IGST:</span>
        <span className="font-medium">₹{totals.igst.toFixed(2)}</span>
      </div>
    )
  }
  return (
    <>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">CGST:</span>
        <span className="font-medium">₹{totals.cgst.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">SGST:</span>
        <span className="font-medium">₹{totals.sgst.toFixed(2)}</span>
      </div>
    </>
  )
}

function TotalsSummary({ totals, billingMode, interState }: {
  readonly totals: ReturnType<typeof calculateInvoiceTotals>
  readonly billingMode: BillingMode
  readonly interState: boolean
}) {
  return (
    <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal:</span>
        <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
      </div>
      {billingMode === "gst" && (
        <>
          <GstTaxRows totals={totals} interState={interState} />
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
      {totals.roundOff !== 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Round Off:</span>
          <span className="font-medium">{totals.roundOff > 0 ? "+" : ""}₹{totals.roundOff.toFixed(2)}</span>
        </div>
      )}
      <div className="flex justify-between text-lg font-bold pt-3 border-t border-border">
        <span>Total Amount:</span>
        <span className="text-primary">₹{totals.grandTotal.toFixed(2)}</span>
      </div>
      {totals.grandTotal > 0 && (
        <p className="text-xs text-muted-foreground italic pt-1">
          {numberToWords(totals.grandTotal)}
        </p>
      )}
    </div>
  )
}

function renderSaveIcon(isSaving: boolean, FallbackIcon: typeof Save) {
  if (isSaving) return <Loader2 className="w-4 h-4 mr-2 animate-spin" />
  return <FallbackIcon className="w-4 h-4 mr-2" />
}

export function InvoiceForm({ invoice }: InvoiceFormProps) {
  const router = useRouter()
  const isEditMode = !!invoice
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [customers, setCustomers] = useState<ICustomer[]>([])
  const [items, setItems] = useState<(IItem | LightweightItem)[]>([])
  const [allInvoices, setAllInvoices] = useState<IInvoice[]>([])

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
  const [orgGstNumber, setOrgGstNumber] = useState<string | undefined>(undefined)

  const initialDocTypeRef = useRef(documentType)

  async function loadEditModeData(inv: IInvoice) {
    const editItemIds = inv.items
      .map((item) => item.itemId)
      .filter((id): id is string => !!id)
    const needsInvoices = isCreditOrDebitNote(inv.documentType) && !!inv.parentDocumentId
    const [customersData, editItems, invoicesData] = await Promise.all([
      getCustomers(),
      editItemIds.length > 0 ? getItemsByIds(editItemIds) : Promise.resolve([]),
      needsInvoices ? getInvoices() : Promise.resolve([]),
    ])
    return { customersData, editItems, invoicesData }
  }

  useEffect(() => {
    async function loadData() {
      try {
        const essentialPromises: [
          ReturnType<typeof getSettings>,
          ReturnType<typeof getOrganizationDetails>,
          ReturnType<typeof generateInvoiceNumber> | Promise<string>,
        ] = [
          getSettings(),
          getOrganizationDetails(),
          isEditMode ? Promise.resolve("") : generateInvoiceNumber(documentType),
        ]

        const [settingsData, orgDetails, invoiceNumber] = await Promise.all(essentialPromises)

        if (orgDetails?.gstNumber) {
          setOrgGstNumber(orgDetails.gstNumber)
        }
        setCustomFieldsConfig({
          field1Enabled: settingsData.customField1Enabled,
          field1Label: settingsData.customField1Label,
          field2Enabled: settingsData.customField2Enabled,
          field2Label: settingsData.customField2Label,
        })

        if (!isEditMode) {
          setInvoiceNo(invoiceNumber)
        }

        if (isEditMode && invoice) {
          const { customersData, editItems, invoicesData } = await loadEditModeData(invoice)
          setCustomers(customersData)
          setItems(editItems)
          setAllInvoices(invoicesData)

          const { customer, parent } = resolveEditModeData(invoice, customersData, invoicesData)
          setSelectedCustomer(customer)
          if (parent) setParentInvoice(parent)
        }
      } catch (err) {
        const message = extractErrorMessage(err, "Failed to load form data")
        setLoadError(message)
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode])

  useEffect(() => {
    if (!isEditMode && documentType !== initialDocTypeRef.current) {
      initialDocTypeRef.current = documentType
      generateInvoiceNumber(documentType).then(setInvoiceNo)
    }
    if (!isEditMode && isCreditOrDebitNote(documentType) && allInvoices.length === 0) {
      getInvoices().then(setAllInvoices)
    }
  }, [documentType, isEditMode, allInvoices.length])

  useEffect(() => {
    if (parentInvoice && isCreditOrDebitNote(documentType)) {
      setSelectedCustomer(
        customers.find((c) => c.id === parentInvoice.customerId) || null
      )
      setInvoiceItems(parentInvoice.items)
      setBillingMode(parentInvoice.billingMode)
    }
  }, [parentInvoice, documentType, customers])

  const interState = isInterStateSale(orgGstNumber, selectedCustomer?.gstinNo)
  const totals = calculateInvoiceTotals(invoiceItems, billingMode, interState)
  const isDirty = useRef(false)

  useEffect(() => {
    if (!isLoading) isDirty.current = true
  }, [invoiceItems, selectedCustomer, notes, billingMode, pricingMode, isLoading])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty.current && !isSaving) {
        e.preventDefault()
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isSaving])

  const handleSave = useCallback(async (status?: "draft" | "sent") => {
    const validationError = validateInvoiceFormData(
      selectedCustomer, invoiceItems, dueDate, invoiceDate,
      documentType, parentInvoice, invoice?.parentDocumentId
    )
    if (validationError) {
      toast.error(validationError)
      return
    }

    const saveAction = isEditMode ? "update" : "save"
    setIsSaving(true)
    try {
      const invoiceData = buildInvoicePayload({
        invoiceNo,
        documentType,
        selectedCustomer: selectedCustomer!,
        invoiceDate,
        dueDate,
        validityDate,
        billingMode,
        pricingMode,
        invoiceItems,
        totals,
        paidAmount: invoice?.paidAmount || 0,
        notes,
        status: status || invoice?.status || "draft",
        parentInvoice,
      })

      isDirty.current = false

      const result = await persistInvoice(isEditMode, invoice, invoiceData, documentType, status)
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      router.push(result.redirectTo)
    } catch {
      toast.error(`Failed to ${saveAction} ${DOCUMENT_TYPE_CONFIG[documentType].label}`)
    } finally {
      setIsSaving(false)
    }
  }, [selectedCustomer, invoiceItems, dueDate, invoiceDate, documentType, parentInvoice, invoice, invoiceNo, validityDate, billingMode, pricingMode, totals, notes, isEditMode, router])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const hasModifier = e.ctrlKey || e.metaKey
      if (!hasModifier || isSaving) return

      if (e.key === "s") {
        e.preventDefault()
        handleSave(isEditMode ? undefined : "draft")
        return
      }

      if (e.shiftKey && e.key === "S" && !isEditMode) {
        e.preventDefault()
        handleSave("sent")
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleSave, isSaving, isEditMode])

  if (isLoading) {
    return <InvoiceFormSkeleton />
  }

  if (loadError) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6 text-center space-y-4">
          <p className="text-sm text-destructive font-medium">Failed to load invoice form</p>
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <ClientErrorBoundary fallbackTitle="Invoice form encountered an error">
    <div className="space-y-6">
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

      {isCreditOrDebitNote(documentType) && !isEditMode && (
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
            onItemsPoolChange={setItems}
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
            <div className="space-y-4">
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

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="gap-1">
                  {invoiceItems.length} {invoiceItems.length === 1 ? "item" : "items"}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  {invoiceItems.reduce((sum, item) => sum + item.quantity, 0)} total qty
                </Badge>
                {pricingMode !== "sale" && (
                  <Badge variant="secondary" className="gap-1 capitalize">
                    {pricingMode} pricing
                  </Badge>
                )}
              </div>
            </div>

            <TotalsSummary totals={totals} billingMode={billingMode} interState={interState} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                <Keyboard className="w-3.5 h-3.5" />
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[0.625rem] font-mono">Ctrl+S</kbd> Save
                {!isEditMode && (
                  <>
                    <span className="mx-1">|</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[0.625rem] font-mono">Ctrl+Shift+S</kbd> Create
                  </>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>Keyboard shortcuts for quick save</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(isEditMode && invoice ? `/invoices/${invoice.id}` : "/invoices")}
            disabled={isSaving}
          >
            Cancel
          </Button>
          {isEditMode ? (
            <Button onClick={() => handleSave()} disabled={isSaving}>
              {renderSaveIcon(isSaving, Save)}
              Update {DOCUMENT_TYPE_CONFIG[documentType].label}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleSave("draft")} disabled={isSaving}>
                {renderSaveIcon(isSaving, Save)}
                Save as Draft
              </Button>
              <Button onClick={() => handleSave("sent")} disabled={isSaving}>
                {renderSaveIcon(isSaving, Send)}
                Create {DOCUMENT_TYPE_CONFIG[documentType].label}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
    </ClientErrorBoundary>
  )
}
