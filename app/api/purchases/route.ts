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
      .from("purchases")
      .select("*, purchase_items(*)")
      .eq("organization_id", userOrg?.organization_id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[API/Purchases] Error fetching purchases:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to frontend format
    const purchases = data?.map((purchase) => ({
      id: purchase.id,
      purchaseNo: purchase.purchase_number,
      supplierId: purchase.supplier_id || "",
      supplierName: purchase.supplier_name,
      supplierPhone: purchase.supplier_phone || "",
      supplierAddress: purchase.supplier_address || "",
      supplierGst: purchase.supplier_gst || "",
      date: purchase.purchase_date || purchase.created_at,
      items: purchase.purchase_items?.map((item: Record<string, unknown>) => ({
        itemId: item.item_id || "",
        name: item.item_name,
        hsn: item.hsn || "",
        quantity: item.quantity,
        rate: Number(item.rate),
        discount: Number(item.discount || 0),
        discountType: item.discount_type || "percentage",
        taxRate: Number(item.tax_rate),
        amount: Number(item.amount),
      })) || [],
      subtotal: Number(purchase.subtotal),
      discount: Number(purchase.discount || 0),
      discountType: purchase.discount_type || "percentage",
      cgst: Number(purchase.cgst),
      sgst: Number(purchase.sgst),
      igst: Number(purchase.igst),
      total: Number(purchase.total),
      paidAmount: Number(purchase.paid_amount || 0),
      balance: Number(purchase.balance || purchase.total),
      status: purchase.status,
      gstEnabled: purchase.gst_enabled,
      notes: purchase.notes || "",
      createdAt: purchase.created_at,
      updatedAt: purchase.updated_at,
    })) || []

    return NextResponse.json(purchases)
  } catch (error) {
    console.error("[API/Purchases] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
