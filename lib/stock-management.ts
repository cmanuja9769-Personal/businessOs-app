// Stock Management & Movement Tracking with Ledger Support

import { createClient } from "@/lib/supabase/server"

export type StockTransactionType = 
  | "IN" 
  | "OUT" 
  | "ADJUSTMENT" 
  | "SALE" 
  | "PURCHASE" 
  | "RETURN" 
  | "TRANSFER_IN" 
  | "TRANSFER_OUT" 
  | "OPENING" 
  | "CORRECTION"

export interface StockMovementData {
  itemId: string
  organizationId: string
  warehouseId?: string
  transactionType: StockTransactionType
  entryQuantity: number // Original quantity entered by user
  entryUnit: string // Unit selected by user (PCS, CTN, etc.)
  referenceType?: string // invoice, purchase, adjustment, transfer
  referenceId?: string
  referenceNo?: string
  ratePerUnit?: number
  partyId?: string
  partyName?: string
  notes?: string
}

export interface StockLedgerEntry {
  id: string
  itemId: string
  warehouseId?: string
  transactionType: StockTransactionType
  transactionDate: Date
  quantityBefore: number
  quantityChange: number
  quantityAfter: number
  entryQuantity: number
  entryUnit: string
  baseQuantity: number
  ratePerUnit?: number
  totalValue?: number
  referenceType?: string
  referenceId?: string
  referenceNo?: string
  partyName?: string
  notes?: string
  createdBy?: string
}

/**
 * Calculate base quantity from entry quantity and unit
 */
export function calculateBaseQuantity(
  entryQuantity: number,
  entryUnit: string,
  itemUnit: string,
  packagingUnit: string | null,
  perCartonQuantity: number | null
): number {
  // If entry unit is packaging unit, convert to base units
  if (entryUnit === packagingUnit && perCartonQuantity && perCartonQuantity > 1) {
    return Math.round(entryQuantity * perCartonQuantity)
  }
  // Otherwise, return as-is (already in base units)
  return Math.round(entryQuantity)
}

/**
 * Convert base quantity to packaging units (for display)
 */
export function convertToPackagingUnits(
  baseQuantity: number,
  packagingUnit: string | null,
  perCartonQuantity: number | null
): { packagingQty: number; remainingBaseQty: number } | null {
  if (!packagingUnit || !perCartonQuantity || perCartonQuantity <= 1) {
    return null
  }
  
  const packagingQty = Math.floor(baseQuantity / perCartonQuantity)
  const remainingBaseQty = baseQuantity % perCartonQuantity
  
  return { packagingQty, remainingBaseQty }
}

/**
 * Format stock for display (e.g., "5 CTN + 30 PCS" or "1530 PCS")
 */
export function formatStockDisplay(
  baseQuantity: number,
  baseUnit: string,
  packagingUnit: string | null,
  perCartonQuantity: number | null,
  showPackaging = true
): string {
  if (!showPackaging || !packagingUnit || !perCartonQuantity || perCartonQuantity <= 1) {
    return `${baseQuantity.toLocaleString()} ${baseUnit}`
  }
  
  const converted = convertToPackagingUnits(baseQuantity, packagingUnit, perCartonQuantity)
  if (!converted) {
    return `${baseQuantity.toLocaleString()} ${baseUnit}`
  }
  
  if (converted.remainingBaseQty === 0) {
    return `${converted.packagingQty} ${packagingUnit}`
  }
  
  if (converted.packagingQty === 0) {
    return `${converted.remainingBaseQty} ${baseUnit}`
  }
  
  return `${converted.packagingQty} ${packagingUnit} + ${converted.remainingBaseQty} ${baseUnit}`
}

/**
 * Log stock movement to the ledger
 */
export async function logStockMovement(data: StockMovementData, userId: string) {
  const supabase = await createClient()

  // Get item details for conversion
  const { data: item } = await supabase
    .from("items")
    .select("current_stock, unit, packaging_unit, per_carton_quantity, organization_id")
    .eq("id", data.itemId)
    .single()

  if (!item) {
    return { success: false, error: "Item not found" }
  }

  // Calculate base quantity
  const baseQuantity = calculateBaseQuantity(
    data.entryQuantity,
    data.entryUnit,
    item.unit,
    item.packaging_unit,
    item.per_carton_quantity
  )

  // Determine quantity change (positive for IN, negative for OUT)
  const isInbound = ["IN", "PURCHASE", "RETURN", "TRANSFER_IN", "OPENING", "ADJUSTMENT"].includes(data.transactionType)
  const quantityChange = isInbound ? Math.abs(baseQuantity) : -Math.abs(baseQuantity)

  const quantityBefore = item.current_stock || 0
  const quantityAfter = Math.max(0, quantityBefore + quantityChange)

  // Try to use the database RPC function first (preferred method)
  if (data.warehouseId) {
    try {
      const { data: ledgerId, error } = await supabase.rpc("record_stock_movement", {
        p_organization_id: data.organizationId,
        p_item_id: data.itemId,
        p_warehouse_id: data.warehouseId,
        p_transaction_type: data.transactionType,
        p_entry_quantity: data.entryQuantity,
        p_entry_unit: data.entryUnit,
        p_reference_type: data.referenceType || null,
        p_reference_id: data.referenceId || null,
        p_reference_no: data.referenceNo || null,
        p_party_id: data.partyId || null,
        p_party_name: data.partyName || null,
        p_rate_per_unit: data.ratePerUnit || null,
        p_notes: data.notes || null,
        p_created_by: userId,
      })

      if (!error && ledgerId) {
        return { success: true, ledgerId, quantityAfter }
      }
      // If RPC fails, fall through to direct method
      console.warn("[Stock] RPC failed, using direct method:", error?.message)
    } catch (err) {
      console.warn("[Stock] RPC not available:", err)
    }
  }

  // Fallback: Direct insert to ledger and update item
  const { data: movement, error: ledgerError } = await supabase
    .from("stock_ledger")
    .insert({
      organization_id: data.organizationId,
      item_id: data.itemId,
      warehouse_id: data.warehouseId || null,
      transaction_type: data.transactionType,
      quantity_before: quantityBefore,
      quantity_change: quantityChange,
      quantity_after: quantityAfter,
      entry_quantity: data.entryQuantity,
      entry_unit: data.entryUnit,
      base_quantity: baseQuantity,
      rate_per_unit: data.ratePerUnit || null,
      total_value: data.ratePerUnit ? data.entryQuantity * data.ratePerUnit : null,
      reference_type: data.referenceType || null,
      reference_id: data.referenceId || null,
      reference_no: data.referenceNo || null,
      party_id: data.partyId || null,
      party_name: data.partyName || null,
      notes: data.notes || null,
      created_by: userId,
    })
    .select()
    .single()

  if (ledgerError) {
    console.error("[Stock] Error logging movement:", ledgerError)
    // Continue even if ledger fails - at least update the stock
  }

  // Update item current_stock
  const { error: updateError } = await supabase
    .from("items")
    .update({ current_stock: quantityAfter })
    .eq("id", data.itemId)

  if (updateError) {
    console.error("[Stock] Error updating item stock:", updateError)
    return { success: false, error: updateError.message }
  }

  // Update warehouse stock if applicable
  if (data.warehouseId) {
    await updateWarehouseStock(
      supabase,
      data.itemId,
      data.warehouseId,
      data.organizationId,
      quantityChange
    )
  }

  return { success: true, movement, quantityAfter }
}

/**
 * Update warehouse-specific stock
 */
async function updateWarehouseStock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemId: string,
  warehouseId: string,
  organizationId: string,
  quantityChange: number
) {
  // Get current warehouse stock
  const { data: warehouseStock } = await supabase
    .from("item_warehouse_stock")
    .select("id, quantity")
    .eq("item_id", itemId)
    .eq("warehouse_id", warehouseId)
    .single()

  if (warehouseStock) {
    // Update existing record
    const newQuantity = Math.max(0, (warehouseStock.quantity || 0) + quantityChange)
    await supabase
      .from("item_warehouse_stock")
      .update({ quantity: newQuantity })
      .eq("id", warehouseStock.id)
  } else {
    // Create new record
    await supabase
      .from("item_warehouse_stock")
      .insert({
        item_id: itemId,
        warehouse_id: warehouseId,
        organization_id: organizationId,
        quantity: Math.max(0, quantityChange),
      })
  }
}

/**
 * Get stock movements for an item
 */
export async function getStockMovements(itemId: string, limit = 50): Promise<StockLedgerEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("stock_ledger")
    .select(`
      *,
      warehouses:warehouse_id (name)
    `)
    .eq("item_id", itemId)
    .order("transaction_date", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[Stock] Error fetching movements:", error)
    return []
  }

  return (data || []).map((entry: any) => ({
    id: entry.id,
    itemId: entry.item_id,
    warehouseId: entry.warehouse_id,
    transactionType: entry.transaction_type,
    transactionDate: new Date(entry.transaction_date),
    quantityBefore: entry.quantity_before || 0,
    quantityChange: entry.quantity_change || 0,
    quantityAfter: entry.quantity_after || 0,
    entryQuantity: entry.entry_quantity || 0,
    entryUnit: entry.entry_unit || "PCS",
    baseQuantity: entry.base_quantity || 0,
    ratePerUnit: entry.rate_per_unit,
    totalValue: entry.total_value,
    referenceType: entry.reference_type,
    referenceId: entry.reference_id,
    referenceNo: entry.reference_no,
    partyName: entry.party_name,
    notes: entry.notes,
    createdBy: entry.created_by,
  }))
}

/**
 * Get low stock items with warehouse details
 */
export async function getLowStockItems(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("items")
    .select(`
      *,
      warehouses:warehouse_id (name)
    `)
    .eq("organization_id", organizationId)
    .filter("current_stock", "lte", "min_stock")

  if (error) {
    console.error("[Stock] Error fetching low stock items:", error)
    return []
  }

  return data || []
}

/**
 * Get stock distribution across warehouses for an item
 */
export async function getItemStockDistribution(itemId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("item_warehouse_stock")
    .select(`
      id,
      warehouse_id,
      quantity,
      min_quantity,
      max_quantity,
      location,
      warehouses:warehouse_id (id, name, code)
    `)
    .eq("item_id", itemId)

  if (error) {
    console.error("[Stock] Error fetching distribution:", error)
    return []
  }

  return (data || []).map((stock: any) => ({
    id: stock.id,
    warehouseId: stock.warehouse_id,
    warehouseName: stock.warehouses?.name || "Unknown",
    warehouseCode: stock.warehouses?.code || "",
    quantity: stock.quantity || 0,
    minQuantity: stock.min_quantity || 0,
    maxQuantity: stock.max_quantity || 0,
    location: stock.location || "",
  }))
}
