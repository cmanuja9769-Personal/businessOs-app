"use server"

import { revalidatePath } from "next/cache"
import { getCurrentOrganization } from "@/lib/organizations"
import { authorize } from "@/lib/authorize"
import { isDemoMode, throwDemoMutationError, DEMO_ORG_ID, DEMO_ORG_NAME } from "@/app/demo/helpers"

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
  if (await isDemoMode()) return { id: DEMO_ORG_ID, name: DEMO_ORG_NAME, email: "info@techmart.in", phone: "080-26541234", gstNumber: "29AABCT1234F1ZX", panNumber: "AABCT1234F", address: "No. 42, Industrial Area, Peenya, Bengaluru - 560058" }
  const { supabase } = await authorize("settings", "read")
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
  bankName?: string
  bankAccountNo?: string
  bankIfsc?: string
  upiId?: string
  bankAccountHolderName?: string
  bankBranchName?: string
  invoiceTemplate: "classic" | "modern" | "minimal"
  templateColor: string
  customTerms?: string
  invoiceFooter?: string
  defaultNotes?: string
  invoicePrefix: string
  purchasePrefix: string
  quotationPrefix: string
  proformaPrefix: string
  salesOrderPrefix: string
  deliveryChallanPrefix: string
  creditNotePrefix: string
  debitNotePrefix: string
  taxEnabled: boolean
  defaultTaxRate: number
  currencySymbol: string
  dateFormat: string
  financialYearStart: number
  lowStockAlert: boolean
  lowStockThreshold: number
  defaultPaymentTermsDays: number
  defaultBillingMode: "gst" | "non-gst"
  defaultPricingMode: "sale" | "wholesale" | "quantity"
  defaultPackingType: "loose" | "carton"
  showAmountInWords: boolean
  roundOffTotal: boolean
  invoiceNumberResetMode: "never" | "yearly" | "monthly"
  nextInvoiceNumber: number
  multiCurrencyEnabled: boolean
  secondaryCurrencies: string
  emailNotificationsEnabled: boolean
  emailOnInvoiceCreated: boolean
  emailOnPaymentReceived: boolean
  emailOnLowStock: boolean
  notificationEmail: string
  customField1Enabled: boolean
  customField1Label: string
  customField2Enabled: boolean
  customField2Label: string
  createdAt: Date
  updatedAt: Date
}

export async function getSettings(): Promise<ISettings> {
  if (await isDemoMode()) return {
    id: "demo-settings", businessName: DEMO_ORG_NAME, businessAddress: "No. 42, Industrial Area, Peenya, Bengaluru - 560058",
    businessPhone: "080-26541234", businessEmail: "info@techmart.in", businessGst: "29AABCT1234F1ZX", businessPan: "AABCT1234F",
    invoiceTemplate: "modern", templateColor: "#3b82f6",
    invoicePrefix: "INV", purchasePrefix: "PUR", quotationPrefix: "QTN", proformaPrefix: "PI",
    salesOrderPrefix: "SO", deliveryChallanPrefix: "DC", creditNotePrefix: "CN", debitNotePrefix: "DN",
    taxEnabled: true, defaultTaxRate: 18, currencySymbol: "₹", dateFormat: "dd/MM/yyyy",
    financialYearStart: 4, lowStockAlert: true, lowStockThreshold: 10,
    defaultPaymentTermsDays: 30, defaultBillingMode: "gst" as const, defaultPricingMode: "sale" as const,
    defaultPackingType: "loose" as const, showAmountInWords: true, roundOffTotal: true,
    invoiceNumberResetMode: "never" as const, nextInvoiceNumber: 1,
    multiCurrencyEnabled: false, secondaryCurrencies: "",
    emailNotificationsEnabled: false, emailOnInvoiceCreated: false,
    emailOnPaymentReceived: false, emailOnLowStock: false, notificationEmail: "",
    customField1Enabled: false, customField1Label: "Custom Field 1",
    customField2Enabled: false, customField2Label: "Custom Field 2",
    createdAt: new Date(), updatedAt: new Date(),
  }
  const { supabase, organizationId } = await authorize("settings", "read")

  const result = await supabase.from("settings").select("*").eq("organization_id", organizationId).limit(1).single()
  let data = result.data
  const { error } = result

  if (error || !data) {
    const { data: newSettings, error: createError } = await supabase
      .from("settings")
      .insert({
        organization_id: organizationId,
        business_name: "My Business",
        invoice_prefix: "INV",
        purchase_prefix: "PO",
        quotation_prefix: "QTN",
        proforma_prefix: "PI",
        sales_order_prefix: "SO",
        delivery_challan_prefix: "DC",
        credit_note_prefix: "CN",
        debit_note_prefix: "DN",
        tax_enabled: true,
        default_tax_rate: 18,
        currency_symbol: "₹",
        date_format: "dd/MM/yyyy",
        financial_year_start: 4,
        low_stock_alert: true,
        low_stock_threshold: 10,
        default_payment_terms_days: 0,
        default_billing_mode: "gst",
        default_pricing_mode: "sale",
        default_packing_type: "loose",
        show_amount_in_words: true,
        round_off_total: true,
        invoice_number_reset_mode: "never",
        next_invoice_number: 1,
        multi_currency_enabled: false,
        secondary_currencies: "",
        email_notifications_enabled: false,
        email_on_invoice_created: false,
        email_on_payment_received: false,
        email_on_low_stock: false,
        notification_email: "",
        custom_field_1_enabled: false,
        custom_field_1_label: "Custom Field 1",
        custom_field_2_enabled: false,
        custom_field_2_label: "Custom Field 2",
      })
      .select()
      .single()

    if (createError) {
      console.error("[v0] Error creating default settings:", createError)
      return {
        id: "",
        businessName: "My Business",
        invoicePrefix: "INV",
        purchasePrefix: "PO",
        quotationPrefix: "QTN",
        proformaPrefix: "PI",
        salesOrderPrefix: "SO",
        deliveryChallanPrefix: "DC",
        creditNotePrefix: "CN",
        debitNotePrefix: "DN",
        invoiceTemplate: "classic" as const,
        templateColor: "#3b82f6",
        taxEnabled: true,
        defaultTaxRate: 18,
        currencySymbol: "₹",
        dateFormat: "dd/MM/yyyy",
        financialYearStart: 4,
        lowStockAlert: true,
        lowStockThreshold: 10,
        defaultPaymentTermsDays: 0,
        defaultBillingMode: "gst" as const,
        defaultPricingMode: "sale" as const,
        defaultPackingType: "loose" as const,
        showAmountInWords: true,
        roundOffTotal: true,
        invoiceNumberResetMode: "never" as const,
        nextInvoiceNumber: 1,
        multiCurrencyEnabled: false,
        secondaryCurrencies: "",
        emailNotificationsEnabled: false,
        emailOnInvoiceCreated: false,
        emailOnPaymentReceived: false,
        emailOnLowStock: false,
        notificationEmail: "",
        customField1Enabled: false,
        customField1Label: "Custom Field 1",
        customField2Enabled: false,
        customField2Label: "Custom Field 2",
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
    bankAccountHolderName: data.bank_account_holder_name,
    bankBranchName: data.bank_branch_name,
    invoiceTemplate: (data.invoice_template || "classic") as "classic" | "modern" | "minimal",
    templateColor: data.template_color || "#6366f1",
    customTerms: data.custom_terms,
    invoiceFooter: data.invoice_footer,
    defaultNotes: data.default_notes,
    invoicePrefix: data.invoice_prefix,
    purchasePrefix: data.purchase_prefix,
    quotationPrefix: data.quotation_prefix || "QTN",
    proformaPrefix: data.proforma_prefix || "PI",
    salesOrderPrefix: data.sales_order_prefix || "SO",
    deliveryChallanPrefix: data.delivery_challan_prefix || "DC",
    creditNotePrefix: data.credit_note_prefix || "CN",
    debitNotePrefix: data.debit_note_prefix || "DN",
    taxEnabled: data.tax_enabled,
    defaultTaxRate: Number(data.default_tax_rate),
    currencySymbol: data.currency_symbol,
    dateFormat: data.date_format, 
    financialYearStart: data.financial_year_start,
    lowStockAlert: data.low_stock_alert,
    lowStockThreshold: data.low_stock_threshold ?? 10,
    defaultPaymentTermsDays: data.default_payment_terms_days ?? 0,
    defaultBillingMode: (data.default_billing_mode || "gst") as "gst" | "non-gst",
    defaultPricingMode: (data.default_pricing_mode || "sale") as "sale" | "wholesale" | "quantity",
    defaultPackingType: (data.default_packing_type || "loose") as "loose" | "carton",
    showAmountInWords: data.show_amount_in_words ?? true,
    roundOffTotal: data.round_off_total ?? true,
    invoiceNumberResetMode: (data.invoice_number_reset_mode || "never") as "never" | "yearly" | "monthly",
    nextInvoiceNumber: data.next_invoice_number ?? 1,
    multiCurrencyEnabled: data.multi_currency_enabled ?? false,
    secondaryCurrencies: data.secondary_currencies || "",
    emailNotificationsEnabled: data.email_notifications_enabled ?? false,
    emailOnInvoiceCreated: data.email_on_invoice_created ?? false,
    emailOnPaymentReceived: data.email_on_payment_received ?? false,
    emailOnLowStock: data.email_on_low_stock ?? false,
    notificationEmail: data.notification_email || "",
    customField1Enabled: data.custom_field_1_enabled ?? false,
    customField1Label: data.custom_field_1_label || "Custom Field 1",
    customField2Enabled: data.custom_field_2_enabled ?? false,
    customField2Label: data.custom_field_2_label || "Custom Field 2",
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}

export async function updateSettings(formData: FormData) {
  if (await isDemoMode()) throwDemoMutationError()
  const { supabase, organizationId } = await authorize("settings", "update")

  const getString = (key: string): string | null => {
    const val = formData.get(key)
    return typeof val === "string" ? val : null
  }

  const data: Record<string, string | boolean | number | null> = {}
  
  const businessName = getString("businessName")
  if (businessName) data.business_name = businessName
  
  const businessAddress = getString("businessAddress")
  if (businessAddress !== null) data.business_address = businessAddress || null
  
  const businessPhone = getString("businessPhone")
  if (businessPhone !== null) data.business_phone = businessPhone || null
  
  const businessEmail = getString("businessEmail")
  if (businessEmail !== null) data.business_email = businessEmail || null
  
  const businessGst = getString("businessGst")
  if (businessGst !== null) data.business_gst = businessGst || null
  
  const businessLogoUrl = getString("businessLogoUrl")
  if (businessLogoUrl !== null) data.business_logo_url = businessLogoUrl || null
  
  const businessPan = getString("businessPan")
  if (businessPan !== null) data.business_pan = businessPan || null
  
  const signatureImageUrl = getString("signatureImageUrl")
  if (signatureImageUrl !== null) data.signature_image_url = signatureImageUrl || null
  
  const bankName = getString("bankName")
  if (bankName !== null) data.bank_name = bankName || null
  
  const bankAccountNo = getString("bankAccountNo")
  if (bankAccountNo !== null) data.bank_account_no = bankAccountNo || null
  
  const bankIfsc = getString("bankIfsc")
  if (bankIfsc !== null) data.bank_ifsc = bankIfsc || null
  
  const upiId = getString("upiId")
  if (upiId !== null) data.upi_id = upiId || null

  const bankAccountHolderName = getString("bankAccountHolderName")
  if (bankAccountHolderName !== null) data.bank_account_holder_name = bankAccountHolderName || null

  const bankBranchName = getString("bankBranchName")
  if (bankBranchName !== null) data.bank_branch_name = bankBranchName || null
  
  const invoiceTemplate = getString("invoiceTemplate")
  if (invoiceTemplate) data.invoice_template = invoiceTemplate
  
  const templateColor = getString("templateColor")
  if (templateColor) data.template_color = templateColor
  
  const customTerms = getString("customTerms")
  if (customTerms !== null) data.custom_terms = customTerms || null
  
  const invoiceFooter = getString("invoiceFooter")
  if (invoiceFooter !== null) data.invoice_footer = invoiceFooter || null

  const defaultNotes = getString("defaultNotes")
  if (defaultNotes !== null) data.default_notes = defaultNotes || null
  
  const invoicePrefix = getString("invoicePrefix")
  if (invoicePrefix) data.invoice_prefix = invoicePrefix
  
  const purchasePrefix = getString("purchasePrefix")
  if (purchasePrefix) data.purchase_prefix = purchasePrefix

  const quotationPrefix = getString("quotationPrefix")
  if (quotationPrefix) data.quotation_prefix = quotationPrefix

  const proformaPrefix = getString("proformaPrefix")
  if (proformaPrefix) data.proforma_prefix = proformaPrefix

  const salesOrderPrefix = getString("salesOrderPrefix")
  if (salesOrderPrefix) data.sales_order_prefix = salesOrderPrefix

  const deliveryChallanPrefix = getString("deliveryChallanPrefix")
  if (deliveryChallanPrefix) data.delivery_challan_prefix = deliveryChallanPrefix

  const creditNotePrefix = getString("creditNotePrefix")
  if (creditNotePrefix) data.credit_note_prefix = creditNotePrefix

  const debitNotePrefix = getString("debitNotePrefix")
  if (debitNotePrefix) data.debit_note_prefix = debitNotePrefix
  
  const taxEnabled = getString("taxEnabled")
  if (taxEnabled !== null) data.tax_enabled = taxEnabled === "true"
  
  const defaultTaxRate = getString("defaultTaxRate")
  if (defaultTaxRate) data.default_tax_rate = Number(defaultTaxRate)
  
  const currencySymbol = getString("currencySymbol")
  if (currencySymbol) data.currency_symbol = currencySymbol
  
  const dateFormat = getString("dateFormat")
  if (dateFormat) data.date_format = dateFormat
  
  const financialYearStart = getString("financialYearStart")
  if (financialYearStart) data.financial_year_start = Number(financialYearStart)
  
  const lowStockAlert = getString("lowStockAlert")
  if (lowStockAlert !== null) data.low_stock_alert = lowStockAlert === "true"

  const lowStockThreshold = getString("lowStockThreshold")
  if (lowStockThreshold) data.low_stock_threshold = Number(lowStockThreshold)

  const defaultPaymentTermsDays = getString("defaultPaymentTermsDays")
  if (defaultPaymentTermsDays !== null) data.default_payment_terms_days = Number(defaultPaymentTermsDays)

  const defaultBillingMode = getString("defaultBillingMode")
  if (defaultBillingMode) data.default_billing_mode = defaultBillingMode

  const defaultPricingMode = getString("defaultPricingMode")
  if (defaultPricingMode) data.default_pricing_mode = defaultPricingMode

  const defaultPackingType = getString("defaultPackingType")
  if (defaultPackingType) data.default_packing_type = defaultPackingType

  const showAmountInWords = getString("showAmountInWords")
  if (showAmountInWords !== null) data.show_amount_in_words = showAmountInWords === "true"

  const roundOffTotal = getString("roundOffTotal")
  if (roundOffTotal !== null) data.round_off_total = roundOffTotal === "true"

  const customField1Enabled = getString("customField1Enabled")
  if (customField1Enabled !== null) data.custom_field_1_enabled = customField1Enabled === "true"
  
  const customField1Label = getString("customField1Label")
  if (customField1Label) data.custom_field_1_label = customField1Label
  
  const customField2Enabled = getString("customField2Enabled")
  if (customField2Enabled !== null) data.custom_field_2_enabled = customField2Enabled === "true"
  
  const customField2Label = getString("customField2Label")
  if (customField2Label) data.custom_field_2_label = customField2Label

  const invoiceNumberResetMode = getString("invoiceNumberResetMode")
  if (invoiceNumberResetMode) data.invoice_number_reset_mode = invoiceNumberResetMode

  const nextInvoiceNumber = getString("nextInvoiceNumber")
  if (nextInvoiceNumber) data.next_invoice_number = Number(nextInvoiceNumber)

  const multiCurrencyEnabled = getString("multiCurrencyEnabled")
  if (multiCurrencyEnabled !== null) data.multi_currency_enabled = multiCurrencyEnabled === "true"

  const secondaryCurrencies = getString("secondaryCurrencies")
  if (secondaryCurrencies !== null) data.secondary_currencies = secondaryCurrencies || ""

  const emailNotificationsEnabled = getString("emailNotificationsEnabled")
  if (emailNotificationsEnabled !== null) data.email_notifications_enabled = emailNotificationsEnabled === "true"

  const emailOnInvoiceCreated = getString("emailOnInvoiceCreated")
  if (emailOnInvoiceCreated !== null) data.email_on_invoice_created = emailOnInvoiceCreated === "true"

  const emailOnPaymentReceived = getString("emailOnPaymentReceived")
  if (emailOnPaymentReceived !== null) data.email_on_payment_received = emailOnPaymentReceived === "true"

  const emailOnLowStock = getString("emailOnLowStock")
  if (emailOnLowStock !== null) data.email_on_low_stock = emailOnLowStock === "true"

  const notificationEmail = getString("notificationEmail")
  if (notificationEmail !== null) data.notification_email = notificationEmail || ""

  const { data: existingSettings } = await supabase.from("settings").select("id").eq("organization_id", organizationId).limit(1).single()

  if (existingSettings) {
    const { error } = await supabase.from("settings").update(data).eq("id", existingSettings.id)

    if (error) {
      console.error("[v0] Error updating settings:", error)
      return { success: false, error: error.message }
    }
  } else {
    if (!data.business_name) {
      data.business_name = "My Business"
    }
    if (!data.invoice_prefix) {
      data.invoice_prefix = "INV"
    }
    if (!data.purchase_prefix) {
      data.purchase_prefix = "PO"
    }
    data.organization_id = organizationId
    
    const { error } = await supabase.from("settings").insert(data)

    if (error) {
      console.error("[v0] Error creating settings:", error)
      return { success: false, error: error.message }
    }
  }

  revalidatePath("/settings")
  return { success: true }
}
