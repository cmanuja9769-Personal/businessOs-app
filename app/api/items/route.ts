import { NextResponse } from "next/server"
import { authorize, orgScope } from "@/lib/authorize"

export async function GET() {
  try {
    const { supabase, organizationId } = await authorize("items", "read")

    const allItems: Record<string, unknown>[] = []
    let offset = 0
    const pageSize = 1000

    while (true) {
      const { data, error } = await supabase
        .from("items")
        .select("id, name, item_code, unit, current_stock, min_stock, purchase_price, sale_price, category, warehouse_id, opening_stock, created_at, updated_at")
        .or(orgScope(organizationId))
        .is("deleted_at", null)
        .order("name", { ascending: true })
        .range(offset, offset + pageSize - 1)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const rows = (data as Record<string, unknown>[]) || []
      if (rows.length === 0) break
      allItems.push(...rows)
      if (rows.length < pageSize) break
      offset += pageSize
    }

    return NextResponse.json(allItems)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Items API unhandled error:", message)
    return NextResponse.json(
      { error: message || "Internal server error" },
      { status: 500 }
    )
  }
}
