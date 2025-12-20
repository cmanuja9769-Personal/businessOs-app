import type { IInvoiceItem } from "@/types"

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
): {
  subtotal: number
  cgst: number
  sgst: number
  igst: number
  cess: number
  discount: number
  total: number
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

  // For intra-state: CGST + SGST, For inter-state: IGST
  const cgst = billingMode === "gst" ? totalGst / 2 : 0
  const sgst = billingMode === "gst" ? totalGst / 2 : 0
  const igst = 0 // In this simplified version, we're using CGST+SGST

  const total = subtotal + totalGst + totalCess

  return {
    subtotal,
    cgst,
    sgst,
    igst,
    cess: totalCess,
    discount: totalDiscount,
    total,
  }
}
