"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { IItem, PackagingUnit } from "@/types"
import { itemSchema } from "@/lib/schemas"
import { authorize, orgScope } from "@/lib/authorize"
import { isDemoMode, throwDemoMutationError } from "@/app/demo/helpers"
import { demoItems } from "@/app/demo/data"
import { generateNextNumericBarcode } from "./barcode-actions"

function stringOrEmpty(value: unknown): string {
  return String(value || "")
}

function numberOrZero(value: unknown): number {
  return Number(value) || 0
}

function asWarehouseId(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function dateOrNow(value: unknown): Date {
  return new Date(value ? String(value) : Date.now())
}

type WarehouseStock = { warehouseId: string; warehouseName: string; quantity: number }

async function fetchWarehouseStockBatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  batchIds: string[],
  organizationId: string,
  godownNameById: Map<string, string>,
  warehouseStocksByItemId: Map<string, WarehouseStock[]>
): Promise<void> {
  try {
    const stockRes = await supabase
      .from("item_warehouse_stock")
      .select("item_id, warehouse_id, quantity")
      .in("item_id", batchIds)
      .eq("organization_id", organizationId)
      .gt("quantity", 0)

    if (stockRes.error) return

    const stockData = (stockRes.data as Array<{ item_id: string; warehouse_id: string; quantity: number }>) || []

    for (const stock of stockData) {
      if (!stock.item_id || !stock.warehouse_id) continue

      const itemStocks = warehouseStocksByItemId.get(stock.item_id) || []
      const warehouseName = godownNameById.get(stock.warehouse_id) || ""
      itemStocks.push({
        warehouseId: stock.warehouse_id,
        warehouseName,
        quantity: Number(stock.quantity) || 0,
      })
      warehouseStocksByItemId.set(stock.item_id, itemStocks)
    }
  } catch {
    // batch query failed
  }
}

async function fetchItemsPage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  offset: number,
  pageSize: number
): Promise<{ data: Record<string, unknown>[]; error?: string }> {
  const itemsRes = await supabase
    .from("items")
    .select("*", { count: "exact" })
    .or(orgScope(organizationId))
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (itemsRes.error) {
    return { data: [], error: itemsRes.error.message || String(itemsRes.error) }
  }

  return { data: (itemsRes.data as Record<string, unknown>[]) || [] }
}

async function fetchAllItemsData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string
): Promise<Record<string, unknown>[]> {
  const pageSize = 1000
  let offset = 0
  const allData: Record<string, unknown>[] = []

  while (true) {
    const page = await fetchItemsPage(supabase, organizationId, offset, pageSize)
    if (page.error) {
      console.error("[Items] Critical: query failed:", page.error)
      break
    }

    if (page.data.length === 0) break
    allData.push(...page.data)
    if (page.data.length < pageSize) break
    offset += pageSize
  }

  return allData
}

async function fetchGodownNameById(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const allWarehousesRes = await supabase.from("warehouses").select("id, name")
  if (allWarehousesRes.error || !allWarehousesRes.data) return result

  for (const godown of allWarehousesRes.data as Record<string, unknown>[]) {
    if (godown?.id && typeof godown?.name === "string") {
      result.set(godown.id as string, godown.name)
    }
  }
  return result
}

function buildDisplayGodownNames(
  warehouseStocks: WarehouseStock[],
  warehouseId: unknown,
  godownNameById: Map<string, string>
): string[] {
  const stockNames = warehouseStocks.filter((stock) => stock.warehouseName).map((stock) => stock.warehouseName).sort()
  if (stockNames.length > 0) return stockNames

  if (typeof warehouseId === "string") {
    const fallbackName = godownNameById.get(warehouseId)
    if (fallbackName) return [fallbackName]
  }

  return []
}

function mapDbItemToItemDto(
  item: Record<string, unknown>,
  warehouseStocksByItemId: Map<string, WarehouseStock[]>,
  godownNameById: Map<string, string>
): IItem {
  const itemId = stringOrEmpty(item.id)
  const warehouseStocks = warehouseStocksByItemId.get(itemId) || []
  const displayGodownNames = buildDisplayGodownNames(warehouseStocks, item.warehouse_id, godownNameById)
  const stock = numberOrZero(item.current_stock)
  const warehouseId = asWarehouseId(item.warehouse_id)

  return {
    id: itemId,
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
    alternateUnit: undefined,
    mrp: numberOrZero(item.sale_price),
    stock,
    minStock: numberOrZero(item.min_stock),
    maxStock: stock + 100,
    itemLocation: stringOrEmpty(item.item_location),
    perCartonQuantity: numberOrZero(item.per_carton_quantity) || 1,
    godownId: warehouseId,
    godownName: displayGodownNames.length > 0 ? displayGodownNames.join(", ") : null,
    warehouseStocks: warehouseStocks.map((stock) => ({
      id: `${itemId}-${stock.warehouseId}`,
      itemId,
      warehouseId: stock.warehouseId,
      warehouseName: stock.warehouseName,
      quantity: stock.quantity,
    })),
    taxRate: numberOrZero(item.tax_rate),
    inclusiveOfTax: Boolean(item.inclusive_of_tax) || false,
    gstRate: numberOrZero(item.tax_rate),
    cessRate: 0,
    createdAt: dateOrNow(item.created_at),
    updatedAt: dateOrNow(item.updated_at),
  }
}

function dedupeItems(items: IItem[]): { uniqueItems: IItem[]; duplicates: Array<{ id: string; name: string }> } {
  const seenIds = new Set<string>()
  const duplicates: Array<{ id: string; name: string }> = []

  const uniqueItems = items.filter((item) => {
    if (seenIds.has(item.id)) {
      duplicates.push({ id: item.id, name: item.name })
      return false
    }
    seenIds.add(item.id)
    return true
  })

  return { uniqueItems, duplicates }
}

function logDuplicateSummary(duplicates: Array<{ id: string; name: string }>): void {
  if (duplicates.length === 0) return

  console.warn(`[Items] Found ${duplicates.length} duplicate items in query results (filtered out)`)
  duplicates.slice(0, 3).forEach((duplicate) => {
    console.warn(`  - ${duplicate.id} (${duplicate.name})`)
  })
  if (duplicates.length > 3) {
    console.warn(`  ... and ${duplicates.length - 3} more`)
  }
}

export async function getItems(): Promise<IItem[]> {
  if (await isDemoMode()) return demoItems
  const { supabase, organizationId } = await authorize("items", "read")
  try {
    const allData = await fetchAllItemsData(supabase, organizationId)
    if (allData.length === 0) return []

    const godownNameById = await fetchGodownNameById(supabase)
    const itemIds = allData.map((item) => item.id).filter((id): id is string => typeof id === "string")
    const warehouseStocksByItemId = new Map<string, WarehouseStock[]>()
    if (itemIds.length > 0) {
      const stockPageSize = 50
      for (let index = 0; index < itemIds.length; index += stockPageSize) {
        const batchIds = itemIds.slice(index, index + stockPageSize)
        await fetchWarehouseStockBatch(supabase, batchIds, organizationId, godownNameById, warehouseStocksByItemId)
      }
    }
    const mappedItems = allData.map((item) => mapDbItemToItemDto(item, warehouseStocksByItemId, godownNameById))
    const { uniqueItems, duplicates } = dedupeItems(mappedItems)
    logDuplicateSummary(duplicates)
    return uniqueItems
  } catch {
    return []
  }
}

export async function getItemCategories(): Promise<string[]> {
  if (await isDemoMode()) return [...new Set(demoItems.map(i => i.category).filter(Boolean) as string[])]
  const { supabase, organizationId } = await authorize("items", "read")
  
  try {
    const { data, error } = await supabase
      .from("items")
      .select("category")
      .or(orgScope(organizationId))
      .is("deleted_at", null)
      .not("category", "is", null)
      .not("category", "eq", "")

    if (error) {
      console.error("[Categories] Failed to fetch categories:", error.message)
      return []
    }

    const categories = new Set<string>()
    for (const item of data || []) {
      if (item.category && typeof item.category === "string" && item.category.trim()) {
        categories.add(item.category.trim())
      }
    }

    return Array.from(categories).sort((a, b) => a.localeCompare(b))
  } catch (error) {
    console.error("[Categories] Unexpected error:", error)
    return []
  }
}

async function resolveDefaultWarehouseId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  providedWarehouseId: string | null | undefined
): Promise<string | null> {
  if (providedWarehouseId) return providedWarehouseId

  const { data: eWarehouse } = await supabase
    .from("warehouses")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", "E")
    .maybeSingle()

  if (eWarehouse?.id) return eWarehouse.id

  const { data: firstWarehouse } = await supabase
    .from("warehouses")
    .select("id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  return firstWarehouse?.id || null
}

async function createInitialWarehouseStockIfNeeded(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  itemId: string,
  warehouseId: string | null,
  quantity: number
): Promise<void> {
  if (!warehouseId || quantity <= 0) return

  const { error } = await supabase
    .from("item_warehouse_stock")
    .insert({
      organization_id: organizationId,
      item_id: itemId,
      warehouse_id: warehouseId,
      quantity,
    })

  if (error) {
    console.error("[Items] Warning: Failed to create warehouse stock record:", error)
  }
}

export async function createItem(formData: FormData) {
  if (await isDemoMode()) throwDemoMutationError()
  const data = {
    name: formData.get("name"),
    itemCode: formData.get("itemCode"),
    category: formData.get("category"),
    hsnCode: formData.get("hsnCode"),
    salePrice: formData.get("salePrice"),
    wholesalePrice: formData.get("wholesalePrice"),
    quantityPrice: formData.get("quantityPrice"),
    purchasePrice: formData.get("purchasePrice"),
    discountType: formData.get("discountType"),
    saleDiscount: formData.get("saleDiscount"),
    barcodeNo: formData.get("barcodeNo"),
    unit: formData.get("unit"),
    conversionRate: formData.get("conversionRate"),
    alternateUnit: formData.get("alternateUnit"),
    packagingUnit: formData.get("packagingUnit"),
    mrp: formData.get("mrp"),
    stock: formData.get("stock"),
    stockEntryUnit: formData.get("stockEntryUnit"),
    minStock: formData.get("minStock"),
    maxStock: formData.get("maxStock"),
    itemLocation: formData.get("itemLocation"),
    perCartonQuantity: formData.get("perCartonQuantity"),
    godownId: formData.get("godownId"),
    taxRate: formData.get("taxRate"),
    inclusiveOfTax: formData.get("inclusiveOfTax"),
    gstRate: formData.get("gstRate"),
    cessRate: formData.get("cessRate"),
  }

  const validated = itemSchema.parse(data)

  const { supabase, organizationId } = await authorize("items", "create")

  const defaultWarehouseId = await resolveDefaultWarehouseId(supabase, organizationId, validated.godownId)

  let barcodeNo = validated.barcodeNo
  if (!barcodeNo) {
    barcodeNo = await generateNextNumericBarcode(supabase)
  }

  const { data: newItem, error } = await supabase
    .from("items")
    .insert({
      organization_id: organizationId,
      item_code: validated.itemCode || null,
      name: validated.name,
      description: validated.description || null,
      category: validated.category || null,
      hsn: validated.hsnCode || null,
      barcode_no: barcodeNo,
      unit: validated.unit || "PCS",
      packaging_unit: validated.packagingUnit || "CTN",
      sale_price: validated.salePrice,
      wholesale_price: validated.wholesalePrice || 0,
      quantity_price: validated.quantityPrice || 0,
      purchase_price: validated.purchasePrice,
      discount_type: validated.discountType || "percentage",
      sale_discount: validated.saleDiscount || 0,
      opening_stock: validated.stock,
      current_stock: validated.stock,
      min_stock: validated.minStock || 0,
      item_location: validated.itemLocation || null,
      per_carton_quantity: validated.perCartonQuantity || 1,
      warehouse_id: defaultWarehouseId,
      tax_rate: validated.taxRate || 0,
      inclusive_of_tax: validated.inclusiveOfTax || false,
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating item:", error)
    return { success: false, error: error.message }
  }

  if (newItem) {
    await createInitialWarehouseStockIfNeeded(supabase, organizationId, String(newItem.id), defaultWarehouseId, validated.stock)
  }

  revalidatePath("/items")
  return { success: true, item: newItem }
}

export async function updateItem(id: string, formData: FormData) {
  if (await isDemoMode()) throwDemoMutationError()
  const data = {
    name: formData.get("name"),
    itemCode: formData.get("itemCode"),
    description: formData.get("description"),
    category: formData.get("category"),
    hsnCode: formData.get("hsnCode"),
    salePrice: formData.get("salePrice"),
    wholesalePrice: formData.get("wholesalePrice"),
    quantityPrice: formData.get("quantityPrice"),
    purchasePrice: formData.get("purchasePrice"),
    discountType: formData.get("discountType"),
    saleDiscount: formData.get("saleDiscount"),
    barcodeNo: formData.get("barcodeNo"),
    unit: formData.get("unit"),
    conversionRate: formData.get("conversionRate"),
    alternateUnit: formData.get("alternateUnit"),
    packagingUnit: formData.get("packagingUnit"),
    mrp: formData.get("mrp"),
    stock: formData.get("stock"),
    stockEntryUnit: formData.get("stockEntryUnit"),
    minStock: formData.get("minStock"),
    maxStock: formData.get("maxStock"),
    itemLocation: formData.get("itemLocation"),
    perCartonQuantity: formData.get("perCartonQuantity"),
    godownId: formData.get("godownId"),
    taxRate: formData.get("taxRate"),
    inclusiveOfTax: formData.get("inclusiveOfTax"),
    gstRate: formData.get("gstRate"),
    cessRate: formData.get("cessRate"),
  }

  const validated = itemSchema.parse(data)

  const { supabase, organizationId } = await authorize("items", "update")
  const updatePayload: Record<string, unknown> = {
    item_code: validated.itemCode || null,
    name: validated.name,
    description: validated.description || null,
    category: validated.category || null,
    hsn: validated.hsnCode || null,
    unit: validated.unit || "PCS",
    packaging_unit: validated.packagingUnit || "CTN",
    sale_price: validated.salePrice,
    wholesale_price: validated.wholesalePrice || 0,
    quantity_price: validated.quantityPrice || 0,
    purchase_price: validated.purchasePrice,
    discount_type: validated.discountType || "percentage",
    sale_discount: validated.saleDiscount || 0,
    current_stock: validated.stock,
    min_stock: validated.minStock || 0,
    item_location: validated.itemLocation || null,
    per_carton_quantity: validated.perCartonQuantity || 1,
    warehouse_id: validated.godownId || null,
    tax_rate: validated.taxRate || 0,
    inclusive_of_tax: validated.inclusiveOfTax || false,
  }

  const barcode = String(validated.barcodeNo || "").trim()
  if (barcode) {
    updatePayload.barcode_no = barcode
  } else {
    const { data: existing, error: existingError } = await supabase
      .from("items")
      .select("barcode_no")
      .eq("id", id)
      .maybeSingle()

    if (existingError) {
      console.error("[Barcode] Failed to fetch existing barcode:", existingError.message || existingError)
    }

    const existingBarcode = String((existing as Record<string, unknown>)?.barcode_no ?? "").trim()
    if (!existingBarcode) {
      updatePayload.barcode_no = await generateNextNumericBarcode(supabase)
    }
  }

  const { error } = await supabase.from("items").update(updatePayload).eq("id", id).or(orgScope(organizationId))

  if (error) {
    console.error("[v0] Error updating item:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/items")
  return { success: true }
}

export async function deleteItem(id: string) {
  if (await isDemoMode()) throwDemoMutationError()
  const { supabase, organizationId } = await authorize("items", "delete")
  const { error } = await supabase
    .from("items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .or(orgScope(organizationId))

  if (error) {
    console.error("[v0] Error deleting item:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/items")
  return { success: true }
}

export async function bulkDeleteItems(ids: string[]) {
  if (await isDemoMode()) throwDemoMutationError()
  if (!ids || ids.length === 0) {
    return { success: false, error: "No items selected" }
  }

  const { supabase, organizationId } = await authorize("items", "delete")
  const { error, data } = await supabase
    .from("items")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids)
    .or(orgScope(organizationId))
    .is("deleted_at", null)
    .select("id")

  if (error) {
    console.error("[v0] Error bulk deleting items:", error)
    return { success: false, error: error.message }
  }

  const deleted = data?.length || ids.length
  revalidatePath("/items")
  return { 
    success: true, 
    deleted,
    message: `Successfully deleted ${deleted} item(s)` 
  }
}

export async function deleteAllItems() {
  if (await isDemoMode()) throwDemoMutationError()
  const { supabase, organizationId } = await authorize("items", "delete")
  
  const { count } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .or(orgScope(organizationId))
    .is("deleted_at", null)
  
  if (!count || count === 0) {
    return { success: false, error: "No items to delete" }
  }

  const { error } = await supabase
    .from("items")
    .update({ deleted_at: new Date().toISOString() })
    .or(orgScope(organizationId))
    .is("deleted_at", null)
    .neq("id", "00000000-0000-0000-0000-000000000000")

  if (error) {
    console.error("[v0] Error deleting all items:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/items")
  return { 
    success: true, 
    deleted: count,
    message: `Successfully deleted all ${count} item(s)` 
  }
}

export async function searchItems(query: string, limit = 30): Promise<IItem[]> {
  if (await isDemoMode()) return demoItems.filter(i => i.name.toLowerCase().includes(query.toLowerCase()) || (i.itemCode?.toLowerCase().includes(query.toLowerCase()) ?? false)).slice(0, limit)
  try {
    const { supabase, organizationId } = await authorize("items", "read")

    let itemsQuery = supabase
      .from("items")
      .select("*")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .limit(limit)

    if (query.trim()) {
      const sanitized = query.trim().replace(/[%.,()]/g, "")
      if (sanitized.length > 0) {
        itemsQuery = itemsQuery.or(
          `name.ilike.%${sanitized}%,item_code.ilike.%${sanitized}%,barcode_no.ilike.%${sanitized}%`
        )
      }
    }

    const { data, error } = await itemsQuery

    if (error || !data) return []

    const { data: allWarehouses } = await supabase
      .from("warehouses")
      .select("id, name")
      .eq("organization_id", organizationId)

    const godownNameById = new Map<string, string>()
    if (allWarehouses) {
      for (const wh of allWarehouses as Array<{ id: string; name: string }>) {
        godownNameById.set(wh.id, wh.name)
      }
    }

    return (data as Record<string, unknown>[]).map((item) => ({
      id: item.id as string,
      name: (item.name as string) || "",
      itemCode: (item.item_code as string) || "",
      barcodeNo: (item.barcode_no as string) || "",
      hsnCode: (item.hsn as string) || "",
      category: (item.category as string) || "",
      unit: (item.unit as string) || "PCS",
      packagingUnit: (item.packaging_unit as PackagingUnit) || undefined,
      perCartonQuantity: Number(item.per_carton_quantity) || 0,
      purchasePrice: Number(item.purchase_price) || 0,
      salePrice: Number(item.sale_price) || 0,
      conversionRate: 1,
      alternateUnit: undefined,
      wholesalePrice: Number(item.wholesale_price) || 0,
      quantityPrice: Number(item.quantity_price) || 0,
      mrp: Number(item.mrp) || Number(item.sale_price) || 0,
      discountType: "percentage" as const,
      saleDiscount: 0,
      gstRate: Number(item.tax_rate) || 0,
      taxRate: Number(item.tax_rate) || 0,
      cessRate: 0,
      inclusiveOfTax: false,
      stock: Number(item.current_stock) || 0,
      minStock: Number(item.min_stock) || 0,
      maxStock: Number(item.max_stock) || 0,
      itemLocation: (item.item_location as string) || undefined,
      godownId: (item.warehouse_id as string) || null,
      godownName: item.warehouse_id ? godownNameById.get(item.warehouse_id as string) || null : null,
      createdAt: new Date(item.created_at as string || Date.now()),
      updatedAt: new Date(item.updated_at as string || Date.now()),
    }))
  } catch {
    return []
  }
}
