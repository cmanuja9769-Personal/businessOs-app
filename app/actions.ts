"use server"

import { createClient } from "@/lib/supabase/server"

export async function globalSearch(query: string) {
  if (!query || query.trim().length < 2) {
    return { customers: [], items: [], invoices: [] }
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { customers: [], items: [], invoices: [] }
  }

  const searchTerm = `%${query.trim()}%`

  // Search customers
  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, name, phone, email")
    .or(`name.ilike.${searchTerm},phone.ilike.${searchTerm},email.ilike.${searchTerm},gst_number.ilike.${searchTerm}`)
    .limit(5)

  if (customersError) {
    console.error("[globalSearch] customers error:", customersError)
  }

  // Search items
  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("id, name, item_code, hsn, sale_price")
    .or(
      `name.ilike.${searchTerm},item_code.ilike.${searchTerm},hsn.ilike.${searchTerm},barcode_no.ilike.${searchTerm},category.ilike.${searchTerm}`
    )
    .limit(5)

  if (itemsError) {
    console.error("[globalSearch] items error:", itemsError)
  }

  // Search invoices
  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, created_at, customer_name")
    .or(`invoice_number.ilike.${searchTerm},customer_name.ilike.${searchTerm},customer_phone.ilike.${searchTerm}`)
    .order("created_at", { ascending: false })
    .limit(5)

  if (invoicesError) {
    console.error("[globalSearch] invoices error:", invoicesError)
  }

  return {
    customers:
      customers?.map((c: { id: string; name: string; phone: string; email: string }) => ({
      id: c.id,
      name: c.name,
      contactNo: c.phone,
      email: c.email,
    })) || [],
    items:
      items?.map((i: { id: string; name: string; item_code: string; hsn: string; sale_price: number }) => ({
      id: i.id,
      name: i.name,
      itemCode: i.item_code,
      hsnCode: i.hsn,
      salePrice: Number(i.sale_price) || 0,
    })) || [],
    invoices:
      invoices?.map((inv: { id: string; invoice_number: string; total: number; customer_name: string; created_at: string }) => ({
      id: inv.id,
      invoiceNo: inv.invoice_number,
      totalAmount: Number(inv.total) || 0,
      customerName: inv.customer_name || "Unknown",
      createdAt: inv.created_at,
    })) || [],
  }
}
