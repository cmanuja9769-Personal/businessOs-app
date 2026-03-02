import { NextResponse } from "next/server"
import { authorize, orgScope } from "@/lib/authorize"

export async function GET() {
  try {
    const { supabase, organizationId } = await authorize("customers", "read")

    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .or(orgScope(organizationId))
      .is("deleted_at", null)
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
