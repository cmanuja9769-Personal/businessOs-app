// Chart of Accounts Management

import { createClient } from "@/lib/supabase/server"

const DEFAULT_ACCOUNTS = [
  // Assets
  { code: "1000", name: "Assets", type: "asset", parent: null, system: true },
  { code: "1100", name: "Current Assets", type: "asset", parent: "1000", system: true },
  { code: "1110", name: "Cash in Hand", type: "asset", parent: "1100", system: true },
  { code: "1120", name: "Bank Accounts", type: "asset", parent: "1100", system: true },
  { code: "1130", name: "Accounts Receivable", type: "asset", parent: "1100", system: true },
  { code: "1140", name: "Inventory", type: "asset", parent: "1100", system: true },
  { code: "1200", name: "Fixed Assets", type: "asset", parent: "1000", system: true },

  // Liabilities
  { code: "2000", name: "Liabilities", type: "liability", parent: null, system: true },
  { code: "2100", name: "Current Liabilities", type: "liability", parent: "2000", system: true },
  { code: "2110", name: "Accounts Payable", type: "liability", parent: "2100", system: true },
  { code: "2120", name: "CGST Payable", type: "liability", parent: "2100", system: true },
  { code: "2121", name: "SGST Payable", type: "liability", parent: "2100", system: true },
  { code: "2122", name: "IGST Payable", type: "liability", parent: "2100", system: true },

  // Equity
  { code: "3000", name: "Equity", type: "equity", parent: null, system: true },
  { code: "3100", name: "Owner Equity", type: "equity", parent: "3000", system: true },
  { code: "3200", name: "Retained Earnings", type: "equity", parent: "3000", system: true },

  // Income
  { code: "4000", name: "Income", type: "income", parent: null, system: true },
  { code: "4100", name: "Sales Revenue", type: "income", parent: "4000", system: true },
  { code: "4200", name: "Other Income", type: "income", parent: "4000", system: true },

  // Expenses
  { code: "5000", name: "Expenses", type: "expense", parent: null, system: true },
  { code: "5100", name: "Cost of Goods Sold", type: "expense", parent: "5000", system: true },
  { code: "5200", name: "Operating Expenses", type: "expense", parent: "5000", system: true },
  { code: "5210", name: "Rent Expense", type: "expense", parent: "5200", system: true },
  { code: "5220", name: "Salaries & Wages", type: "expense", parent: "5200", system: true },
  { code: "5230", name: "Utilities", type: "expense", parent: "5200", system: true },
  { code: "5240", name: "Office Supplies", type: "expense", parent: "5200", system: true },

  // Input Tax Credit
  { code: "1150", name: "Input CGST", type: "asset", parent: "1100", system: true },
  { code: "1151", name: "Input SGST", type: "asset", parent: "1100", system: true },
  { code: "1152", name: "Input IGST", type: "asset", parent: "1100", system: true },
]

export async function seedChartOfAccounts(organizationId: string) {
  const supabase = await createClient()

  // Check if accounts already exist
  const { count } = await supabase
    .from("accounts")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)

  if ((count || 0) > 0) {
    return { success: true, message: "Accounts already exist" }
  }

  // Create mapping of code to UUID for parent relationships
  const accountMap = new Map<string, string>()

  // First pass: Create all parent accounts
  for (const acc of DEFAULT_ACCOUNTS.filter((a) => !a.parent)) {
    const { data, error } = await supabase
      .from("accounts")
      .insert({
        organization_id: organizationId,
        account_code: acc.code,
        account_name: acc.name,
        account_type: acc.type,
        parent_account_id: null,
        level: 1,
        is_system_account: acc.system,
      })
      .select()
      .single()

    if (data) {
      accountMap.set(acc.code, data.id)
    }
  }

  // Second pass: Create child accounts
  for (const acc of DEFAULT_ACCOUNTS.filter((a) => a.parent)) {
    const parentId = acc.parent ? accountMap.get(acc.parent) : null
    if (!parentId) continue

    const { data } = await supabase
      .from("accounts")
      .insert({
        organization_id: organizationId,
        account_code: acc.code,
        account_name: acc.name,
        account_type: acc.type,
        parent_account_id: parentId,
        level: 2,
        is_system_account: acc.system,
      })
      .select()
      .single()

    if (data) {
      accountMap.set(acc.code, data.id)
    }
  }

  return { success: true, message: "Chart of accounts created successfully", count: DEFAULT_ACCOUNTS.length }
}

export async function getAccountsByType(organizationId: string, type: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("account_type", type)
    .eq("is_active", true)
    .order("account_code")

  if (error) {
    console.error("[v0] Error fetching accounts:", error)
    return []
  }

  return data || []
}

export async function getAccountHierarchy(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("account_code")

  if (error) {
    console.error("[v0] Error fetching accounts:", error)
    return []
  }

  return data || []
}

export async function getAccountBalance(accountId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("accounts")
    .select("debit_balance, credit_balance, current_balance")
    .eq("id", accountId)
    .single()

  if (error) {
    console.error("[v0] Error fetching account balance:", error)
    return { debitBalance: 0, creditBalance: 0, currentBalance: 0 }
  }

  return {
    debitBalance: Number(data.debit_balance) || 0,
    creditBalance: Number(data.credit_balance) || 0,
    currentBalance: Number(data.current_balance) || 0,
  }
}
