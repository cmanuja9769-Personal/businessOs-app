// Stock Adjustment Management

import { createClient } from "@/lib/supabase/server"
import { logStockMovement } from "@/lib/stock-management"

export interface AdjustmentData {
  itemId: string
  quantity: number
  adjustmentType: "increase" | "decrease"
  reason: "damage" | "theft" | "found" | "correction" | "opening_balance" | "expired" | "other"
  batchId?: string
  warehouseId?: string
  notes?: string
}

export async function createAdjustment(
  organizationId: string,
  data: AdjustmentData,
  userId: string,
  status: "pending" | "approved" = "approved"
) {
  const supabase = await createClient()

  const { data: lastAdj } = await supabase
    .from("stock_adjustments")
    .select("adjustment_no")
    .like("adjustment_no", "ADJ-%")
    .order("created_at", { ascending: false })
    .limit(1)

  let nextNum = 1
  if (lastAdj && lastAdj.length > 0) {
    const lastNo = (lastAdj[0] as Record<string, unknown>).adjustment_no as string
    const parts = lastNo.split("-")
    const parsed = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(parsed)) nextNum = parsed + 1
  }

  const adjustmentNo = `ADJ-${Date.now()}-${nextNum.toString().padStart(4, "0")}`

  const insertData: Record<string, unknown> = {
    organization_id: organizationId,
    adjustment_no: adjustmentNo,
    item_id: data.itemId,
    batch_id: data.batchId || null,
    adjustment_type: data.adjustmentType,
    quantity: data.quantity,
    reason: data.reason,
    notes: data.notes || null,
    adjusted_by: userId,
    status,
  }

  if (status === "approved") {
    insertData.approved_by = userId
    insertData.approved_at = new Date().toISOString()
  }

  const { data: adjustment, error } = await supabase
    .from("stock_adjustments")
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating adjustment:", error)
    return { success: false, error: error.message }
  }

  if (status === "approved") {
    const stockQuantity = data.adjustmentType === "increase" ? data.quantity : -data.quantity
    const movementResult = await logStockMovement({
      itemId: data.itemId,
      organizationId,
      warehouseId: data.warehouseId,
      transactionType: "ADJUSTMENT",
      entryQuantity: stockQuantity,
      entryUnit: "PCS",
      referenceType: "adjustment",
      referenceId: adjustment.id,
      referenceNo: adjustmentNo,
      notes: `Stock ${data.adjustmentType}: ${data.reason}${data.notes ? ` - ${data.notes}` : ""}`,
    }, userId)

    if (!movementResult.success) {
      return { success: false, error: movementResult.error || "Failed to update stock" }
    }
  }

  return { success: true, adjustment }
}

export async function approveAdjustment(adjustmentId: string, userId: string) {
  const supabase = await createClient()

  const { data: adjustment } = await supabase.from("stock_adjustments").select("*").eq("id", adjustmentId).single()

  if (!adjustment) {
    return { success: false, error: "Adjustment not found" }
  }

  if (adjustment.status === "approved") {
    return { success: false, error: "Adjustment is already approved" }
  }

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

  const stockQuantity = adjustment.adjustment_type === "increase"
    ? adjustment.quantity
    : -adjustment.quantity

  const movementResult = await logStockMovement({
    itemId: adjustment.item_id,
    organizationId: adjustment.organization_id,
    transactionType: "ADJUSTMENT",
    entryQuantity: stockQuantity,
    entryUnit: "PCS",
    referenceType: "adjustment",
    referenceId: adjustmentId,
    referenceNo: adjustment.adjustment_no,
    notes: `Approved adjustment: ${adjustment.reason}`,
  }, userId)

  if (!movementResult.success) {
    return { success: false, error: movementResult.error || "Failed to update stock" }
  }

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
