"use server"

import { revalidatePath } from "next/cache"
import type { IPurchase } from "@/types"
import { purchaseSchema } from "@/lib/schemas"
import { authorize, orgScope } from "@/lib/authorize"
import { calculatePurchaseItemAmount, calculatePurchaseTotals } from "@/lib/invoice-calculations"
import { createJournalEntryForPurchase } from "@/lib/accounting/auto-journal"
import { isDemoMode, throwDemoMutationError } from "@/app/demo/helpers"
import { demoPurchases } from "@/app/demo/data"

export async function getPurchases(): Promise<IPurchase[]> {
  if (await isDemoMode()) return demoPurchases
  try {
    const { supabase, organizationId } = await authorize("purchases", "read")
    const { data, error } = await supabase
      .from("purchases")
      .select("*, purchase_items(*)")
      .or(orgScope(organizationId))
      .is("deleted_at", null)
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
      items: purchase.purchase_items.map((item: { item_id: string | null; item_name: string; hsn: string | null; quantity: number; rate: number; discount: number | null; discount_type: string | null; tax_rate: number; amount: number }) => ({
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
  } catch {
    return []
  }
}

export async function getPurchase(id: string): Promise<IPurchase | undefined> {
  if (await isDemoMode()) return demoPurchases.find(p => p.id === id)
  try {
    const { supabase, organizationId } = await authorize("purchases", "read")
    const { data, error } = await supabase.from("purchases").select("*, purchase_items(*)").eq("id", id).or(orgScope(organizationId)).single()

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
    items: data.purchase_items.map((item: { item_id: string | null; item_name: string; hsn: string | null; quantity: number; rate: number; discount: number | null; discount_type: string | null; tax_rate: number; amount: number }) => ({
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
  } catch {
    return undefined
  }
}

export async function createPurchase(data: unknown) {
  if (await isDemoMode()) throwDemoMutationError()
  try {
    const validated = purchaseSchema.parse(data)
    const { supabase, organizationId, userId } = await authorize("purchases", "create")

    const totals = calculatePurchaseTotals(
      validated.items.map((item) => ({
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount || 0,
        discountType: item.discountType || "percentage",
        taxRate: item.taxRate,
      })),
      validated.gstEnabled,
    )
    const serverTotal = Math.round(totals.total * 100) / 100
    const serverBalance = Math.round((serverTotal - (validated.paidAmount || 0)) * 100) / 100

    const { data: newPurchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        organization_id: organizationId,
        purchase_number: validated.purchaseNo,
        supplier_id: validated.supplierId || null,
        supplier_name: validated.supplierName,
        supplier_phone: validated.supplierPhone || null,
        supplier_address: validated.supplierAddress || null,
        supplier_gst: validated.supplierGst || null,
        purchase_date: validated.date.toISOString().split("T")[0],
        subtotal: Math.round(totals.subtotal * 100) / 100,
        discount: validated.discount,
        discount_type: validated.discountType,
        cgst: Math.round(totals.cgst * 100) / 100,
        sgst: Math.round(totals.sgst * 100) / 100,
        igst: Math.round(totals.igst * 100) / 100,
        total: serverTotal,
        paid_amount: validated.paidAmount || 0,
        balance: serverBalance,
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
      amount: Math.round(
        calculatePurchaseItemAmount(item.quantity, item.rate, item.discount || 0, item.discountType || "percentage", item.taxRate, validated.gstEnabled) * 100
      ) / 100,
    }))

    const { error: itemsError } = await supabase.from("purchase_items").insert(purchaseItems)

    if (itemsError) {
      await supabase.from("purchases").delete().eq("id", newPurchase.id)
      console.error("[v0] Error creating purchase items:", itemsError)
      return { success: false, error: itemsError.message }
    }

    try {
      await createJournalEntryForPurchase({
        organizationId,
        userId,
        purchaseId: newPurchase.id,
        purchaseNo: validated.purchaseNo,
        supplierName: validated.supplierName,
        subtotal: Math.round(totals.subtotal * 100) / 100,
        cgst: Math.round(totals.cgst * 100) / 100,
        sgst: Math.round(totals.sgst * 100) / 100,
        igst: Math.round(totals.igst * 100) / 100,
        total: serverTotal,
      })
    } catch (journalError) {
      console.error("[auto-journal] Failed to create journal entry for purchase:", journalError)
    }

    revalidatePath("/purchases")
    return { success: true, purchase: newPurchase }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create purchase" }
  }
}

export async function updatePurchase(id: string, data: unknown) {
  if (await isDemoMode()) throwDemoMutationError()
  try {
    const validated = purchaseSchema.parse(data)
    const { supabase, organizationId } = await authorize("purchases", "update")

    const totals = calculatePurchaseTotals(
      validated.items.map((item) => ({
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount || 0,
        discountType: item.discountType || "percentage",
        taxRate: item.taxRate,
      })),
      validated.gstEnabled,
    )
    const serverTotal = Math.round(totals.total * 100) / 100
    const serverBalance = Math.round((serverTotal - (validated.paidAmount || 0)) * 100) / 100

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
        subtotal: Math.round(totals.subtotal * 100) / 100,
        discount: validated.discount,
        discount_type: validated.discountType,
        cgst: Math.round(totals.cgst * 100) / 100,
        sgst: Math.round(totals.sgst * 100) / 100,
        igst: Math.round(totals.igst * 100) / 100,
        total: serverTotal,
        paid_amount: validated.paidAmount || 0,
        balance: serverBalance,
        status: validated.status,
        gst_enabled: validated.gstEnabled,
        notes: validated.notes || null,
      })
      .eq("id", id)
      .or(orgScope(organizationId))

    if (purchaseError) {
      console.error("[v0] Error updating purchase:", purchaseError)
      return { success: false, error: purchaseError.message }
    }

    const { data: existingItems } = await supabase
      .from("purchase_items")
      .select("*")
      .eq("purchase_id", id)

    await supabase.from("purchase_items").delete().eq("purchase_id", id)

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
      amount: Math.round(
        calculatePurchaseItemAmount(item.quantity, item.rate, item.discount || 0, item.discountType || "percentage", item.taxRate, validated.gstEnabled) * 100
      ) / 100,
    }))

    const { error: itemsError } = await supabase.from("purchase_items").insert(purchaseItems)

    if (itemsError) {
      console.error("[v0] Error updating purchase items:", itemsError)
      if (existingItems && existingItems.length > 0) {
        const restoreRows = existingItems.map((row: Record<string, unknown>) => {
          const filtered = Object.fromEntries(Object.entries(row).filter(([k]) => k !== "id"))
          return { ...filtered, purchase_id: id }
        })
        await supabase.from("purchase_items").insert(restoreRows)
      }
      return { success: false, error: itemsError.message }
    }

    revalidatePath("/purchases")
    revalidatePath(`/purchases/${id}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update purchase" }
  }
}

export async function deletePurchase(id: string) {
  if (await isDemoMode()) throwDemoMutationError()
  try {
    const { supabase, organizationId } = await authorize("purchases", "delete")
    const { error } = await supabase
      .from("purchases")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null)
      .or(orgScope(organizationId))

  if (error) {
    console.error("[v0] Error deleting purchase:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/purchases")
  return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete purchase" }
  }
}

export async function bulkDeletePurchases(ids: string[]) {
  if (await isDemoMode()) throwDemoMutationError()
  if (!ids || ids.length === 0) {
    return { success: false, error: "No purchases selected" }
  }

  try {
    const { supabase, organizationId } = await authorize("purchases", "delete")
    const { error, count } = await supabase
      .from("purchases")
      .delete()
      .in("id", ids)
      .or(orgScope(organizationId))
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
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete purchases" }
  }
}

export async function deleteAllPurchases() {
  if (await isDemoMode()) throwDemoMutationError()
  try {
    const { supabase, organizationId } = await authorize("purchases", "delete")
  
    const { count } = await supabase
      .from("purchases")
      .select("*", { count: "exact", head: true })
      .or(orgScope(organizationId))
  
  if (!count || count === 0) {
    return { success: false, error: "No purchases to delete" }
  }

  const { error } = await supabase
    .from("purchases")
    .delete()
    .or(orgScope(organizationId))
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
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete purchases" }
  }
}

export async function generatePurchaseNumber(): Promise<string> {
  if (await isDemoMode()) return "DEMO-PUR-001"
  const { supabase, organizationId } = await authorize("purchases", "read")
  const year = new Date().getFullYear()
  const likePattern = `PO/${year}/%`

  const { data } = await supabase
    .from("purchases")
    .select("purchase_number")
    .or(orgScope(organizationId))
    .like("purchase_number", likePattern)
    .order("purchase_number", { ascending: false })
    .limit(1)

  let nextNum = 1
  if (data && data.length > 0) {
    const lastNumber = data[0].purchase_number as string
    const parts = lastNumber.split("/")
    const parsed = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(parsed)) nextNum = parsed + 1
  }

  return `PO/${year}/${nextNum.toString().padStart(4, "0")}`
}
