type DbMatchItem = {
  id: string
  name: string | null
  category: string | null
  per_carton_quantity?: number | null
}

type MatchResult = {
  matches?: DbMatchItem[]
  reason?: string
}

export function canonicalizeText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/&+/g, "and")
    .replace(/\bpce\b/g, "pcs")
    .replace(/\bpc\b/g, "pcs")
    .replace(/\bpcs\b/g, "pcs")
    .replace(/\bcms\b/g, "cm")
}

export function normalizeKey(value: unknown): string {
  return canonicalizeText(value).replace(/[^a-z0-9]+/g, "")
}

export function normalizeKeyRelaxed(value: unknown): string {
  return canonicalizeText(value)
    .replace(/\b\d+\s*(shots?|shot)\b/g, "")
    .replace(/\bshots?\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
}

export function normalizePerCartonKey(value: unknown): string {
  if (value === null || value === undefined || value === "") return ""
  const num = Number(value)
  if (!Number.isFinite(num)) return ""
  return String(num)
}

function appendToMapBucket<T>(map: Map<string, T[]>, key: string, value: T) {
  const bucket = map.get(key)
  if (bucket) bucket.push(value)
  else map.set(key, [value])
}

export function buildLookupMaps(dbItems: DbMatchItem[]) {
  const byNameKey = new Map<string, DbMatchItem[]>()
  const byNameKeyRelaxed = new Map<string, DbMatchItem[]>()

  for (const dbItem of dbItems) {
    const nameKey = normalizeKey(dbItem.name)
    if (!nameKey) continue

    appendToMapBucket(byNameKey, nameKey, dbItem)

    const relaxedKey = normalizeKeyRelaxed(dbItem.name)
    if (relaxedKey) {
      appendToMapBucket(byNameKeyRelaxed, relaxedKey, dbItem)
    }
  }

  return { byNameKey, byNameKeyRelaxed }
}

type NarrowResult = { candidates: DbMatchItem[]; resolved?: DbMatchItem[] }

function findCandidates(
  strictNameKey: string,
  itemName: string,
  byNameKey: Map<string, DbMatchItem[]>,
  byNameKeyRelaxed: Map<string, DbMatchItem[]>,
): DbMatchItem[] {
  const strict = byNameKey.get(strictNameKey) || []
  if (strict.length > 0) return strict
  const relaxedKey = normalizeKeyRelaxed(itemName)
  if (!relaxedKey) return []
  return byNameKeyRelaxed.get(relaxedKey) || []
}

function narrowCandidates(
  candidates: DbMatchItem[],
  fieldKey: string,
  getItemKey: (item: DbMatchItem) => string,
): NarrowResult {
  if (!fieldKey) return { candidates }
  const filtered = candidates.filter((c) => getItemKey(c) === fieldKey)
  if (filtered.length === 1) return { resolved: [filtered[0]], candidates }
  if (filtered.length > 1) return { candidates: filtered }
  return { candidates }
}

export function resolveMatch(
  itemName: string,
  itemCategory: string | undefined | null,
  itemPerCartonQuantity: number | undefined | null,
  byNameKey: Map<string, DbMatchItem[]>,
  byNameKeyRelaxed: Map<string, DbMatchItem[]>,
): MatchResult {
  const strictNameKey = normalizeKey(itemName)
  const categoryKey = normalizeKey(itemCategory)
  const perCartonKey = normalizePerCartonKey(itemPerCartonQuantity)

  if (!strictNameKey) return { reason: "Missing name" }

  const candidates = findCandidates(strictNameKey, itemName, byNameKey, byNameKeyRelaxed)
  if (candidates.length === 0) return { reason: "No name match" }
  if (candidates.length === 1) return { matches: [candidates[0]] }

  const afterCategory = narrowCandidates(candidates, categoryKey, (c) => normalizeKey(c.category))
  if (afterCategory.resolved) return { matches: afterCategory.resolved }

  const afterPerCarton = narrowCandidates(afterCategory.candidates, perCartonKey, (c) => normalizePerCartonKey(c.per_carton_quantity))
  if (afterPerCarton.resolved) return { matches: afterPerCarton.resolved }

  const final = afterPerCarton.candidates
  const signature = (c: DbMatchItem) =>
    `${normalizeKey(c.name)}|${normalizeKey(c.category)}|${normalizePerCartonKey(c.per_carton_quantity)}`
  const sigs = new Set(final.map(signature))
  if (sigs.size === 1) return { matches: final }

  return { reason: `Ambiguous match (candidates=${final.length})` }
}

export function buildInsertPayload(
  item: {
    itemCode?: string | null
    name: string
    description?: string | null
    category?: string | null
    hsnCode?: string | null
    barcodeNo?: string | null
    unit?: string | null
    packagingUnit?: string | null
    conversionRate?: number | null
    alternateUnit?: string | null
    purchasePrice?: number
    salePrice?: number
    wholesalePrice?: number
    quantityPrice?: number
    mrp?: number
    stock?: number
    minStock?: number
    maxStock?: number
    itemLocation?: string | null
    perCartonQuantity?: number | null
    godownId?: string | null
    taxRate?: number
    gstRate?: number
    cessRate?: number
    inclusiveOfTax?: boolean
  },
  organizationId: string,
  barcodeNo: string,
) {
  return {
    organization_id: organizationId,
    item_code: item.itemCode || null,
    name: item.name,
    description: item.description || null,
    category: item.category || null,
    hsn: item.hsnCode || null,
    barcode_no: barcodeNo,
    unit: item.unit || "PCS",
    packaging_unit: item.packagingUnit || "CTN",
    conversion_rate: item.conversionRate || 1,
    alternate_unit: item.alternateUnit || null,
    purchase_price: item.purchasePrice || 0,
    sale_price: item.salePrice || 0,
    wholesale_price: item.wholesalePrice || 0,
    quantity_price: item.quantityPrice || 0,
    mrp: item.mrp || 0,
    opening_stock: item.stock || 0,
    current_stock: item.stock || 0,
    min_stock: item.minStock || 0,
    max_stock: item.maxStock || 0,
    item_location: item.itemLocation || null,
    per_carton_quantity: item.perCartonQuantity || null,
    warehouse_id: item.godownId || null,
    tax_rate: item.taxRate || item.gstRate || 0,
    cess_rate: item.cessRate || 0,
    inclusive_of_tax: item.inclusiveOfTax || false,
  }
}
