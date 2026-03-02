"use server"

import { authorize, orgScope } from "@/lib/authorize"
import { isDemoMode } from "@/app/demo/helpers"
import { demoItems } from "@/app/demo/data"
import type { IItem, PackagingUnit } from "@/types"

export interface LightweightItem {
  readonly id: string
  readonly itemCode: string
  readonly name: string
  readonly category: string
  readonly hsnCode: string
  readonly barcodeNo: string
  readonly unit: string
  readonly packagingUnit: PackagingUnit
  readonly perCartonQuantity: number
  readonly purchasePrice: number
  readonly salePrice: number
  readonly wholesalePrice: number
  readonly quantityPrice: number
  readonly stock: number
  readonly minStock: number
  readonly gstRate: number
  readonly taxRate: number
  readonly cessRate: number
  readonly inclusiveOfTax: boolean
  readonly discountType: "percentage" | "flat"
  readonly saleDiscount: number
}

function toLightweightItem(item: Record<string, unknown>): LightweightItem {
  return {
    id: String(item.id || ""),
    itemCode: String(item.item_code || ""),
    name: String(item.name || ""),
    category: String(item.category || ""),
    hsnCode: String(item.hsn || ""),
    barcodeNo: String(item.barcode_no || ""),
    unit: String(item.unit || "PCS"),
    packagingUnit: (item.packaging_unit as PackagingUnit) || "CTN",
    perCartonQuantity: Number(item.per_carton_quantity) || 1,
    purchasePrice: Number(item.purchase_price) || 0,
    salePrice: Number(item.sale_price) || 0,
    wholesalePrice: Number(item.wholesale_price) || 0,
    quantityPrice: Number(item.quantity_price) || 0,
    stock: Number(item.current_stock) || 0,
    minStock: Number(item.min_stock) || 0,
    gstRate: Number(item.tax_rate) || 0,
    taxRate: Number(item.tax_rate) || 0,
    cessRate: 0,
    inclusiveOfTax: Boolean(item.inclusive_of_tax),
    discountType: (item.discount_type as "percentage" | "flat") || "percentage",
    saleDiscount: Number(item.sale_discount) || 0,
  }
}

function demoToLightweight(item: IItem): LightweightItem {
  return {
    id: item.id,
    itemCode: item.itemCode || "",
    name: item.name,
    category: item.category || "",
    hsnCode: item.hsnCode || "",
    barcodeNo: item.barcodeNo || "",
    unit: item.unit,
    packagingUnit: item.packagingUnit || "CTN",
    perCartonQuantity: item.perCartonQuantity || 1,
    purchasePrice: item.purchasePrice,
    salePrice: item.salePrice,
    wholesalePrice: item.wholesalePrice || 0,
    quantityPrice: item.quantityPrice || 0,
    stock: item.stock,
    minStock: item.minStock,
    gstRate: item.gstRate,
    taxRate: item.taxRate || item.gstRate,
    cessRate: item.cessRate,
    inclusiveOfTax: item.inclusiveOfTax || false,
    discountType: item.discountType || "percentage",
    saleDiscount: item.saleDiscount || 0,
  }
}

const LIGHTWEIGHT_SELECT = `
  id,
  item_code,
  name,
  category,
  hsn,
  barcode_no,
  unit,
  packaging_unit,
  per_carton_quantity,
  purchase_price,
  sale_price,
  wholesale_price,
  quantity_price,
  current_stock,
  min_stock,
  tax_rate,
  inclusive_of_tax,
  discount_type,
  sale_discount
`

export async function getItemsForInvoice(): Promise<LightweightItem[]> {
  if (await isDemoMode()) return demoItems.map(demoToLightweight)

  const { supabase, organizationId } = await authorize("items", "read")
  try {
    const allItems: Record<string, unknown>[] = []
    let offset = 0
    const pageSize = 1000

    while (true) {
      const { data, error } = await supabase
        .from("items")
        .select(LIGHTWEIGHT_SELECT)
        .or(orgScope(organizationId))
        .is("deleted_at", null)
        .order("name", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1)

      if (error) {
        console.error("[Items/Lightweight] Error fetching items:", error.message)
        break
      }

      if (!data || data.length === 0) break
      allItems.push(...data)
      if (data.length < pageSize) break
      offset += pageSize
    }

    return allItems.map(toLightweightItem)
  } catch {
    return []
  }
}
