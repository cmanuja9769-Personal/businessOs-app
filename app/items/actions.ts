"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { IItem } from "@/types"
import { itemSchema } from "@/lib/schemas"

async function generateNextNumericBarcode(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  // Desired format: 13-digit numeric code starting with 200 (EAN-13-like internal range)
  const PREFIX = "200"
  const FALLBACK_BASE = BigInt(2000000000000) // 13 digits

  try {
    const pageSize = 1000
    let offset = 0
    let maxBarcode = FALLBACK_BASE

    // Paginate through matching barcode rows and compute numeric max using BigInt
    while (true) {
      const res = await supabase
        .from("items")
        .select("barcode_no")
        .like("barcode_no", `${PREFIX}%`)
        .not("barcode_no", "is", null)
        .range(offset, offset + pageSize - 1)

      if (res.error) {
        console.error("[Barcode] Failed to fetch barcodes for max computation:", res.error.message || res.error)
        break
      }

      const rows = (res.data as Array<any>) || []
      if (rows.length === 0) break

      for (const r of rows) {
        const val = String(r?.barcode_no ?? "").trim()
        if (!/^\d+$/.test(val)) continue
        try {
          const n = BigInt(val)
          if (n > maxBarcode) maxBarcode = n
        } catch (e) {
          // ignore unparsable values
        }
      }

      if (rows.length < pageSize) break
      offset += pageSize
    }

    // next candidate
    let nextNumber = maxBarcode + BigInt(1)

    // Keep generating and checking collisions to avoid races
    for (let attempt = 0; attempt < 50; attempt++) {
      const candidate = String(nextNumber).padStart(13, "0")
      if (!candidate.startsWith(PREFIX)) {
        nextNumber = FALLBACK_BASE + BigInt(1)
        continue
      }

      const { data: exists, error: existsError } = await supabase
        .from("items")
        .select("id")
        .eq("barcode_no", candidate)
        .limit(1)

      if (existsError) {
        console.error("[Barcode] Failed to check barcode collision:", existsError.message || existsError)
        // Best effort: still return candidate
        return candidate
      }

      if (!exists || (Array.isArray(exists) && exists.length === 0)) {
        return candidate
      }

      nextNumber = nextNumber + BigInt(1)
    }

    // Worst-case fallback
    return String(nextNumber).padStart(13, "0")
  } catch (err) {
    console.error("[Barcode] Unexpected error generating barcode:", err)
    return String(FALLBACK_BASE + BigInt(1)).padStart(13, "0")
  }
}

export async function assignBarcodeToItem(id: string) {
  const supabase = await createClient()

  try {
    const { data: existing, error: existingError } = await supabase
      .from("items")
      .select("barcode_no")
      .eq("id", id)
      .maybeSingle()

    if (existingError) {
      console.error("[Barcode] Failed to fetch item for assignment:", existingError.message || existingError)
      return { success: false, error: existingError.message || "DB error" }
    }

    const existingBarcode = String((existing as any)?.barcode_no ?? "").trim()
    if (existingBarcode) {
      return { success: true, barcode: existingBarcode }
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = await generateNextNumericBarcode(supabase)

      const { data: updated, error: updateError } = await supabase
        .from("items")
        .update({ barcode_no: candidate })
        .eq("id", id)
        .select()
        .maybeSingle()

      if (!updateError) {
        try { revalidatePath("/items") } catch {}
        return { success: true, barcode: candidate, item: updated }
      }

      const msg = String(updateError?.message || "")
      const isUniqueViolation = msg.toLowerCase().includes("unique") || String(updateError?.code) === "23505"

      console.error(`[Barcode] Failed to assign barcode (attempt ${attempt}):`, updateError.message || updateError)

      if (!isUniqueViolation) {
        return { success: false, error: updateError.message || "Update failed" }
      }
      // Else retry (another process may have taken the candidate)
    }

    return { success: false, error: "Failed to assign unique barcode after multiple attempts" }
  } catch (err) {
    console.error("[Barcode] Unexpected error assigning barcode:", err)
    return { success: false, error: String(err) }
  }
}

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
        // IMPORTANT: do not fall back to item_code.
        // If barcode_no is null, show empty so we don't accidentally save item_code as barcode.
        barcodeNo: String(item.barcode_no || ""),
        unit: String(item.unit) || "PCS",
        packagingUnit: String(item.packaging_unit || "CTN"),
        conversionRate: 1,
        alternateUnit: undefined,
        mrp: Number(item.sale_price) || 0,
        stock: Number(item.current_stock) || 0,
        minStock: Number(item.min_stock) || 0,
        maxStock: (Number(item.current_stock) || 0) + 100,
        itemLocation: String(item.item_location) || "",
        perCartonQuantity: Number(item.per_carton_quantity) || 1,
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

  const supabase = await createClient()
  
  // Generate a sequential numeric barcode if not provided
  let barcodeNo = validated.barcodeNo
  if (!barcodeNo) {
    barcodeNo = await generateNextNumericBarcode(supabase)
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

  const supabase = await createClient()
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
    // If the item currently has no barcode in DB, auto-assign one.
    // (If it already has a barcode, keep it unchanged.)
    const { data: existing, error: existingError } = await supabase
      .from("items")
      .select("barcode_no")
      .eq("id", id)
      .maybeSingle()

    if (existingError) {
      console.error("[Barcode] Failed to fetch existing barcode:", existingError.message || existingError)
    }

    const existingBarcode = String((existing as any)?.barcode_no ?? "").trim()
    if (!existingBarcode) {
      updatePayload.barcode_no = await generateNextNumericBarcode(supabase)
    }
  }

  const { error } = await supabase.from("items").update(updatePayload).eq("id", id)

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

  // ⚠️ TEMPORARY MODIFICATION: Robust matching for bulk updates
  // Match primarily by item name; use category and/or per-carton quantity only to disambiguate.
  // This avoids hard AND matching (name+category) which often fails due to formatting differences.
  console.error(`[BULK IMPORT] Using robust matching (name-first, then category/per-carton as tie-breakers) (TEMPORARY MODE)`)

  // Debug: print normalized keys and candidates for the first few problematic rows.
  // Keeps logs readable while still letting you spot why certain rows don't match.
  const DEBUG_MATCHING = true
  const DEBUG_MAX = 30
  let debugCount = 0
  const debugBlocks: string[] = []

  type DbMatchItem = {
    id: string
    name: string | null
    category: string | null
    per_carton_quantity?: number | null
  }

  const canonicalizeText = (value: unknown): string => {
    return String(value ?? "")
      .toLowerCase()
      .trim()
      .replace(/&+/g, "and")
      // normalize common unit words/abbreviations
      .replace(/\bpce\b/g, "pcs")
      .replace(/\bpc\b/g, "pcs")
      .replace(/\bpcs\b/g, "pcs")
      .replace(/\bcms\b/g, "cm")
  }

  const normalizeKey = (value: unknown): string => {
    return canonicalizeText(value).replace(/[^a-z0-9]+/g, "")
  }

  // Relaxed normalization used ONLY as a fallback when strict matching finds no candidates.
  // Intended to handle cases where DB names contain extra suffix descriptors like "160 Shots".
  const normalizeKeyRelaxed = (value: unknown): string => {
    return canonicalizeText(value)
      .replace(/\b\d+\s*(shots?|shot)\b/g, "")
      .replace(/\bshots?\b/g, "")
      .replace(/[^a-z0-9]+/g, "")
  }

  const normalizePerCartonKey = (value: unknown): string => {
    if (value === null || value === undefined || value === "") return ""
    const num = Number(value)
    if (!Number.isFinite(num)) return ""
    return String(num)
  }

  // Fetch ALL existing items from database for matching.
  // Supabase/PostgREST enforces a 1000-row limit per request, so we must batch.
  const dbItems: DbMatchItem[] = []
  const pageSize = 1000
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from("items")
      .select("id, name, category, per_carton_quantity")
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.error(`[BULK IMPORT] Failed to fetch existing items (offset=${offset}): ${error.message}`)
      return { success: false, error: `Failed to fetch existing items: ${error.message}` }
    }

    const batch = ((data as DbMatchItem[]) || []).filter((x) => x && typeof x.id === "string")
    if (batch.length === 0) break

    dbItems.push(...batch)
    if (batch.length < pageSize) break
    offset += pageSize
  }

  // Index by name-key for fast candidate lookup
  const byNameKey = new Map<string, DbMatchItem[]>()
  const byNameKeyRelaxed = new Map<string, DbMatchItem[]>()
  for (const dbItem of dbItems) {
    const nameKey = normalizeKey(dbItem.name)
    if (!nameKey) continue
    const bucket = byNameKey.get(nameKey)
    if (bucket) bucket.push(dbItem)
    else byNameKey.set(nameKey, [dbItem])

    const relaxedKey = normalizeKeyRelaxed(dbItem.name)
    if (relaxedKey) {
      const relaxedBucket = byNameKeyRelaxed.get(relaxedKey)
      if (relaxedBucket) relaxedBucket.push(dbItem)
      else byNameKeyRelaxed.set(relaxedKey, [dbItem])
    }
  }

  console.error(`[BULK IMPORT] Loaded ${dbItems.length} items (${byNameKey.size} strict keys, ${byNameKeyRelaxed.size} relaxed keys) for matching`)

  // Process each item from upload and match by name+category
  const itemsToUpdateById = new Map<string, {id: string, itemCode: string | null, unit: string, description: string | null}>()
  
  const formatCandidate = (c: DbMatchItem) => {
    return {
      id: c.id,
      name: String(c.name ?? ""),
      nameKey: normalizeKey(c.name),
      category: String(c.category ?? ""),
      categoryKey: normalizeKey(c.category),
      perCarton: c.per_carton_quantity ?? null,
    }
  }

  const debugMismatch = (payload: {
    item: IItem
    reason: string
    nameKey: string
    categoryKey: string
    perCartonKey: string
    candidates: DbMatchItem[]
  }) => {
    if (!DEBUG_MATCHING) return
    if (debugCount >= DEBUG_MAX) return
    debugCount++

    const { item, reason, nameKey, categoryKey, perCartonKey, candidates } = payload
    console.warn(`[BULK IMPORT][DEBUG ${debugCount}/${DEBUG_MAX}] ${reason}`)
    console.warn(`[BULK IMPORT][DEBUG] raw: name="${String(item.name ?? "")}", category="${String(item.category ?? "")}", perCarton="${String(item.perCartonQuantity ?? "")}"`)
    console.warn(`[BULK IMPORT][DEBUG] keys: nameKey="${nameKey}", categoryKey="${categoryKey}", perCartonKey="${perCartonKey}"`)
    if (candidates.length > 0) {
      console.warn(`[BULK IMPORT][DEBUG] candidates (${candidates.length}):`, candidates.slice(0, 10).map(formatCandidate))
      if (candidates.length > 10) {
        console.warn(`[BULK IMPORT][DEBUG] (showing first 10 candidates)`)
      }
    }

    try {
      const candidatesFormatted = candidates.slice(0, 10).map(formatCandidate)
      const block = [
        `[BULK IMPORT][DEBUG ${debugCount}/${DEBUG_MAX}] ${reason}`,
        `raw: name="${String(item.name ?? "")}", category="${String(item.category ?? "")}", perCarton="${String(item.perCartonQuantity ?? "")}"`,
        `keys: nameKey="${nameKey}", categoryKey="${categoryKey}", perCartonKey="${perCartonKey}"`,
        candidates.length > 0
          ? `candidates (${candidates.length}) first ${Math.min(10, candidates.length)}: ${JSON.stringify(candidatesFormatted, null, 2)}`
          : `candidates (0)`
      ].join("\n")
      debugBlocks.push(block)
    } catch {
      // Best-effort only; never fail import for debug serialization.
    }
  }

  const resolveMatch = (item: IItem): { matches?: DbMatchItem[]; reason?: string; debug?: { nameKey: string; categoryKey: string; perCartonKey: string; candidates: DbMatchItem[]; keyType: "strict" | "relaxed" } } => {
    const strictNameKey = normalizeKey(item.name)
    const categoryKey = normalizeKey(item.category)
    const perCartonKey = normalizePerCartonKey(item.perCartonQuantity)

    if (!strictNameKey) {
      return { reason: "Missing name", debug: { nameKey: strictNameKey, categoryKey, perCartonKey, candidates: [], keyType: "strict" } }
    }

    let keyType: "strict" | "relaxed" = "strict"
    let nameKeyForDebug = strictNameKey

    let candidates = byNameKey.get(strictNameKey) || []
    if (candidates.length === 0) {
      const relaxedKey = normalizeKeyRelaxed(item.name)
      if (relaxedKey) {
        candidates = byNameKeyRelaxed.get(relaxedKey) || []
        if (candidates.length > 0) {
          keyType = "relaxed"
          nameKeyForDebug = relaxedKey
        }
      }
    }

    if (candidates.length === 0) {
      return { reason: "No name match", debug: { nameKey: nameKeyForDebug, categoryKey, perCartonKey, candidates: [], keyType } }
    }
    if (candidates.length === 1) {
      return { matches: [candidates[0]] }
    }

    let filtered = candidates
    if (categoryKey) {
      const byCategory = filtered.filter((c) => normalizeKey(c.category) === categoryKey)
      if (byCategory.length === 1) return { matches: [byCategory[0]] }
      if (byCategory.length > 1) filtered = byCategory
    }

    if (perCartonKey) {
      const byPerCarton = filtered.filter((c) => normalizePerCartonKey(c.per_carton_quantity) === perCartonKey)
      if (byPerCarton.length === 1) return { matches: [byPerCarton[0]] }
      if (byPerCarton.length > 1) filtered = byPerCarton
    }

    // If multiple candidates remain but they are true duplicates (same normalized name/category/perCarton),
    // update all of them (safe for unit/description/item_code syncing).
    const signature = (c: DbMatchItem) => {
      return `${normalizeKey(c.name)}|${normalizeKey(c.category)}|${normalizePerCartonKey(c.per_carton_quantity)}`
    }
    const sigs = new Set(filtered.map(signature))
    if (sigs.size === 1) {
      return { matches: filtered }
    }

    return {
      reason: `Ambiguous match (candidates=${filtered.length})`,
      debug: { nameKey: nameKeyForDebug, categoryKey, perCartonKey, candidates: filtered, keyType },
    }
  }

  for (const item of itemsData) {
    const { matches, reason, debug } = resolveMatch(item)

    if (matches && matches.length > 0) {
      // Item(s) found - prepare update for item_code, unit, and description
      const descriptionValue = item.description && item.description.trim() ? item.description.trim() : null
      const itemCodeValue = item.itemCode && item.itemCode.trim() ? item.itemCode.trim() : null

      for (const m of matches) {
        if (!m?.id) continue
        itemsToUpdateById.set(m.id, {
          id: m.id,
          itemCode: itemCodeValue,
          unit: String(item.unit || "PCS"),
          description: descriptionValue,
        })
      }

      if (matches.length === 1) {
        console.error(`[BULK IMPORT] Matched "${item.name}" (${item.category || ""}) -> ID: ${matches[0].id}`)
      } else {
        console.warn(`[BULK IMPORT] Matched duplicates for "${item.name}" (${item.category || ""}) -> IDs: ${matches.map((m) => m.id).join(", ")}`)
      }
    } else {
      errors.push(`No unique match for "${item.name}" (category="${item.category || ""}", perCarton="${String(item.perCartonQuantity ?? "")}")${reason ? `: ${reason}` : ""}`)
      console.error(`[BULK IMPORT] No match for "${item.name}" (${item.category || ""})${reason ? `: ${reason}` : ""}`)

      if (debug) {
        debugMismatch({
          item,
          reason: reason || "No match",
          nameKey: debug.nameKey,
          categoryKey: debug.categoryKey,
          perCartonKey: debug.perCartonKey,
          candidates: debug.candidates,
        })
      }
    }
  }

  const itemsToUpdate = Array.from(itemsToUpdateById.values())
  console.error(`[BULK IMPORT] Found ${itemsToUpdate.length} unique item IDs to update`)

  // Perform updates - update ALL columns from the uploaded data
  for (const updateItem of itemsToUpdate) {
    try {
      // You may need to map/validate fields as per your DB schema
      const updatePayload: Record<string, unknown> = {
        item_code: updateItem.itemCode,
        name: updateItem.name,
        description: updateItem.description,
        category: updateItem.category,
        hsn: updateItem.hsnCode,
        barcode_no: updateItem.barcodeNo,
        unit: updateItem.unit,
        conversion_rate: updateItem.conversionRate,
        alternate_unit: updateItem.alternateUnit,
        purchase_price: updateItem.purchasePrice,
        sale_price: updateItem.salePrice,
        wholesale_price: updateItem.wholesalePrice,
        quantity_price: updateItem.quantityPrice,
        mrp: updateItem.mrp,
        stock: updateItem.stock,
        min_stock: updateItem.minStock,
        max_stock: updateItem.maxStock,
        item_location: updateItem.itemLocation,
        per_carton_quantity: updateItem.perCartonQuantity,
        godown_id: updateItem.godownId,
        gst_rate: updateItem.gstRate,
        tax_rate: updateItem.taxRate,
        cess_rate: updateItem.cessRate,
        inclusive_of_tax: updateItem.inclusiveOfTax,
        updated_at: new Date().toISOString(),
      }
      // Remove undefined/null fields to avoid overwriting with null
      Object.keys(updatePayload).forEach((k) => {
        if (updatePayload[k] === undefined) delete updatePayload[k]
      })
      const { error } = await supabase
        .from("items")
        .update(updatePayload)
        .eq("id", updateItem.id)
      if (error) {
        const errorMsg = `Update failed for item ID "${updateItem.id}": ${error.message}`
        console.error(`[BULK IMPORT] ${errorMsg}`)
        errors.push(errorMsg)
      } else {
        updateCount++
      }
    } catch (err) {
      const errorMsg = `Update error for item ID "${updateItem.id}": ${err instanceof Error ? err.message : "Unknown error"}`
      console.error(`[BULK IMPORT] ${errorMsg}`)
      errors.push(errorMsg)
    }
  }

  console.error(`[BULK IMPORT] Updates completed: ${updateCount} successful, ${itemsToUpdate.length - updateCount} failed`)

  revalidatePath("/items")

  console.error(`[BULK IMPORT] Import complete. Updated: ${updateCount}, Errors: ${errors.length}`)

  if (errors.length > 0) {
    return {
      success: updateCount > 0,
      inserted: 0,
      updated: updateCount,
      error: `Completed with issues. Updated: ${updateCount}/${itemsData.length}. Errors: ${errors.length}`,
      details: errors.slice(0, 50),
      debugBlocks: debugBlocks.slice(0, DEBUG_MAX),
    }
  }

  return {
    success: true,
    inserted: 0,
    updated: updateCount,
    message: `✅ Successfully updated ${updateCount} items (item code, unit & description)`,
    debugBlocks: debugBlocks.slice(0, DEBUG_MAX),
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

// ========== Item Details Functions ==========

export async function getItemById(id: string) {
  const supabase = await createClient()
  
  const { data: item, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !item) {
    console.error("[Items] Error fetching item by ID:", error)
    return null
  }

  // Get godown name if warehouse_id exists
  let godownName = null
  if (item.warehouse_id) {
    const { data: godown } = await supabase
      .from("warehouses")
      .select("name")
      .eq("id", item.warehouse_id)
      .single()
    godownName = godown?.name || null
  }

  return {
    id: String(item.id),
    itemCode: String(item.item_code || ""),
    name: String(item.name),
    description: String(item.description || ""),
    category: String(item.category || ""),
    hsnCode: String(item.hsn || ""),
    salePrice: Number(item.sale_price) || 0,
    wholesalePrice: Number(item.wholesale_price) || 0,
    quantityPrice: Number(item.quantity_price) || 0,
    purchasePrice: Number(item.purchase_price) || 0,
    discountType: (item.discount_type as "percentage" | "flat") || "percentage",
    saleDiscount: Number(item.sale_discount) || 0,
    barcodeNo: String(item.barcode_no || ""),
    unit: String(item.unit) || "PCS",
    packagingUnit: String(item.packaging_unit || "CTN"),
    conversionRate: 1,
    mrp: Number(item.sale_price) || 0,
    stock: Number(item.current_stock) || 0,
    openingStock: Number(item.opening_stock) || 0,
    minStock: Number(item.min_stock) || 0,
    maxStock: (Number(item.current_stock) || 0) + 100,
    itemLocation: String(item.item_location || ""),
    perCartonQuantity: Number(item.per_carton_quantity) || 1,
    godownId: item.warehouse_id || null,
    godownName,
    taxRate: Number(item.tax_rate) || 0,
    inclusiveOfTax: Boolean(item.inclusive_of_tax),
    gstRate: Number(item.tax_rate) || 0,
    cessRate: 0,
    createdAt: new Date(item.created_at),
    updatedAt: new Date(item.updated_at),
  }
}

export async function getItemStockDistribution(itemId: string) {
  const supabase = await createClient()
  
  // Try to get from item_warehouse_stock table first
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
    .eq("item_id", itemId)

  if (error) {
    console.error("[Items] Error fetching stock distribution:", error)
    // Fallback to items table warehouse_id
    const { data: item } = await supabase
      .from("items")
      .select("warehouse_id, current_stock, item_location")
      .eq("id", itemId)
      .single()

    if (item?.warehouse_id) {
      const { data: warehouse } = await supabase
        .from("warehouses")
        .select("id, name")
        .eq("id", item.warehouse_id)
        .single()

      return [{
        id: "legacy",
        warehouseId: item.warehouse_id,
        warehouseName: warehouse?.name || "Unknown",
        quantity: item.current_stock || 0,
        minQuantity: 0,
        maxQuantity: 0,
        location: item.item_location || "",
      }]
    }
    return []
  }

  return (warehouseStocks || []).map((ws: any) => ({
    id: ws.id,
    warehouseId: ws.warehouse_id,
    warehouseName: ws.warehouses?.name || "Unknown",
    quantity: ws.quantity || 0,
    minQuantity: ws.min_quantity || 0,
    maxQuantity: ws.max_quantity || 0,
    location: ws.location || "",
  }))
}

export async function getItemStockLedger(itemId: string, limit = 100) {
  const supabase = await createClient()
  
  const { data: ledgerEntries, error } = await supabase
    .from("stock_ledger")
    .select(`
      *,
      warehouses:warehouse_id (
        name
      )
    `)
    .eq("item_id", itemId)
    .order("transaction_date", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[Items] Error fetching stock ledger:", error)
    return []
  }

  return (ledgerEntries || []).map((entry: any) => ({
    id: entry.id,
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
    referenceNo: entry.reference_no || "",
    partyName: entry.party_name || "",
    warehouseName: entry.warehouses?.name || "",
    notes: entry.notes || "",
  }))
}

export async function getItemInvoiceUsage(itemId: string, limit = 50) {
  const supabase = await createClient()
  
  // Query invoices and filter by item in JSON array
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("id, invoice_no, document_type, invoice_date, customer_name, items")
    .order("invoice_date", { ascending: false })
    .limit(500) // Fetch more and filter client-side

  if (error) {
    console.error("[Items] Error fetching invoice usage:", error)
    return []
  }

  const usage: any[] = []
  
  for (const invoice of invoices || []) {
    const items = invoice.items as any[]
    if (!Array.isArray(items)) continue

    for (const item of items) {
      const itemIdFromInvoice = item?.itemId || item?.item_id
      if (itemIdFromInvoice === itemId) {
        usage.push({
          invoiceId: invoice.id,
          invoiceNo: invoice.invoice_no,
          documentType: invoice.document_type || "invoice",
          invoiceDate: new Date(invoice.invoice_date),
          customerName: invoice.customer_name,
          quantity: Number(item?.quantity) || 0,
          unit: item?.unit || "PCS",
          rate: Number(item?.rate) || 0,
          amount: Number(item?.amount) || 0,
        })
        break // Only count once per invoice
      }
    }

    if (usage.length >= limit) break
  }

  return usage
}

// Add stock with ledger entry
export async function addStockWithLedger(
  itemId: string,
  warehouseId: string,
  quantity: number,
  entryUnit: string,
  notes?: string
) {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Get item details
  const { data: item } = await supabase
    .from("items")
    .select("organization_id, per_carton_quantity, packaging_unit, unit")
    .eq("id", itemId)
    .single()

  if (!item) {
    return { success: false, error: "Item not found" }
  }

  // Calculate base quantity
  let baseQuantity = quantity
  if (entryUnit === item.packaging_unit && item.per_carton_quantity) {
    baseQuantity = Math.round(quantity * item.per_carton_quantity)
  }

  // Try to use the database function if available
  try {
    const { data: ledgerId, error } = await supabase.rpc("record_stock_movement", {
      p_organization_id: item.organization_id,
      p_item_id: itemId,
      p_warehouse_id: warehouseId,
      p_transaction_type: "IN",
      p_entry_quantity: quantity,
      p_entry_unit: entryUnit,
      p_notes: notes || null,
      p_created_by: user.id,
    })

    if (error) throw error

    revalidatePath("/items")
    revalidatePath(`/items/${itemId}`)
    return { success: true, ledgerId }
  } catch (err) {
    // Fallback: Direct update if function doesn't exist
    console.warn("[Stock] RPC not available, using direct update:", err)
    
    const { error: updateError } = await supabase
      .from("items")
      .update({ current_stock: supabase.rpc("", {}) })
      .eq("id", itemId)

    // Simple fallback update
    const { data: currentItem } = await supabase
      .from("items")
      .select("current_stock")
      .eq("id", itemId)
      .single()

    const newStock = (currentItem?.current_stock || 0) + baseQuantity

    const { error: fallbackError } = await supabase
      .from("items")
      .update({ current_stock: newStock })
      .eq("id", itemId)

    if (fallbackError) {
      return { success: false, error: fallbackError.message }
    }

    revalidatePath("/items")
    revalidatePath(`/items/${itemId}`)
    return { success: true }
  }
}

