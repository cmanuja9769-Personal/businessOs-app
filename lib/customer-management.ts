// Customer Management Enhancements

import { createClient } from "@/lib/supabase/server"

export interface CustomerGroupData {
  name: string
  description?: string
  discountPercentage?: number
  creditLimit?: number
  creditDays?: number
}

export async function createCustomerGroup(organizationId: string, data: CustomerGroupData) {
  const supabase = await createClient()

  const { data: group, error } = await supabase
    .from("customer_groups")
    .insert({
      organization_id: organizationId,
      name: data.name,
      description: data.description || null,
      discount_percentage: data.discountPercentage || 0,
      credit_limit: data.creditLimit || 0,
      credit_days: data.creditDays || 0,
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating customer group:", error)
    return { success: false, error: error.message }
  }

  return { success: true, group }
}

export async function getCustomerGroups(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("customer_groups")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name")

  if (error) {
    console.error("[v0] Error fetching customer groups:", error)
    return []
  }

  return data || []
}

export async function getAgingAnalysis(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("customer_aging_analysis")
    .select("*")
    .eq("organization_id", organizationId)
    .gt("outstanding", 0)
    .order("outstanding", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching aging analysis:", error)
    return []
  }

  return data || []
}

export async function getCustomerStatement(customerId: string, startDate?: Date, endDate?: Date) {
  const supabase = await createClient()

  let query = supabase
    .from("invoices")
    .select("id, invoice_number, invoice_date, total, balance, status")
    .eq("customer_id", customerId)

  if (startDate) {
    query = query.gte("invoice_date", startDate.toISOString().split("T")[0])
  }

  if (endDate) {
    query = query.lte("invoice_date", endDate.toISOString().split("T")[0])
  }

  const { data, error } = await query.order("invoice_date", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching customer statement:", error)
    return []
  }

  return data || []
}

export async function checkCreditLimit(customerId: string) {
  const supabase = await createClient()

  const { data: customer } = await supabase
    .from("customers")
    .select("credit_limit, outstanding_balance")
    .eq("id", customerId)
    .single()

  if (!customer) {
    return { withinLimit: true, creditLimit: 0, outstanding: 0 }
  }

  const withinLimit = customer.outstanding_balance <= customer.credit_limit

  return {
    withinLimit,
    creditLimit: Number(customer.credit_limit),
    outstanding: Number(customer.outstanding_balance),
    available: Math.max(0, customer.credit_limit - customer.outstanding_balance),
  }
}
