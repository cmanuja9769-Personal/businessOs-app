"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { IPayment } from "@/types"
import { paymentSchema } from "@/lib/schemas"

export async function createPayment(data: unknown) {
  const validated = paymentSchema.parse(data)

  const supabase = await createClient()

  // Create payment record
  const { data: newPayment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      invoice_id: validated.invoiceId || null,
      purchase_id: validated.purchaseId || null,
      payment_date: validated.paymentDate.toISOString().split("T")[0],
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

  // Update invoice or purchase balance and status
  if (validated.invoiceId) {
    const { data: invoice } = await supabase
      .from("invoices")
      .select("total, paid_amount")
      .eq("id", validated.invoiceId)
      .single()

    if (invoice) {
      const newPaidAmount = Number(invoice.paid_amount) + validated.amount
      const newBalance = Number(invoice.total) - newPaidAmount
      const newStatus = newBalance <= 0 ? "paid" : newPaidAmount > 0 ? "partial" : "unpaid"

      await supabase
        .from("invoices")
        .update({
          paid_amount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
        })
        .eq("id", validated.invoiceId)

      revalidatePath("/invoices")
      revalidatePath(`/invoices/${validated.invoiceId}`)
    }
  }

  if (validated.purchaseId) {
    const { data: purchase } = await supabase
      .from("purchases")
      .select("total, paid_amount")
      .eq("id", validated.purchaseId)
      .single()

    if (purchase) {
      const newPaidAmount = Number(purchase.paid_amount) + validated.amount
      const newBalance = Number(purchase.total) - newPaidAmount
      const newStatus = newBalance <= 0 ? "paid" : newPaidAmount > 0 ? "partial" : "unpaid"

      await supabase
        .from("purchases")
        .update({
          paid_amount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
        })
        .eq("id", validated.purchaseId)

      revalidatePath("/purchases")
      revalidatePath(`/purchases/${validated.purchaseId}`)
    }
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
    console.error("[v0] Error fetching payments:", error)
    return []
  }

  return (
    data?.map((payment) => ({
      id: payment.id,
      invoiceId: payment.invoice_id,
      purchaseId: payment.purchase_id,
      paymentDate: new Date(payment.payment_date),
      amount: Number(payment.amount),
      paymentMethod: payment.payment_method as any,
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
    console.error("[v0] Error fetching payments:", error)
    return []
  }

  return (
    data?.map((payment) => ({
      id: payment.id,
      invoiceId: payment.invoice_id,
      purchaseId: payment.purchase_id,
      paymentDate: new Date(payment.payment_date),
      amount: Number(payment.amount),
      paymentMethod: payment.payment_method as any,
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
    console.error("[v0] Error fetching payments:", error)
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

  // Get payment amount before deletion
  const { data: paymentData } = await supabase.from("payments").select("amount").eq("id", id).single()

  if (!paymentData) {
    return { success: false, error: "Payment not found" }
  }

  const { error: deleteError } = await supabase.from("payments").delete().eq("id", id)

  if (deleteError) {
    console.error("[v0] Error deleting payment:", deleteError)
    return { success: false, error: deleteError.message }
  }

  // Update invoice or purchase balance
  if (invoiceId) {
    const { data: invoice } = await supabase.from("invoices").select("total, paid_amount").eq("id", invoiceId).single()

    if (invoice) {
      const newPaidAmount = Number(invoice.paid_amount) - Number(paymentData.amount)
      const newBalance = Number(invoice.total) - newPaidAmount
      const newStatus = newBalance <= 0 ? "paid" : newPaidAmount > 0 ? "partial" : "unpaid"

      await supabase
        .from("invoices")
        .update({
          paid_amount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
        })
        .eq("id", invoiceId)

      revalidatePath("/invoices")
      revalidatePath(`/invoices/${invoiceId}`)
    }
  }

  if (purchaseId) {
    const { data: purchase } = await supabase
      .from("purchases")
      .select("total, paid_amount")
      .eq("id", purchaseId)
      .single()

    if (purchase) {
      const newPaidAmount = Number(purchase.paid_amount) - Number(paymentData.amount)
      const newBalance = Number(purchase.total) - newPaidAmount
      const newStatus = newBalance <= 0 ? "paid" : newPaidAmount > 0 ? "partial" : "unpaid"

      await supabase
        .from("purchases")
        .update({
          paid_amount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
        })
        .eq("id", purchaseId)

      revalidatePath("/purchases")
      revalidatePath(`/purchases/${purchaseId}`)
    }
  }

  revalidatePath("/payments")
  return { success: true }
}
