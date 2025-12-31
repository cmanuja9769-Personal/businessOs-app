// Journal Entry Management

import { createClient } from "@/lib/supabase/server"

export interface JournalLineItem {
  accountId: string
  accountCode: string
  accountName: string
  debitAmount: number
  creditAmount: number
  description?: string
}

export interface JournalEntryData {
  entryType: "journal" | "payment" | "receipt" | "contra" | "sales" | "purchase"
  entryDate: Date
  description?: string
  lines: JournalLineItem[]
  referenceType?: string
  referenceId?: string
  referenceNo?: string
}

export async function createJournalEntry(organizationId: string, data: JournalEntryData, userId: string) {
  const supabase = await createClient()

  // Validate debit = credit
  const totalDebit = data.lines.reduce((sum, line) => sum + line.debitAmount, 0)
  const totalCredit = data.lines.reduce((sum, line) => sum + line.creditAmount, 0)

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return { success: false, error: "Debit and Credit totals must be equal" }
  }

  // Generate entry number
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from("journal_entries")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .like("entry_no", `JE/${year}/%`)

  const entryNo = `JE/${year}/${((count || 0) + 1).toString().padStart(4, "0")}`

  // Create journal entry
  const { data: entry, error: entryError } = await supabase
    .from("journal_entries")
    .insert({
      organization_id: organizationId,
      entry_no: entryNo,
      entry_date: data.entryDate.toISOString().split("T")[0],
      entry_type: data.entryType,
      description: data.description || null,
      reference_type: data.referenceType || null,
      reference_id: data.referenceId || null,
      reference_no: data.referenceNo || null,
      total_debit: totalDebit,
      total_credit: totalCredit,
      status: "draft",
      created_by: userId,
    })
    .select()
    .single()

  if (entryError || !entry) {
    console.error("[v0] Error creating journal entry:", entryError)
    return { success: false, error: entryError?.message }
  }

  // Create line items
  const lines = data.lines.map((line, index) => ({
    entry_id: entry.id,
    account_id: line.accountId,
    account_code: line.accountCode,
    account_name: line.accountName,
    debit_amount: line.debitAmount,
    credit_amount: line.creditAmount,
    description: line.description || null,
    line_order: index,
  }))

  const { error: linesError } = await supabase.from("journal_entry_lines").insert(lines)

  if (linesError) {
    console.error("[v0] Error creating journal lines:", linesError)
    // Delete the entry if lines fail
    await supabase.from("journal_entries").delete().eq("id", entry.id)
    return { success: false, error: linesError.message }
  }

  return { success: true, entry }
}

export async function postJournalEntry(entryId: string, userId: string) {
  const supabase = await createClient()

  // Get entry with lines
  const { data: entry } = await supabase
    .from("journal_entries")
    .select("*, journal_entry_lines(*)")
    .eq("id", entryId)
    .single()

  if (!entry) {
    return { success: false, error: "Entry not found" }
  }

  // Update entry status
  const { error: updateError } = await supabase
    .from("journal_entries")
    .update({
      status: "posted",
      posted_by: userId,
      posted_at: new Date().toISOString(),
    })
    .eq("id", entryId)

  if (updateError) {
    console.error("[v0] Error posting journal entry:", updateError)
    return { success: false, error: updateError.message }
  }

  // Update account balances
  for (const line of entry.journal_entry_lines) {
    const debit = Number(line.debit_amount) || 0
    const credit = Number(line.credit_amount) || 0
    const net = debit - credit

    const { data: account } = await supabase
      .from("accounts")
      .select("debit_balance, credit_balance, current_balance")
      .eq("id", line.account_id)
      .single()

    if (account) {
      const newDebit = (Number(account.debit_balance) || 0) + debit
      const newCredit = (Number(account.credit_balance) || 0) + credit
      const newBalance = (Number(account.current_balance) || 0) + net

      await supabase
        .from("accounts")
        .update({
          debit_balance: newDebit,
          credit_balance: newCredit,
          current_balance: newBalance,
        })
        .eq("id", line.account_id)
    }
  }

  return { success: true }
}

export async function getJournalEntries(organizationId: string, status = "posted") {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", status)
    .order("entry_date", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching journal entries:", error)
    return []
  }

  return data || []
}

export async function getGeneralLedger(accountId: string, startDate?: Date, endDate?: Date) {
  const supabase = await createClient()

  let query = supabase
    .from("journal_entry_lines")
    .select("*, journal_entries(entry_no, entry_date, description)")
    .eq("account_id", accountId)
    .order("journal_entries(entry_date)", { ascending: false })

  if (startDate) {
    query = query.gte("journal_entries(entry_date)", startDate.toISOString().split("T")[0])
  }

  if (endDate) {
    query = query.lte("journal_entries(entry_date)", endDate.toISOString().split("T")[0])
  }

  const { data, error } = await query

  if (error) {
    console.error("[v0] Error fetching general ledger:", error)
    return []
  }

  return data || []
}
