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

interface AgingInput {
  readonly balance: number
  readonly dueDate: string | null
  readonly customerId: string
  readonly customerName: string
}

const EMPTY_SUMMARY: AgingBucket = { current: 0, days31to60: 0, days61to90: 0, over90: 0, total: 0 }

function computeAgingFromInvoices(invoices: readonly AgingInput[]): AgingAnalysisData {
  const today = new Date()
  const customerMap = new Map<string, CustomerAgingRow>()

  for (const inv of invoices) {
    if (inv.balance <= 0 || !inv.dueDate) continue

    const bucket = getDaysBucket(inv.dueDate, today)
    const existing = customerMap.get(inv.customerId) || {
      customerId: inv.customerId,
      customerName: inv.customerName,
      current: 0,
      days31to60: 0,
      days61to90: 0,
      over90: 0,
      total: 0,
    }

    customerMap.set(inv.customerId, {
      ...existing,
      [bucket]: existing[bucket] + inv.balance,
      total: existing.total + inv.balance,
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

function normalizeDemoInvoices(): AgingInput[] {
  return demoInvoices
    .filter((inv) => inv.documentType === "invoice" && inv.status !== "cancelled" && (Number(inv.balance) || 0) > 0)
    .map((inv) => ({
      balance: Number(inv.balance) || 0,
      dueDate: String(inv.dueDate || inv.invoiceDate || "") || null,
      customerId: inv.customerId || "unknown",
      customerName: inv.customerName || "Unknown Customer",
    }))
}

export async function getAgingAnalysis(): Promise<AgingAnalysisData> {
  if (await isDemoMode()) {
    return computeAgingFromInvoices(normalizeDemoInvoices())
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
    return { summary: EMPTY_SUMMARY, customers: [] }
  }

  const normalized = (invoices || []).map((inv) => ({
    balance: Number(inv.balance) || (Number(inv.total) - Number(inv.paid_amount || 0)),
    dueDate: (inv.due_date || inv.invoice_date) as string | null,
    customerId: (inv.customer_id as string) || "unknown",
    customerName: (inv.customer_name as string) || "Unknown Customer",
  }))

  return computeAgingFromInvoices(normalized)
}
