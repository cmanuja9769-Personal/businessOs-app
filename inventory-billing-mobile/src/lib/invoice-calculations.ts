export interface IInvoiceItem {
  id?: string;
  itemId: string;
  itemName: string;
  description?: string;
  hsnCode?: string;
  quantity: number;
  unit: string;
  rate: number;
  gstRate: number;
  cessRate: number;
  discount: number;
  amount: number;
}

export function calculateItemAmount(
  quantity: number,
  rate: number,
  gstRate: number,
  cessRate: number,
  discount: number,
  billingMode: 'gst' | 'non-gst',
): number {
  const baseAmount = quantity * rate;
  const discountAmount = (baseAmount * discount) / 100;
  const amountAfterDiscount = baseAmount - discountAmount;

  if (billingMode === 'non-gst') {
    return amountAfterDiscount;
  }

  const gstAmount = (amountAfterDiscount * gstRate) / 100;
  const cessAmount = (amountAfterDiscount * cessRate) / 100;

  return amountAfterDiscount + gstAmount + cessAmount;
}

export function calculateInvoiceTotals(
  items: IInvoiceItem[],
  billingMode: 'gst' | 'non-gst',
  isInterstate: boolean = false,
): {
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  discount: number;
  total: number;
  taxableAmount: number;
} {
  let subtotal = 0;
  let totalGst = 0;
  let totalCess = 0;
  let totalDiscount = 0;

  items.forEach((item) => {
    const baseAmount = item.quantity * item.rate;
    const discountAmount = (baseAmount * item.discount) / 100;
    const amountAfterDiscount = baseAmount - discountAmount;

    subtotal += amountAfterDiscount;
    totalDiscount += discountAmount;

    if (billingMode === 'gst') {
      const gstAmount = (amountAfterDiscount * item.gstRate) / 100;
      const cessAmount = (amountAfterDiscount * item.cessRate) / 100;
      totalGst += gstAmount;
      totalCess += cessAmount;
    }
  });

  // For intra-state: CGST + SGST, For inter-state: IGST
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (billingMode === 'gst') {
    if (isInterstate) {
      igst = totalGst;
    } else {
      cgst = totalGst / 2;
      sgst = totalGst / 2;
    }
  }

  const total = subtotal + totalGst + totalCess;

  return {
    subtotal,
    cgst,
    sgst,
    igst,
    cess: totalCess,
    discount: totalDiscount,
    total,
    taxableAmount: subtotal,
  };
}

export function calculateGSTBreakup(
  amount: number,
  gstRate: number,
  isInterstate: boolean = false,
): {
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
} {
  const totalGst = (amount * gstRate) / 100;

  if (isInterstate) {
    return {
      cgst: 0,
      sgst: 0,
      igst: totalGst,
      totalGst,
    };
  }

  return {
    cgst: totalGst / 2,
    sgst: totalGst / 2,
    igst: 0,
    totalGst,
  };
}

export function validateInvoiceItems(items: IInvoiceItem[]): string | null {
  if (!items || items.length === 0) {
    return 'Invoice must have at least one item';
  }

  for (const item of items) {
    if (item.quantity <= 0) {
      return `Invalid quantity for ${item.itemName}`;
    }
    if (item.rate <= 0) {
      return `Invalid rate for ${item.itemName}`;
    }
  }

  return null;
}
