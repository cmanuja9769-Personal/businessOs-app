"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { IItem } from "@/types"
import { itemSchema } from "@/lib/schemas"

export async function getItems(): Promise<IItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("items").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching items:", error)
    return []
  }

  return (
    data?.map((item) => ({
      id: item.id,
      itemCode: item.item_code,
      name: item.name,
      category: item.category,
      hsnCode: item.hsn,
      salePrice: Number(item.sale_price),
      wholesalePrice: Number(item.wholesale_price),
      quantityPrice: Number(item.quantity_price),
      purchasePrice: Number(item.purchase_price),
      discountType: item.discount_type as "percentage" | "flat",
      saleDiscount: Number(item.sale_discount),
      barcodeNo: item.item_code,
      unit: "PCS",
      conversionRate: 1,
      alternateUnit: undefined,
      mrp: Number(item.sale_price),
      stock: item.current_stock,
      minStock: item.min_stock,
      maxStock: item.current_stock + 100,
      itemLocation: item.item_location,
      taxRate: Number(item.tax_rate),
      inclusiveOfTax: item.inclusive_of_tax,
      gstRate: Number(item.tax_rate),
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
    taxRate: formData.get("taxRate"),
    inclusiveOfTax: formData.get("inclusiveOfTax"),
    gstRate: formData.get("gstRate"),
    cessRate: formData.get("cessRate"),
  }

  const validated = itemSchema.parse(data)

  const supabase = await createClient()
  const { data: newItem, error } = await supabase
    .from("items")
    .insert({
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
      opening_stock: validated.stock,
      current_stock: validated.stock,
      min_stock: validated.minStock || 0,
      item_location: validated.itemLocation || null,
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

  const records = itemsData.map((item) => ({
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
    tax_rate: item.taxRate || 0,
    inclusive_of_tax: item.inclusiveOfTax || false,
  }))

  const { error } = await supabase.from("items").insert(records)

  if (error) {
    console.error("[v0] Error bulk importing items:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/items")
  return { success: true, count: itemsData.length }
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
