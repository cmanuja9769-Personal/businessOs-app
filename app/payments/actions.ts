"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { IPayment } from "@/types"
import { paymentSchema } from "@/lib/schemas"

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
  amountDelta: number
) {
  const { data: invoice } = await supabase
    .from("invoices")
    .select(TOTAL_PAID_SELECT)
    .eq("id", invoiceId)
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

  revalidatePath("/invoices")
  revalidatePath(`/invoices/${invoiceId}`)
}

async function updatePurchaseBalance(
  supabase: SupabaseClient,
  purchaseId: string,
  amountDelta: number
) {
  const { data: purchase } = await supabase
    .from("purchases")
    .select(TOTAL_PAID_SELECT)
    .eq("id", purchaseId)
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

  revalidatePath("/purchases")
  revalidatePath(`/purchases/${purchaseId}`)
}

export async function createPayment(data: unknown) {
  const validated = paymentSchema.parse(data)
  const supabase = await createClient()

  const { data: newPayment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      invoice_id: validated.invoiceId || null,
      purchase_id: validated.purchaseId || null,
      payment_date: typeof validated.paymentDate === 'string' ? validated.paymentDate : validated.paymentDate.toISOString().split("T")[0],
      amount: validated.amount,
      payment_method: validated.paymentMethod,
      reference_number: validated.referenceNumber || null,
      notes: validated.notes || null,
    })
    .select()
    .single()

  if (paymentError) {
    console.error("[v0] Error creating payment:", paymentError)
    return { success: false, error: paymentError.message }
  }

  if (validated.invoiceId) {
    await updateInvoiceBalance(supabase, validated.invoiceId, validated.amount)
  }

  if (validated.purchaseId) {
    await updatePurchaseBalance(supabase, validated.purchaseId, validated.amount)
  }

  return { success: true, payment: newPayment }
}

export async function getPaymentsByInvoice(invoiceId: string): Promise<IPayment[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("invoice_id", invoiceId)
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
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("purchase_id", purchaseId)
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
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("payments")
    .select(`
      *,
      invoices:invoice_id(invoice_number, customer_name),
      purchases:purchase_id(purchase_number, supplier_name)
    `)
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
  const supabase = await createClient()

  const { data: paymentData } = await supabase.from("payments").select("amount").eq("id", id).single()

  if (!paymentData) {
    return { success: false, error: "Payment not found" }
  }

  const { error: deleteError } = await supabase.from("payments").delete().eq("id", id)

  if (deleteError) {
    console.error("[v0] Error deleting payment:", deleteError)
    return { success: false, error: deleteError.message }
  }

  const reverseAmount = -Number(paymentData.amount)

  if (invoiceId) {
    await updateInvoiceBalance(supabase, invoiceId, reverseAmount)
  }

  if (purchaseId) {
    await updatePurchaseBalance(supabase, purchaseId, reverseAmount)
  }

  revalidatePath("/payments")
  return { success: true }
}
