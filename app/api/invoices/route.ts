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
      .from("invoices")
      .select("*, invoice_items(*)")
      .eq("organization_id", userOrg?.organization_id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[API/Invoices] Error fetching invoices:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to frontend format
    const invoices = data?.map((invoice) => ({
      id: invoice.id,
      invoiceNo: invoice.invoice_number,
      documentType: invoice.document_type || "invoice",
      customerId: invoice.customer_id || "",
      customerName: invoice.customer_name,
      customerPhone: invoice.customer_phone || "",
      customerAddress: invoice.customer_address || "",
      customerGst: invoice.customer_gst || "",
      invoiceDate: invoice.invoice_date || invoice.created_at,
      dueDate: invoice.due_date || invoice.invoice_date || invoice.created_at,
      items: invoice.invoice_items?.map((item: Record<string, unknown>) => ({
        itemId: item.item_id || "",
        itemName: item.item_name,
        quantity: item.quantity,
        unit: item.unit || "PCS",
        rate: Number(item.rate),
        gstRate: Number(item.tax_rate || item.gst_rate || 0),
        cessRate: Number(item.cess_rate || 0),
        discount: Number(item.discount || 0),
        amount: Number(item.amount),
        purchasePrice: Number(item.purchase_price || 0),
      })) || [],
      subtotal: Number(invoice.subtotal),
      cgst: Number(invoice.cgst),
      sgst: Number(invoice.sgst),
      igst: Number(invoice.igst),
      cess: Number(invoice.cess || 0),
      discount: Number(invoice.discount || 0),
      discountType: invoice.discount_type || "percentage",
      total: Number(invoice.total),
      paidAmount: Number(invoice.paid_amount || 0),
      balance: Number(invoice.balance || invoice.total),
      status: invoice.status,
      gstEnabled: invoice.gst_enabled,
      notes: invoice.notes || "",
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at,
    })) || []

    return NextResponse.json(invoices)
  } catch (error) {
    console.error("[API/Invoices] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
