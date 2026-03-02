"use server"

import { revalidatePath } from "next/cache"
import { getCurrentOrganization } from "@/lib/organizations"
import { authorize } from "@/lib/authorize"
import { isDemoMode, throwDemoMutationError, DEMO_ORG_ID, DEMO_ORG_NAME } from "@/app/demo/helpers"

const DEFAULT_BUSINESS_NAME = "My Business"
const DEFAULT_DATE_FORMAT = "dd/MM/yyyy"
const DEFAULT_CUSTOM_FIELD_1 = "Custom Field 1"
const DEFAULT_CUSTOM_FIELD_2 = "Custom Field 2"

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
    name: resolved?.name || DEFAULT_BUSINESS_NAME,
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
    taxEnabled: true, defaultTaxRate: 18, currencySymbol: "₹", dateFormat: DEFAULT_DATE_FORMAT,
    financialYearStart: 4, lowStockAlert: true, lowStockThreshold: 10,
    defaultPaymentTermsDays: 30, defaultBillingMode: "gst" as const, defaultPricingMode: "sale" as const,
    defaultPackingType: "loose" as const, showAmountInWords: true, roundOffTotal: true,
    invoiceNumberResetMode: "never" as const, nextInvoiceNumber: 1,
    multiCurrencyEnabled: false, secondaryCurrencies: "",
    emailNotificationsEnabled: false, emailOnInvoiceCreated: false,
    emailOnPaymentReceived: false, emailOnLowStock: false, notificationEmail: "",
    customField1Enabled: false, customField1Label: DEFAULT_CUSTOM_FIELD_1,
    customField2Enabled: false, customField2Label: DEFAULT_CUSTOM_FIELD_2,
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
        business_name: DEFAULT_BUSINESS_NAME,
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
        date_format: DEFAULT_DATE_FORMAT,
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
        custom_field_1_label: DEFAULT_CUSTOM_FIELD_1,
        custom_field_2_enabled: false,
        custom_field_2_label: DEFAULT_CUSTOM_FIELD_2,
      })
      .select()
      .single()

    if (createError) {
      console.error("[v0] Error creating default settings:", createError)
      return {
        id: "",
        businessName: DEFAULT_BUSINESS_NAME,
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
        dateFormat: DEFAULT_DATE_FORMAT,
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
        customField1Label: DEFAULT_CUSTOM_FIELD_1,
        customField2Enabled: false,
        customField2Label: DEFAULT_CUSTOM_FIELD_2,
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
    customField1Label: data.custom_field_1_label || DEFAULT_CUSTOM_FIELD_1,
    customField2Enabled: data.custom_field_2_enabled ?? false,
    customField2Label: data.custom_field_2_label || DEFAULT_CUSTOM_FIELD_2,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}

type SettingsFieldType = "required-string" | "nullable-string" | "boolean" | "number" | "nullable-number" | "nullable-empty-string"

const NULLABLE_STRING: SettingsFieldType = "nullable-string"
const REQUIRED_STRING: SettingsFieldType = "required-string"

type SettingsValue = string | boolean | number | null

type FieldProcessor = (val: string | null) => { skip: boolean; value: SettingsValue }

interface SettingsFieldMapping {
  readonly formKey: string
  readonly dbKey: string
  readonly type: SettingsFieldType
}

const SETTINGS_FIELD_MAPPINGS: readonly SettingsFieldMapping[] = [
  { formKey: "businessName", dbKey: "business_name", type: REQUIRED_STRING },
  { formKey: "businessAddress", dbKey: "business_address", type: NULLABLE_STRING },
  { formKey: "businessPhone", dbKey: "business_phone", type: NULLABLE_STRING },
  { formKey: "businessEmail", dbKey: "business_email", type: NULLABLE_STRING },
  { formKey: "businessGst", dbKey: "business_gst", type: NULLABLE_STRING },
  { formKey: "businessLogoUrl", dbKey: "business_logo_url", type: NULLABLE_STRING },
  { formKey: "businessPan", dbKey: "business_pan", type: NULLABLE_STRING },
  { formKey: "signatureImageUrl", dbKey: "signature_image_url", type: NULLABLE_STRING },
  { formKey: "bankName", dbKey: "bank_name", type: NULLABLE_STRING },
  { formKey: "bankAccountNo", dbKey: "bank_account_no", type: NULLABLE_STRING },
  { formKey: "bankIfsc", dbKey: "bank_ifsc", type: NULLABLE_STRING },
  { formKey: "upiId", dbKey: "upi_id", type: NULLABLE_STRING },
  { formKey: "bankAccountHolderName", dbKey: "bank_account_holder_name", type: NULLABLE_STRING },
  { formKey: "bankBranchName", dbKey: "bank_branch_name", type: NULLABLE_STRING },
  { formKey: "invoiceTemplate", dbKey: "invoice_template", type: REQUIRED_STRING },
  { formKey: "templateColor", dbKey: "template_color", type: REQUIRED_STRING },
  { formKey: "customTerms", dbKey: "custom_terms", type: NULLABLE_STRING },
  { formKey: "invoiceFooter", dbKey: "invoice_footer", type: NULLABLE_STRING },
  { formKey: "defaultNotes", dbKey: "default_notes", type: NULLABLE_STRING },
  { formKey: "invoicePrefix", dbKey: "invoice_prefix", type: REQUIRED_STRING },
  { formKey: "purchasePrefix", dbKey: "purchase_prefix", type: REQUIRED_STRING },
  { formKey: "quotationPrefix", dbKey: "quotation_prefix", type: REQUIRED_STRING },
  { formKey: "proformaPrefix", dbKey: "proforma_prefix", type: REQUIRED_STRING },
  { formKey: "salesOrderPrefix", dbKey: "sales_order_prefix", type: REQUIRED_STRING },
  { formKey: "deliveryChallanPrefix", dbKey: "delivery_challan_prefix", type: REQUIRED_STRING },
  { formKey: "creditNotePrefix", dbKey: "credit_note_prefix", type: REQUIRED_STRING },
  { formKey: "debitNotePrefix", dbKey: "debit_note_prefix", type: REQUIRED_STRING },
  { formKey: "taxEnabled", dbKey: "tax_enabled", type: "boolean" },
  { formKey: "defaultTaxRate", dbKey: "default_tax_rate", type: "number" },
  { formKey: "currencySymbol", dbKey: "currency_symbol", type: REQUIRED_STRING },
  { formKey: "dateFormat", dbKey: "date_format", type: REQUIRED_STRING },
  { formKey: "financialYearStart", dbKey: "financial_year_start", type: "number" },
  { formKey: "lowStockAlert", dbKey: "low_stock_alert", type: "boolean" },
  { formKey: "lowStockThreshold", dbKey: "low_stock_threshold", type: "number" },
  { formKey: "defaultPaymentTermsDays", dbKey: "default_payment_terms_days", type: "nullable-number" },
  { formKey: "defaultBillingMode", dbKey: "default_billing_mode", type: REQUIRED_STRING },
  { formKey: "defaultPricingMode", dbKey: "default_pricing_mode", type: REQUIRED_STRING },
  { formKey: "defaultPackingType", dbKey: "default_packing_type", type: REQUIRED_STRING },
  { formKey: "showAmountInWords", dbKey: "show_amount_in_words", type: "boolean" },
  { formKey: "roundOffTotal", dbKey: "round_off_total", type: "boolean" },
  { formKey: "customField1Enabled", dbKey: "custom_field_1_enabled", type: "boolean" },
  { formKey: "customField1Label", dbKey: "custom_field_1_label", type: REQUIRED_STRING },
  { formKey: "customField2Enabled", dbKey: "custom_field_2_enabled", type: "boolean" },
  { formKey: "customField2Label", dbKey: "custom_field_2_label", type: REQUIRED_STRING },
  { formKey: "invoiceNumberResetMode", dbKey: "invoice_number_reset_mode", type: REQUIRED_STRING },
  { formKey: "nextInvoiceNumber", dbKey: "next_invoice_number", type: "number" },
  { formKey: "multiCurrencyEnabled", dbKey: "multi_currency_enabled", type: "boolean" },
  { formKey: "secondaryCurrencies", dbKey: "secondary_currencies", type: "nullable-empty-string" },
  { formKey: "emailNotificationsEnabled", dbKey: "email_notifications_enabled", type: "boolean" },
  { formKey: "emailOnInvoiceCreated", dbKey: "email_on_invoice_created", type: "boolean" },
  { formKey: "emailOnPaymentReceived", dbKey: "email_on_payment_received", type: "boolean" },
  { formKey: "emailOnLowStock", dbKey: "email_on_low_stock", type: "boolean" },
  { formKey: "notificationEmail", dbKey: "notification_email", type: "nullable-empty-string" },
]

const FIELD_PROCESSORS: Record<SettingsFieldType, FieldProcessor> = {
  "required-string": (val) => ({ skip: !val, value: val }),
  "nullable-string": (val) => ({ skip: val === null, value: val || null }),
  "boolean": (val) => ({ skip: val === null, value: val === "true" }),
  "number": (val) => ({ skip: !val, value: Number(val) }),
  "nullable-number": (val) => ({ skip: val === null, value: Number(val) }),
  "nullable-empty-string": (val) => ({ skip: val === null, value: val || "" }),
}

function getFormString(formData: FormData, key: string): string | null {
  const val = formData.get(key)
  return typeof val === "string" ? val : null
}

function extractSettingsFromForm(formData: FormData): Record<string, SettingsValue> {
  const data: Record<string, SettingsValue> = {}
  for (const { formKey, dbKey, type } of SETTINGS_FIELD_MAPPINGS) {
    const result = FIELD_PROCESSORS[type](getFormString(formData, formKey))
    if (!result.skip) {
      data[dbKey] = result.value
    }
  }
  return data
}

function applyInsertDefaults(data: Record<string, SettingsValue>, organizationId: string) {
  data.business_name = data.business_name || DEFAULT_BUSINESS_NAME
  data.invoice_prefix = data.invoice_prefix || "INV"
  data.purchase_prefix = data.purchase_prefix || "PO"
  data.organization_id = organizationId
}

export async function updateSettings(formData: FormData) {
  if (await isDemoMode()) throwDemoMutationError()
  const { supabase, organizationId } = await authorize("settings", "update")

  const data = extractSettingsFromForm(formData)

  const { data: existingSettings } = await supabase
    .from("settings")
    .select("id")
    .eq("organization_id", organizationId)
    .limit(1)
    .single()

  if (!existingSettings) {
    applyInsertDefaults(data, organizationId)
  }

  const { error } = existingSettings
    ? await supabase.from("settings").update(data).eq("id", existingSettings.id)
    : await supabase.from("settings").insert(data)

  if (error) {
    console.error("[v0] Error saving settings:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/settings")
  return { success: true }
}
