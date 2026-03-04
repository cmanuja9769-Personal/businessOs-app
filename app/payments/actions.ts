"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { IPayment } from "@/types"
import { paymentSchema } from "@/lib/schemas"
import { authorize, orgScope } from "@/lib/authorize"
import { createJournalEntryForPayment } from "@/lib/accounting/auto-journal"
import { isDemoMode, throwDemoMutationError } from "@/app/demo/helpers"
import { demoPayments, demoPaymentsExtended } from "@/app/demo/data"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

const TOTAL_PAID_SELECT = "total, paid_amount"
const ERROR_FETCHING_PAYMENTS = "[v0] Error fetching payments:"

function derivePaymentStatus(balance: number, paidAmount: number): "paid" | "partial" | "unpaid" {
  if (balance <= 0) return "paid"
  if (paidAmount > 0) return "partial"
  return "unpaid"
}

async function updateInvoiceBalance(
  supabase: SupabaseClient,
  invoiceId: string,
  amountDelta: number,
  organizationId: string,
) {
  const { data: invoice } = await supabase
    .from("invoices")
    .select(TOTAL_PAID_SELECT)
    .eq("id", invoiceId)
    .or(orgScope(organizationId))
    .single()

  if (!invoice) return

  const newPaidAmount = Number(invoice.paid_amount) + amountDelta
  const newBalance = Number(invoice.total) - newPaidAmount

  await supabase
    .from("invoices")
    .update({
      paid_amount: newPaidAmount,
      balance: newBalance,
      status: derivePaymentStatus(newBalance, newPaidAmount),
    })
    .eq("id", invoiceId)
    .or(orgScope(organizationId))

  revalidatePath("/invoices")
  revalidatePath(`/invoices/${invoiceId}`)
}

async function updatePurchaseBalance(
  supabase: SupabaseClient,
  purchaseId: string,
  amountDelta: number,
  organizationId: string,
) {
  const { data: purchase } = await supabase
    .from("purchases")
    .select(TOTAL_PAID_SELECT)
    .eq("id", purchaseId)
    .or(orgScope(organizationId))
    .single()

  if (!purchase) return

  const newPaidAmount = Number(purchase.paid_amount) + amountDelta
  const newBalance = Number(purchase.total) - newPaidAmount

  await supabase
    .from("purchases")
    .update({
      paid_amount: newPaidAmount,
      balance: newBalance,
      status: derivePaymentStatus(newBalance, newPaidAmount),
    })
    .eq("id", purchaseId)
    .or(orgScope(organizationId))

  revalidatePath("/purchases")
  revalidatePath(`/purchases/${purchaseId}`)
}

async function updateCustomerOutstanding(
  supabase: SupabaseClient,
  customerId: string,
  amountDelta: number,
  organizationId: string,
) {
  const { data: customer } = await supabase
    .from("customers")
    .select("outstanding_balance")
    .eq("id", customerId)
    .or(orgScope(organizationId))
    .single()

  if (!customer) return

  const newOutstanding = Math.max(0, (Number(customer.outstanding_balance) || 0) + amountDelta)

  await supabase
    .from("customers")
    .update({
      outstanding_balance: newOutstanding,
      last_transaction_date: new Date().toISOString().split("T")[0],
    })
    .eq("id", customerId)
    .or(orgScope(organizationId))
}

async function validatePaymentAmount(
  supabase: SupabaseClient,
  table: "invoices" | "purchases",
  recordId: string,
  amount: number,
  organizationId: string,
): Promise<string | null> {
  const { data: record } = await supabase
    .from(table)
    .select(TOTAL_PAID_SELECT)
    .eq("id", recordId)
    .or(orgScope(organizationId))
    .single()

  if (!record) return null

  const remaining = Number(record.total) - Number(record.paid_amount)
  if (amount > remaining + 0.01) {
    return `Payment of ₹${amount.toFixed(2)} exceeds remaining balance of ₹${remaining.toFixed(2)}`
  }
  return null
}

async function createJournalEntrySafe(params: Parameters<typeof createJournalEntryForPayment>[0]) {
  try {
    await createJournalEntryForPayment(params)
  } catch (journalErr) {
    console.error("[Payments] Journal entry creation failed (non-blocking):", journalErr)
  }
}

async function applyInvoicePaymentSideEffects(
  supabase: SupabaseClient,
  invoiceId: string,
  amount: number,
  organizationId: string,
) {
  await updateInvoiceBalance(supabase, invoiceId, amount, organizationId)
  const { data: invoice } = await supabase
    .from("invoices")
    .select("customer_id")
    .eq("id", invoiceId)
    .or(orgScope(organizationId))
    .single()
  if (invoice?.customer_id) {
    await updateCustomerOutstanding(supabase, invoice.customer_id, -amount, organizationId)
  }
}

function formatPaymentDate(paymentDate: string | Date): string {
  return typeof paymentDate === "string" ? paymentDate : paymentDate.toISOString().split("T")[0]
}

export async function createPayment(data: unknown) {
  if (await isDemoMode()) throwDemoMutationError()
  const validated = paymentSchema.parse(data)
  const { supabase, organizationId, userId } = await authorize("invoices", "update")

  if (validated.invoiceId) {
    const err = await validatePaymentAmount(supabase, "invoices", validated.invoiceId, validated.amount, organizationId)
    if (err) return { success: false, error: err }
  }

  if (validated.purchaseId) {
    const err = await validatePaymentAmount(supabase, "purchases", validated.purchaseId, validated.amount, organizationId)
    if (err) return { success: false, error: err }
  }

  const { data: newPayment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      organization_id: organizationId,
      invoice_id: validated.invoiceId || null,
      purchase_id: validated.purchaseId || null,
      payment_date: formatPaymentDate(validated.paymentDate),
      amount: validated.amount,
      payment_method: validated.paymentMethod,
      reference_number: validated.referenceNumber || null,
      notes: validated.notes || null,
    })
    .select()
    .single()

  if (paymentError) {
    console.error("[Payments] Error creating payment:", paymentError)
    return { success: false, error: paymentError.message }
  }

  if (validated.invoiceId) {
    await applyInvoicePaymentSideEffects(supabase, validated.invoiceId, validated.amount, organizationId)
  }

  if (validated.purchaseId) {
    await updatePurchaseBalance(supabase, validated.purchaseId, validated.amount, organizationId)
  }

  await createJournalEntrySafe({
    organizationId,
    userId,
    paymentId: newPayment.id,
    amount: validated.amount,
    paymentMethod: validated.paymentMethod,
    isReceivable: !!validated.invoiceId,
    referenceNo: validated.referenceNumber || undefined,
    description: validated.notes || undefined,
  })

  return { success: true, payment: newPayment }
}

export async function getPaymentsByInvoice(invoiceId: string): Promise<IPayment[]> {
  if (await isDemoMode()) return demoPayments.filter(p => p.invoiceId === invoiceId)
  const { supabase, organizationId } = await authorize("invoices", "read")
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("invoice_id", invoiceId)
    .or(orgScope(organizationId))
    .is("deleted_at", null)
    .order("payment_date", { ascending: false })

  if (error) {
    console.error(ERROR_FETCHING_PAYMENTS, error)
    return []
  }

  return (
    data?.map((payment) => ({
      id: payment.id,
      invoiceId: payment.invoice_id,
      purchaseId: payment.purchase_id,
      type: payment.invoice_id ? "receivable" : "payable" as "receivable" | "payable",
      customerName: undefined,
      supplierName: undefined,
      paymentDate: new Date(payment.payment_date),
      amount: Number(payment.amount),
      paymentMethod: payment.payment_method as IPayment["paymentMethod"],
      referenceNumber: payment.reference_number,
      notes: payment.notes,
      createdAt: new Date(payment.created_at),
    })) || []
  )
}

export async function getPaymentsByPurchase(purchaseId: string): Promise<IPayment[]> {
  if (await isDemoMode()) return demoPayments.filter(p => p.purchaseId === purchaseId)
  const { supabase, organizationId } = await authorize("purchases", "read")
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("purchase_id", purchaseId)
    .or(orgScope(organizationId))
    .is("deleted_at", null)
    .order("payment_date", { ascending: false })

  if (error) {
    console.error(ERROR_FETCHING_PAYMENTS, error)
    return []
  }

  return (
    data?.map((payment) => ({
      id: payment.id,
      invoiceId: payment.invoice_id,
      purchaseId: payment.purchase_id,
      type: payment.purchase_id ? "payable" : "receivable" as "receivable" | "payable",
      paymentDate: new Date(payment.payment_date),
      amount: Number(payment.amount),
      paymentMethod: payment.payment_method as IPayment["paymentMethod"],
      referenceNumber: payment.reference_number,
      notes: payment.notes,
      createdAt: new Date(payment.created_at),
    })) || []
  )
}

export async function getAllPayments() {
  if (await isDemoMode()) return demoPaymentsExtended
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
    console.error(ERROR_FETCHING_PAYMENTS, error)
    return []
  }

  return (
    data?.map((payment) => ({
      id: payment.id,
      invoiceId: payment.invoice_id,
      invoiceNumber: payment.invoices?.invoice_number,
      customerName: payment.invoices?.customer_name,
      purchaseId: payment.purchase_id,
      purchaseNumber: payment.purchases?.purchase_number,
      supplierName: payment.purchases?.supplier_name,
      paymentDate: new Date(payment.payment_date),
      amount: Number(payment.amount),
      paymentMethod: payment.payment_method,
      referenceNumber: payment.reference_number,
      notes: payment.notes,
      createdAt: new Date(payment.created_at),
    })) || []
  )
}

export async function deletePayment(id: string, invoiceId?: string, purchaseId?: string) {
  if (await isDemoMode()) throwDemoMutationError()
  const { supabase, organizationId } = await authorize("invoices", "delete")

  const { data: paymentData } = await supabase
    .from("payments")
    .select("amount")
    .eq("id", id)
    .or(orgScope(organizationId))
    .is("deleted_at", null)
    .single()

  if (!paymentData) {
    return { success: false, error: "Payment not found" }
  }

  const { error: deleteError } = await supabase
    .from("payments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .or(orgScope(organizationId))
    .is("deleted_at", null)

  if (deleteError) {
    console.error("[v0] Error deleting payment:", deleteError)
    return { success: false, error: deleteError.message }
  }

  const reverseAmount = -Number(paymentData.amount)

  if (invoiceId) {
    await updateInvoiceBalance(supabase, invoiceId, reverseAmount, organizationId)
  }

  if (purchaseId) {
    await updatePurchaseBalance(supabase, purchaseId, reverseAmount, organizationId)
  }

  revalidatePath("/payments")
  return { success: true }
}
