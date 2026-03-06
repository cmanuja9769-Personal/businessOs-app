import { NextRequest, NextResponse } from "next/server"
import { authorize, orgScope } from "@/lib/authorize"
import { SupabaseClient } from "@supabase/supabase-js"

interface LedgerRow {
  date: string
  type: string
  documentNo: string
  description: string
  debit: number
  credit: number
}

function mapInvoiceToLedgerRow(inv: Record<string, unknown>): LedgerRow {
  const isCreditNote = inv.document_type === "credit_note"
  return {
    date: inv.invoice_date as string,
    type: isCreditNote ? "Credit Note" : "Tax Invoice",
    documentNo: inv.invoice_number as string,
    description: isCreditNote ? "Sales Return / Credit Note" : "Sales Invoice",
    debit: isCreditNote ? 0 : Number(inv.total),
    credit: isCreditNote ? Number(inv.total) : 0,
  }
}

function mapPaymentToLedgerRow(pay: Record<string, unknown>, direction: "received" | "made"): LedgerRow {
  const label = direction === "received" ? "Payment Received" : "Payment Made"
  return {
    date: pay.payment_date as string,
    type: direction === "received" ? "Payment Receipt" : "Payment Made",
    documentNo: (pay.reference_number as string) || "Payment",
    description: `${label} — ${pay.payment_method || "Cash"}`,
    debit: direction === "made" ? Number(pay.amount) : 0,
    credit: direction === "received" ? Number(pay.amount) : 0,
  }
}

async function fetchCustomerLedger(
  supabase: SupabaseClient,
  organizationId: string,
  partyId: string,
  dateFrom: string,
  dateTo: string,
): Promise<LedgerRow[]> {
  const [invoicesRes, paymentsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, invoice_date, total, document_type, notes, status")
      .eq("customer_id", partyId)
      .or(orgScope(organizationId))
      .is("deleted_at", null)
      .gte("invoice_date", dateFrom)
      .lte("invoice_date", dateTo)
      .neq("status", "cancelled")
      .order("invoice_date", { ascending: true }),
    supabase
      .from("payments")
      .select("id, invoice_id, payment_date, amount, payment_method, reference_number, invoices!inner(customer_id)")
      .or(orgScope(organizationId))
      .is("deleted_at", null)
      .gte("payment_date", dateFrom)
      .lte("payment_date", dateTo),
  ])

  const entries: LedgerRow[] = (invoicesRes.data ?? []).map(mapInvoiceToLedgerRow)

  const customerPayments = (paymentsRes.data ?? []).filter(
    (p: Record<string, unknown>) => (p.invoices as Record<string, unknown> | null)?.customer_id === partyId,
  )
  for (const pay of customerPayments) {
    entries.push(mapPaymentToLedgerRow(pay as Record<string, unknown>, "received"))
  }

  return entries
}

async function fetchSupplierLedger(
  supabase: SupabaseClient,
  organizationId: string,
  partyId: string,
  dateFrom: string,
  dateTo: string,
): Promise<LedgerRow[]> {
  const [purchasesRes, paymentsRes] = await Promise.all([
    supabase
      .from("purchases")
      .select("id, purchase_number, purchase_date, total")
      .eq("supplier_id", partyId)
      .or(orgScope(organizationId))
      .is("deleted_at", null)
      .gte("purchase_date", dateFrom)
      .lte("purchase_date", dateTo)
      .order("purchase_date", { ascending: true }),
    supabase
      .from("payments")
      .select("id, purchase_id, payment_date, amount, payment_method, reference_number, purchases!inner(supplier_id)")
      .or(orgScope(organizationId))
      .is("deleted_at", null)
      .gte("payment_date", dateFrom)
      .lte("payment_date", dateTo),
  ])

  const entries: LedgerRow[] = (purchasesRes.data ?? []).map((pur) => ({
    date: pur.purchase_date,
    type: "Purchase Invoice",
    documentNo: pur.purchase_number,
    description: "Purchase Invoice",
    debit: 0,
    credit: Number(pur.total),
  }))

  const supplierPayments = (paymentsRes.data ?? []).filter(
    (p: Record<string, unknown>) => (p.purchases as Record<string, unknown> | null)?.supplier_id === partyId,
  )
  for (const pay of supplierPayments) {
    entries.push(mapPaymentToLedgerRow(pay as Record<string, unknown>, "made"))
  }

  return entries
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, organizationId } = await authorize("invoices", "read")
    const { searchParams } = request.nextUrl
    const partyId = searchParams.get("partyId")
    const partyType = searchParams.get("partyType")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    if (!partyId || !partyType || !dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "Missing required params: partyId, partyType, dateFrom, dateTo" },
        { status: 400 },
      )
    }

    const entries = partyType === "customer"
      ? await fetchCustomerLedger(supabase, organizationId, partyId, dateFrom, dateTo)
      : await fetchSupplierLedger(supabase, organizationId, partyId, dateFrom, dateTo)

    entries.sort((a, b) => a.date.localeCompare(b.date) || a.documentNo.localeCompare(b.documentNo))

    let runningBalance = 0
    const ledger = entries.map((e) => {
      runningBalance += e.debit - e.credit
      return { ...e, balance: runningBalance }
    })

    return NextResponse.json({ data: ledger })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
