"use server"

import { enqueueJob } from "@/lib/invoice-queue"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { IInvoice, DocumentType } from "@/types"
import { invoiceSchema } from "@/lib/schemas"

export async function getInvoices(): Promise<IInvoice[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching invoices:", error)
    return []
  }

  return (
    data?.map((invoice) => ({
      id: invoice.id,
      invoiceNo: invoice.invoice_number,
      documentType: (invoice.document_type || "invoice") as any,
      customerId: invoice.customer_id || "",
      customerName: invoice.customer_name,
      customerPhone: invoice.customer_phone || "",
      customerAddress: invoice.customer_address || "",
      customerGst: invoice.customer_gst || "",
      invoiceDate: new Date(invoice.invoice_date || invoice.created_at),
      dueDate: new Date(invoice.due_date || invoice.invoice_date || invoice.created_at),
      validityDate: invoice.validity_date ? new Date(invoice.validity_date) : undefined,
      billingMode: (invoice.gst_enabled ? "gst" : "non-gst") as "gst" | "non-gst",
      pricingMode: (invoice.pricing_mode || "sale") as "sale" | "wholesale" | "quantity",
      items: invoice.invoice_items.map((item: any) => ({
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
      status: invoice.status as any,
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
}

export async function getInvoice(id: string): Promise<IInvoice | undefined> {
  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!id || !uuidRegex.test(id)) {
    // Only log if it's not an empty/null/undefined value
    if (id && id !== 'undefined' && id !== 'null') {
      console.error(`[v0] Invalid invoice ID format: ${id}`)
    }
    return undefined
  }

  const supabase = await createClient()
  const { data, error } = await supabase.from("invoices").select("*, invoice_items(*)").eq("id", id).single()

  if (error || !data) {
    console.error("[v0] Error fetching invoice:", error)
    return undefined
  }

  return {
    id: data.id,
    invoiceNo: data.invoice_number,
    documentType: (data.document_type || "invoice") as any,
    customerId: data.customer_id || "",
    customerName: data.customer_name,
    customerPhone: data.customer_phone || "",
    customerAddress: data.customer_address || "",
    customerGst: data.customer_gst || "",
    invoiceDate: new Date(data.invoice_date || data.created_at),
    dueDate: new Date(data.due_date || data.invoice_date || data.created_at),
    validityDate: data.validity_date ? new Date(data.validity_date) : undefined,
    billingMode: (data.gst_enabled ? "gst" : "non-gst") as "gst" | "non-gst",
    pricingMode: (data.pricing_mode || "sale") as "sale" | "wholesale" | "quantity",
    items: data.invoice_items.map((item: any) => ({
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
    status: data.status as any,
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
}

export async function createInvoice(data: unknown) {
  try {
    const validated = invoiceSchema.parse(data)

    const supabase = await createClient()

    // Create invoice
    const { data: newInvoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
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
        subtotal: validated.subtotal,
        discount: validated.discount,
        discount_type: validated.discountType,
        cgst: validated.cgst,
        sgst: validated.sgst,
        igst: validated.igst,
        cess: validated.cess || 0,
        total: validated.total,
        paid_amount: validated.paidAmount || 0,
        balance: validated.balance || validated.total,
        status: validated.status,
        gst_enabled: validated.gstEnabled,
        notes: validated.notes || null,
        irn: validated.irn || null,
        qr_code: validated.qrCode || null,
        e_invoice_date: validated.eInvoiceDate ? validated.eInvoiceDate.toISOString() : null,
        parent_document_id: validated.parentDocumentId || null,
        converted_to_invoice_id: validated.convertedToInvoiceId || null,
      })
      .select()
      .single()

    if (invoiceError || !newInvoice) {
      console.error("[v0] Error creating invoice:", invoiceError)
      return { success: false, error: invoiceError?.message || "Failed to create invoice" }
    }

    // Create invoice items
    const invoiceItems = validated.items.map((item) => ({
      invoice_id: newInvoice.id,
      item_id: item.itemId || null,
      item_name: item.itemName,
      unit: item.unit || "PCS",
      quantity: item.quantity,
      rate: item.rate,
      gst_rate: item.gstRate || 0,
      cess_rate: item.cessRate || 0,
      discount: item.discount || 0,
      amount: item.amount,
    }))

    const { error: itemsError } = await supabase.from("invoice_items").insert(invoiceItems)

    if (itemsError) {
      console.error("[v0] Error creating invoice items:", itemsError)
      return { success: false, error: itemsError.message }
    }

    revalidatePath("/invoices")
    return { success: true, invoice: newInvoice }
  } catch (error) {
    console.error("[v0] Error in createInvoice:", error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to create invoice" }
  }
}

export async function updateInvoice(id: string, data: unknown) {
  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return { success: false, error: "Invalid invoice ID" }
  }

  try {
    const validated = invoiceSchema.parse(data)

    const supabase = await createClient()

    // Update invoice
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
        subtotal: validated.subtotal,
        discount: validated.discount,
        discount_type: validated.discountType,
        cgst: validated.cgst,
        sgst: validated.sgst,
        igst: validated.igst,
        cess: validated.cess || 0,
        total: validated.total,
        paid_amount: validated.paidAmount || 0,
        balance: validated.balance || validated.total,
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

    if (invoiceError) {
      console.error("[v0] Error updating invoice:", invoiceError)
      return { success: false, error: invoiceError.message }
    }

    // Delete old invoice items
    await supabase.from("invoice_items").delete().eq("invoice_id", id)

    // Create new invoice items
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
      amount: item.amount,
    }))

    const { error: itemsError } = await supabase.from("invoice_items").insert(invoiceItems)

    if (itemsError) {
      console.error("[v0] Error updating invoice items:", itemsError)
      return { success: false, error: itemsError.message }
    }

    revalidatePath("/invoices")
    revalidatePath(`/invoices/${id}`)
    return { success: true }
  } catch (error) {
    console.error("[v0] Error in updateInvoice:", error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to update invoice" }
  }
}

export async function deleteInvoice(id: string) {
  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return { success: false, error: "Invalid invoice ID" }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("invoices").delete().eq("id", id)

  if (error) {
    console.error("[v0] Error deleting invoice:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/invoices")
  return { success: true }
}

export async function bulkDeleteInvoices(ids: string[]) {
  if (!ids || ids.length === 0) {
    return { success: false, error: "No invoices selected" }
  }

  // Validate all UUIDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const invalidIds = ids.filter(id => !uuidRegex.test(id))
  if (invalidIds.length > 0) {
    return { success: false, error: "Invalid invoice IDs detected" }
  }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from("invoices")
    .delete()
    .in("id", ids)
    .select()

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
}

export async function deleteAllInvoices() {
  const supabase = await createClient()
  
  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
  
  if (!count || count === 0) {
    return { success: false, error: "No invoices to delete" }
  }

  const { error } = await supabase
    .from("invoices")
    .delete()
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
}

export async function updateInvoiceStatus(id: string, status: IInvoice["status"]) {
  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return { success: false, error: "Invalid invoice ID" }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("invoices").update({ status }).eq("id", id)

  if (error) {
    console.error("[v0] Error updating invoice status:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/invoices")
  return { success: true }
}

export async function generateInvoiceNumber(documentType = "invoice"): Promise<string> {
  const supabase = await createClient()
  const year = new Date().getFullYear()

  // Get prefix based on document type
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

  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .like("invoice_number", `${prefix}/${year}/%`)

  return `${prefix}/${year}/${((count || 0) + 1).toString().padStart(4, "0")}`
}

// Convert document to invoice (for quotations, proforma, delivery challans, sales orders)
export async function convertDocumentToInvoice(documentId: string) {
  const supabase = await createClient()

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
    status: "draft" as any,
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
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("document_type", documentType)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching invoices by type:", error)
    return []
  }

  return (
    data?.map((invoice) => ({
      id: invoice.id,
      invoiceNo: invoice.invoice_number,
      documentType: (invoice.document_type || "invoice") as any,
      customerId: invoice.customer_id || "",
      customerName: invoice.customer_name,
      customerPhone: invoice.customer_phone || "",
      customerAddress: invoice.customer_address || "",
      customerGst: invoice.customer_gst || "",
      invoiceDate: new Date(invoice.invoice_date || invoice.created_at),
      dueDate: new Date(invoice.due_date || invoice.invoice_date || invoice.created_at),
      validityDate: invoice.validity_date ? new Date(invoice.validity_date) : undefined,
      billingMode: (invoice.gst_enabled ? "gst" : "non-gst") as "gst" | "non-gst",
      pricingMode: (invoice.pricing_mode || "sale") as "sale" | "wholesale" | "quantity",
      items: invoice.invoice_items.map((item: any) => ({
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
      status: invoice.status as any,
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
}

// Generate E-Invoice (IRN and QR Code)
export async function generateEInvoice(invoiceId: string, organizationId: string) {
  try {
    // Enqueue the job for async processing
    const jobId = await enqueueJob("generate_einvoice", {
      invoiceId,
      organizationId,
    })

    // Return job ID so client can poll for status
    return {
      success: true,
      jobId,
      irn: null, // Will be available after processing
    }
  } catch (error) {
    console.error("[v0] Error generating E-Invoice:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate E-Invoice",
    }
  }
}

export async function sendInvoiceEmail(invoiceId: string, recipientEmail: string, organizationId: string) {
  try {
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
export async function cancelEInvoice(invoiceId: string, reason: string) {
  const supabase = await createClient()

  const invoice = await getInvoice(invoiceId)
  if (!invoice || !invoice.irn) {
    return { success: false, error: "Invoice not found or not e-invoiced" }
  }

  // Check if within 24 hours
  if (invoice.eInvoiceDate) {
    const hoursSinceGeneration = (Date.now() - new Date(invoice.eInvoiceDate).getTime()) / (1000 * 60 * 60)
    if (hoursSinceGeneration > 24) {
      return { success: false, error: "E-Invoice can only be cancelled within 24 hours of generation" }
    }
  }

  try {
    // TODO: Call actual IRP cancellation API
    // await cancelIRN(invoice.irn, reason)

    // Clear IRN fields
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        irn: null,
        qr_code: null,
        e_invoice_date: null,
      })
      .eq("id", invoiceId)

    if (updateError) {
      return { success: false, error: "Failed to cancel e-invoice" }
    }

    revalidatePath("/invoices")
    revalidatePath(`/invoices/${invoiceId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: "Failed to cancel e-invoice with IRP" }
  }
}
