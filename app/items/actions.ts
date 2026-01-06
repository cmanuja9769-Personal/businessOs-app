"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { IItem } from "@/types"
import { itemSchema } from "@/lib/schemas"

export async function getItems(): Promise<IItem[]> {
  const supabase = await createClient()
  // Supabase PostgREST enforces a 1000-row limit per request.
  // Fetch all items by batching requests in 1000-row chunks.
  try {
    const allData: Record<string, unknown>[] = []
    let offset = 0
    const pageSize = 1000

    // Keep fetching until we get fewer items than the page size (indicating end of data)
    while (true) {
      const itemsRes = await supabase
        .from("items")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (itemsRes.error) {
        console.error("[Items] Critical: query failed:", itemsRes.error.message || itemsRes.error)
        break
      }

      const data = (itemsRes.data as Record<string, unknown>[]) || []
      
      if (data.length === 0) {
        break // No more data
      }

      allData.push(...data)
      console.warn(`[Items] Fetched batch: offset=${offset}, items=${data.length}, total=${allData.length}`)

      if (data.length < pageSize) {
        break // Last batch, fewer items than page size
      }

      offset += pageSize
    }

    console.warn(`[Items] API returned ${allData.length} items total (batched fetch)`)

    if (!allData || allData.length === 0) {
      return []
    }

    // Batch lookup: get all unique godown IDs from items
    const godownIds = Array.from(
      new Set(
        allData
          .map((item) => item?.warehouse_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      )
    )

    const godownNameById = new Map<string, string>()
    if (godownIds.length > 0) {
      const godownsRes = await supabase.from("godowns").select("id, name").in("id", godownIds)
      if (!godownsRes.error && godownsRes.data) {
        for (const godown of godownsRes.data as Record<string, unknown>[]) {
          if (godown?.id && typeof godown?.name === "string") {
            godownNameById.set(godown.id as string, godown.name)
          }
        }
      }
    }

    const mappedItems = (
      allData?.map((item) => ({
        id: String(item.id) || "",
        itemCode: String(item.item_code) || "",
        name: String(item.name) || "",
        description: String(item.description) || "",
        category: String(item.category) || "",
        hsnCode: String(item.hsn) || "",
        salePrice: Number(item.sale_price) || 0,
        wholesalePrice: Number(item.wholesale_price) || 0,
        quantityPrice: Number(item.quantity_price) || 0,
        purchasePrice: Number(item.purchase_price) || 0,
        discountType: (item.discount_type as "percentage" | "flat") || "percentage",
        saleDiscount: Number(item.sale_discount) || 0,
        barcodeNo: String(item.barcode_no || item.item_code || ""),
        unit: "PCS",
        conversionRate: 1,
        alternateUnit: undefined,
        mrp: Number(item.sale_price) || 0,
        stock: Number(item.current_stock) || 0,
        minStock: Number(item.min_stock) || 0,
        maxStock: (Number(item.current_stock) || 0) + 100,
        itemLocation: String(item.item_location) || "",
        perCartonQuantity: Number(item.per_carton_quantity) || undefined,
        godownId: String(item.warehouse_id) || null,
        godownName: godownNameById.get(String(item.warehouse_id)) || null,
        taxRate: Number(item.tax_rate) || 0,
        inclusiveOfTax: Boolean(item.inclusive_of_tax) || false,
        gstRate: Number(item.tax_rate) || 0,
        cessRate: 0,
        createdAt: new Date(String(item.created_at)),
        updatedAt: new Date(String(item.updated_at)),
      })) || []
    )

    console.warn(`[Items] Successfully processed ${mappedItems.length} items from database`)
    return mappedItems
  } catch (error) {
    console.error("[Items] Unexpected error during fetch:", error)
    return []
  }
}

export async function createItem(formData: FormData) {
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
    mrp: formData.get("mrp"),
    stock: formData.get("stock"),
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

  const supabase = await createClient()
  
  // Generate a sequential numeric barcode if not provided
  let barcodeNo = validated.barcodeNo
  if (!barcodeNo) {
    // Get the count of items to generate next barcode number
    const { count } = await supabase.from("items").select("*", { count: "exact", head: true })
    const nextNumber = (count || 0) + 1
    // Generate 13-digit barcode (EAN-13 format): prefix 200 + 10 digits
    barcodeNo = `200${nextNumber.toString().padStart(10, "0")}`
  }

  const { data: newItem, error } = await supabase
    .from("items")
    .insert({
      item_code: validated.itemCode || null,
      name: validated.name,
      description: validated.description || null,
      category: validated.category || null,
      hsn: validated.hsnCode || null,
      barcode_no: barcodeNo,
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
      per_carton_quantity: validated.perCartonQuantity || null,
      warehouse_id: validated.godownId || null,
      tax_rate: validated.taxRate || 0,
      inclusive_of_tax: validated.inclusiveOfTax || false,
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating item:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/items")
  return { success: true, item: newItem }
}

export async function updateItem(id: string, formData: FormData) {
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
    mrp: formData.get("mrp"),
    stock: formData.get("stock"),
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

  const supabase = await createClient()
  const { error } = await supabase
    .from("items")
    .update({
      item_code: validated.itemCode || null,
      name: validated.name,
      description: validated.description || null,
      category: validated.category || null,
      hsn: validated.hsnCode || null,
      sale_price: validated.salePrice,
      wholesale_price: validated.wholesalePrice || 0,
      quantity_price: validated.quantityPrice || 0,
      purchase_price: validated.purchasePrice,
      discount_type: validated.discountType || "percentage",
      sale_discount: validated.saleDiscount || 0,
      current_stock: validated.stock,
      min_stock: validated.minStock || 0,
      item_location: validated.itemLocation || null,
      per_carton_quantity: validated.perCartonQuantity || null,
      warehouse_id: validated.godownId || null,
      tax_rate: validated.taxRate || 0,
      inclusive_of_tax: validated.inclusiveOfTax || false,
    })
    .eq("id", id)

  if (error) {
    console.error("[v0] Error updating item:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/items")
  return { success: true }
}

export async function deleteItem(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("items").delete().eq("id", id)

  if (error) {
    console.error("[v0] Error deleting item:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/items")
  return { success: true }
}

export async function bulkDeleteItems(ids: string[]) {
  if (!ids || ids.length === 0) {
    return { success: false, error: "No items selected" }
  }

  const supabase = await createClient()
  const { error, count } = await supabase
    .from("items")
    .delete()
    .in("id", ids)
    .select()

  if (error) {
    console.error("[v0] Error bulk deleting items:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/items")
  return { 
    success: true, 
    deleted: count || ids.length,
    message: `Successfully deleted ${count || ids.length} item(s)` 
  }
}

export async function deleteAllItems() {
  const supabase = await createClient()
  
  // Get count first for confirmation
  const { count } = await supabase
    .from("items")
    .select("*", { count: "exact", head: true })
  
  if (!count || count === 0) {
    return { success: false, error: "No items to delete" }
  }

  const { error } = await supabase
    .from("items")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000") // Delete all except impossible ID

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

export async function bulkImportItems(itemsData: IItem[]) {
  if (!itemsData || itemsData.length === 0) {
    return { success: false, error: "No items to import" }
  }

  console.error(`[BULK IMPORT] Starting import of ${itemsData.length} items`)

  const supabase = await createClient()
  const errors: string[] = []
  let insertCount = 0
  let updateCount = 0

  // Helper to check if ID is a valid UUID (36 chars, contains hyphens in right places)
  const isValidUUID = (id: string): boolean => {
    if (!id || typeof id !== "string") return false
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  }

  // Separate items into new and existing based on ID
  const existingItems = itemsData.filter((item) => item.id && isValidUUID(item.id))
  const newItems = itemsData.filter((item) => !item.id || !isValidUUID(item.id))

  console.error(`[BULK IMPORT] Existing items: ${existingItems.length}, New items: ${newItems.length}`)

  // Helper function to generate item code if missing
  const generateItemCode = (name: string, index: number): string => {
    if (!name) return `ITEM-${Date.now()}-${index}`
    // Create code from first 3 letters of name + timestamp + index
    const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '')
    return `${prefix}-${Date.now()}-${index}`.substring(0, 20)
  }

  // Helper function to safely parse per carton quantity
  const parsePerCartonQuantity = (value: unknown): number | null => {
    if (value === null || value === undefined) return null
    const num = Number(value)
    if (isNaN(num) || num <= 0) return null
    return num
  }

  // Handle updates for existing items
  if (existingItems.length > 0) {
    console.error(`[BULK IMPORT] Processing ${existingItems.length} updates...`)
    for (const item of existingItems) {
      try {
        const { error } = await supabase
          .from("items")
          .update({
            item_code: item.itemCode && item.itemCode.trim() ? item.itemCode : null,
            name: item.name,
            description: item.description && item.description.trim() ? item.description : null,
            category: item.category && item.category.trim() ? item.category : null,
            hsn: item.hsnCode && item.hsnCode.trim() ? item.hsnCode : null,
            barcode_no: item.barcodeNo && item.barcodeNo.trim() ? item.barcodeNo : null,
            sale_price: Number(item.salePrice) || 0,
            wholesale_price: Number(item.wholesalePrice) || 0,
            quantity_price: Number(item.quantityPrice) || 0,
            purchase_price: Number(item.purchasePrice) || 0,
            discount_type: item.discountType || "percentage",
            sale_discount: Number(item.saleDiscount) || 0,
            current_stock: Number(item.stock) || 0,
            min_stock: Number(item.minStock) || 0,
            item_location: item.itemLocation && item.itemLocation.trim() ? item.itemLocation : null,
            per_carton_quantity: parsePerCartonQuantity(item.perCartonQuantity),
            warehouse_id: item.godownId || null,
            tax_rate: Number(item.taxRate || item.gstRate) || 18,
            inclusive_of_tax: Boolean(item.inclusiveOfTax) || false,
          })
          .eq("id", item.id)

        if (error) {
          const errorMsg = `Update failed for item "${item.name}": ${error.message}`
          console.error(`[BULK IMPORT] ${errorMsg}`)
          errors.push(errorMsg)
        } else {
          updateCount++
        }
      } catch (err) {
        const errorMsg = `Update error for item "${item.name}": ${err instanceof Error ? err.message : "Unknown error"}`
        console.error(`[BULK IMPORT] ${errorMsg}`)
        errors.push(errorMsg)
      }
    }
    console.error(`[BULK IMPORT] Updates completed: ${updateCount} successful, ${existingItems.length - updateCount} failed`)
  }

  // Handle inserts for new items in smaller batches
  if (newItems.length > 0) {
    console.error(`[BULK IMPORT] Processing ${newItems.length} inserts...`)
    const BATCH_SIZE = 100 // Smaller batch size for inserts

    for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
      const batch = newItems.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(newItems.length / BATCH_SIZE)

      console.error(`[BULK IMPORT] Processing insert batch ${batchNum}/${totalBatches} (${batch.length} items)`)

      try {
        const records = batch.map((item, index) => ({
          item_code: item.itemCode && item.itemCode.trim() ? item.itemCode : generateItemCode(item.name, i + index),
          name: item.name,
          description: item.description && item.description.trim() ? item.description : null,
          category: item.category && item.category.trim() ? item.category : null,
          hsn: item.hsnCode && item.hsnCode.trim() ? item.hsnCode : null,
          barcode_no: item.barcodeNo && item.barcodeNo.trim() ? item.barcodeNo : null,
          sale_price: Number(item.salePrice) || 0,
          wholesale_price: Number(item.wholesalePrice) || 0,
          quantity_price: Number(item.quantityPrice) || 0,
          purchase_price: Number(item.purchasePrice) || 0,
          discount_type: item.discountType || "percentage",
          sale_discount: Number(item.saleDiscount) || 0,
          opening_stock: Number(item.stock) || 0,
          current_stock: Number(item.stock) || 0,
          min_stock: Number(item.minStock) || 0,
          item_location: item.itemLocation && item.itemLocation.trim() ? item.itemLocation : null,
          per_carton_quantity: parsePerCartonQuantity(item.perCartonQuantity),
          warehouse_id: item.godownId || null,
          tax_rate: Number(item.taxRate || item.gstRate) || 18,
          inclusive_of_tax: Boolean(item.inclusiveOfTax) || false,
        }))

        const { error } = await supabase.from("items").insert(records)

        if (error) {
          const errorMsg = `Batch ${batchNum} insert failed: ${error.message}`
          console.error(`[BULK IMPORT] ${errorMsg}`)
          errors.push(errorMsg)
          
          // Try individual inserts as fallback
          console.error(`[BULK IMPORT] Attempting individual inserts for batch ${batchNum}...`)
          for (const record of records) {
            try {
              const { error: individualError } = await supabase.from("items").insert([record])
              if (individualError) {
                errors.push(`Individual insert failed for "${record.name}": ${individualError.message}`)
              } else {
                insertCount++
              }
            } catch (individualErr) {
              errors.push(`Individual insert error for "${record.name}": ${individualErr instanceof Error ? individualErr.message : "Unknown"}`)
            }
          }
        } else {
          insertCount += batch.length
          console.error(`[BULK IMPORT] Batch ${batchNum} succeeded (${batch.length} items)`)
        }
      } catch (err) {
        const errorMsg = `Batch ${batchNum} error: ${err instanceof Error ? err.message : "Unknown error"}`
        console.error(`[BULK IMPORT] ${errorMsg}`)
        errors.push(errorMsg)
      }
    }
    console.error(`[BULK IMPORT] Inserts completed: ${insertCount} successful`)
  }

  revalidatePath("/items")

  console.error(`[BULK IMPORT] Import complete. Inserted: ${insertCount}, Updated: ${updateCount}, Errors: ${errors.length}`)

  if (errors.length > 0) {
    return {
      success: insertCount + updateCount > 0, // Partial success if some items were imported
      inserted: insertCount,
      updated: updateCount,
      error: `Completed with issues. Imported: ${insertCount + updateCount}/${itemsData.length}. Errors: ${errors.length}`,
      details: errors.slice(0, 50), // Send first 50 errors
    }
  }

  return {
    success: true,
    inserted: insertCount,
    updated: updateCount,
    message: `✅ Successfully imported ${insertCount + updateCount} items (${insertCount} new, ${updateCount} updated)`,
  }
}

export async function updateStock(id: string, quantity: number) {
  const supabase = await createClient()

  const { data: item } = await supabase.from("items").select("current_stock").eq("id", id).single()

  if (!item) return { success: false, error: "Item not found" }

  const { error } = await supabase
    .from("items")
    .update({ current_stock: item.current_stock + quantity })
    .eq("id", id)

  if (error) {
    console.error("[v0] Error updating stock:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/items")
  return { success: true }
}
