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
      .from("suppliers")
      .select("*")
      .eq("organization_id", userOrg?.organization_id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[API/Suppliers] Error fetching suppliers:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to frontend format
    const suppliers = data?.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      gstin: supplier.gst_number,
      createdAt: supplier.created_at,
      updatedAt: supplier.updated_at,
    })) || []

    return NextResponse.json(suppliers)
  } catch (error) {
    console.error("[API/Suppliers] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
