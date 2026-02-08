import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: memberships, error: orgError } = await supabase
      .from("app_user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 500 })
    }

    const membership = memberships?.[0]

    if (!membership) {
      return NextResponse.json({ error: "No active organization" }, { status: 403 })
    }

    const orgId = membership.organization_id as string

    const allItems: Record<string, unknown>[] = []
    let offset = 0
    const pageSize = 1000

    while (true) {
      const { data, error } = await supabase
        .from("items")
        .select("id, name, item_code, unit, current_stock, min_stock, purchase_price, sale_price, category, warehouse_id, opening_stock, created_at, updated_at")
        .eq("organization_id", orgId)
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
