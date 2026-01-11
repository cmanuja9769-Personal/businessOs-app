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
      .from("payments")
      .select(`
        *,
        invoices:invoice_id(invoice_number, customer_name, organization_id),
        purchases:purchase_id(purchase_number, supplier_name, organization_id)
      `)
      .order("payment_date", { ascending: false })

    if (error) {
      console.error("[API/Payments] Error fetching payments:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter payments by organization (via linked invoices/purchases)
    const filteredPayments = data?.filter((payment) => {
      if (payment.invoices?.organization_id === userOrg?.organization_id) return true
      if (payment.purchases?.organization_id === userOrg?.organization_id) return true
      return false
    }) || []

    // Transform to frontend format
    const payments = filteredPayments.map((payment) => ({
      id: payment.id,
      invoiceId: payment.invoice_id,
      invoiceNo: payment.invoices?.invoice_number,
      customerName: payment.invoices?.customer_name,
      purchaseId: payment.purchase_id,
      purchaseNo: payment.purchases?.purchase_number,
      supplierName: payment.purchases?.supplier_name,
      type: payment.invoice_id ? "receipt" : "payment",
      paymentDate: payment.payment_date,
      date: payment.payment_date,
      amount: Number(payment.amount),
      paymentMethod: payment.payment_method,
      paymentMode: payment.payment_method,
      referenceNo: payment.reference_number,
      referenceNumber: payment.reference_number,
      partyName: payment.invoices?.customer_name || payment.purchases?.supplier_name || "",
      notes: payment.notes,
      createdAt: payment.created_at,
    }))

    return NextResponse.json(payments)
  } catch (error) {
    console.error("[API/Payments] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
