"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { ISupplier } from "@/types"
import { supplierSchema } from "@/lib/schemas"

export async function getSuppliers(): Promise<ISupplier[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from("suppliers").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching suppliers:", error)
    return []
  }

  return (
    data?.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      contactNo: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      gstinNo: supplier.gst_number,
      createdAt: new Date(supplier.created_at),
      updatedAt: new Date(supplier.updated_at),
    })) || []
  )
}

export async function createSupplier(formData: FormData) {
  const data = {
    name: formData.get("name"),
    contactNo: formData.get("contactNo"),
    email: formData.get("email"),
    address: formData.get("address"),
    gstinNo: formData.get("gstinNo"),
  }

  const validated = supplierSchema.parse(data)

  const supabase = await createClient()
  const { data: newSupplier, error } = await supabase
    .from("suppliers")
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
    console.error("[v0] Error creating supplier:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/suppliers")
  return { success: true, supplier: newSupplier }
}

export async function updateSupplier(id: string, formData: FormData) {
  const data = {
    name: formData.get("name"),
    contactNo: formData.get("contactNo"),
    email: formData.get("email"),
    address: formData.get("address"),
    gstinNo: formData.get("gstinNo"),
  }

  const validated = supplierSchema.parse(data)

  const supabase = await createClient()
  const { error } = await supabase
    .from("suppliers")
    .update({
      name: validated.name,
      phone: validated.contactNo,
      email: validated.email || null,
      address: validated.address || null,
      gst_number: validated.gstinNo || null,
    })
    .eq("id", id)

  if (error) {
    console.error("[v0] Error updating supplier:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/suppliers")
  return { success: true }
}

export async function deleteSupplier(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("suppliers").delete().eq("id", id)

  if (error) {
    console.error("[v0] Error deleting supplier:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/suppliers")
  return { success: true }
}
