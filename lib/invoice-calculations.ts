import type { IInvoiceItem } from "@/types"

export function extractStateCodeFromGstin(gstin: string | null | undefined): string | null {
  if (!gstin || gstin.length < 2) return null
  return gstin.substring(0, 2)
}

export function isInterStateSale(
  sellerGstin: string | null | undefined,
  buyerGstin: string | null | undefined,
): boolean {
  const sellerState = extractStateCodeFromGstin(sellerGstin)
  const buyerState = extractStateCodeFromGstin(buyerGstin)
  if (!sellerState || !buyerState) return false
  return sellerState !== buyerState
}

export function calculateItemAmount(
  quantity: number,
  rate: number,
  gstRate: number,
  cessRate: number,
  discount: number,
  billingMode: "gst" | "non-gst",
): number {
  const baseAmount = quantity * rate
  const discountAmount = (baseAmount * discount) / 100
  const amountAfterDiscount = baseAmount - discountAmount

  if (billingMode === "non-gst") {
    return amountAfterDiscount
  }

  const gstAmount = (amountAfterDiscount * gstRate) / 100
  const cessAmount = (amountAfterDiscount * cessRate) / 100

  return amountAfterDiscount + gstAmount + cessAmount
}

export function calculateInvoiceTotals(
  items: IInvoiceItem[],
  billingMode: "gst" | "non-gst",
  isInterState = false,
): {
  subtotal: number
  cgst: number
  sgst: number
  igst: number
  cess: number
  discount: number
  total: number
  roundOff: number
  grandTotal: number
} {
  let subtotal = 0
  let totalGst = 0
  let totalCess = 0
  let totalDiscount = 0

  items.forEach((item) => {
    const baseAmount = item.quantity * item.rate
    const discountAmount = (baseAmount * item.discount) / 100
    const amountAfterDiscount = baseAmount - discountAmount

    subtotal += amountAfterDiscount
    totalDiscount += discountAmount

    if (billingMode === "gst") {
      const gstAmount = (amountAfterDiscount * item.gstRate) / 100
      const cessAmount = (amountAfterDiscount * item.cessRate) / 100
      totalGst += gstAmount
      totalCess += cessAmount
    }
  })

  let cgst = 0
  let sgst = 0
  let igst = 0

  if (billingMode === "gst") {
    if (isInterState) {
      igst = totalGst
    } else {
      cgst = totalGst / 2
      sgst = totalGst / 2
    }
  }

  const total = subtotal + totalGst + totalCess
  const grandTotal = Math.round(total)
  const roundOff = grandTotal - total

  return {
    subtotal,
    cgst,
    sgst,
    igst,
    cess: totalCess,
    discount: totalDiscount,
    total,
    roundOff,
    grandTotal,
  }
}

export function calculatePurchaseItemAmount(
  quantity: number,
  rate: number,
  discount: number,
  discountType: "percentage" | "flat",
  taxRate: number,
  gstEnabled: boolean,
): number {
  const baseAmount = quantity * rate
  const discountAmount =
    discountType === "flat" ? discount : (baseAmount * discount) / 100
  const amountAfterDiscount = baseAmount - discountAmount

  if (!gstEnabled) return amountAfterDiscount

  const taxAmount = (amountAfterDiscount * taxRate) / 100
  return amountAfterDiscount + taxAmount
}

export function calculatePurchaseTotals(
  items: ReadonlyArray<{
    readonly quantity: number
    readonly rate: number
    readonly discount: number
    readonly discountType: "percentage" | "flat"
    readonly taxRate: number
    readonly isInterState?: boolean
  }>,
  gstEnabled: boolean,
  isInterState = false,
): {
  subtotal: number
  cgst: number
  sgst: number
  igst: number
  discount: number
  total: number
} {
  let subtotal = 0
  let totalTax = 0
  let totalDiscount = 0

  for (const item of items) {
    const baseAmount = item.quantity * item.rate
    const discountAmount =
      item.discountType === "flat"
        ? item.discount
        : (baseAmount * item.discount) / 100
    const amountAfterDiscount = baseAmount - discountAmount

    subtotal += amountAfterDiscount
    totalDiscount += discountAmount

    if (gstEnabled) {
      totalTax += (amountAfterDiscount * item.taxRate) / 100
    }
  }

  let cgst = 0
  let sgst = 0
  let igst = 0

  if (gstEnabled) {
    if (isInterState) {
      igst = totalTax
    } else {
      cgst = totalTax / 2
      sgst = totalTax / 2
    }
  }

  return {
    subtotal,
    cgst,
    sgst,
    igst,
    discount: totalDiscount,
    total: subtotal + totalTax,
  }
}
