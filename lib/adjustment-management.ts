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

export async function createAdjustment(
  organizationId: string,
  data: AdjustmentData,
  userId: string,
  status: "pending" | "approved" = "approved"
) {
  const supabase = await createClient()

  const { count } = await supabase.from("stock_adjustments").select("*", { count: "exact", head: true })

  const adjustmentNo = `ADJ-${Date.now()}-${((count || 0) + 1).toString().padStart(4, "0")}`

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
