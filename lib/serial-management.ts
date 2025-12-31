// Serial Number Management Utilities

import { createClient } from "@/lib/supabase/server"

export interface SerialData {
  serialNumber: string
  purchaseDate?: Date
  warrantyMonths?: number
  notes?: string
  batchId?: string
  purchaseId?: string
}

export async function createSerial(itemId: string, organizationId: string, data: SerialData) {
  const supabase = await createClient()

  let warrantyExpiry = null
  if (data.warrantyMonths && data.warrantyMonths > 0) {
    const expiry = new Date()
    expiry.setMonth(expiry.getMonth() + data.warrantyMonths)
    warrantyExpiry = expiry.toISOString().split("T")[0]
  }

  const { data: serial, error } = await supabase
    .from("item_serials")
    .insert({
      item_id: itemId,
      organization_id: organizationId,
      serial_number: data.serialNumber,
      purchase_date: data.purchaseDate?.toISOString().split("T")[0] || null,
      batch_id: data.batchId || null,
      warranty_months: data.warrantyMonths || 0,
      warranty_expiry: warrantyExpiry,
      notes: data.notes || null,
      purchase_id: data.purchaseId || null,
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating serial:", error)
    return { success: false, error: error.message }
  }

  return { success: true, serial }
}

export async function getSerialsForItem(itemId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("item_serials")
    .select("*")
    .eq("item_id", itemId)
    .eq("status", "in_stock")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching serials:", error)
    return []
  }

  return data || []
}

export async function updateSerialStatus(serialId: string, status: string, invoiceId?: string, customerId?: string) {
  const supabase = await createClient()

  const update: any = {
    status,
    sale_date: status === "sold" ? new Date().toISOString().split("T")[0] : null,
  }

  if (invoiceId) update.invoice_id = invoiceId
  if (customerId) update.customer_id = customerId

  const { error } = await supabase.from("item_serials").update(update).eq("id", serialId)

  if (error) {
    console.error("[v0] Error updating serial status:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function searchSerial(organizationId: string, serialNumber: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("item_serials")
    .select("*, items(name, item_code), customers(name)")
    .eq("organization_id", organizationId)
    .eq("serial_number", serialNumber)
    .single()

  if (error) {
    console.error("[v0] Error searching serial:", error)
    return null
  }

  return data
}
