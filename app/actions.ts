"use server"

import { authorize, orgScope } from "@/lib/authorize"
import { isDemoMode } from "@/app/demo/helpers"
import { demoCustomers, demoItems, demoInvoices } from "@/app/demo/data"

export async function globalSearch(query: string) {
  if (!query || query.trim().length < 2) {
    return { customers: [], items: [], invoices: [] }
  }

  if (await isDemoMode()) {
    const q = query.trim().toLowerCase()
    return {
      customers: demoCustomers
        .filter((c) => c.name.toLowerCase().includes(q) || c.contactNo?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))
        .slice(0, 5)
        .map((c) => ({ id: c.id, name: c.name, contactNo: c.contactNo, email: c.email ?? null })),
      items: demoItems
        .filter((i) => i.name.toLowerCase().includes(q) || i.itemCode?.toLowerCase().includes(q) || i.hsnCode?.toLowerCase().includes(q))
        .slice(0, 5)
        .map((i) => ({ id: i.id, name: i.name, itemCode: i.itemCode ?? null, hsnCode: i.hsnCode ?? null, salePrice: Number(i.salePrice) || 0 })),
      invoices: demoInvoices
        .filter((inv) => inv.invoiceNo?.toLowerCase().includes(q) || inv.customerName?.toLowerCase().includes(q))
        .slice(0, 5)
        .map((inv) => ({ id: inv.id, invoiceNo: inv.invoiceNo, totalAmount: Number(inv.total) || 0, customerName: inv.customerName || "Unknown", createdAt: String(inv.createdAt) })),
    }
  }

  const { supabase, organizationId } = await authorize("items", "read")

  const searchTerm = `%${query.trim()}%`

  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, name, phone, email")
    .or(orgScope(organizationId))
    .is("deleted_at", null)
    .or(`name.ilike.${searchTerm},phone.ilike.${searchTerm},email.ilike.${searchTerm},gst_number.ilike.${searchTerm}`)
    .limit(5)

  if (customersError) {
    console.error("[globalSearch] customers error:", customersError)
  }

  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("id, name, item_code, hsn, sale_price")
    .or(orgScope(organizationId))
    .is("deleted_at", null)
    .or(
      `name.ilike.${searchTerm},item_code.ilike.${searchTerm},hsn.ilike.${searchTerm},barcode_no.ilike.${searchTerm},category.ilike.${searchTerm}`
    )
    .limit(5)

  if (itemsError) {
    console.error("[globalSearch] items error:", itemsError)
  }

  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, created_at, customer_name")
    .or(orgScope(organizationId))
    .is("deleted_at", null)
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
