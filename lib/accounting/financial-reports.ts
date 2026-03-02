import type { SupabaseClient } from "@supabase/supabase-js"

export interface TrialBalanceAccount {
  readonly accountCode: string
  readonly accountName: string
  readonly accountType: string
  readonly debitBalance: number
  readonly creditBalance: number
}

export interface AccountBalance {
  readonly accountCode: string
  readonly accountName: string
  readonly balance: number
}

export interface ProfitLossData {
  readonly revenueItems: readonly AccountBalance[]
  readonly revenue: number
  readonly otherIncomeItems: readonly AccountBalance[]
  readonly otherIncome: number
  readonly totalIncome: number
  readonly cogsItems: readonly AccountBalance[]
  readonly cogs: number
  readonly grossProfit: number
  readonly expenseItems: readonly AccountBalance[]
  readonly operatingExpenses: number
  readonly depreciation: number
  readonly ebit: number
  readonly interestExpense: number
  readonly taxExpense: number
  readonly netProfit: number
}

export interface BalanceSheetData {
  readonly currentAssets: readonly AccountBalance[]
  readonly fixedAssets: readonly AccountBalance[]
  readonly otherAssets: readonly AccountBalance[]
  readonly totalAssets: number
  readonly currentLiabilities: readonly AccountBalance[]
  readonly longTermLiabilities: readonly AccountBalance[]
  readonly totalLiabilities: number
  readonly equityAccounts: readonly AccountBalance[]
  readonly totalEquity: number
}

type BalanceValue = number | string | null

interface RawAccount {
  readonly id: string
  readonly account_code: string
  readonly account_name: string
  readonly account_type: string
  readonly current_balance: BalanceValue
}

interface JournalLine {
  readonly account_id: string
  readonly debit_amount: number | string | null
  readonly credit_amount: number | string | null
}

function sumBalances(items: readonly AccountBalance[]): number {
  return items.reduce((sum, item) => sum + item.balance, 0)
}

function toAccountBalance(acc: RawAccount): AccountBalance {
  return {
    accountCode: acc.account_code,
    accountName: acc.account_name,
    balance: Math.abs(Number(acc.current_balance) || 0),
  }
}

function isLeafAccount(code: string): boolean {
  const codeNum = parseInt(code, 10)
  const isTopLevel = [1000, 2000, 3000, 4000, 5000].includes(codeNum)
  return !isTopLevel
}

async function fetchOrgAccounts(supabase: SupabaseClient, organizationId: string): Promise<RawAccount[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, account_code, account_name, account_type, current_balance")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("account_code")

  if (error) {
    console.error("[FinancialReports] Error fetching accounts:", error)
    return []
  }

  return (data as RawAccount[]) || []
}

async function fetchPeriodLines(
  supabase: SupabaseClient,
  accountIds: readonly string[],
  startDate: string,
  endDate: string,
): Promise<JournalLine[]> {
  if (accountIds.length === 0) return []

  const { data, error } = await supabase
    .from("journal_entry_lines")
    .select("account_id, debit_amount, credit_amount, journal_entries!inner(entry_date, status)")
    .in("account_id", [...accountIds])
    .gte("journal_entries.entry_date", startDate)
    .lte("journal_entries.entry_date", endDate)
    .eq("journal_entries.status", "posted")

  if (error) {
    console.error("[FinancialReports] Error fetching journal lines:", error)
    return []
  }

  return (data as JournalLine[]) || []
}

function aggregateLinesByAccount(
  lines: readonly JournalLine[],
  accounts: readonly RawAccount[],
  mode: "debit" | "credit",
): AccountBalance[] {
  const totals = new Map<string, number>()
  for (const line of lines) {
    const amount = mode === "debit"
      ? (Number(line.debit_amount) || 0)
      : (Number(line.credit_amount) || 0)
    totals.set(line.account_id, (totals.get(line.account_id) || 0) + amount)
  }

  const accountMap = new Map(accounts.map((a) => [a.id, a]))

  return [...totals.entries()]
    .filter(([, amount]) => Math.abs(amount) > 0.01)
    .map(([id, amount]) => {
      const acc = accountMap.get(id)
      return {
        accountCode: acc?.account_code || "",
        accountName: acc?.account_name || "",
        balance: amount,
      }
    })
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode))
}

export async function getTrialBalance(
  supabase: SupabaseClient,
  organizationId: string,
  _asOnDate?: Date,
): Promise<TrialBalanceAccount[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("account_code, account_name, account_type, debit_balance, credit_balance")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("account_code")

  if (error) {
    console.error("[FinancialReports] Error fetching trial balance:", error)
    return []
  }

  return (
    data?.map((acc) => ({
      accountCode: acc.account_code,
      accountName: acc.account_name,
      accountType: acc.account_type,
      debitBalance: Number(acc.debit_balance) || 0,
      creditBalance: Number(acc.credit_balance) || 0,
    })) || []
  )
}

export async function getProfitLossStatement(
  supabase: SupabaseClient,
  organizationId: string,
  startDate: Date,
  endDate: Date,
): Promise<ProfitLossData> {
  const accounts = await fetchOrgAccounts(supabase, organizationId)

  const incomeAccounts = accounts.filter((a) => a.account_type === "income")
  const expenseAccounts = accounts.filter((a) => a.account_type === "expense")

  const incomeIds = incomeAccounts.map((a) => a.id)
  const expenseIds = expenseAccounts.map((a) => a.id)

  const startStr = startDate.toISOString().split("T")[0]
  const endStr = endDate.toISOString().split("T")[0]

  const [incomeLines, expenseLines] = await Promise.all([
    fetchPeriodLines(supabase, incomeIds, startStr, endStr),
    fetchPeriodLines(supabase, expenseIds, startStr, endStr),
  ])

  const allIncomeItems = aggregateLinesByAccount(incomeLines, incomeAccounts, "credit")
  const revenueItems = allIncomeItems.filter((i) => i.accountCode.startsWith("41"))
  const otherIncomeItems = allIncomeItems.filter((i) => !i.accountCode.startsWith("41"))

  const allExpenseItems = aggregateLinesByAccount(expenseLines, expenseAccounts, "debit")
  const cogsItems = allExpenseItems.filter((i) => i.accountCode.startsWith("51") && !i.accountCode.startsWith("52"))
  const expenseItems = allExpenseItems.filter((i) => i.accountCode.startsWith("52"))

  const revenue = sumBalances(revenueItems)
  const otherIncome = sumBalances(otherIncomeItems)
  const totalIncome = revenue + otherIncome
  const cogs = sumBalances(cogsItems)
  const grossProfit = totalIncome - cogs
  const operatingExpenses = sumBalances(expenseItems)
  const depreciation = 0
  const ebit = grossProfit - operatingExpenses - depreciation
  const interestExpense = 0
  const taxExpense = 0
  const netProfit = ebit - interestExpense - taxExpense

  return {
    revenueItems,
    revenue,
    otherIncomeItems,
    otherIncome,
    totalIncome,
    cogsItems,
    cogs,
    grossProfit,
    expenseItems,
    operatingExpenses,
    depreciation,
    ebit,
    interestExpense,
    taxExpense,
    netProfit,
  }
}

export async function getBalanceSheet(
  supabase: SupabaseClient,
  organizationId: string,
  _asOnDate?: Date,
): Promise<BalanceSheetData> {
  const accounts = await fetchOrgAccounts(supabase, organizationId)

  const leafAccounts = accounts.filter((a) => isLeafAccount(a.account_code))
  const assetAccounts = leafAccounts.filter((a) => a.account_type === "asset")
  const liabilityAccounts = leafAccounts.filter((a) => a.account_type === "liability")
  const equityLeaf = leafAccounts.filter((a) => a.account_type === "equity")

  const currentAssets = assetAccounts
    .filter((a) => a.account_code.startsWith("11"))
    .map(toAccountBalance)
    .filter((a) => a.balance > 0)

  const fixedAssets = assetAccounts
    .filter((a) => a.account_code.startsWith("12"))
    .map(toAccountBalance)
    .filter((a) => a.balance > 0)

  const otherAssets = assetAccounts
    .filter((a) => !a.account_code.startsWith("11") && !a.account_code.startsWith("12"))
    .map(toAccountBalance)
    .filter((a) => a.balance > 0)

  const currentLiabilities = liabilityAccounts
    .filter((a) => a.account_code.startsWith("21"))
    .map(toAccountBalance)
    .filter((a) => a.balance > 0)

  const longTermLiabilities = liabilityAccounts
    .filter((a) => !a.account_code.startsWith("21"))
    .map(toAccountBalance)
    .filter((a) => a.balance > 0)

  const equityItems = equityLeaf.map(toAccountBalance).filter((a) => a.balance > 0)

  const totalAssets = sumBalances(currentAssets) + sumBalances(fixedAssets) + sumBalances(otherAssets)
  const totalLiabilities = sumBalances(currentLiabilities) + sumBalances(longTermLiabilities)
  const totalEquity = sumBalances(equityItems)

  return {
    currentAssets,
    fixedAssets,
    otherAssets,
    totalAssets,
    currentLiabilities,
    longTermLiabilities,
    totalLiabilities,
    equityAccounts: equityItems,
    totalEquity,
  }
}

export async function getCashFlowStatement(
  supabase: SupabaseClient,
  organizationId: string,
  startDate: Date,
  endDate: Date,
) {
  const startStr = startDate.toISOString().split("T")[0]
  const endStr = endDate.toISOString().split("T")[0]

  const [paymentsResult, receiptsResult, cashAccountsResult] = await Promise.all([
    supabase
      .from("journal_entries")
      .select("total_debit")
      .eq("organization_id", organizationId)
      .eq("entry_type", "payment")
      .eq("status", "posted")
      .gte("entry_date", startStr)
      .lte("entry_date", endStr),
    supabase
      .from("journal_entries")
      .select("total_credit")
      .eq("organization_id", organizationId)
      .eq("entry_type", "receipt")
      .eq("status", "posted")
      .gte("entry_date", startStr)
      .lte("entry_date", endStr),
    supabase
      .from("accounts")
      .select("current_balance")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .in("account_code", ["1110", "1120"]),
  ])

  const operatingOutflow = (paymentsResult.data || []).reduce(
    (sum, entry) => sum + Number(entry.total_debit),
    0,
  )
  const operatingInflow = (receiptsResult.data || []).reduce(
    (sum, entry) => sum + Number(entry.total_credit),
    0,
  )

  const currentCashBalance = (cashAccountsResult.data || []).reduce(
    (sum, acc) => sum + (Number(acc.current_balance) || 0),
    0,
  )

  const operatingActivities = operatingInflow - operatingOutflow
  const netCashFlow = operatingActivities
  const closingCash = currentCashBalance
  const openingCash = closingCash - netCashFlow

  return {
    operatingActivities,
    investingActivities: 0,
    financingActivities: 0,
    netCashFlow,
    openingCash,
    closingCash,
  }
}
