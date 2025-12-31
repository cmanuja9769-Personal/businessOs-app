// Batch Management Utilities

import { createClient } from "@/lib/supabase/server"

export interface BatchData {
  batchNumber: string
  manufacturingDate?: Date
  expiryDate?: Date
  purchasePrice: number
  quantity: number
  purchaseId?: string
}

export async function createBatch(itemId: string, organizationId: string, data: BatchData) {
  const supabase = await createClient()

  const { data: batch, error } = await supabase
    .from("item_batches")
    .insert({
      item_id: itemId,
      organization_id: organizationId,
      batch_number: data.batchNumber,
      manufacturing_date: data.manufacturingDate?.toISOString().split("T")[0] || null,
      expiry_date: data.expiryDate?.toISOString().split("T")[0] || null,
      purchase_price: data.purchasePrice,
      quantity: data.quantity,
      remaining_quantity: data.quantity,
      purchase_id: data.purchaseId || null,
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating batch:", error)
    return { success: false, error: error.message }
  }

  return { success: true, batch }
}

export async function getBatchesForItem(itemId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("item_batches")
    .select("*")
    .eq("item_id", itemId)
    .order("expiry_date", { ascending: true, nullsFirst: false })

  if (error) {
    console.error("[v0] Error fetching batches:", error)
    return []
  }

  return data || []
}

// FIFO - Select batch with earliest expiry date for sale
export async function selectBatchFIFO(itemId: string, requiredQty: number) {
  const supabase = await createClient()

  const { data: batches, error } = await supabase
    .from("item_batches")
    .select("*")
    .eq("item_id", itemId)
    .gt("remaining_quantity", 0)
    .order("expiry_date", { ascending: true, nullsFirst: true })

  if (error) {
    console.error("[v0] Error selecting batch FIFO:", error)
    return []
  }

  const selection: Array<{ batchId: string; quantity: number }> = []
  let remaining = requiredQty

  for (const batch of batches || []) {
    if (remaining <= 0) break

    const qtyToTake = Math.min(batch.remaining_quantity, remaining)
    selection.push({
      batchId: batch.id,
      quantity: qtyToTake,
    })

    remaining -= qtyToTake
  }

  return selection
}

// Get expiring batches
export async function getExpiringBatches(organizationId: string, daysBeforeExpiry = 30) {
  const supabase = await createClient()

  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + daysBeforeExpiry)

  const { data, error } = await supabase
    .from("item_batches")
    .select("*, items(name, item_code)")
    .eq("organization_id", organizationId)
    .lt("expiry_date", expiryDate.toISOString().split("T")[0])
    .gt("remaining_quantity", 0)
    .order("expiry_date", { ascending: true })

  if (error) {
    console.error("[v0] Error fetching expiring batches:", error)
    return []
  }

  return data || []
}
