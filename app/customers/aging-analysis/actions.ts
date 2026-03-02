"use server"

import { authorize } from "@/lib/authorize"
import { isDemoMode } from "@/app/demo/helpers"
import { demoInvoices } from "@/app/demo/data"

interface AgingBucket {
  readonly current: number
  readonly days31to60: number
  readonly days61to90: number
  readonly over90: number
  readonly total: number
}

export interface CustomerAgingRow {
  readonly customerId: string
  readonly customerName: string
  readonly current: number
  readonly days31to60: number
  readonly days61to90: number
  readonly over90: number
  readonly total: number
}

export interface AgingAnalysisData {
  readonly summary: AgingBucket
  readonly customers: readonly CustomerAgingRow[]
}

function getDaysBucket(dueDate: string, today: Date): keyof Omit<AgingBucket, "total"> {
  const due = new Date(dueDate)
  const diffMs = today.getTime() - due.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 30) return "current"
  if (diffDays <= 60) return "days31to60"
  if (diffDays <= 90) return "days61to90"
  return "over90"
}

export async function getAgingAnalysis(): Promise<AgingAnalysisData> {
  if (await isDemoMode()) {
    const today = new Date()
    const customerMap = new Map<string, CustomerAgingRow>()
    const unpaidInvoices = demoInvoices.filter(
      (inv) => inv.documentType === "invoice" && inv.status !== "cancelled" && (Number(inv.balance) || 0) > 0
    )
    for (const inv of unpaidInvoices) {
      const balanceAmount = Number(inv.balance) || 0
      if (balanceAmount <= 0) continue
      const dueDate = inv.dueDate || inv.invoiceDate
      if (!dueDate) continue
      const bucket = getDaysBucket(String(dueDate), today)
      const custId = inv.customerId || "unknown"
      const custName = inv.customerName || "Unknown Customer"
      const existing = customerMap.get(custId) || {
        customerId: custId, customerName: custName, current: 0, days31to60: 0, days61to90: 0, over90: 0, total: 0,
      }
      customerMap.set(custId, { ...existing, [bucket]: existing[bucket] + balanceAmount, total: existing.total + balanceAmount })
    }
    const customers = [...customerMap.values()].sort((a, b) => b.total - a.total)
    const summary: AgingBucket = {
      current: customers.reduce((s, c) => s + c.current, 0),
      days31to60: customers.reduce((s, c) => s + c.days31to60, 0),
      days61to90: customers.reduce((s, c) => s + c.days61to90, 0),
      over90: customers.reduce((s, c) => s + c.over90, 0),
      total: customers.reduce((s, c) => s + c.total, 0),
    }
    return { summary, customers }
  }

  const { supabase, organizationId } = await authorize("invoices", "read")

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("id, customer_id, customer_name, due_date, invoice_date, total, paid_amount, balance, status, doc_type")
    .eq("organization_id", organizationId)
    .eq("doc_type", "invoice")
    .neq("status", "cancelled")
    .gt("balance", 0)

  if (error) {
    console.error("[AgingAnalysis] Error fetching invoices:", error)
    return { summary: { current: 0, days31to60: 0, days61to90: 0, over90: 0, total: 0 }, customers: [] }
  }

  const today = new Date()
  const customerMap = new Map<string, CustomerAgingRow>()

  for (const inv of invoices || []) {
    const balanceAmount = Number(inv.balance) || (Number(inv.total) - Number(inv.paid_amount || 0))
    if (balanceAmount <= 0) continue

    const dueDate = inv.due_date || inv.invoice_date
    if (!dueDate) continue

    const bucket = getDaysBucket(dueDate, today)
    const custId = inv.customer_id || "unknown"
    const custName = inv.customer_name || "Unknown Customer"

    const existing = customerMap.get(custId) || {
      customerId: custId,
      customerName: custName,
      current: 0,
      days31to60: 0,
      days61to90: 0,
      over90: 0,
      total: 0,
    }

    customerMap.set(custId, {
      ...existing,
      [bucket]: existing[bucket] + balanceAmount,
      total: existing.total + balanceAmount,
    })
  }

  const customers = [...customerMap.values()].sort((a, b) => b.total - a.total)

  const summary: AgingBucket = {
    current: customers.reduce((s, c) => s + c.current, 0),
    days31to60: customers.reduce((s, c) => s + c.days31to60, 0),
    days61to90: customers.reduce((s, c) => s + c.days61to90, 0),
    over90: customers.reduce((s, c) => s + c.over90, 0),
    total: customers.reduce((s, c) => s + c.total, 0),
  }

  return { summary, customers }
}
