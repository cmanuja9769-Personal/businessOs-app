"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { IInvoice } from "@/types"
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
      customerId: invoice.customer_id || "",
      customerName: invoice.customer_name,
      customerPhone: invoice.customer_phone || "",
      customerAddress: invoice.customer_address || "",
      customerGst: invoice.customer_gst || "",
      invoiceDate: new Date(invoice.invoice_date || invoice.created_at),
      dueDate: new Date(invoice.due_date || invoice.invoice_date || invoice.created_at),
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
      status: invoice.status as "paid" | "unpaid" | "partial" | "draft" | "sent" | "overdue",
      gstEnabled: invoice.gst_enabled,
      notes: invoice.notes || undefined,
      createdAt: new Date(invoice.created_at),
      updatedAt: new Date(invoice.updated_at),
    })) || []
  )
}

export async function getInvoice(id: string): Promise<IInvoice | undefined> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("invoices").select("*, invoice_items(*)").eq("id", id).single()

  if (error || !data) {
    console.error("[v0] Error fetching invoice:", error)
    return undefined
  }

  return {
    id: data.id,
    invoiceNo: data.invoice_number,
    customerId: data.customer_id || "",
    customerName: data.customer_name,
    customerPhone: data.customer_phone || "",
    customerAddress: data.customer_address || "",
    customerGst: data.customer_gst || "",
    invoiceDate: new Date(data.invoice_date || data.created_at),
    dueDate: new Date(data.due_date || data.invoice_date || data.created_at),
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
    status: data.status as "paid" | "unpaid" | "partial" | "draft" | "sent" | "overdue",
    gstEnabled: data.gst_enabled,
    notes: data.notes || undefined,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}

export async function createInvoice(data: unknown) {
  const validated = invoiceSchema.parse(data)

  const supabase = await createClient()

  // Create invoice
  const { data: newInvoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      invoice_number: validated.invoiceNo,
      customer_id: validated.customerId || null,
      customer_name: validated.customerName,
      customer_phone: validated.customerPhone || null,
      customer_address: validated.customerAddress || null,
      customer_gst: validated.customerGst || null,
      invoice_date: validated.invoiceDate.toISOString().split("T")[0],
      due_date: validated.dueDate.toISOString().split("T")[0],
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
    })
    .select()
    .single()

  if (invoiceError || !newInvoice) {
    console.error("[v0] Error creating invoice:", invoiceError)
    return { success: false, error: invoiceError?.message }
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
}

export async function updateInvoice(id: string, data: unknown) {
  const validated = invoiceSchema.parse(data)

  const supabase = await createClient()

  // Update invoice
  const { error: invoiceError } = await supabase
    .from("invoices")
    .update({
      invoice_number: validated.invoiceNo,
      customer_id: validated.customerId || null,
      customer_name: validated.customerName,
      customer_phone: validated.customerPhone || null,
      customer_address: validated.customerAddress || null,
      customer_gst: validated.customerGst || null,
      invoice_date: validated.invoiceDate.toISOString().split("T")[0],
      due_date: validated.dueDate.toISOString().split("T")[0],
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
}

export async function deleteInvoice(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("invoices").delete().eq("id", id)

  if (error) {
    console.error("[v0] Error deleting invoice:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/invoices")
  return { success: true }
}

export async function updateInvoiceStatus(id: string, status: IInvoice["status"]) {
  const supabase = await createClient()
  const { error } = await supabase.from("invoices").update({ status }).eq("id", id)

  if (error) {
    console.error("[v0] Error updating invoice status:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/invoices")
  return { success: true }
}

export async function generateInvoiceNumber(): Promise<string> {
  const supabase = await createClient()
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .like("invoice_number", `INV/${year}/%`)

  return `INV/${year}/${((count || 0) + 1).toString().padStart(4, "0")}`
}
