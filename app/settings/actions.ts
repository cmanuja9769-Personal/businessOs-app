"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export interface ISettings {
  id: string
  businessName: string
  businessAddress?: string
  businessPhone?: string
  businessEmail?: string
  businessGst?: string
  businessLogoUrl?: string
  invoicePrefix: string
  purchasePrefix: string
  taxEnabled: boolean
  defaultTaxRate: number
  currencySymbol: string
  dateFormat: string
  financialYearStart: number
  lowStockAlert: boolean
  createdAt: Date
  updatedAt: Date
}

export async function getSettings(): Promise<ISettings> {
  const supabase = await createClient()

  let { data, error } = await supabase.from("settings").select("*").limit(1).single()

  // If no settings exist, create default settings
  if (error || !data) {
    const { data: newSettings, error: createError } = await supabase
      .from("settings")
      .insert({
        business_name: "My Business",
        invoice_prefix: "INV",
        purchase_prefix: "PO",
        tax_enabled: true,
        default_tax_rate: 18,
        currency_symbol: "₹",
        date_format: "dd/MM/yyyy",
        financial_year_start: 4,
        low_stock_alert: true,
      })
      .select()
      .single()

    if (createError) {
      console.error("[v0] Error creating default settings:", createError)
      // Return default values if creation fails
      return {
        id: "",
        businessName: "My Business",
        invoicePrefix: "INV",
        purchasePrefix: "PO",
        taxEnabled: true,
        defaultTaxRate: 18,
        currencySymbol: "₹",
        dateFormat: "dd/MM/yyyy",
        financialYearStart: 4,
        lowStockAlert: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }

    data = newSettings
  }

  return {
    id: data.id,
    businessName: data.business_name,
    businessAddress: data.business_address,
    businessPhone: data.business_phone,
    businessEmail: data.business_email,
    businessGst: data.business_gst,
    businessLogoUrl: data.business_logo_url,
    invoicePrefix: data.invoice_prefix,
    purchasePrefix: data.purchase_prefix,
    taxEnabled: data.tax_enabled,
    defaultTaxRate: Number(data.default_tax_rate),
    currencySymbol: data.currency_symbol,
    dateFormat: data.date_format,
    financialYearStart: data.financial_year_start,
    lowStockAlert: data.low_stock_alert,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}

export async function updateSettings(formData: FormData) {
  const supabase = await createClient()

  const data = {
    business_name: formData.get("businessName"),
    business_address: formData.get("businessAddress") || null,
    business_phone: formData.get("businessPhone") || null,
    business_email: formData.get("businessEmail") || null,
    business_gst: formData.get("businessGst") || null,
    invoice_prefix: formData.get("invoicePrefix"),
    purchase_prefix: formData.get("purchasePrefix"),
    tax_enabled: formData.get("taxEnabled") === "true",
    default_tax_rate: Number(formData.get("defaultTaxRate")),
    currency_symbol: formData.get("currencySymbol"),
    date_format: formData.get("dateFormat"),
    financial_year_start: Number(formData.get("financialYearStart")),
    low_stock_alert: formData.get("lowStockAlert") === "true",
  }

  // Get the first settings record
  const { data: existingSettings } = await supabase.from("settings").select("id").limit(1).single()

  if (existingSettings) {
    const { error } = await supabase.from("settings").update(data).eq("id", existingSettings.id)

    if (error) {
      console.error("[v0] Error updating settings:", error)
      return { success: false, error: error.message }
    }
  } else {
    const { error } = await supabase.from("settings").insert(data)

    if (error) {
      console.error("[v0] Error creating settings:", error)
      return { success: false, error: error.message }
    }
  }

  revalidatePath("/settings")
  return { success: true }
}
