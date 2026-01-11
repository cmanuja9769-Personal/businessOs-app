import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get user's organization
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userOrg } = await supabase
      .from("app_user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single()

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("organization_id", userOrg?.organization_id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[API/Customers] Error fetching customers:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to frontend format
    const customers = data?.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      gstin: customer.gst_number,
      openingBalance: Number(customer.opening_balance || 0),
      createdAt: customer.created_at,
      updatedAt: customer.updated_at,
    })) || []

    return NextResponse.json(customers)
  } catch (error) {
    console.error("[API/Customers] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
