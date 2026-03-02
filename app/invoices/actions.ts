"use server"

import { enqueueJob } from "@/lib/invoice-queue"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { IInvoice, DocumentType, DocumentStatus, BillingMode, PricingMode } from "@/types"
import { invoiceSchema } from "@/lib/schemas"
import { logStockMovement, type StockTransactionType } from "@/lib/stock-management"
import { authorize, orgScope } from "@/lib/authorize"
import { calculateItemAmount, calculateInvoiceTotals, isInterStateSale } from "@/lib/invoice-calculations"
import { createJournalEntryForInvoice } from "@/lib/accounting/auto-journal"
import { isDemoMode, throwDemoMutationError } from "@/app/demo/helpers"
import { demoInvoices } from "@/app/demo/data"

interface DbInvoiceItem {
  readonly item_id: string | null
  readonly item_name: string
  readonly quantity: number
  readonly unit: string | null
  readonly rate: number
  readonly tax_rate: number | null
  readonly gst_rate: number | null
  readonly cess_rate: number | null
  readonly discount: number | null
  readonly custom_field_1_value: string | null
  readonly custom_field_2_value: number | null
  readonly amount: number
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const INVOICE_WITH_ITEMS_SELECT = "*, invoice_items(*)"
const INVOICE_LIST_SELECT = "id, invoice_number, document_type, customer_id, customer_name, customer_phone, customer_gst, invoice_date, due_date, validity_date, gst_enabled, pricing_mode, subtotal, cgst, sgst, igst, cess, discount, discount_type, total, paid_amount, balance, status, notes, irn, qr_code, e_invoice_date, ewaybill_no, ewaybill_date, ewaybill_valid_upto, ewaybill_status, vehicle_number, transport_mode, distance, parent_document_id, converted_to_invoice_id, created_at, updated_at"
const INVALID_INVOICE_ID = "Invalid invoice ID"
const SALE_DOC_TYPES = ["invoice", "cash_memo", "tax_invoice"]
const RETURN_DOC_TYPES = ["sales_return"]

interface ValidatedInvoiceItem {
  readonly itemId?: string
  readonly itemName: string
  readonly quantity: number
  readonly unit?: string
  readonly rate: number
  readonly gstRate?: number
  readonly cessRate?: number
  readonly discount?: number
  readonly customField1Value?: string | null
  readonly customField2Value?: number | null
  readonly amount: number
}

async function resolveOrganizationId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  items: readonly ValidatedInvoiceItem[],
): Promise<string | null> {
  for (const item of items) {
    if (!item.itemId) continue
    const { data: itemData } = await supabase
      .from("items")
      .select("organization_id")
      .eq("id", item.itemId)
      .single()
    if (itemData?.organization_id) return itemData.organization_id
  }
  return null
}

async function logInvoiceStockMovements(
  supabase: Awaited<ReturnType<typeof createClient>>,
  items: readonly ValidatedInvoiceItem[],
  docType: string,
  invoiceId: string,
  invoiceNo: string,
  customerId: string | undefined,
  customerName: string | undefined,
  userId: string,
): Promise<void> {
  const isStockDoc = SALE_DOC_TYPES.includes(docType) || RETURN_DOC_TYPES.includes(docType)
  if (!isStockDoc) return

  const organizationId = await resolveOrganizationId(supabase, items)
  if (!organizationId) return

  const isSale = SALE_DOC_TYPES.includes(docType)
  const transactionType = isSale ? "SALE" : "RETURN"

  for (const item of items) {
    if (!item.itemId) continue
    try {
      await logStockMovement({
        itemId: item.itemId,
        organizationId,
        transactionType,
        entryQuantity: item.quantity,
        entryUnit: item.unit || "PCS",
        referenceType: "invoice",
        referenceId: invoiceId,
        referenceNo: invoiceNo,
        ratePerUnit: item.rate,
        partyId: customerId,
        partyName: customerName,
        notes: `${docType === "invoice" ? "Invoice" : docType} ${invoiceNo}`,
      }, userId)
    } catch (stockError) {
      console.error("[v0] Error logging stock movement for item:", item.itemId, stockError)
    }
  }
}

export async function getInvoices(): Promise<IInvoice[]> {
  if (await isDemoMode()) return demoInvoices
  try {
    const { supabase, organizationId } = await authorize("invoices", "read")
    const { data, error } = await supabase
      .from("invoices")
      .select(INVOICE_LIST_SELECT)
      .or(orgScope(organizationId))
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(2000)

  if (error) {
    console.error("[Invoices] Error fetching invoices:", error.message || error)
    return []
  }

  return (
    data?.map((invoice) => ({
      id: invoice.id,
      invoiceNo: invoice.invoice_number,
      documentType: (invoice.document_type || "invoice") as DocumentType,
      customerId: invoice.customer_id || "",
      customerName: invoice.customer_name,
      customerPhone: invoice.customer_phone || "",
      customerAddress: "",
      customerGst: invoice.customer_gst || "",
      invoiceDate: new Date(invoice.invoice_date || invoice.created_at),
      dueDate: new Date(invoice.due_date || invoice.invoice_date || invoice.created_at),
      validityDate: invoice.validity_date ? new Date(invoice.validity_date) : undefined,
      billingMode: (invoice.gst_enabled ? "gst" : "non-gst") as BillingMode,
      pricingMode: (invoice.pricing_mode || "sale") as PricingMode,
      items: [],
      subtotal: Number(invoice.subtotal),
      cgst: Number(invoice.cgst),
      sgst: Number(invoice.sgst),
      igst: Number(invoice.igst),
      cess: Number(invoice.cess || 0),
      discount: Number(invoice.discount || 0),
      discountType: (invoice.discount_type || "percentage") as "percentage" | "flat",
      total: Number(invoice.total),
      paidAmount: Number(invoice.paid_amount || 0),
      balance: Number(invoice.balance || invoice.total),
      status: invoice.status as DocumentStatus,
      gstEnabled: invoice.gst_enabled,
      notes: invoice.notes || undefined,
      irn: invoice.irn || undefined,
      qrCode: invoice.qr_code || undefined,
      eInvoiceDate: invoice.e_invoice_date ? new Date(invoice.e_invoice_date) : undefined,
      ewaybillNo: invoice.ewaybill_no || null,
      ewaybillDate: invoice.ewaybill_date || null,
      ewaybillValidUpto: invoice.ewaybill_valid_upto || null,
      ewaybillStatus: invoice.ewaybill_status || null,
      vehicleNumber: invoice.vehicle_number || null,
      transportMode: invoice.transport_mode || null,
      distance: invoice.distance || null,
      parentDocumentId: invoice.parent_document_id || undefined,
      convertedToInvoiceId: invoice.converted_to_invoice_id || undefined,
      createdAt: new Date(invoice.created_at),
      updatedAt: new Date(invoice.updated_at),
    })) || []
  )
  } catch {
    return []
  }
}

export async function getInvoice(id: string): Promise<IInvoice | undefined> {
  if (await isDemoMode()) return demoInvoices.find(i => i.id === id)
  if (!id || !UUID_REGEX.test(id)) {
    if (id && id !== 'undefined' && id !== 'null') {
      console.error(`[v0] Invalid invoice ID format: ${id}`)
    }
    return undefined
  }

  try {
    const { supabase, organizationId } = await authorize("invoices", "read")
    const { data, error } = await supabase
      .from("invoices")
      .select(INVOICE_WITH_ITEMS_SELECT)
      .eq("id", id)
      .or(orgScope(organizationId))
      .single()

  if (error || !data) {
    console.error("[v0] Error fetching invoice:", error)
    return undefined
  }

  return {
    id: data.id,
    invoiceNo: data.invoice_number,
    documentType: (data.document_type || "invoice") as DocumentType,
    customerId: data.customer_id || "",
    customerName: data.customer_name,
    customerPhone: data.customer_phone || "",
    customerAddress: data.customer_address || "",
    customerGst: data.customer_gst || "",
    invoiceDate: new Date(data.invoice_date || data.created_at),
    dueDate: new Date(data.due_date || data.invoice_date || data.created_at),
    validityDate: data.validity_date ? new Date(data.validity_date) : undefined,
    billingMode: (data.gst_enabled ? "gst" : "non-gst") as BillingMode,
    pricingMode: (data.pricing_mode || "sale") as PricingMode,
    items: data.invoice_items.map((item: DbInvoiceItem) => ({
      itemId: item.item_id || "",
      itemName: item.item_name,
      quantity: item.quantity,
      unit: item.unit || "PCS",
      rate: Number(item.rate),
      gstRate: Number(item.tax_rate || item.gst_rate || 0),
      cessRate: Number(item.cess_rate || 0),
      discount: Number(item.discount || 0),
      customField1Value: item.custom_field_1_value ?? undefined,
      customField2Value: item.custom_field_2_value == null ? undefined : Number(item.custom_field_2_value),
      amount: Number(item.amount),
    })),
    subtotal: Number(data.subtotal),
    cgst: Number(data.cgst),
    sgst: Number(data.sgst),
    igst: Number(data.igst),
    cess: Number(data.cess || 0),
    discount: Number(data.discount || 0),
    discountType: (data.discount_type || "percentage") as "percentage" | "flat",
    total: Number(data.total),
    paidAmount: Number(data.paid_amount || 0),
    balance: Number(data.balance || data.total),
    status: data.status as DocumentStatus,
    gstEnabled: data.gst_enabled,
    notes: data.notes || undefined,
    irn: data.irn || undefined,
    qrCode: data.qr_code || undefined,
    eInvoiceDate: data.e_invoice_date ? new Date(data.e_invoice_date) : undefined,
    ewaybillNo: data.ewaybill_no || null,
    ewaybillDate: data.ewaybill_date || null,
    ewaybillValidUpto: data.ewaybill_valid_upto || null,
    ewaybillStatus: data.ewaybill_status || null,
    vehicleNumber: data.vehicle_number || null,
    transportMode: data.transport_mode || null,
    distance: data.distance || null,
    parentDocumentId: data.parent_document_id || undefined,
    convertedToInvoiceId: data.converted_to_invoice_id || undefined,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
  } catch {
    return undefined
  }
}

async function checkCreditLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerId: string,
  estimatedTotal: number,
): Promise<string | null> {
  const { data: customer } = await supabase
    .from("customers")
    .select("credit_limit, outstanding_balance")
    .eq("id", customerId)
    .single()

  if (!customer?.credit_limit || customer.credit_limit <= 0) return null

  const currentOutstanding = customer.outstanding_balance || 0
  if (currentOutstanding + estimatedTotal > customer.credit_limit) {
    return `Credit limit exceeded. Limit: ₹${customer.credit_limit.toLocaleString("en-IN")}, Outstanding: ₹${currentOutstanding.toLocaleString("en-IN")}, Invoice: ₹${Math.round(estimatedTotal).toLocaleString("en-IN")}`
  }
  return null
}

function estimateInvoiceTotal(items: readonly ValidatedInvoiceItem[], gstEnabled: boolean): number {
  return Number(items.reduce((sum, item) => {
    const base = item.quantity * item.rate
    const disc = (base * (item.discount || 0)) / 100
    const afterDisc = base - disc
    const gst = gstEnabled ? (afterDisc * (item.gstRate || 0)) / 100 : 0
    return sum + afterDisc + gst
  }, 0))
}

async function createInvoiceJournalEntry(params: {
  organizationId: string
  userId: string
  invoiceId: string
  invoiceNo: string
  customerName: string
  totals: ReturnType<typeof calculateInvoiceTotals>
  serverTotal: number
}) {
  try {
    await createJournalEntryForInvoice({
      organizationId: params.organizationId,
      userId: params.userId,
      invoiceId: params.invoiceId,
      invoiceNo: params.invoiceNo,
      customerName: params.customerName,
      subtotal: Math.round(params.totals.subtotal * 100) / 100,
      cgst: Math.round(params.totals.cgst * 100) / 100,
      sgst: Math.round(params.totals.sgst * 100) / 100,
      igst: Math.round(params.totals.igst * 100) / 100,
      total: params.serverTotal,
    })
  } catch (journalError) {
    console.error("[auto-journal] Failed to create journal entry for invoice:", journalError)
  }
}

async function updateCustomerOutstandingForInvoice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerId: string,
  docType: string,
  serverBalance: number,
  serverTotal: number,
) {
  const balanceChange = RETURN_DOC_TYPES.includes(docType) ? -serverBalance : serverBalance
  const { error: rpcError } = await supabase.rpc("update_customer_outstanding", {
    p_customer_id: customerId,
    p_amount: balanceChange,
  })
  if (rpcError) {
    const { data: cust } = await supabase
      .from("customers")
      .select("outstanding_balance, total_sales")
      .eq("id", customerId)
      .single()

    const currentBalance = cust?.outstanding_balance || 0
    await supabase
      .from("customers")
      .update({
        outstanding_balance: currentBalance + balanceChange,
        total_sales: cust?.total_sales ? Number(cust.total_sales) + serverTotal : serverTotal,
        last_transaction_date: new Date().toISOString().split("T")[0],
      })
      .eq("id", customerId)
  }
}

function buildInvoiceInsertPayload(
  validated: ReturnType<typeof invoiceSchema.parse>,
  organizationId: string,
  totals: ReturnType<typeof calculateInvoiceTotals>,
  serverTotal: number,
  serverBalance: number,
) {
  return {
    organization_id: organizationId,
    invoice_number: validated.invoiceNo,
    document_type: validated.documentType || "invoice",
    customer_id: validated.customerId || null,
    customer_name: validated.customerName,
    customer_phone: validated.customerPhone || null,
    customer_address: validated.customerAddress || null,
    customer_gst: validated.customerGst || null,
    invoice_date: validated.invoiceDate.toISOString().split("T")[0],
    due_date: validated.dueDate.toISOString().split("T")[0],
    validity_date: validated.validityDate ? validated.validityDate.toISOString().split("T")[0] : null,
    pricing_mode: validated.pricingMode,
    subtotal: Math.round(totals.subtotal * 100) / 100,
    discount: validated.discount,
    discount_type: validated.discountType,
    cgst: Math.round(totals.cgst * 100) / 100,
    sgst: Math.round(totals.sgst * 100) / 100,
    igst: Math.round(totals.igst * 100) / 100,
    cess: Math.round(totals.cess * 100) / 100,
    round_off: Math.round(totals.roundOff * 100) / 100,
    total: serverTotal,
    paid_amount: validated.paidAmount || 0,
    balance: serverBalance,
    status: validated.status,
    gst_enabled: validated.gstEnabled,
    notes: validated.notes || null,
    irn: validated.irn || null,
    qr_code: validated.qrCode || null,
    e_invoice_date: validated.eInvoiceDate ? validated.eInvoiceDate.toISOString() : null,
    parent_document_id: validated.parentDocumentId || null,
    converted_to_invoice_id: validated.convertedToInvoiceId || null,
  }
}

function buildInvoiceItemRows(
  items: ReturnType<typeof invoiceSchema.parse>["items"],
  invoiceId: string,
  billingMode: "gst" | "non-gst",
) {
  return items.map((item) => ({
    invoice_id: invoiceId,
    item_id: item.itemId || null,
    item_name: item.itemName,
    unit: item.unit || "PCS",
    quantity: item.quantity,
    rate: item.rate,
    gst_rate: item.gstRate || 0,
    cess_rate: item.cessRate || 0,
    discount: item.discount || 0,
    custom_field_1_value: item.customField1Value ?? null,
    custom_field_2_value: item.customField2Value ?? null,
    amount: Math.round(
      calculateItemAmount(item.quantity, item.rate, item.gstRate || 0, item.cessRate || 0, item.discount || 0, billingMode) * 100
    ) / 100,
  }))
}

function extractErrorMessage(error: unknown, fallback = "Failed to create invoice"): string {
  return error instanceof Error ? error.message : fallback
}

async function handlePostInvoiceCreation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  validated: ReturnType<typeof invoiceSchema.parse>,
  organizationId: string,
  userId: string,
  invoiceId: string,
  totals: ReturnType<typeof calculateInvoiceTotals>,
  serverTotal: number,
  serverBalance: number,
) {
  const docType = validated.documentType || "invoice"
  await logInvoiceStockMovements(supabase, validated.items, docType, invoiceId, validated.invoiceNo, validated.customerId || undefined, validated.customerName || undefined, userId)

  if (docType === "invoice") {
    await createInvoiceJournalEntry({ organizationId, userId, invoiceId, invoiceNo: validated.invoiceNo, customerName: validated.customerName || "Customer", totals, serverTotal })
  }

  if (validated.customerId && SALE_DOC_TYPES.includes(docType)) {
    await updateCustomerOutstandingForInvoice(supabase, validated.customerId, docType, serverBalance, serverTotal)
  }
}

export async function createInvoice(data: unknown) {
  if (await isDemoMode()) throwDemoMutationError()
  try {
    const validated = invoiceSchema.parse(data)
    const { supabase, organizationId, userId } = await authorize("invoices", "create")

    if (validated.customerId) {
      const estimated = estimateInvoiceTotal(validated.items as readonly ValidatedInvoiceItem[], validated.gstEnabled)
      const creditErr = await checkCreditLimit(supabase, validated.customerId, estimated)
      if (creditErr) return { success: false, error: creditErr }
    }

    const { data: orgData } = await supabase
      .from("app_organizations")
      .select("gst_number")
      .eq("id", organizationId)
      .single()

    const interState = isInterStateSale(orgData?.gst_number, validated.customerGst)
    const billingMode: "gst" | "non-gst" = validated.gstEnabled ? "gst" : "non-gst"
    const recalcItems = validated.items.map((item) => ({
      itemId: item.itemId || "",
      itemName: item.itemName,
      quantity: item.quantity,
      unit: item.unit || "PCS",
      rate: item.rate,
      gstRate: item.gstRate || 0,
      cessRate: item.cessRate || 0,
      discount: item.discount || 0,
      amount: 0,
    }))
    const totals = calculateInvoiceTotals(recalcItems, billingMode, interState)
    const serverTotal = Math.round(totals.grandTotal * 100) / 100
    const serverBalance = Math.round((serverTotal - (validated.paidAmount || 0)) * 100) / 100

    const payload = buildInvoiceInsertPayload(validated, organizationId, totals, serverTotal, serverBalance)
    const { data: newInvoice, error: invoiceError } = await supabase.from("invoices").insert(payload).select().single()

    if (invoiceError || !newInvoice) {
      return { success: false, error: invoiceError?.message || "Failed to create invoice" }
    }

    const { error: itemsError } = await supabase.from("invoice_items").insert(
      buildInvoiceItemRows(validated.items, newInvoice.id, billingMode)
    )

    if (itemsError) {
      await supabase.from("invoices").delete().eq("id", newInvoice.id)
      return { success: false, error: itemsError.message }
    }

    await handlePostInvoiceCreation(supabase, validated, organizationId, userId, newInvoice.id, totals, serverTotal, serverBalance)

    revalidatePath("/invoices")
    revalidatePath("/items")
    return { success: true, invoice: newInvoice }
  } catch (error) {
    console.error("[v0] Error in createInvoice:", error)
    return { success: false, error: extractErrorMessage(error) }
  }
}

async function restoreInvoiceItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  existingItems: Record<string, unknown>[] | null,
  invoiceId: string,
) {
  if (!existingItems || existingItems.length === 0) return
  const restoreRows = existingItems.map((row) => {
    const filtered = Object.fromEntries(Object.entries(row).filter(([k]) => k !== "id"))
    return { ...filtered, invoice_id: invoiceId }
  })
  await supabase.from("invoice_items").insert(restoreRows)
}

export async function updateInvoice(id: string, data: unknown) {
  if (await isDemoMode()) throwDemoMutationError()
  if (!UUID_REGEX.test(id)) {
    return { success: false, error: INVALID_INVOICE_ID }
  }

  try {
    const validated = invoiceSchema.parse(data)

    const { supabase, organizationId } = await authorize("invoices", "update")

    const { data: orgData } = await supabase
      .from("app_organizations")
      .select("gst_number")
      .eq("id", organizationId)
      .single()

    const interState = isInterStateSale(orgData?.gst_number, validated.customerGst)

    const billingMode: "gst" | "non-gst" = validated.gstEnabled ? "gst" : "non-gst"
    const recalcItems = validated.items.map((item) => ({
      itemId: item.itemId || "",
      itemName: item.itemName,
      quantity: item.quantity,
      unit: item.unit || "PCS",
      rate: item.rate,
      gstRate: item.gstRate || 0,
      cessRate: item.cessRate || 0,
      discount: item.discount || 0,
      amount: 0,
    }))
    const totals = calculateInvoiceTotals(recalcItems, billingMode, interState)
    const serverTotal = Math.round(totals.grandTotal * 100) / 100
    const serverBalance = Math.round((serverTotal - (validated.paidAmount || 0)) * 100) / 100

    const { error: invoiceError } = await supabase
      .from("invoices")
      .update({
        invoice_number: validated.invoiceNo,
        document_type: validated.documentType || "invoice",
        customer_id: validated.customerId || null,
        customer_name: validated.customerName,
        customer_phone: validated.customerPhone || null,
        customer_address: validated.customerAddress || null,
        customer_gst: validated.customerGst || null,
        invoice_date: validated.invoiceDate.toISOString().split("T")[0],
        due_date: validated.dueDate.toISOString().split("T")[0],
        validity_date: validated.validityDate ? validated.validityDate.toISOString().split("T")[0] : null,
        pricing_mode: validated.pricingMode,
        subtotal: Math.round(totals.subtotal * 100) / 100,
        discount: validated.discount,
        discount_type: validated.discountType,
        cgst: Math.round(totals.cgst * 100) / 100,
        sgst: Math.round(totals.sgst * 100) / 100,
        igst: Math.round(totals.igst * 100) / 100,
        cess: Math.round(totals.cess * 100) / 100,
        round_off: Math.round(totals.roundOff * 100) / 100,
        total: serverTotal,
        paid_amount: validated.paidAmount || 0,
        balance: serverBalance,
        status: validated.status,
        gst_enabled: validated.gstEnabled,
        notes: validated.notes || null,
        irn: validated.irn || null,
        qr_code: validated.qrCode || null,
        e_invoice_date: validated.eInvoiceDate ? validated.eInvoiceDate.toISOString() : null,
        parent_document_id: validated.parentDocumentId || null,
        converted_to_invoice_id: validated.convertedToInvoiceId || null,
      })
      .eq("id", id)
      .or(orgScope(organizationId))

    if (invoiceError) {
      console.error("[v0] Error updating invoice:", invoiceError)
      return { success: false, error: invoiceError.message }
    }

    const { data: existingItems } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id)

    await supabase.from("invoice_items").delete().eq("invoice_id", id)

    const invoiceItems = validated.items.map((item) => ({
      invoice_id: id,
      item_id: item.itemId || null,
      item_name: item.itemName,
      unit: item.unit || "PCS",
      quantity: item.quantity,
      rate: item.rate,
      gst_rate: item.gstRate || 0,
      cess_rate: item.cessRate || 0,
      discount: item.discount || 0,
      custom_field_1_value: item.customField1Value ?? null,
      custom_field_2_value: item.customField2Value ?? null,
      amount: Math.round(
        calculateItemAmount(item.quantity, item.rate, item.gstRate || 0, item.cessRate || 0, item.discount || 0, billingMode) * 100
      ) / 100,
    }))

    const { error: itemsError } = await supabase.from("invoice_items").insert(invoiceItems)

    if (itemsError) {
      console.error("[v0] Error updating invoice items:", itemsError)
      await restoreInvoiceItems(supabase, existingItems, id)
      return { success: false, error: itemsError.message }
    }

    revalidatePath("/invoices")
    revalidatePath(`/invoices/${id}`)
    return { success: true }
  } catch (error) {
    console.error("[v0] Error in updateInvoice:", error)
    return { success: false, error: extractErrorMessage(error, "Failed to update invoice") }
  }
}

async function reverseStockForDeletedInvoice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  items: DbInvoiceItem[],
  reverseType: string,
  invoiceId: string,
  invoiceNumber: string,
  docType: string,
  userId: string,
) {
  const orgId = await resolveOrganizationId(supabase, items.map((i) => ({
    itemId: i.item_id || undefined,
    itemName: i.item_name,
    quantity: i.quantity,
    rate: i.rate,
    amount: i.amount,
  })))

  if (!orgId) return

  for (const item of items) {
    if (!item.item_id) continue
    try {
      await logStockMovement({
        itemId: item.item_id,
        organizationId: orgId,
        transactionType: reverseType as StockTransactionType,
        entryQuantity: item.quantity,
        entryUnit: item.unit || "PCS",
        referenceType: "invoice_delete",
        referenceId: invoiceId,
        referenceNo: invoiceNumber,
        ratePerUnit: item.rate,
        notes: `Reversal for deleted ${docType} ${invoiceNumber}`,
      }, userId)
    } catch (stockError) {
      console.error("[v0] Error reversing stock for item:", item.item_id, stockError)
    }
  }
}

async function adjustCustomerOutstandingOnDelete(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerId: string,
  balance: number | string,
) {
  const balanceReduction = -Number(balance)
  const { error: rpcError } = await supabase.rpc("update_customer_outstanding", {
    p_customer_id: customerId,
    p_amount: balanceReduction,
  })
  if (!rpcError) return

  const { data: cust } = await supabase
    .from("customers")
    .select("outstanding_balance")
    .eq("id", customerId)
    .single()
  if (!cust) return

  await supabase
    .from("customers")
    .update({ outstanding_balance: Math.max(0, (cust.outstanding_balance || 0) + balanceReduction) })
    .eq("id", customerId)
}

export async function deleteInvoice(id: string) {
  if (await isDemoMode()) throwDemoMutationError()
  if (!UUID_REGEX.test(id)) {
    return { success: false, error: INVALID_INVOICE_ID }
  }

  try {
    const { supabase, organizationId, userId } = await authorize("invoices", "delete")

    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, document_type, customer_id, invoice_number, balance, invoice_items(*)")
      .eq("id", id)
      .is("deleted_at", null)
      .or(orgScope(organizationId))
      .single()

    if (!invoice) {
      return { success: false, error: "Invoice not found" }
    }

    const { error } = await supabase
      .from("invoices")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null)
      .or(orgScope(organizationId))

    if (error) {
      console.error("[v0] Error deleting invoice:", error)
      return { success: false, error: error.message }
    }

    const docType = invoice.document_type || "invoice"
    const isSaleDoc = SALE_DOC_TYPES.includes(docType)
    const isReturnDoc = RETURN_DOC_TYPES.includes(docType)

    if (isSaleDoc || isReturnDoc) {
      const reverseType = isSaleDoc ? "RETURN" : "SALE"
      const items = invoice.invoice_items as DbInvoiceItem[]
      await reverseStockForDeletedInvoice(supabase, items, reverseType, id, invoice.invoice_number, docType, userId)
    }

    if (invoice.customer_id && isSaleDoc && invoice.balance) {
      await adjustCustomerOutstandingOnDelete(supabase, invoice.customer_id, invoice.balance)
    }

    revalidatePath("/invoices")
    return { success: true }
  } catch (error) {
    return { success: false, error: extractErrorMessage(error, "Failed to delete invoice") }
  }
}

export async function bulkDeleteInvoices(ids: string[]) {
  if (await isDemoMode()) throwDemoMutationError()
  if (!ids || ids.length === 0) {
    return { success: false, error: "No invoices selected" }
  }

  const invalidIds = ids.filter(id => !UUID_REGEX.test(id))
  if (invalidIds.length > 0) {
    return { success: false, error: "Invalid invoice IDs detected" }
  }

  try {
    const { supabase, organizationId } = await authorize("invoices", "delete")
    const { error, count } = await supabase
      .from("invoices")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids)
      .or(orgScope(organizationId))
      .is("deleted_at", null)

  if (error) {
    console.error("[v0] Error bulk deleting invoices:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/invoices")
  return { 
    success: true, 
    deleted: count || ids.length,
    message: `Successfully deleted ${count || ids.length} invoice(s)` 
  }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete invoices" }
  }
}

export async function deleteAllInvoices() {
  if (await isDemoMode()) throwDemoMutationError()
  try {
    const { supabase, organizationId } = await authorize("invoices", "delete")
  
    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .or(orgScope(organizationId))
      .is("deleted_at", null)
  
    if (!count || count === 0) {
      return { success: false, error: "No invoices to delete" }
    }

    const { error } = await supabase
      .from("invoices")
      .update({ deleted_at: new Date().toISOString() })
      .or(orgScope(organizationId))
      .is("deleted_at", null)
      .neq("id", "00000000-0000-0000-0000-000000000000")

  if (error) {
    console.error("[v0] Error deleting all invoices:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/invoices")
  return { 
    success: true, 
    deleted: count,
    message: `Successfully deleted all ${count} invoice(s)` 
  }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete invoices" }
  }
}

export async function updateInvoiceStatus(id: string, status: IInvoice["status"]) {
  if (await isDemoMode()) throwDemoMutationError()
  if (!UUID_REGEX.test(id)) {
    return { success: false, error: INVALID_INVOICE_ID }
  }

  try {
    const { supabase, organizationId } = await authorize("invoices", "update")
    const { error } = await supabase.from("invoices").update({ status }).eq("id", id).or(orgScope(organizationId))

  if (error) {
    console.error("[v0] Error updating invoice status:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/invoices")
  return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update status" }
  }
}

export async function generateInvoiceNumber(documentType = "invoice"): Promise<string> {
  if (await isDemoMode()) return `DEMO-${documentType.toUpperCase()}-001`
  const { supabase, organizationId } = await authorize("invoices", "read")
  const year = new Date().getFullYear()

  const prefixMap: Record<string, string> = {
    invoice: "INV",
    sales_order: "SO",
    quotation: "QUO",
    proforma: "PRO",
    delivery_challan: "DC",
    credit_note: "CN",
    debit_note: "DN",
  }

  const prefix = prefixMap[documentType] || "INV"
  const likePattern = `${prefix}/${year}/%`

  const { data } = await supabase
    .from("invoices")
    .select("invoice_number")
    .or(orgScope(organizationId))
    .like("invoice_number", likePattern)
    .order("invoice_number", { ascending: false })
    .limit(1)

  let nextNum = 1
  if (data && data.length > 0) {
    const lastNumber = data[0].invoice_number as string
    const parts = lastNumber.split("/")
    const parsed = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(parsed)) nextNum = parsed + 1
  }

  return `${prefix}/${year}/${nextNum.toString().padStart(4, "0")}`
}

// Convert document to invoice (for quotations, proforma, delivery challans, sales orders)
export async function convertDocumentToInvoice(documentId: string) {
  if (await isDemoMode()) throwDemoMutationError()
  const { supabase } = await authorize("invoices", "create")

  // Get the original document
  const originalDoc = await getInvoice(documentId)
  if (!originalDoc) {
    return { success: false, error: "Document not found" }
  }

  // Check if document can be converted
  const canConvert = ["quotation", "proforma", "delivery_challan", "sales_order"].includes(originalDoc.documentType)
  if (!canConvert) {
    return { success: false, error: "This document type cannot be converted to invoice" }
  }

  // Generate new invoice number
  const invoiceNumber = await generateInvoiceNumber("invoice")

  // Create new invoice from original document
  const invoiceData = {
    invoiceNo: invoiceNumber,
    documentType: "invoice" as DocumentType,
    customerId: originalDoc.customerId,
    customerName: originalDoc.customerName,
    customerPhone: originalDoc.customerPhone,
    customerAddress: originalDoc.customerAddress,
    customerGst: originalDoc.customerGst,
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    billingMode: originalDoc.billingMode,
    pricingMode: originalDoc.pricingMode,
    items: originalDoc.items,
    subtotal: originalDoc.subtotal,
    cgst: originalDoc.cgst,
    sgst: originalDoc.sgst,
    igst: originalDoc.igst,
    cess: originalDoc.cess,
    discount: originalDoc.discount,
    discountType: originalDoc.discountType,
    total: originalDoc.total,
    paidAmount: 0,
    balance: originalDoc.total,
    status: "draft" as DocumentStatus,
    gstEnabled: originalDoc.gstEnabled,
    notes: originalDoc.notes,
    parentDocumentId: documentId,
  }

  const result = await createInvoice(invoiceData)

  if (result.success && result.invoice) {
    // Update original document status and link to new invoice
    await supabase
      .from("invoices")
      .update({
        status: "converted",
        converted_to_invoice_id: result.invoice.id,
      })
      .eq("id", documentId)

    revalidatePath("/invoices")
    revalidatePath(`/invoices/${documentId}`)
    return { success: true, invoiceId: result.invoice.id }
  }

  return result
}

// Get invoices by document type
export async function getInvoicesByType(documentType: DocumentType): Promise<IInvoice[]> {
  if (await isDemoMode()) return demoInvoices.filter(i => i.documentType === documentType)
  try {
    const { supabase, organizationId } = await authorize("invoices", "read")
    const { data, error } = await supabase
      .from("invoices")
      .select(INVOICE_WITH_ITEMS_SELECT)
      .eq("document_type", documentType)
      .or(orgScope(organizationId))
      .is("deleted_at", null)
      .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching invoices by type:", error)
    return []
  }

  return (
    data?.map((invoice) => ({
      id: invoice.id,
      invoiceNo: invoice.invoice_number,
      documentType: (invoice.document_type || "invoice") as DocumentType,
      customerId: invoice.customer_id || "",
      customerName: invoice.customer_name,
      customerPhone: invoice.customer_phone || "",
      customerAddress: invoice.customer_address || "",
      customerGst: invoice.customer_gst || "",
      invoiceDate: new Date(invoice.invoice_date || invoice.created_at),
      dueDate: new Date(invoice.due_date || invoice.invoice_date || invoice.created_at),
      validityDate: invoice.validity_date ? new Date(invoice.validity_date) : undefined,
      billingMode: (invoice.gst_enabled ? "gst" : "non-gst") as BillingMode,
      pricingMode: (invoice.pricing_mode || "sale") as PricingMode,
      items: invoice.invoice_items.map((item: DbInvoiceItem) => ({
        itemId: item.item_id || "",
        itemName: item.item_name,
        quantity: item.quantity,
        unit: item.unit || "PCS",
        rate: Number(item.rate),
        gstRate: Number(item.tax_rate || item.gst_rate || 0),
        cessRate: Number(item.cess_rate || 0),
        discount: Number(item.discount || 0),
        amount: Number(item.amount),
      })),
      subtotal: Number(invoice.subtotal),
      cgst: Number(invoice.cgst),
      sgst: Number(invoice.sgst),
      igst: Number(invoice.igst),
      cess: Number(invoice.cess || 0),
      discount: Number(invoice.discount || 0),
      discountType: (invoice.discount_type || "percentage") as "percentage" | "flat",
      total: Number(invoice.total),
      paidAmount: Number(invoice.paid_amount || 0),
      balance: Number(invoice.balance || invoice.total),
      status: invoice.status as DocumentStatus,
      gstEnabled: invoice.gst_enabled,
      notes: invoice.notes || undefined,
      irn: invoice.irn || undefined,
      qrCode: invoice.qr_code || undefined,
      eInvoiceDate: invoice.e_invoice_date ? new Date(invoice.e_invoice_date) : undefined,
      parentDocumentId: invoice.parent_document_id || undefined,
      convertedToInvoiceId: invoice.converted_to_invoice_id || undefined,
      createdAt: new Date(invoice.created_at),
      updatedAt: new Date(invoice.updated_at),
    })) || []
  )
  } catch {
    return []
  }
}

export async function generateEInvoice(invoiceId: string) {
  if (await isDemoMode()) throwDemoMutationError()
  try {
    const { organizationId } = await authorize("invoices", "update")

    const jobId = await enqueueJob("generate_einvoice", {
      invoiceId,
      organizationId,
    })

    return {
      success: true,
      jobId,
      irn: null,
    }
  } catch (error) {
    console.error("[v0] Error generating E-Invoice:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate E-Invoice",
    }
  }
}

export async function sendInvoiceEmail(invoiceId: string, recipientEmail: string) {
  if (await isDemoMode()) throwDemoMutationError()
  try {
    const { organizationId } = await authorize("invoices", "read")

    const jobId = await enqueueJob("send_email", {
      invoiceId,
      recipientEmail,
      organizationId,
    })

    return {
      success: true,
      jobId,
    }
  } catch (error) {
    console.error("[v0] Error sending invoice email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    }
  }
}

// Cancel E-Invoice IRN
export async function cancelEInvoice(invoiceId: string, _reason: string) {
  if (await isDemoMode()) throwDemoMutationError()
  const { supabase, organizationId } = await authorize("invoices", "update")

  const invoice = await getInvoice(invoiceId)
  if (!invoice || !invoice.irn) {
    return { success: false, error: "Invoice not found or not e-invoiced" }
  }

  if (invoice.eInvoiceDate) {
    const hoursSinceGeneration = (Date.now() - new Date(invoice.eInvoiceDate).getTime()) / (1000 * 60 * 60)
    if (hoursSinceGeneration > 24) {
      return { success: false, error: "E-Invoice can only be cancelled within 24 hours of generation" }
    }
  }

  try {
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        irn: null,
        qr_code: null,
        e_invoice_date: null,
      })
      .eq("id", invoiceId)
      .or(orgScope(organizationId))

    if (updateError) {
      return { success: false, error: "Failed to cancel e-invoice" }
    }

    revalidatePath("/invoices")
    revalidatePath(`/invoices/${invoiceId}`)
    return { success: true }
  } catch  {
    return { success: false, error: "Failed to cancel e-invoice with IRP" }
  }
}
