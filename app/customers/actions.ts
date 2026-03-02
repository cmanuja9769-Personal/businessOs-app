"use server"

import { revalidatePath } from "next/cache"
import type { ICustomer } from "@/types"
import { customerSchema } from "@/lib/schemas"
import { authorize, orgScope } from "@/lib/authorize"
import { fetchGSTDetails, type GSTDetails } from "@/lib/gst-lookup"
import { isDemoMode, throwDemoMutationError } from "@/app/demo/helpers"
import { demoCustomers } from "@/app/demo/data"

const CUSTOMERS_PATH = "/customers"

export async function getCustomers(): Promise<ICustomer[]> {
  if (await isDemoMode()) return demoCustomers
  try {
  const { supabase, organizationId } = await authorize("customers", "read")
  const { data, error } = await supabase.from("customers").select("*").or(orgScope(organizationId)).is("deleted_at", null).order("created_at", { ascending: false })

  if (error) {
    console.error("[Customers] Error fetching customers:", error.message || error)
    return []
  }

  return (
    data?.map((customer) => ({
      id: customer.id,
      name: customer.name,
      contactNo: customer.phone,
      email: customer.email,
      address: customer.address,
      gstinNo: customer.gst_number,
      openingBalance: 0,
      openingDate: new Date(),
      createdAt: new Date(customer.created_at),
      updatedAt: new Date(customer.updated_at),
    })) || []
  )
  } catch {
    return []
  }
}

export async function createCustomer(formData: FormData) {
  if (await isDemoMode()) throwDemoMutationError()
  const data = {
    name: formData.get("name"),
    contactNo: formData.get("contactNo"),
    email: formData.get("email"),
    address: formData.get("address"),
    openingBalance: formData.get("openingBalance"),
    openingDate: formData.get("openingDate"),
    gstinNo: formData.get("gstinNo"),
  }

  const validated = customerSchema.parse(data)

  const { supabase, organizationId } = await authorize("customers", "create")
  const { data: newCustomer, error } = await supabase
    .from("customers")
    .insert({
      name: validated.name,
      phone: validated.contactNo,
      email: validated.email || null,
      address: validated.address || null,
      gst_number: validated.gstinNo || null,
      organization_id: organizationId,
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating customer:", error)
    return { success: false, error: error.message }
  }

  revalidatePath(CUSTOMERS_PATH)
  return { success: true, customer: newCustomer }
}

export async function updateCustomer(id: string, formData: FormData) {
  if (await isDemoMode()) throwDemoMutationError()
  const data = {
    name: formData.get("name"),
    contactNo: formData.get("contactNo"),
    email: formData.get("email"),
    address: formData.get("address"),
    openingBalance: formData.get("openingBalance"),
    openingDate: formData.get("openingDate"),
    gstinNo: formData.get("gstinNo"),
  }

  const validated = customerSchema.parse(data)

  const { supabase, organizationId } = await authorize("customers", "update")
  const { error } = await supabase
    .from("customers")
    .update({
      name: validated.name,
      phone: validated.contactNo,
      email: validated.email || null,
      address: validated.address || null,
      gst_number: validated.gstinNo || null,
    })
    .eq("id", id)
    .or(orgScope(organizationId))

  if (error) {
    console.error("[v0] Error updating customer:", error)
    return { success: false, error: error.message }
  }

  revalidatePath(CUSTOMERS_PATH)
  return { success: true }
}

export async function deleteCustomer(id: string) {
  if (await isDemoMode()) throwDemoMutationError()
  const { supabase, organizationId } = await authorize("customers", "delete")
  const { error } = await supabase
    .from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .or(orgScope(organizationId))

  if (error) {
    console.error("[v0] Error deleting customer:", error)
    return { success: false, error: error.message }
  }

  revalidatePath(CUSTOMERS_PATH)
  return { success: true }
}

export async function bulkDeleteCustomers(ids: string[]) {
  if (await isDemoMode()) throwDemoMutationError()
  if (!ids || ids.length === 0) {
    return { success: false, error: "No customers selected" }
  }

  const { supabase, organizationId } = await authorize("customers", "delete")
  const { error, count } = await supabase
    .from("customers")
    .delete()
    .in("id", ids)
    .or(orgScope(organizationId))
    .select()

  if (error) {
    console.error("[v0] Error bulk deleting customers:", error)
    return { success: false, error: error.message }
  }

  revalidatePath(CUSTOMERS_PATH)
  return { 
    success: true, 
    deleted: count || ids.length,
    message: `Successfully deleted ${count || ids.length} customer(s)` 
  }
}

export async function deleteAllCustomers() {
  if (await isDemoMode()) throwDemoMutationError()
  const { supabase, organizationId } = await authorize("customers", "delete")
  
  const { count } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .or(orgScope(organizationId))
  
  if (!count || count === 0) {
    return { success: false, error: "No customers to delete" }
  }

  const { error } = await supabase
    .from("customers")
    .delete()
    .or(orgScope(organizationId))
    .neq("id", "00000000-0000-0000-0000-000000000000")

  if (error) {
    console.error("[v0] Error deleting all customers:", error)
    return { success: false, error: error.message }
  }

  revalidatePath(CUSTOMERS_PATH)
  return { 
    success: true, 
    deleted: count,
    message: `Successfully deleted all ${count} customer(s)` 
  }
}

export async function bulkImportCustomers(customersData: ICustomer[]) {
  if (await isDemoMode()) throwDemoMutationError()
  const { supabase, organizationId } = await authorize("customers", "create")

  const records = customersData.map((customer) => ({
    name: customer.name,
    phone: customer.contactNo,
    email: customer.email || null,
    address: customer.address || null,
    gst_number: customer.gstinNo || null,
    organization_id: organizationId,
  }))

  const { error } = await supabase.from("customers").insert(records)

  if (error) {
    console.error("[v0] Error bulk importing customers:", error)
    return { success: false, error: error.message }
  }

  revalidatePath(CUSTOMERS_PATH)
  return { success: true, count: customersData.length }
}

/**
 * Fetches GST details for a given GSTIN
 * @param gstin - The GST number to lookup
 * @returns GST details including address or error
 */
export async function lookupGSTDetails(gstin: string): Promise<{ success: boolean; data?: GSTDetails; error?: string }> {
  try {
    const details = await fetchGSTDetails(gstin)
    
    if (!details) {
      return { success: false, error: "GST details not found" }
    }

    return { success: true, data: details }
  } catch (error) {
    console.error("[v0] Error fetching GST details:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch GST details" 
    }
  }
}
