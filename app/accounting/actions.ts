"use server"

import { authorize } from "@/lib/authorize"
import { getTrialBalance, getProfitLossStatement, getBalanceSheet, getCashFlowStatement } from "@/lib/accounting/financial-reports"
import { getJournalEntries } from "@/lib/accounting/journal"
import { isDemoMode } from "@/app/demo/helpers"
import type { TrialBalanceAccount, ProfitLossData, BalanceSheetData } from "@/lib/accounting/financial-reports"

const DEMO_ACCOUNTING = {
  accountCount: 24,
  journalEntryCount: 48,
  totalAssets: 4230000,
  netProfit: 845000,
}

const DEMO_TRIAL_BALANCE: TrialBalanceAccount[] = [
  { accountCode: "1100", accountName: "Cash & Bank", accountType: "asset", debitBalance: 990000, creditBalance: 0 },
  { accountCode: "1200", accountName: "Accounts Receivable", accountType: "asset", debitBalance: 1240000, creditBalance: 0 },
  { accountCode: "1300", accountName: "Inventory", accountType: "asset", debitBalance: 2000000, creditBalance: 0 },
  { accountCode: "2100", accountName: "Accounts Payable", accountType: "liability", debitBalance: 0, creditBalance: 980000 },
  { accountCode: "2200", accountName: "GST Payable", accountType: "liability", debitBalance: 0, creditBalance: 600000 },
  { accountCode: "3100", accountName: "Owner's Equity", accountType: "equity", debitBalance: 0, creditBalance: 2650000 },
  { accountCode: "4100", accountName: "Sales Revenue", accountType: "income", debitBalance: 0, creditBalance: 2850000 },
  { accountCode: "5100", accountName: "Cost of Goods Sold", accountType: "expense", debitBalance: 1780000, creditBalance: 0 },
  { accountCode: "5200", accountName: "Operating Expenses", accountType: "expense", debitBalance: 225000, creditBalance: 0 },
  { accountCode: "3200", accountName: "Retained Earnings", accountType: "equity", debitBalance: 0, creditBalance: 845000 },
]

const DEMO_PNL: ProfitLossData = {
  revenueItems: [{ accountCode: "4100", accountName: "Sales Revenue", balance: 2850000 }],
  revenue: 2850000,
  otherIncomeItems: [],
  otherIncome: 0,
  totalIncome: 2850000,
  cogsItems: [{ accountCode: "5100", accountName: "Cost of Goods Sold", balance: 1780000 }],
  cogs: 1780000,
  grossProfit: 1070000,
  expenseItems: [{ accountCode: "5200", accountName: "Rent & Utilities", balance: 120000 }, { accountCode: "5300", accountName: "Salaries", balance: 105000 }],
  operatingExpenses: 225000,
  depreciation: 0,
  ebit: 845000,
  interestExpense: 0,
  taxExpense: 0,
  netProfit: 845000,
}

const DEMO_BS: BalanceSheetData = {
  currentAssets: [
    { accountCode: "1100", accountName: "Cash & Bank", balance: 990000 },
    { accountCode: "1200", accountName: "Accounts Receivable", balance: 1240000 },
    { accountCode: "1300", accountName: "Inventory", balance: 2000000 },
  ],
  fixedAssets: [],
  otherAssets: [],
  totalAssets: 4230000,
  currentLiabilities: [
    { accountCode: "2100", accountName: "Accounts Payable", balance: 980000 },
    { accountCode: "2200", accountName: "GST Payable", balance: 600000 },
  ],
  longTermLiabilities: [],
  totalLiabilities: 1580000,
  equityAccounts: [
    { accountCode: "3100", accountName: "Owner's Equity", balance: 2650000 },
  ],
  totalEquity: 2650000,
}

const DEMO_CASHFLOW = {
  operatingActivities: 720000,
  investingActivities: -180000,
  financingActivities: -50000,
  netCashFlow: 490000,
  openingCash: 500000,
  closingCash: 990000,
}

export async function getAccountingDashboard() {
  if (await isDemoMode()) return DEMO_ACCOUNTING
  const { supabase, organizationId } = await authorize("invoices", "read")

  const [accountsResult, journalResult] = await Promise.all([
    supabase
      .from("accounts")
      .select("id", { count: "exact" })
      .eq("organization_id", organizationId)
      .eq("is_active", true),
    supabase
      .from("journal_entries")
      .select("id", { count: "exact" })
      .eq("organization_id", organizationId)
      .eq("status", "posted"),
  ])

  const now = new Date()
  const fyStart = now.getMonth() >= 3
    ? new Date(now.getFullYear(), 3, 1)
    : new Date(now.getFullYear() - 1, 3, 1)

  let totalAssets = 0
  let netProfit = 0

  try {
    const balanceSheet = await getBalanceSheet(supabase, organizationId, now)
    totalAssets = balanceSheet.totalAssets
  } catch {
    totalAssets = 0
  }

  try {
    const pnl = await getProfitLossStatement(
      supabase,
      organizationId,
      fyStart,
      now
    )
    netProfit = pnl.netProfit
  } catch {
    netProfit = 0
  }

  return {
    accountCount: accountsResult.count ?? 0,
    journalEntryCount: journalResult.count ?? 0,
    totalAssets,
    netProfit,
  }
}

export async function getTrialBalanceData(asOnDate?: string) {
  if (await isDemoMode()) return DEMO_TRIAL_BALANCE
  const { supabase, organizationId } = await authorize("invoices", "read")
  const date = asOnDate ? new Date(asOnDate) : undefined
  return getTrialBalance(supabase, organizationId, date)
}

export async function getProfitLossData(startDate: string, endDate: string) {
  if (await isDemoMode()) return DEMO_PNL
  const { supabase, organizationId } = await authorize("invoices", "read")
  return getProfitLossStatement(
    supabase,
    organizationId,
    new Date(startDate),
    new Date(endDate)
  )
}

export async function getBalanceSheetData(asOnDate?: string) {
  if (await isDemoMode()) return DEMO_BS
  const { supabase, organizationId } = await authorize("invoices", "read")
  const date = asOnDate ? new Date(asOnDate) : new Date()
  return getBalanceSheet(supabase, organizationId, date)
}

export async function getJournalEntriesData(status?: "draft" | "posted" | "voided") {
  if (await isDemoMode()) return [] as Array<Record<string, unknown>>
  const { supabase, organizationId } = await authorize("invoices", "read")
  return getJournalEntries(supabase, organizationId, status)
}

export async function getCashFlowData(startDate: string, endDate: string) {
  if (await isDemoMode()) return DEMO_CASHFLOW
  const { supabase, organizationId } = await authorize("invoices", "read")
  return getCashFlowStatement(
    supabase,
    organizationId,
    new Date(startDate),
    new Date(endDate)
  )
}
