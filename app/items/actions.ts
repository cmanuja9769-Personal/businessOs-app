"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { IItem } from "@/types"
import { itemSchema } from "@/lib/schemas"

export async function getItems(): Promise<IItem[]> {
  const supabase = await createClient()
  // Prefer fetching warehouse join (Godown), but fall back if the DB migration
  // adding `items.warehouse_id` hasn't been applied yet.
  let data: any[] | null = null
  let error: any = null

  const joined = await supabase
    .from("items")
    .select("*, warehouses!warehouse_id ( id, name )")
    .order("created_at", { ascending: false })

  data = joined.data as any
  error = joined.error as any

  if (error) {
    const code = error?.code
    const message = error?.message
    const details = error?.details
    const hint = error?.hint
    console.error("[v0] Error fetching items:", { code, message, details, hint })

    // Fallback query without join (keeps the app functional until migration is applied)
    const fallback = await supabase.from("items").select("*").order("created_at", { ascending: false })
    if (fallback.error) {
      const fe = fallback.error as any
      console.error("[v0] Error fetching items (fallback):", {
        code: fe?.code,
        message: fe?.message,
        details: fe?.details,
        hint: fe?.hint,
      })
      return []
    }
    data = fallback.data as any
  }

  if (!data) {
    return []
  }

  return (
    data?.map((item) => ({
      id: item.id,
      itemCode: item.item_code || "",
      name: item.name,
      category: item.category || "",
      hsnCode: item.hsn || "",
      salePrice: Number(item.sale_price) || 0,
      wholesalePrice: Number(item.wholesale_price) || 0,
      quantityPrice: Number(item.quantity_price) || 0,
      purchasePrice: Number(item.purchase_price) || 0,
      discountType: (item.discount_type as "percentage" | "flat") || "percentage",
      saleDiscount: Number(item.sale_discount) || 0,
      barcodeNo: item.barcode_no || item.item_code || "",
      unit: "PCS",
      conversionRate: 1,
      alternateUnit: undefined,
      mrp: Number(item.sale_price) || 0,
      stock: item.current_stock || 0,
      minStock: item.min_stock || 0,
      maxStock: (item.current_stock || 0) + 100,
      itemLocation: item.item_location || "",
      perCartonQuantity: item.per_carton_quantity || undefined,
      godownId: item.warehouse_id || null,
      godownName: item.warehouses?.name || null,
      taxRate: Number(item.tax_rate) || 0,
      inclusiveOfTax: item.inclusive_of_tax || false,
      gstRate: Number(item.tax_rate) || 0,
      cessRate: 0,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
    })) || []
  )
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

export async function bulkImportItems(itemsData: IItem[]) {
  const supabase = await createClient()

  // Separate items into new and existing based on ID
  const existingItems = itemsData.filter((item) => item.id && item.id.length > 10) // UUID length check
  const newItems = itemsData.filter((item) => !item.id || item.id.length <= 10)

  let insertCount = 0
  let updateCount = 0
  const errors: string[] = []

  // Handle updates for existing items
  if (existingItems.length > 0) {
    for (const item of existingItems) {
      const { error } = await supabase
        .from("items")
        .update({
          item_code: item.itemCode || null,
          name: item.name,
          category: item.category || null,
          hsn: item.hsnCode || null,
          sale_price: item.salePrice,
          wholesale_price: item.wholesalePrice || 0,
          quantity_price: item.quantityPrice || 0,
          purchase_price: item.purchasePrice,
          discount_type: item.discountType || "percentage",
          sale_discount: item.saleDiscount || 0,
          current_stock: item.stock,
          min_stock: item.minStock || 0,
          item_location: item.itemLocation || null,
          per_carton_quantity: item.perCartonQuantity || null,
          warehouse_id: item.godownId || null,
          tax_rate: item.taxRate || item.gstRate || 0,
          inclusive_of_tax: item.inclusiveOfTax || false,
        })
        .eq("id", item.id)

      if (error) {
        errors.push(`Failed to update item ${item.name}: ${error.message}`)
      } else {
        updateCount++
      }
    }
  }

  // Handle inserts for new items
  if (newItems.length > 0) {
    const records = newItems.map((item) => ({
      item_code: item.itemCode || null,
      name: item.name,
      category: item.category || null,
      hsn: item.hsnCode || null,
      sale_price: item.salePrice,
      wholesale_price: item.wholesalePrice || 0,
      quantity_price: item.quantityPrice || 0,
      purchase_price: item.purchasePrice,
      discount_type: item.discountType || "percentage",
      sale_discount: item.saleDiscount || 0,
      opening_stock: item.stock,
      current_stock: item.stock,
      min_stock: item.minStock || 0,
      item_location: item.itemLocation || null,
      per_carton_quantity: item.perCartonQuantity || null,
      warehouse_id: item.godownId || null,
      tax_rate: item.taxRate || item.gstRate || 0,
      inclusive_of_tax: item.inclusiveOfTax || false,
    }))

    const { error } = await supabase.from("items").insert(records)

    if (error) {
      console.error("[v0] Error bulk importing items:", error)
      return { success: false, error: error.message }
    }

    insertCount = newItems.length
  }

  revalidatePath("/items")

  if (errors.length > 0) {
    return {
      success: false,
      error: `Completed with errors. Inserted: ${insertCount}, Updated: ${updateCount}, Errors: ${errors.length}`,
      details: errors,
    }
  }

  return {
    success: true,
    inserted: insertCount,
    updated: updateCount,
    message: `Successfully imported ${insertCount + updateCount} items (${insertCount} new, ${updateCount} updated)`,
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
