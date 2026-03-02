import { NextResponse } from "next/server"
import { authorize, orgScope } from "@/lib/authorize"

export async function GET() {
  try {
    const { supabase, organizationId } = await authorize("invoices", "read")

    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        invoices:invoice_id(invoice_number, customer_name),
        purchases:purchase_id(purchase_number, supplier_name)
      `)
      .or(orgScope(organizationId))
      .is("deleted_at", null)
      .order("payment_date", { ascending: false })

    if (error) {
      console.error("[API/Payments] Error fetching payments:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const payments = (data || []).map((payment) => ({
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
