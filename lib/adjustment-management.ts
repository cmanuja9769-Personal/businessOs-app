// Stock Adjustment Management

import { createClient } from "@/lib/supabase/server"

export interface AdjustmentData {
  itemId: string
  quantity: number
  adjustmentType: "increase" | "decrease"
  reason: "damage" | "theft" | "found" | "correction" | "opening_balance" | "expired" | "other"
  batchId?: string
  notes?: string
}

export async function createAdjustment(organizationId: string, data: AdjustmentData, userId: string) {
  const supabase = await createClient()

  // Generate adjustment number
  const { count } = await supabase.from("stock_adjustments").select("*", { count: "exact", head: true })

  const adjustmentNo = `ADJ-${Date.now()}-${((count || 0) + 1).toString().padStart(4, "0")}`

  const { data: adjustment, error } = await supabase
    .from("stock_adjustments")
    .insert({
      organization_id: organizationId,
      adjustment_no: adjustmentNo,
      item_id: data.itemId,
      batch_id: data.batchId || null,
      adjustment_type: data.adjustmentType,
      quantity: data.quantity,
      reason: data.reason,
      notes: data.notes || null,
      adjusted_by: userId,
      status: "pending",
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating adjustment:", error)
    return { success: false, error: error.message }
  }

  return { success: true, adjustment }
}

export async function approveAdjustment(adjustmentId: string, userId: string) {
  const supabase = await createClient()

  // Get adjustment
  const { data: adjustment } = await supabase.from("stock_adjustments").select("*").eq("id", adjustmentId).single()

  if (!adjustment) {
    return { success: false, error: "Adjustment not found" }
  }

  // Update adjustment status
  const { error: updateError } = await supabase
    .from("stock_adjustments")
    .update({
      status: "approved",
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", adjustmentId)

  if (updateError) {
    console.error("[v0] Error approving adjustment:", updateError)
    return { success: false, error: updateError.message }
  }

  // Get current stock for item
  const { data: item } = await supabase
    .from("items")
    .select("current_stock, unit")
    .eq("id", adjustment.item_id)
    .single()

  const quantityBefore = item?.current_stock || 0
  const quantityChange = adjustment.adjustment_type === "increase" ? adjustment.quantity : -adjustment.quantity
  const quantityAfter = quantityBefore + quantityChange

  // Log to stock_ledger (the correct table)
  await supabase.from("stock_ledger").insert({
    organization_id: adjustment.organization_id,
    item_id: adjustment.item_id,
    warehouse_id: null,
    transaction_type: "ADJUSTMENT",
    quantity_before: quantityBefore,
    quantity_change: quantityChange,
    quantity_after: quantityAfter,
    entry_quantity: adjustment.quantity,
    entry_unit: item?.unit || "PCS",
    base_quantity: adjustment.quantity,
    reference_type: "adjustment",
    reference_id: adjustmentId,
    reference_no: adjustment.adjustment_no,
    notes: `${adjustment.adjustment_type === "increase" ? "Stock Increase" : "Stock Decrease"} - ${adjustment.reason}${adjustment.notes ? ": " + adjustment.notes : ""}`,
    created_by: userId,
  })

  return { success: true }
}

export async function getAdjustments(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("stock_adjustments")
    .select("*, items(name, item_code)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching adjustments:", error)
    return []
  }

  return data || []
}
