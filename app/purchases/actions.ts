"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { IPurchase } from "@/types"
import { purchaseSchema } from "@/lib/schemas"

export async function getPurchases(): Promise<IPurchase[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("purchases")
    .select("*, purchase_items(*)")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching purchases:", error)
    return []
  }

  return (
    data?.map((purchase) => ({
      id: purchase.id,
      purchaseNo: purchase.purchase_number,
      supplierId: purchase.supplier_id || "",
      supplierName: purchase.supplier_name,
      supplierPhone: purchase.supplier_phone || "",
      supplierAddress: purchase.supplier_address || "",
      supplierGst: purchase.supplier_gst || "",
      date: new Date(purchase.purchase_date || purchase.created_at),
      items: purchase.purchase_items.map((item: any) => ({
        itemId: item.item_id || "",
        name: item.item_name,
        hsn: item.hsn || "",
        quantity: item.quantity,
        rate: Number(item.rate),
        discount: Number(item.discount || 0),
        discountType: (item.discount_type || "percentage") as "percentage" | "flat",
        taxRate: Number(item.tax_rate),
        amount: Number(item.amount),
      })),
      subtotal: Number(purchase.subtotal),
      discount: Number(purchase.discount || 0),
      discountType: (purchase.discount_type || "percentage") as "percentage" | "flat",
      cgst: Number(purchase.cgst),
      sgst: Number(purchase.sgst),
      igst: Number(purchase.igst),
      total: Number(purchase.total),
      paidAmount: Number(purchase.paid_amount || 0),
      balance: Number(purchase.balance || purchase.total),
      status: purchase.status as "paid" | "unpaid" | "partial",
      gstEnabled: purchase.gst_enabled,
      notes: purchase.notes || undefined,
      createdAt: new Date(purchase.created_at),
      updatedAt: new Date(purchase.updated_at),
    })) || []
  )
}

export async function getPurchase(id: string): Promise<IPurchase | undefined> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("purchases").select("*, purchase_items(*)").eq("id", id).single()

  if (error || !data) {
    console.error("[v0] Error fetching purchase:", error)
    return undefined
  }

  return {
    id: data.id,
    purchaseNo: data.purchase_number,
    supplierId: data.supplier_id || "",
    supplierName: data.supplier_name,
    supplierPhone: data.supplier_phone || "",
    supplierAddress: data.supplier_address || "",
    supplierGst: data.supplier_gst || "",
    date: new Date(data.purchase_date || data.created_at),
    items: data.purchase_items.map((item: any) => ({
      itemId: item.item_id || "",
      name: item.item_name,
      hsn: item.hsn || "",
      quantity: item.quantity,
      rate: Number(item.rate),
      discount: Number(item.discount || 0),
      discountType: (item.discount_type || "percentage") as "percentage" | "flat",
      taxRate: Number(item.tax_rate),
      amount: Number(item.amount),
    })),
    subtotal: Number(data.subtotal),
    discount: Number(data.discount || 0),
    discountType: (data.discount_type || "percentage") as "percentage" | "flat",
    cgst: Number(data.cgst),
    sgst: Number(data.sgst),
    igst: Number(data.igst),
    total: Number(data.total),
    paidAmount: Number(data.paid_amount || 0),
    balance: Number(data.balance || data.total),
    status: data.status as "paid" | "unpaid" | "partial",
    gstEnabled: data.gst_enabled,
    notes: data.notes || undefined,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}

export async function createPurchase(data: unknown) {
  const validated = purchaseSchema.parse(data)

  const supabase = await createClient()

  // Create purchase
  const { data: newPurchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      purchase_number: validated.purchaseNo,
      supplier_id: validated.supplierId || null,
      supplier_name: validated.supplierName,
      supplier_phone: validated.supplierPhone || null,
      supplier_address: validated.supplierAddress || null,
      supplier_gst: validated.supplierGst || null,
      purchase_date: validated.date.toISOString().split("T")[0],
      subtotal: validated.subtotal,
      discount: validated.discount,
      discount_type: validated.discountType,
      cgst: validated.cgst,
      sgst: validated.sgst,
      igst: validated.igst,
      total: validated.total,
      paid_amount: validated.paidAmount || 0,
      balance: validated.balance || validated.total,
      status: validated.status,
      gst_enabled: validated.gstEnabled,
      notes: validated.notes || null,
    })
    .select()
    .single()

  if (purchaseError || !newPurchase) {
    console.error("[v0] Error creating purchase:", purchaseError)
    return { success: false, error: purchaseError?.message }
  }

  // Create purchase items
  const purchaseItems = validated.items.map((item) => ({
    purchase_id: newPurchase.id,
    item_id: item.itemId || null,
    item_name: item.name,
    hsn: item.hsn || null,
    quantity: item.quantity,
    rate: item.rate,
    discount: item.discount || 0,
    discount_type: item.discountType,
    tax_rate: item.taxRate,
    amount: item.amount,
  }))

  const { error: itemsError } = await supabase.from("purchase_items").insert(purchaseItems)

  if (itemsError) {
    console.error("[v0] Error creating purchase items:", itemsError)
    return { success: false, error: itemsError.message }
  }

  revalidatePath("/purchases")
  return { success: true, purchase: newPurchase }
}

export async function updatePurchase(id: string, data: unknown) {
  const validated = purchaseSchema.parse(data)

  const supabase = await createClient()

  // Update purchase
  const { error: purchaseError } = await supabase
    .from("purchases")
    .update({
      purchase_number: validated.purchaseNo,
      supplier_id: validated.supplierId || null,
      supplier_name: validated.supplierName,
      supplier_phone: validated.supplierPhone || null,
      supplier_address: validated.supplierAddress || null,
      supplier_gst: validated.supplierGst || null,
      purchase_date: validated.date.toISOString().split("T")[0],
      subtotal: validated.subtotal,
      discount: validated.discount,
      discount_type: validated.discountType,
      cgst: validated.cgst,
      sgst: validated.sgst,
      igst: validated.igst,
      total: validated.total,
      paid_amount: validated.paidAmount || 0,
      balance: validated.balance || validated.total,
      status: validated.status,
      gst_enabled: validated.gstEnabled,
      notes: validated.notes || null,
    })
    .eq("id", id)

  if (purchaseError) {
    console.error("[v0] Error updating purchase:", purchaseError)
    return { success: false, error: purchaseError.message }
  }

  // Delete old purchase items
  await supabase.from("purchase_items").delete().eq("purchase_id", id)

  // Create new purchase items
  const purchaseItems = validated.items.map((item) => ({
    purchase_id: id,
    item_id: item.itemId || null,
    item_name: item.name,
    hsn: item.hsn || null,
    quantity: item.quantity,
    rate: item.rate,
    discount: item.discount || 0,
    discount_type: item.discountType,
    tax_rate: item.taxRate,
    amount: item.amount,
  }))

  const { error: itemsError } = await supabase.from("purchase_items").insert(purchaseItems)

  if (itemsError) {
    console.error("[v0] Error updating purchase items:", itemsError)
    return { success: false, error: itemsError.message }
  }

  revalidatePath("/purchases")
  revalidatePath(`/purchases/${id}`)
  return { success: true }
}

export async function deletePurchase(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("purchases").delete().eq("id", id)

  if (error) {
    console.error("[v0] Error deleting purchase:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/purchases")
  return { success: true }
}

export async function bulkDeletePurchases(ids: string[]) {
  if (!ids || ids.length === 0) {
    return { success: false, error: "No purchases selected" }
  }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from("purchases")
    .delete()
    .in("id", ids)
    .select()

  if (error) {
    console.error("[v0] Error bulk deleting purchases:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/purchases")
  return { 
    success: true, 
    deleted: count || ids.length,
    message: `Successfully deleted ${count || ids.length} purchase(s)` 
  }
}

export async function deleteAllPurchases() {
  const supabase = await createClient()
  
  const { count } = await supabase
    .from("purchases")
    .select("*", { count: "exact", head: true })
  
  if (!count || count === 0) {
    return { success: false, error: "No purchases to delete" }
  }

  const { error } = await supabase
    .from("purchases")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")

  if (error) {
    console.error("[v0] Error deleting all purchases:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/purchases")
  return { 
    success: true, 
    deleted: count,
    message: `Successfully deleted all ${count} purchase(s)` 
  }
}

export async function generatePurchaseNumber(): Promise<string> {
  const supabase = await createClient()
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from("purchases")
    .select("*", { count: "exact", head: true })
    .like("purchase_number", `PO/${year}/%`)

  return `PO/${year}/${((count || 0) + 1).toString().padStart(4, "0")}`
}
