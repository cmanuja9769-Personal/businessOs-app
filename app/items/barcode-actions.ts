"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { authorize, orgScope } from "@/lib/authorize"
import { isDemoMode, throwDemoMutationError } from "@/app/demo/helpers"

const ITEM_NOT_FOUND = "Item not found"

function parseBigIntSafe(val: string): bigint | null {
  try {
    return BigInt(val)
  } catch {
    return null
  }
}

function updateMaxBarcodeFromRows(rows: Array<Record<string, unknown>>, currentMax: bigint): bigint {
  let maxBarcode = currentMax
  for (const row of rows) {
    const value = String(row?.barcode_no ?? "").trim()
    if (!/^\d+$/.test(value)) continue
    const parsed = parseBigIntSafe(value)
    if (parsed !== null && parsed > maxBarcode) {
      maxBarcode = parsed
    }
  }
  return maxBarcode
}

function isUniqueViolation(error: { message?: string; code?: string } | null | undefined): boolean {
  const message = String(error?.message || "").toLowerCase()
  return message.includes("unique") || String(error?.code || "") === "23505"
}

async function fetchMaxBarcodeWithPrefix(
  supabase: Awaited<ReturnType<typeof createClient>>,
  prefix: string,
  fallbackBase: bigint
): Promise<bigint> {
  const pageSize = 1000
  let offset = 0
  let maxBarcode = fallbackBase

  while (true) {
    const res = await supabase
      .from("items")
      .select("barcode_no")
      .like("barcode_no", `${prefix}%`)
      .not("barcode_no", "is", null)
      .range(offset, offset + pageSize - 1)

    if (res.error) {
      console.error("[Barcode] Failed to fetch barcodes for max computation:", res.error.message || res.error)
      return maxBarcode
    }

    const rows = (res.data as Array<Record<string, unknown>>) || []
    if (rows.length === 0) return maxBarcode

    maxBarcode = updateMaxBarcodeFromRows(rows, maxBarcode)
    if (rows.length < pageSize) return maxBarcode
    offset += pageSize
  }
}

async function hasBarcodeCollision(
  supabase: Awaited<ReturnType<typeof createClient>>,
  candidate: string
): Promise<{ collision: boolean; fallbackCandidate?: string }> {
  const { data: exists, error: existsError } = await supabase
    .from("items")
    .select("id")
    .eq("barcode_no", candidate)
    .limit(1)

  if (existsError) {
    console.error("[Barcode] Failed to check barcode collision:", existsError.message || existsError)
    return { collision: false, fallbackCandidate: candidate }
  }

  return { collision: Array.isArray(exists) && exists.length > 0 }
}

async function findNextAvailableBarcode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  startFrom: bigint,
  prefix: string,
  fallbackBase: bigint
): Promise<string> {
  let nextNumber = startFrom

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = String(nextNumber).padStart(13, "0")
    if (!candidate.startsWith(prefix)) {
      nextNumber = fallbackBase + BigInt(1)
      continue
    }

    const collisionResult = await hasBarcodeCollision(supabase, candidate)
    if (collisionResult.fallbackCandidate) return collisionResult.fallbackCandidate
    if (!collisionResult.collision) return candidate

    nextNumber = nextNumber + BigInt(1)
  }

  return String(nextNumber).padStart(13, "0")
}

export async function generateNextNumericBarcode(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const PREFIX = "200"
  const FALLBACK_BASE = BigInt(2000000000000)

  try {
    const maxBarcode = await fetchMaxBarcodeWithPrefix(supabase, PREFIX, FALLBACK_BASE)
    return await findNextAvailableBarcode(supabase, maxBarcode + BigInt(1), PREFIX, FALLBACK_BASE)
  } catch (err) {
    console.error("[Barcode] Unexpected error generating barcode:", err)
    return String(FALLBACK_BASE + BigInt(1)).padStart(13, "0")
  }
}

async function fetchExistingBarcode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemId: string
): Promise<{ barcode: string | null; error?: string }> {
  const { data: existing, error } = await supabase
    .from("items")
    .select("barcode_no")
    .eq("id", itemId)
    .maybeSingle()

  if (error) {
    return { barcode: null, error: error.message || "DB error" }
  }

  const barcode = String((existing as Record<string, unknown>)?.barcode_no ?? "").trim()
  return { barcode: barcode || null }
}

async function assignBarcodeWithRetry(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemId: string
): Promise<{ success: boolean; barcode?: string; item?: unknown; error?: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = await generateNextNumericBarcode(supabase)
    const { data: updated, error: updateError } = await supabase
      .from("items")
      .update({ barcode_no: candidate })
      .eq("id", itemId)
      .select()
      .maybeSingle()

    if (!updateError) {
      try { revalidatePath("/items") } catch {}
      return { success: true, barcode: candidate, item: updated }
    }

    console.error(`[Barcode] Failed to assign barcode (attempt ${attempt}):`, updateError.message || updateError)
    if (!isUniqueViolation(updateError)) {
      return { success: false, error: updateError.message || "Update failed" }
    }
  }

  return { success: false, error: "Failed to assign unique barcode after multiple attempts" }
}

export async function assignBarcodeToItem(id: string) {
  if (await isDemoMode()) throwDemoMutationError()
  const { supabase, organizationId } = await authorize("items", "update")

  const { data: itemCheck } = await supabase
    .from("items")
    .select("id")
    .eq("id", id)
    .or(orgScope(organizationId))
    .maybeSingle()

  if (!itemCheck) {
    return { success: false, error: ITEM_NOT_FOUND }
  }

  try {
    const existingBarcodeResult = await fetchExistingBarcode(supabase, id)
    if (existingBarcodeResult.error) {
      console.error("[Barcode] Failed to fetch item for assignment:", existingBarcodeResult.error)
      return { success: false, error: existingBarcodeResult.error }
    }

    const existingBarcode = existingBarcodeResult.barcode
    if (existingBarcode) {
      return { success: true, barcode: existingBarcode }
    }

    return await assignBarcodeWithRetry(supabase, id)
  } catch (err) {
    console.error("[Barcode] Unexpected error assigning barcode:", err)
    return { success: false, error: String(err) }
  }
}
