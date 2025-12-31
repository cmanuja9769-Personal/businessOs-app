"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { ICustomer } from "@/types"
import { customerSchema } from "@/lib/schemas"
import { fetchGSTDetails, type GSTDetails } from "@/lib/gst-lookup"

export async function getCustomers(): Promise<ICustomer[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching customers:", error)
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
}

export async function createCustomer(formData: FormData) {
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

  const supabase = await createClient()
  const { data: newCustomer, error } = await supabase
    .from("customers")
    .insert({
      name: validated.name,
      phone: validated.contactNo,
      email: validated.email || null,
      address: validated.address || null,
      gst_number: validated.gstinNo || null,
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating customer:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/customers")
  return { success: true, customer: newCustomer }
}

export async function updateCustomer(id: string, formData: FormData) {
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

  const supabase = await createClient()
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

  if (error) {
    console.error("[v0] Error updating customer:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/customers")
  return { success: true }
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("customers").delete().eq("id", id)

  if (error) {
    console.error("[v0] Error deleting customer:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/customers")
  return { success: true }
}

export async function bulkImportCustomers(customersData: ICustomer[]) {
  const supabase = await createClient()

  const records = customersData.map((customer) => ({
    name: customer.name,
    phone: customer.contactNo,
    email: customer.email || null,
    address: customer.address || null,
    gst_number: customer.gstinNo || null,
  }))

  const { error } = await supabase.from("customers").insert(records)

  if (error) {
    console.error("[v0] Error bulk importing customers:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/customers")
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
