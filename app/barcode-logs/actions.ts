"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { IBarcodePrintLog } from "@/types"

async function getOrgContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: orgData } = await supabase
    .from("app_user_organizations")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle()

  if (!orgData?.organization_id) throw new Error("No organization found")

  return { supabase, userId: user.id, organizationId: orgData.organization_id }
}

function mapRow(row: Record<string, unknown>): IBarcodePrintLog {
  return {
    id: row.id as string,
    itemId: row.item_id as string,
    itemName: row.item_name as string,
    barcodeNo: row.barcode_no as string | null,
    stockAtPrint: row.stock_at_print as number,
    labelsPrinted: row.labels_printed as number,
    printType: row.print_type as "individual" | "batch",
    layoutId: row.layout_id as string,
    printedAt: new Date(row.printed_at as string),
    createdAt: new Date(row.created_at as string),
  }
}

export async function logBarcodePrint(entries: {
  itemId: string
  itemName: string
  barcodeNo: string | null
  stockAtPrint: number
  labelsPrinted: number
  printType: "individual" | "batch"
  layoutId: string
}[]) {
  try {
    const { supabase, userId, organizationId } = await getOrgContext()
    const rows = entries.map((e) => ({
      item_id: e.itemId,
      item_name: e.itemName,
      barcode_no: e.barcodeNo,
      stock_at_print: e.stockAtPrint,
      labels_printed: e.labelsPrinted,
      print_type: e.printType,
      layout_id: e.layoutId,
      organization_id: organizationId,
      printed_by: userId,
    }))

    const { error } = await supabase.from("barcode_print_logs").insert(rows)
    if (error) throw error

    revalidatePath("/barcode-logs")
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function getBarcodePrintLogs(params?: {
  search?: string
  dateFrom?: string
  dateTo?: string
  printType?: string
  page?: number
  pageSize?: number
}): Promise<{ data: IBarcodePrintLog[]; count: number }> {
  try {
    const { supabase, organizationId } = await getOrgContext()
    const page = params?.page ?? 1
    const pageSize = params?.pageSize ?? 25
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from("barcode_print_logs")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .order("printed_at", { ascending: false })

    if (params?.search) {
      const sanitized = params.search.replace(/[%_\\]/g, "")
      if (sanitized) {
        query = query.or(
          `item_name.ilike.%${sanitized}%,barcode_no.ilike.%${sanitized}%`
        )
      }
    }
    if (params?.dateFrom) {
      query = query.gte("printed_at", params.dateFrom)
    }
    if (params?.dateTo) {
      query = query.lte("printed_at", `${params.dateTo}T23:59:59`)
    }
    if (params?.printType && params.printType !== "all") {
      query = query.eq("print_type", params.printType)
    }

    query = query.range(from, to)

    const { data, count, error } = await query
    if (error) throw error

    return {
      data: (data ?? []).map(mapRow),
      count: count ?? 0,
    }
  } catch {
    return { data: [], count: 0 }
  }
}

export async function deleteBarcodePrintLog(id: string) {
  try {
    const { supabase, organizationId } = await getOrgContext()
    const { error } = await supabase
      .from("barcode_print_logs")
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId)
    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function deleteBarcodePrintLogs(ids: string[]) {
  if (ids.length === 0) return { success: true, deletedCount: 0 }
  try {
    const { supabase, organizationId } = await getOrgContext()
    const { error, count } = await supabase
      .from("barcode_print_logs")
      .delete({ count: "exact" })
      .in("id", ids)
      .eq("organization_id", organizationId)
    if (error) throw error
    return { success: true, deletedCount: count ?? ids.length }
  } catch (error) {
    return { success: false, error: String(error), deletedCount: 0 }
  }
}

export async function getItemLatestPrintLog(
  itemId: string
): Promise<IBarcodePrintLog | null> {
  try {
    const { supabase, organizationId } = await getOrgContext()
    const { data, error } = await supabase
      .from("barcode_print_logs")
      .select("*")
      .eq("item_id", itemId)
      .eq("organization_id", organizationId)
      .order("printed_at", { ascending: false })
      .limit(1)
      .single()
    if (error) return null
    return mapRow(data)
  } catch {
    return null
  }
}

export async function getLatestPrintLogsForItems(
  itemIds: string[]
): Promise<Record<string, IBarcodePrintLog>> {
  if (itemIds.length === 0) return {}
  try {
    const { supabase, organizationId } = await getOrgContext()
    const { data, error } = await supabase
      .from("barcode_print_logs")
      .select("*")
      .in("item_id", itemIds)
      .eq("organization_id", organizationId)
      .order("printed_at", { ascending: false })

    if (error || !data) return {}

    const result: Record<string, IBarcodePrintLog> = {}
    for (const row of data) {
      const itemId = row.item_id as string
      if (!result[itemId]) {
        result[itemId] = mapRow(row)
      }
    }
    return result
  } catch {
    return {}
  }
}
