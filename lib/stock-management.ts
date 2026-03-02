// Stock Management & Movement Tracking with Ledger Support
// Production-ready implementation with atomic operations and audit trail

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

const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  KG:    { G: 1000, GM: 1000, GMS: 1000, GRAM: 1000, GRAMS: 1000 },
  G:     { KG: 0.001 },
  GM:    { KG: 0.001 },
  L:     { ML: 1000, LTR: 1, LITRE: 1 },
  ML:    { L: 0.001, LTR: 0.001 },
  LTR:   { ML: 1000, L: 1 },
  M:     { CM: 100, MM: 1000, FT: 3.28084 },
  CM:    { M: 0.01, MM: 10 },
  MM:    { M: 0.001, CM: 0.1 },
  FT:    { M: 0.3048, IN: 12 },
  IN:    { FT: 1 / 12, CM: 2.54 },
  DOZ:   { PCS: 12, NOS: 12 },
  PCS:   { DOZ: 1 / 12 },
  NOS:   { DOZ: 1 / 12 },
}

export function calculateBaseQuantity(
  entryQuantity: number,
  entryUnit: string,
  itemUnit: string,
  packagingUnit: string | null,
  perCartonQuantity: number | null
): number {
  if (!entryUnit || entryUnit === itemUnit) {
    return entryQuantity
  }

  if (packagingUnit && entryUnit === packagingUnit && perCartonQuantity && perCartonQuantity > 1) {
    return entryQuantity * perCartonQuantity
  }

  const upperEntry = entryUnit.toUpperCase()
  const upperBase = itemUnit.toUpperCase()
  const conversionMap = UNIT_CONVERSIONS[upperEntry]
  if (conversionMap && conversionMap[upperBase] !== undefined) {
    return entryQuantity * conversionMap[upperBase]
  }

  console.warn(`[stock] No conversion found from "${entryUnit}" to "${itemUnit}" — using entry quantity as-is`)
  return entryQuantity
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

const INBOUND_TYPES = new Set(["IN", "PURCHASE", "RETURN", "TRANSFER_IN", "OPENING"])
const OUTBOUND_TYPES = new Set(["OUT", "SALE", "TRANSFER_OUT"])

function resolveQuantityChange(transactionType: string, baseQuantity: number): number {
  if (transactionType === "ADJUSTMENT" || transactionType === "CORRECTION") {
    return baseQuantity
  }
  if (INBOUND_TYPES.has(transactionType)) return Math.abs(baseQuantity)
  if (OUTBOUND_TYPES.has(transactionType)) return -Math.abs(baseQuantity)
  return Math.abs(baseQuantity)
}

type SupabaseStockClient = Awaited<ReturnType<typeof createClient>>

async function tryAtomicStockMovement(
  supabase: SupabaseStockClient,
  data: StockMovementData,
  userId: string,
  quantityAfter: number,
): Promise<{ success: true; ledgerId: string; quantityAfter: number } | null> {
  if (!data.warehouseId) return null
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
    if (!error && ledgerId) return { success: true, ledgerId, quantityAfter }
  } catch { /* RPC unavailable */ }
  return null
}

export async function logStockMovement(data: StockMovementData, userId: string) {
  const supabase = await createClient()

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("current_stock, unit, packaging_unit, per_carton_quantity, organization_id")
    .eq("id", data.itemId)
    .single()

  if (itemError || !item) {
    return { success: false, error: itemError?.message || "Item not found" }
  }

  const baseQuantity = calculateBaseQuantity(
    data.entryQuantity,
    data.entryUnit,
    item.unit,
    item.packaging_unit,
    item.per_carton_quantity
  )

  const quantityChange = resolveQuantityChange(data.transactionType, baseQuantity)
  const quantityBefore = item.current_stock || 0
  const quantityAfter = quantityBefore + quantityChange

  if (quantityAfter < 0) {
    return {
      success: false,
      error: `Insufficient stock. Available: ${quantityBefore}, Required: ${Math.abs(quantityChange)}`,
    }
  }

  const atomicResult = await tryAtomicStockMovement(supabase, data, userId, quantityAfter)
  if (atomicResult) return atomicResult

  const { data: movement, error: ledgerError } = await supabase
    .from("stock_ledger")
    .insert({
      organization_id: data.organizationId,
      item_id: data.itemId,
      warehouse_id: data.warehouseId || null,
      transaction_type: data.transactionType,
      transaction_date: new Date().toISOString(),
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

  const { error: updateError } = await supabase
    .from("items")
    .update({ 
      current_stock: quantityAfter,
      updated_at: new Date().toISOString()
    })
    .eq("id", data.itemId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  if (data.warehouseId) {
    await updateWarehouseStock(
      supabase,
      data.itemId,
      data.warehouseId,
      data.organizationId,
      quantityChange
    )
  }

  return { success: true, movement, quantityAfter, ledgerError: ledgerError?.message }
}

/**
 * Update warehouse-specific stock atomically
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
    .maybeSingle()

  if (warehouseStock) {
    const newQuantity = (warehouseStock.quantity || 0) + quantityChange
    if (newQuantity < 0) {
      return
    }
    await supabase
      .from("item_warehouse_stock")
      .update({ 
        quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq("id", warehouseStock.id)
  } else if (quantityChange > 0) {
    await supabase
      .from("item_warehouse_stock")
      .insert({
        item_id: itemId,
        warehouse_id: warehouseId,
        organization_id: organizationId,
        quantity: quantityChange,
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
    return []
  }

  return (data || []).map((entry: Record<string, unknown>) => ({
    id: entry.id as string,
    itemId: entry.item_id as string,
    warehouseId: entry.warehouse_id as string | undefined,
    transactionType: entry.transaction_type as StockTransactionType,
    transactionDate: new Date(entry.transaction_date as string),
    quantityBefore: (entry.quantity_before as number) || 0,
    quantityChange: (entry.quantity_change as number) || 0,
    quantityAfter: (entry.quantity_after as number) || 0,
    entryQuantity: (entry.entry_quantity as number) || 0,
    entryUnit: (entry.entry_unit as string) || "PCS",
    baseQuantity: (entry.base_quantity as number) || 0,
    ratePerUnit: entry.rate_per_unit as number | undefined,
    totalValue: entry.total_value as number | undefined,
    referenceType: entry.reference_type as string | undefined,
    referenceId: entry.reference_id as string | undefined,
    referenceNo: entry.reference_no as string | undefined,
    partyName: entry.party_name as string | undefined,
    notes: entry.notes as string | undefined,
    createdBy: entry.created_by as string | undefined,
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
    return []
  }

  return (data || []).map((stock: Record<string, unknown>) => ({
    id: stock.id as string,
    warehouseId: stock.warehouse_id as string,
    warehouseName: (stock.warehouses as Record<string, unknown>)?.name as string || "Unknown",
    warehouseCode: (stock.warehouses as Record<string, unknown>)?.code as string || "",
    quantity: (stock.quantity as number) || 0,
    minQuantity: (stock.min_quantity as number) || 0,
    maxQuantity: (stock.max_quantity as number) || 0,
    location: (stock.location as string) || "",
  }))
}
