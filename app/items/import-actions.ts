"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { IItem } from "@/types"
import { authorize, orgScope } from "@/lib/authorize"
import { buildLookupMaps, resolveMatch, buildInsertPayload } from "@/lib/import-utils"
import { isDemoMode, throwDemoMutationError } from "@/app/demo/helpers"
import { generateNextNumericBarcode } from "./barcode-actions"

function sanitizeImportUpdatePayload(updateItem: {
  itemCode: string | null
  unit: string
  description: string | null
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    item_code: updateItem.itemCode,
    unit: updateItem.unit,
    description: updateItem.description,
    updated_at: new Date().toISOString(),
  }
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key]
    }
  })
  return payload
}

async function applyBulkImportUpdates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemsToUpdateById: Map<string, { id: string; itemCode: string | null; unit: string; description: string | null }>,
  errors: string[]
): Promise<number> {
  let updatedCount = 0
  for (const updateItem of itemsToUpdateById.values()) {
    try {
      const payload = sanitizeImportUpdatePayload(updateItem)
      const { error } = await supabase.from("items").update(payload).eq("id", updateItem.id)
      if (error) {
        errors.push(`Update failed for item ID "${updateItem.id}": ${error.message}`)
      } else {
        updatedCount++
      }
    } catch (err) {
      errors.push(`Update error for item ID "${updateItem.id}": ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }
  return updatedCount
}

async function applyBulkImportInserts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemsToInsert: IItem[],
  organizationId: string,
  errors: string[]
): Promise<number> {
  let insertedCount = 0
  for (const item of itemsToInsert) {
    try {
      const barcodeNo = item.barcodeNo || await generateNextNumericBarcode(supabase)
      const payload = buildInsertPayload(item, organizationId, barcodeNo)
      const { error } = await supabase.from("items").insert(payload)
      if (error) {
        errors.push(`Insert failed for "${item.name}": ${error.message}`)
      } else {
        insertedCount++
      }
    } catch (err) {
      errors.push(`Insert error for "${item.name}": ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }
  return insertedCount
}

function appendImportMatchUpdates(
  item: IItem,
  matches: Array<{ id: string; name: string | null; category: string | null; per_carton_quantity?: number | null }>,
  itemsToUpdateById: Map<string, { id: string; itemCode: string | null; unit: string; description: string | null }>
): void {
  const descriptionValue = item.description?.trim() || null
  const itemCodeValue = item.itemCode?.trim() || null
  for (const match of matches) {
    if (!match?.id) continue
    itemsToUpdateById.set(match.id, {
      id: match.id,
      itemCode: itemCodeValue,
      unit: String(item.unit || "PCS"),
      description: descriptionValue,
    })
  }
}

function buildBulkImportNoMatchError(item: IItem, reason?: string): string {
  const details = reason ? `: ${reason}` : ""
  return `No unique match for "${item.name}" (category="${item.category || ""}", perCarton="${String(item.perCartonQuantity ?? "")}")${details}`
}

function collectBulkImportTargets(
  itemsData: IItem[],
  byNameKey: Map<string, Array<{ id: string; name: string | null; category: string | null; per_carton_quantity?: number | null }>>,
  byNameKeyRelaxed: Map<string, Array<{ id: string; name: string | null; category: string | null; per_carton_quantity?: number | null }>>,
  errors: string[]
): {
  itemsToUpdateById: Map<string, { id: string; itemCode: string | null; unit: string; description: string | null }>
  itemsToInsert: IItem[]
} {
  const itemsToUpdateById = new Map<string, { id: string; itemCode: string | null; unit: string; description: string | null }>()
  const itemsToInsert: IItem[] = []

  for (const item of itemsData) {
    const { matches, reason } = resolveMatch(item.name, item.category, item.perCartonQuantity, byNameKey, byNameKeyRelaxed)
    if (matches?.length) {
      appendImportMatchUpdates(item, matches, itemsToUpdateById)
      continue
    }

    if (reason === "No name match") {
      itemsToInsert.push(item)
      continue
    }

    errors.push(buildBulkImportNoMatchError(item, reason))
  }

  return { itemsToUpdateById, itemsToInsert }
}

async function fetchAllDbItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string
) {
  const dbItems: Array<{ id: string; name: string | null; category: string | null; per_carton_quantity?: number | null }> = []
  const pageSize = 1000
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from("items")
      .select("id, name, category, per_carton_quantity")
      .or(orgScope(organizationId))
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) return { success: false as const, error: `Failed to fetch existing items: ${error.message}` }

    const batch = (data || []).filter((x) => !!x && typeof x.id === "string") as Array<{ id: string; name: string | null; category: string | null; per_carton_quantity?: number | null }>
    if (batch.length === 0) break

    dbItems.push(...batch)
    if (batch.length < pageSize) break
    offset += pageSize
  }
  return dbItems
}

export async function bulkImportItems(itemsData: IItem[]) {
  if (await isDemoMode()) throwDemoMutationError()
  if (!itemsData || itemsData.length === 0) {
    return { success: false, error: "No items to import" }
  }

  const { supabase, organizationId } = await authorize("items", "create")
  const errors: string[] = []
  let insertCount = 0
  let updateCount = 0

  const dbItems = await fetchAllDbItems(supabase, organizationId)
  if ("error" in dbItems) return dbItems

  const { byNameKey, byNameKeyRelaxed } = buildLookupMaps(dbItems)

  const { itemsToUpdateById, itemsToInsert } = collectBulkImportTargets(itemsData, byNameKey, byNameKeyRelaxed, errors)

  updateCount = await applyBulkImportUpdates(supabase, itemsToUpdateById, errors)
  insertCount = await applyBulkImportInserts(supabase, itemsToInsert, organizationId, errors)

  revalidatePath("/items")

  if (errors.length > 0) {
    return {
      success: insertCount > 0 || updateCount > 0,
      inserted: insertCount,
      updated: updateCount,
      error: `Completed with issues. Inserted: ${insertCount}, Updated: ${updateCount}/${itemsData.length}. Errors: ${errors.length}`,
      details: errors.slice(0, 50),
    }
  }

  return {
    success: true,
    inserted: insertCount,
    updated: updateCount,
    message: `Successfully imported items: ${insertCount} new, ${updateCount} updated`,
  }
}
