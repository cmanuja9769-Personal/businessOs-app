import { createClient } from "@/lib/supabase/server"

interface PaymentJournalParams {
  readonly organizationId: string
  readonly userId: string
  readonly paymentId: string
  readonly amount: number
  readonly paymentMethod: string
  readonly isReceivable: boolean
  readonly referenceNo?: string
  readonly description?: string
}

interface InvoiceJournalParams {
  readonly organizationId: string
  readonly userId: string
  readonly invoiceId: string
  readonly invoiceNo: string
  readonly customerName: string
  readonly subtotal: number
  readonly cgst: number
  readonly sgst: number
  readonly igst: number
  readonly total: number
}

interface PurchaseJournalParams {
  readonly organizationId: string
  readonly userId: string
  readonly purchaseId: string
  readonly purchaseNo: string
  readonly supplierName: string
  readonly subtotal: number
  readonly cgst: number
  readonly sgst: number
  readonly igst: number
  readonly total: number
}

async function getAccountByCode(supabase: Awaited<ReturnType<typeof createClient>>, organizationId: string, code: string) {
  const { data } = await supabase
    .from("accounts")
    .select("id, account_code, account_name")
    .eq("organization_id", organizationId)
    .eq("account_code", code)
    .maybeSingle()
  return data
}

async function generateEntryNo(supabase: Awaited<ReturnType<typeof createClient>>, organizationId: string, prefix: string) {
  const year = new Date().getFullYear()
  const pattern = `${prefix}/${year}/%`
  const { count } = await supabase
    .from("journal_entries")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .like("entry_no", pattern)
  return `${prefix}/${year}/${((count || 0) + 1).toString().padStart(4, "0")}`
}

export async function createJournalEntryForPayment(params: PaymentJournalParams) {
  const supabase = await createClient()

  const [cashAccount, bankAccount, receivableAccount, payableAccount] = await Promise.all([
    getAccountByCode(supabase, params.organizationId, "1110"),
    getAccountByCode(supabase, params.organizationId, "1120"),
    getAccountByCode(supabase, params.organizationId, "1130"),
    getAccountByCode(supabase, params.organizationId, "2110"),
  ])

  if (!receivableAccount || !payableAccount) return

  const isCashPayment = params.paymentMethod === "cash"
  const debitAccount = isCashPayment ? cashAccount : bankAccount
  if (!debitAccount) return

  const entryNo = await generateEntryNo(supabase, params.organizationId, "PMT")

  const lines = params.isReceivable
    ? [
        {
          account_id: debitAccount.id,
          account_code: debitAccount.account_code,
          account_name: debitAccount.account_name,
          debit_amount: params.amount,
          credit_amount: 0,
          description: `Payment received via ${params.paymentMethod}`,
          line_order: 0,
        },
        {
          account_id: receivableAccount.id,
          account_code: receivableAccount.account_code,
          account_name: receivableAccount.account_name,
          debit_amount: 0,
          credit_amount: params.amount,
          description: "Accounts Receivable reduced",
          line_order: 1,
        },
      ]
    : [
        {
          account_id: payableAccount.id,
          account_code: payableAccount.account_code,
          account_name: payableAccount.account_name,
          debit_amount: params.amount,
          credit_amount: 0,
          description: "Accounts Payable reduced",
          line_order: 0,
        },
        {
          account_id: debitAccount.id,
          account_code: debitAccount.account_code,
          account_name: debitAccount.account_name,
          debit_amount: 0,
          credit_amount: params.amount,
          description: `Payment made via ${params.paymentMethod}`,
          line_order: 1,
        },
      ]

  const { data: entry, error: entryError } = await supabase
    .from("journal_entries")
    .insert({
      organization_id: params.organizationId,
      entry_no: entryNo,
      entry_date: new Date().toISOString().split("T")[0],
      entry_type: params.isReceivable ? "receipt" : "payment",
      reference_type: "payment",
      reference_id: params.paymentId,
      reference_no: params.referenceNo || null,
      description: params.description || `${params.isReceivable ? "Receipt" : "Payment"} of ₹${params.amount.toFixed(2)}`,
      total_debit: params.amount,
      total_credit: params.amount,
      status: "posted",
      posted_by: params.userId,
      posted_at: new Date().toISOString(),
      created_by: params.userId,
    })
    .select()
    .single()

  if (entryError || !entry) {
    console.error("[AutoJournal] Failed to create payment journal entry:", entryError)
    return
  }

  const entryLines = lines.map((line) => ({ ...line, entry_id: entry.id }))
  const { error: linesError } = await supabase.from("journal_entry_lines").insert(entryLines)

  if (linesError) {
    console.error("[AutoJournal] Failed to create payment journal lines:", linesError)
    await supabase.from("journal_entries").delete().eq("id", entry.id)
    return
  }

  await Promise.all(lines.map(async (line) => {
    const net = line.debit_amount - line.credit_amount
    const { error } = await supabase.rpc("update_account_balance_delta", {
      p_account_id: line.account_id,
      p_debit_delta: line.debit_amount,
      p_credit_delta: line.credit_amount,
      p_net_delta: net,
    })
    if (error) {
      console.error("[AutoJournal] account balance update failed, using fallback:", error.message)
      await updateAccountBalanceFallback(supabase, line.account_id, line.debit_amount, line.credit_amount)
    }
  }))
}

export async function createJournalEntryForInvoice(params: InvoiceJournalParams) {
  const supabase = await createClient()

  const [receivableAccount, salesAccount, cgstPayable, sgstPayable, igstPayable] = await Promise.all([
    getAccountByCode(supabase, params.organizationId, "1130"),
    getAccountByCode(supabase, params.organizationId, "4100"),
    getAccountByCode(supabase, params.organizationId, "2120"),
    getAccountByCode(supabase, params.organizationId, "2121"),
    getAccountByCode(supabase, params.organizationId, "2122"),
  ])

  if (!receivableAccount || !salesAccount) return

  const entryNo = await generateEntryNo(supabase, params.organizationId, "INV")

  const lines: Array<{
    account_id: string
    account_code: string
    account_name: string
    debit_amount: number
    credit_amount: number
    description: string
    line_order: number
  }> = []

  lines.push({
    account_id: receivableAccount.id,
    account_code: receivableAccount.account_code,
    account_name: receivableAccount.account_name,
    debit_amount: params.total,
    credit_amount: 0,
    description: `Invoice ${params.invoiceNo} - ${params.customerName}`,
    line_order: 0,
  })

  lines.push({
    account_id: salesAccount.id,
    account_code: salesAccount.account_code,
    account_name: salesAccount.account_name,
    debit_amount: 0,
    credit_amount: params.subtotal,
    description: "Sales Revenue",
    line_order: 1,
  })

  let lineOrder = 2
  if (params.cgst > 0 && cgstPayable) {
    lines.push({
      account_id: cgstPayable.id,
      account_code: cgstPayable.account_code,
      account_name: cgstPayable.account_name,
      debit_amount: 0,
      credit_amount: params.cgst,
      description: "CGST Output",
      line_order: lineOrder++,
    })
  }

  if (params.sgst > 0 && sgstPayable) {
    lines.push({
      account_id: sgstPayable.id,
      account_code: sgstPayable.account_code,
      account_name: sgstPayable.account_name,
      debit_amount: 0,
      credit_amount: params.sgst,
      description: "SGST Output",
      line_order: lineOrder++,
    })
  }

  if (params.igst > 0 && igstPayable) {
    lines.push({
      account_id: igstPayable.id,
      account_code: igstPayable.account_code,
      account_name: igstPayable.account_name,
      debit_amount: 0,
      credit_amount: params.igst,
      description: "IGST Output",
      line_order: lineOrder++,
    })
  }

  const totalDebit = lines.reduce((s, l) => s + l.debit_amount, 0)
  const totalCredit = lines.reduce((s, l) => s + l.credit_amount, 0)

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    console.error("[AutoJournal] Invoice journal debit/credit mismatch:", totalDebit, totalCredit)
    return
  }

  const { data: entry, error: entryError } = await supabase
    .from("journal_entries")
    .insert({
      organization_id: params.organizationId,
      entry_no: entryNo,
      entry_date: new Date().toISOString().split("T")[0],
      entry_type: "sales",
      reference_type: "invoice",
      reference_id: params.invoiceId,
      reference_no: params.invoiceNo,
      description: `Sale to ${params.customerName} - ${params.invoiceNo}`,
      total_debit: totalDebit,
      total_credit: totalCredit,
      status: "posted",
      posted_by: params.userId,
      posted_at: new Date().toISOString(),
      created_by: params.userId,
    })
    .select()
    .single()

  if (entryError || !entry) {
    console.error("[AutoJournal] Failed to create invoice journal entry:", entryError)
    return
  }

  const entryLines = lines.map((line) => ({ ...line, entry_id: entry.id }))
  const { error: linesError } = await supabase.from("journal_entry_lines").insert(entryLines)

  if (linesError) {
    console.error("[AutoJournal] Failed to create invoice journal lines:", linesError)
    await supabase.from("journal_entries").delete().eq("id", entry.id)
    return
  }

  await batchUpdateAccountBalances(supabase, lines)
}

export async function createJournalEntryForPurchase(params: PurchaseJournalParams) {
  const supabase = await createClient()

  const [payableAccount, cogsAccount, inputCgst, inputSgst, inputIgst] = await Promise.all([
    getAccountByCode(supabase, params.organizationId, "2110"),
    getAccountByCode(supabase, params.organizationId, "5100"),
    getAccountByCode(supabase, params.organizationId, "1150"),
    getAccountByCode(supabase, params.organizationId, "1151"),
    getAccountByCode(supabase, params.organizationId, "1152"),
  ])

  if (!payableAccount || !cogsAccount) return

  const entryNo = await generateEntryNo(supabase, params.organizationId, "PUR")

  const lines: Array<{
    account_id: string
    account_code: string
    account_name: string
    debit_amount: number
    credit_amount: number
    description: string
    line_order: number
  }> = []

  lines.push({
    account_id: cogsAccount.id,
    account_code: cogsAccount.account_code,
    account_name: cogsAccount.account_name,
    debit_amount: params.subtotal,
    credit_amount: 0,
    description: "Purchase / COGS",
    line_order: 0,
  })

  let lineOrder = 1
  if (params.cgst > 0 && inputCgst) {
    lines.push({
      account_id: inputCgst.id,
      account_code: inputCgst.account_code,
      account_name: inputCgst.account_name,
      debit_amount: params.cgst,
      credit_amount: 0,
      description: "Input CGST",
      line_order: lineOrder++,
    })
  }

  if (params.sgst > 0 && inputSgst) {
    lines.push({
      account_id: inputSgst.id,
      account_code: inputSgst.account_code,
      account_name: inputSgst.account_name,
      debit_amount: params.sgst,
      credit_amount: 0,
      description: "Input SGST",
      line_order: lineOrder++,
    })
  }

  if (params.igst > 0 && inputIgst) {
    lines.push({
      account_id: inputIgst.id,
      account_code: inputIgst.account_code,
      account_name: inputIgst.account_name,
      debit_amount: params.igst,
      credit_amount: 0,
      description: "Input IGST",
      line_order: lineOrder++,
    })
  }

  lines.push({
    account_id: payableAccount.id,
    account_code: payableAccount.account_code,
    account_name: payableAccount.account_name,
    debit_amount: 0,
    credit_amount: params.total,
    description: `Purchase from ${params.supplierName} - ${params.purchaseNo}`,
    line_order: lineOrder,
  })

  const totalDebit = lines.reduce((s, l) => s + l.debit_amount, 0)
  const totalCredit = lines.reduce((s, l) => s + l.credit_amount, 0)

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    console.error("[AutoJournal] Purchase journal debit/credit mismatch:", totalDebit, totalCredit)
    return
  }

  const { data: entry, error: entryError } = await supabase
    .from("journal_entries")
    .insert({
      organization_id: params.organizationId,
      entry_no: entryNo,
      entry_date: new Date().toISOString().split("T")[0],
      entry_type: "purchase",
      reference_type: "purchase",
      reference_id: params.purchaseId,
      reference_no: params.purchaseNo,
      description: `Purchase from ${params.supplierName} - ${params.purchaseNo}`,
      total_debit: totalDebit,
      total_credit: totalCredit,
      status: "posted",
      posted_by: params.userId,
      posted_at: new Date().toISOString(),
      created_by: params.userId,
    })
    .select()
    .single()

  if (entryError || !entry) {
    console.error("[AutoJournal] Failed to create purchase journal entry:", entryError)
    return
  }

  const entryLines = lines.map((line) => ({ ...line, entry_id: entry.id }))
  const { error: linesError } = await supabase.from("journal_entry_lines").insert(entryLines)

  if (linesError) {
    console.error("[AutoJournal] Failed to create purchase journal lines:", linesError)
    await supabase.from("journal_entries").delete().eq("id", entry.id)
    return
  }

  await batchUpdateAccountBalances(supabase, lines)
}

async function batchUpdateAccountBalances(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lines: ReadonlyArray<{ readonly account_id: string; readonly debit_amount: number; readonly credit_amount: number }>,
) {
  const uniqueAccountIds = [...new Set(lines.map((l) => l.account_id))]
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, debit_balance, credit_balance, current_balance")
    .in("id", uniqueAccountIds)

  if (!accounts) return

  const accountMap = new Map(accounts.map((a) => [a.id, a]))
  const deltas = new Map<string, { debit: number; credit: number }>()

  for (const line of lines) {
    const existing = deltas.get(line.account_id) || { debit: 0, credit: 0 }
    existing.debit += line.debit_amount
    existing.credit += line.credit_amount
    deltas.set(line.account_id, existing)
  }

  await Promise.all(
    [...deltas.entries()].map(async ([accountId, delta]) => {
      const account = accountMap.get(accountId)
      if (!account) return
      const newDebit = (Number(account.debit_balance) || 0) + delta.debit
      const newCredit = (Number(account.credit_balance) || 0) + delta.credit
      const newBalance = (Number(account.current_balance) || 0) + (delta.debit - delta.credit)
      await supabase
        .from("accounts")
        .update({ debit_balance: newDebit, credit_balance: newCredit, current_balance: newBalance })
        .eq("id", accountId)
    }),
  )
}

async function updateAccountBalanceFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountId: string,
  debitAmount: number,
  creditAmount: number,
) {
  const { data: account } = await supabase
    .from("accounts")
    .select("debit_balance, credit_balance, current_balance")
    .eq("id", accountId)
    .single()

  if (!account) return

  const newDebit = (Number(account.debit_balance) || 0) + debitAmount
  const newCredit = (Number(account.credit_balance) || 0) + creditAmount
  const newBalance = (Number(account.current_balance) || 0) + (debitAmount - creditAmount)

  await supabase
    .from("accounts")
    .update({
      debit_balance: newDebit,
      credit_balance: newCredit,
      current_balance: newBalance,
    })
    .eq("id", accountId)
}
