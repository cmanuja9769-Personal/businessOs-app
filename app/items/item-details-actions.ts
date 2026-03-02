"use server"

import { createClient } from "@/lib/supabase/server"
import type { PackagingUnit } from "@/types"
import { authorize, orgScope } from "@/lib/authorize"
import { isDemoMode } from "@/app/demo/helpers"
import { demoItems } from "@/app/demo/data"

function normalizeId(value: string | null | undefined): string | null {
  const normalized = String(value || "").trim()
  if (!normalized || normalized === "null" || normalized === "undefined") {
    return null
  }
  return normalized
}

function stringOrEmpty(value: unknown): string {
  return String(value || "")
}

function numberOrZero(value: unknown): number {
  return Number(value) || 0
}

function asWarehouseId(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

async function fetchItemWarehouseName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  warehouseId: unknown
): Promise<string | null> {
  if (!warehouseId) return null
  const { data: godown } = await supabase
    .from("warehouses")
    .select("name")
    .eq("id", warehouseId)
    .single()
  return godown?.name || null
}

export async function getItemById(id: string) {
  if (await isDemoMode()) return demoItems.find(i => i.id === id) ?? null
  const { supabase, organizationId } = await authorize("items", "read")

  const normalizedId = normalizeId(id)
  if (!normalizedId) {
    console.error("[Items] Invalid id for getItemById:", id)
    return null
  }

  const { data: item, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", normalizedId)
    .or(orgScope(organizationId))
    .single()

  if (error || !item) {
    console.error("[Items] Error fetching item by ID:", error)
    return null
  }

  const godownName = await fetchItemWarehouseName(supabase, item.warehouse_id)
  const stock = numberOrZero(item.current_stock)

  return {
    id: stringOrEmpty(item.id),
    itemCode: stringOrEmpty(item.item_code),
    name: stringOrEmpty(item.name),
    description: stringOrEmpty(item.description),
    category: stringOrEmpty(item.category),
    hsnCode: stringOrEmpty(item.hsn),
    salePrice: numberOrZero(item.sale_price),
    wholesalePrice: numberOrZero(item.wholesale_price),
    quantityPrice: numberOrZero(item.quantity_price),
    purchasePrice: numberOrZero(item.purchase_price),
    discountType: (item.discount_type as "percentage" | "flat") || "percentage",
    saleDiscount: numberOrZero(item.sale_discount),
    barcodeNo: stringOrEmpty(item.barcode_no),
    unit: stringOrEmpty(item.unit) || "PCS",
    packagingUnit: (item.packaging_unit as PackagingUnit) || "CTN",
    conversionRate: 1,
    mrp: numberOrZero(item.sale_price),
    stock,
    openingStock: numberOrZero(item.opening_stock),
    minStock: numberOrZero(item.min_stock),
    maxStock: stock + 100,
    itemLocation: stringOrEmpty(item.item_location),
    perCartonQuantity: numberOrZero(item.per_carton_quantity) || 1,
    godownId: asWarehouseId(item.warehouse_id),
    godownName,
    taxRate: numberOrZero(item.tax_rate),
    inclusiveOfTax: Boolean(item.inclusive_of_tax),
    gstRate: numberOrZero(item.tax_rate),
    cessRate: 0,
    createdAt: new Date(item.created_at),
    updatedAt: new Date(item.updated_at),
  }
}

async function getItemStockDistributionFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemId: string
): Promise<Array<{ id: string; warehouseId: string; warehouseName: string; quantity: number; minQuantity: number; maxQuantity: number; location: string }>> {
  const { data: item } = await supabase
    .from("items")
    .select("warehouse_id, current_stock, item_location")
    .eq("id", itemId)
    .single()

  if (!item) return []

  let warehouseName = "Default"
  if (item.warehouse_id) {
    const { data: warehouse } = await supabase
      .from("warehouses")
      .select("id, name")
      .eq("id", item.warehouse_id)
      .single()
    warehouseName = warehouse?.name || "Default"
  }

  return [{
    id: "main",
    warehouseId: item.warehouse_id || "default",
    warehouseName,
    quantity: item.current_stock || 0,
    minQuantity: 0,
    maxQuantity: 0,
    location: item.item_location || "",
  }]
}

function mapWarehouseStockDistributionRows(
  warehouseStocks: Array<Record<string, unknown>>
): Array<{ id: string; warehouseId: string; warehouseName: string; quantity: number; minQuantity: number; maxQuantity: number; location: string }> {
  return warehouseStocks.map((ws: Record<string, unknown>) => ({
    id: String(ws.id || ""),
    warehouseId: String(ws.warehouse_id || ""),
    warehouseName: String((ws.warehouses as Record<string, unknown>)?.name || "Unknown"),
    quantity: Number(ws.quantity) || 0,
    minQuantity: Number(ws.min_quantity) || 0,
    maxQuantity: Number(ws.max_quantity) || 0,
    location: String(ws.location || ""),
  }))
}

export async function getItemStockDistribution(itemId: string) {
  if (await isDemoMode()) {
    const item = demoItems.find(i => i.id === itemId)
    return item?.warehouseStocks?.map((ws, idx) => ({ id: `stock-${idx}`, warehouseId: ws.warehouseId, warehouseName: ws.warehouseName || "", quantity: ws.quantity, minQuantity: ws.minQuantity ?? 0, maxQuantity: ws.maxQuantity ?? 0, location: ws.location || "" })) ?? []
  }
  const { supabase, organizationId } = await authorize("items", "read")

  const normalizedId = normalizeId(itemId)
  if (!normalizedId) {
    return []
  }

  const { data: itemCheck } = await supabase
    .from("items")
    .select("id")
    .eq("id", normalizedId)
    .or(orgScope(organizationId))
    .maybeSingle()

  if (!itemCheck) return []

  const { data: warehouseStocks, error } = await supabase
    .from("item_warehouse_stock")
    .select(`
      id,
      warehouse_id,
      quantity,
      min_quantity,
      max_quantity,
      location,
      warehouses:warehouse_id (
        id,
        name,
        code
      )
    `)
    .eq("item_id", normalizedId)

  if (error || !warehouseStocks || warehouseStocks.length === 0) {
    return await getItemStockDistributionFallback(supabase, normalizedId)
  }

  return mapWarehouseStockDistributionRows((warehouseStocks || []) as Array<Record<string, unknown>>)
}

export async function getItemStockLedger(itemId: string, limit = 100) {
  if (await isDemoMode()) return []
  const { supabase, organizationId } = await authorize("items", "read")
  
  if (!itemId || itemId === "null" || itemId === "undefined") {
    return []
  }

  const { data: itemCheck } = await supabase
    .from("items")
    .select("id")
    .eq("id", itemId)
    .or(orgScope(organizationId))
    .maybeSingle()

  if (!itemCheck) return []

  const { data: ledgerEntries, error } = await supabase
    .from("stock_ledger")
    .select(`
      *,
      warehouses:warehouse_id (
        name
      )
    `)
    .eq("item_id", itemId)
    .eq("organization_id", organizationId)
    .order("transaction_date", { ascending: false })
    .limit(limit)

  if (!error && ledgerEntries && ledgerEntries.length > 0) {
    return ledgerEntries.map((entry: Record<string, unknown>) => ({
      id: String(entry.id || ""),
      transactionType: String(entry.transaction_type || ""),
      transactionDate: new Date(entry.transaction_date as string),
      quantityBefore: Number(entry.quantity_before) || 0,
      quantityChange: Number(entry.quantity_change) || 0,
      quantityAfter: Number(entry.quantity_after) || 0,
      entryQuantity: Number(entry.entry_quantity) || 0,
      entryUnit: String(entry.entry_unit || "PCS"),
      baseQuantity: Number(entry.base_quantity) || 0,
      ratePerUnit: entry.rate_per_unit ? Number(entry.rate_per_unit) : undefined,
      totalValue: entry.total_value ? Number(entry.total_value) : undefined,
      referenceType: entry.reference_type ? String(entry.reference_type) : undefined,
      referenceId: entry.reference_id ? String(entry.reference_id) : undefined,
      referenceNo: String(entry.reference_no || ""),
      partyName: String(entry.party_name || ""),
      warehouseName: String((entry.warehouses as Record<string, unknown>)?.name || ""),
      notes: String(entry.notes || ""),
    }))
  }

  const { data: adjustments, error: adjError } = await supabase
    .from("stock_adjustments")
    .select("*")
    .eq("item_id", itemId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (!adjError && adjustments && adjustments.length > 0) {
    return adjustments.map((adj: Record<string, unknown>) => ({
      id: String(adj.id || ""),
      transactionType: "ADJUSTMENT",
      transactionDate: new Date(adj.created_at as string),
      quantityBefore: 0,
      quantityChange: adj.adjustment_type === "increase" ? Number(adj.quantity) : -Number(adj.quantity),
      quantityAfter: 0,
      entryQuantity: Number(adj.quantity) || 0,
      entryUnit: "PCS",
      baseQuantity: Number(adj.quantity) || 0,
      ratePerUnit: undefined,
      totalValue: undefined,
      referenceType: "adjustment",
      referenceId: String(adj.id || ""),
      referenceNo: String(adj.adjustment_no || ""),
      partyName: "",
      warehouseName: "",
      notes: `${adj.adjustment_type} - ${adj.reason}${adj.notes ? ": " + adj.notes : ""}`,
    }))
  }

  return []
}

export async function getItemInvoiceUsage(itemId: string, limit = 50) {
  if (await isDemoMode()) return []
  const { supabase, organizationId } = await authorize("items", "read")
  
  if (!itemId || itemId === "null" || itemId === "undefined") {
    return []
  }

  const { data: itemCheck } = await supabase
    .from("items")
    .select("id")
    .eq("id", itemId)
    .or(orgScope(organizationId))
    .maybeSingle()

  if (!itemCheck) return []

  const { data: invoiceItems, error } = await supabase
    .from("invoice_items")
    .select(`
      id,
      item_id,
      item_name,
      quantity,
      unit,
      rate,
      amount,
      invoices:invoice_id (
        id,
        invoice_number,
        document_type,
        invoice_date,
        customer_name
      )
    `)
    .eq("item_id", itemId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[Items] Error fetching invoice usage:", error)
    return []
  }

  return (invoiceItems || [])
    .filter((item: Record<string, unknown>) => item.invoices)
    .map((item: Record<string, unknown>) => {
      const invoice = item.invoices as Record<string, unknown>
      return {
        invoiceId: String(invoice.id || ""),
        invoiceNo: String(invoice.invoice_number || ""),
        documentType: String(invoice.document_type || "invoice"),
        invoiceDate: new Date(invoice.invoice_date as string),
        customerName: String(invoice.customer_name || ""),
        quantity: Number(item.quantity) || 0,
        unit: String(item.unit || "PCS"),
        rate: Number(item.rate) || 0,
        amount: Number(item.amount) || 0,
      }
    })
}
