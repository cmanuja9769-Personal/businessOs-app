"use server"

import { authorize } from "@/lib/authorize"
import { isDemoMode } from "@/app/demo/helpers"

type ExportTable = "invoices" | "customers" | "items" | "payments" | "suppliers" | "purchases"

const TABLE_COLUMNS: Record<ExportTable, { readonly db: string; readonly columns: readonly string[] }> = {
  invoices: {
    db: "invoices",
    columns: ["invoice_number", "customer_name", "document_type", "status", "billing_mode", "subtotal", "tax_amount", "total_amount", "amount_paid", "balance_due", "invoice_date", "due_date", "created_at"],
  },
  customers: {
    db: "customers",
    columns: ["name", "email", "phone", "gst_number", "billing_address", "shipping_address", "city", "state", "pincode", "opening_balance", "created_at"],
  },
  items: {
    db: "items",
    columns: ["name", "sku", "hsn_code", "category", "unit", "sale_price", "wholesale_price", "purchase_price", "quantity_price", "gst_rate", "stock_quantity", "low_stock_threshold", "created_at"],
  },
  payments: {
    db: "payments",
    columns: ["amount", "payment_date", "payment_method", "reference_number", "notes", "created_at"],
  },
  suppliers: {
    db: "suppliers",
    columns: ["name", "email", "phone", "gst_number", "address", "city", "state", "pincode", "opening_balance", "created_at"],
  },
  purchases: {
    db: "purchases",
    columns: ["purchase_number", "supplier_name", "status", "subtotal", "tax_amount", "total_amount", "amount_paid", "balance_due", "purchase_date", "created_at"],
  },
}

function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function exportTableAsCSV(table: ExportTable): Promise<{ success: boolean; csv?: string; error?: string }> {
  if (await isDemoMode()) {
    return { success: false, error: "Export is not available in demo mode" }
  }

  const config = TABLE_COLUMNS[table]
  if (!config) {
    return { success: false, error: "Invalid export table" }
  }

  try {
    const { supabase, organizationId } = await authorize("settings", "read")

    const { data, error } = await supabase
      .from(config.db)
      .select(config.columns.join(","))
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(10000)

    if (error) {
      return { success: false, error: error.message }
    }

    if (!data || data.length === 0) {
      return { success: false, error: `No ${table} data to export` }
    }

    const headerRow = config.columns.map((col) => col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())).join(",")
    const dataRows = data.map((row) =>
      config.columns.map((col) => escapeCSVField((row as unknown as Record<string, unknown>)[col])).join(",")
    )

    const csv = [headerRow, ...dataRows].join("\n")
    return { success: true, csv }
  } catch {
    return { success: false, error: "Failed to export data" }
  }
}
