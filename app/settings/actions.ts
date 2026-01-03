"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrganization } from "@/lib/organizations"

export interface IOrganization {
  id: string
  name: string
  email?: string
  phone?: string
  gstNumber?: string
  panNumber?: string
  address?: string
}

export async function getOrganizationDetails(): Promise<IOrganization | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    console.error("[settings] No authenticated user")
    return null
  }

  const org = await getCurrentOrganization(data.user.id)
  if (!org) {
    console.error("[settings] No organization found for user:", data.user.id)
    return null
  }

  // Handle array or object response
  const resolved = Array.isArray(org) ? org[0] : org

  return {
    id: resolved?.id || "",
    name: resolved?.name || "My Business",
    email: resolved?.email || undefined,
    phone: resolved?.phone || undefined,
    gstNumber: resolved?.gst_number || undefined,
    panNumber: resolved?.pan_number || undefined,
    address: resolved?.address || undefined,
  }
}

export interface ISettings {
  id: string
  businessName: string
  businessAddress?: string
  businessPhone?: string
  businessEmail?: string
  businessGst?: string
  businessLogoUrl?: string
  businessPan?: string
  signatureImageUrl?: string
  // Bank details
  bankName?: string
  bankAccountNo?: string
  bankIfsc?: string
  upiId?: string
  // Invoice customization
  invoiceTemplate: "classic" | "modern" | "minimal"
  templateColor: string
  customTerms?: string
  invoiceFooter?: string
  // Document prefixes
  invoicePrefix: string
  purchasePrefix: string
  // Application settings
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
        invoiceTemplate: "classic" as const,
        templateColor: "#3b82f6",
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
    businessPan: data.business_pan,
    signatureImageUrl: data.signature_image_url,
    bankName: data.bank_name,
    bankAccountNo: data.bank_account_no,
    bankIfsc: data.bank_ifsc,
    upiId: data.upi_id,
    invoiceTemplate: (data.invoice_template || "classic") as "classic" | "modern" | "minimal",
    templateColor: data.template_color || "#6366f1",
    customTerms: data.custom_terms,
    invoiceFooter: data.invoice_footer,
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

  // Build update object only with provided values
  const data: any = {}
  
  const businessName = formData.get("businessName")
  if (businessName) data.business_name = businessName
  
  const businessAddress = formData.get("businessAddress")
  if (businessAddress !== null) data.business_address = businessAddress || null
  
  const businessPhone = formData.get("businessPhone")
  if (businessPhone !== null) data.business_phone = businessPhone || null
  
  const businessEmail = formData.get("businessEmail")
  if (businessEmail !== null) data.business_email = businessEmail || null
  
  const businessGst = formData.get("businessGst")
  if (businessGst !== null) data.business_gst = businessGst || null
  
  const businessLogoUrl = formData.get("businessLogoUrl")
  if (businessLogoUrl !== null) data.business_logo_url = businessLogoUrl || null
  
  const businessPan = formData.get("businessPan")
  if (businessPan !== null) data.business_pan = businessPan || null
  
  const signatureImageUrl = formData.get("signatureImageUrl")
  if (signatureImageUrl !== null) data.signature_image_url = signatureImageUrl || null
  
  const bankName = formData.get("bankName")
  if (bankName !== null) data.bank_name = bankName || null
  
  const bankAccountNo = formData.get("bankAccountNo")
  if (bankAccountNo !== null) data.bank_account_no = bankAccountNo || null
  
  const bankIfsc = formData.get("bankIfsc")
  if (bankIfsc !== null) data.bank_ifsc = bankIfsc || null
  
  const upiId = formData.get("upiId")
  if (upiId !== null) data.upi_id = upiId || null
  
  const invoiceTemplate = formData.get("invoiceTemplate")
  if (invoiceTemplate) data.invoice_template = invoiceTemplate
  
  const templateColor = formData.get("templateColor")
  if (templateColor) data.template_color = templateColor
  
  const customTerms = formData.get("customTerms")
  if (customTerms !== null) data.custom_terms = customTerms || null
  
  const invoiceFooter = formData.get("invoiceFooter")
  if (invoiceFooter !== null) data.invoice_footer = invoiceFooter || null
  
  const invoicePrefix = formData.get("invoicePrefix")
  if (invoicePrefix) data.invoice_prefix = invoicePrefix
  
  const purchasePrefix = formData.get("purchasePrefix")
  if (purchasePrefix) data.purchase_prefix = purchasePrefix
  
  const taxEnabled = formData.get("taxEnabled")
  if (taxEnabled !== null) data.tax_enabled = taxEnabled === "true"
  
  const defaultTaxRate = formData.get("defaultTaxRate")
  if (defaultTaxRate) data.default_tax_rate = Number(defaultTaxRate)
  
  const currencySymbol = formData.get("currencySymbol")
  if (currencySymbol) data.currency_symbol = currencySymbol
  
  const dateFormat = formData.get("dateFormat")
  if (dateFormat) data.date_format = dateFormat
  
  const financialYearStart = formData.get("financialYearStart")
  if (financialYearStart) data.financial_year_start = Number(financialYearStart)
  
  const lowStockAlert = formData.get("lowStockAlert")
  if (lowStockAlert !== null) data.low_stock_alert = lowStockAlert === "true"

  // Get the first settings record
  const { data: existingSettings } = await supabase.from("settings").select("id").limit(1).single()

  if (existingSettings) {
    const { error } = await supabase.from("settings").update(data).eq("id", existingSettings.id)

    if (error) {
      console.error("[v0] Error updating settings:", error)
      return { success: false, error: error.message }
    }
  } else {
    // For new settings, ensure business_name is provided
    if (!data.business_name) {
      data.business_name = "My Business"
    }
    if (!data.invoice_prefix) {
      data.invoice_prefix = "INV"
    }
    if (!data.purchase_prefix) {
      data.purchase_prefix = "PO"
    }
    
    const { error } = await supabase.from("settings").insert(data)

    if (error) {
      console.error("[v0] Error creating settings:", error)
      return { success: false, error: error.message }
    }
  }

  revalidatePath("/settings")
  return { success: true }
}
