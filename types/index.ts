// Core TypeScript types for the business management application

export interface ICustomer {
  id: string
  name: string
  contactNo: string
  email?: string
  address?: string
  openingBalance: number
  openingDate: Date
  gstinNo?: string
  createdAt: Date
  updatedAt: Date
}

export interface IItem {
  id: string
  itemCode?: string // Added optional item code/SKU
  name: string
  category?: string // Added category field
  hsnCode?: string // Made HSN optional
  barcodeNo?: string
  unit: string
  conversionRate: number
  alternateUnit?: string
  purchasePrice: number
  salePrice: number
  wholesalePrice?: number // Added wholesale price
  quantityPrice?: number // Added quantity/bulk price
  mrp?: number
  discountType?: "percentage" | "flat" // Added discount type
  saleDiscount?: number // Added sale discount
  stock: number
  minStock: number
  maxStock: number
  itemLocation?: string // Added item location/rack number
  gstRate: number
  taxRate?: number // Added tax rate field
  cessRate: number
  inclusiveOfTax?: boolean // Added inclusive of tax flag
  createdAt: Date
  updatedAt: Date
}

export interface IInvoiceItem {
  itemId: string
  itemName: string
  quantity: number
  unit: string
  rate: number
  gstRate: number
  cessRate: number
  discount: number
  amount: number
}

export interface IInvoice {
  id: string
  invoiceNo: string
  customerId: string
  customerName: string
  customerPhone?: string
  customerAddress?: string
  customerGst?: string
  invoiceDate: Date
  dueDate: Date
  billingMode: "gst" | "non-gst"
  pricingMode: PricingMode
  items: IInvoiceItem[]
  subtotal: number
  cgst: number
  sgst: number
  igst: number
  cess: number
  discount: number
  discountType: "percentage" | "flat"
  total: number
  paidAmount: number
  balance: number
  status: "draft" | "sent" | "paid" | "overdue" | "unpaid" | "partial"
  gstEnabled: boolean
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export type BillingMode = "gst" | "non-gst"
export type PricingMode = "sale" | "wholesale" | "quantity" // Added pricing mode type

export interface ISupplier {
  id: string
  name: string
  contactNo: string
  email?: string
  address?: string
  gstinNo?: string
  createdAt: Date
  updatedAt: Date
}

export interface IPurchaseItem {
  itemId: string
  name: string
  hsn?: string
  quantity: number
  rate: number
  discount: number
  discountType: "percentage" | "flat"
  taxRate: number
  amount: number
}

export interface IPurchase {
  id: string
  purchaseNo: string
  supplierId: string
  supplierName: string
  supplierPhone?: string
  supplierAddress?: string
  supplierGst?: string
  date: Date
  items: IPurchaseItem[]
  subtotal: number
  discount: number
  discountType: "percentage" | "flat"
  cgst: number
  sgst: number
  igst: number
  total: number
  paidAmount: number
  balance: number
  status: "paid" | "unpaid" | "partial"
  gstEnabled: boolean
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface IPayment {
  id: string
  invoiceId?: string
  purchaseId?: string
  customerName?: string
  supplierName?: string
  type: "receivable" | "payable"
  paymentDate: Date
  amount: number
  paymentMethod: "cash" | "card" | "upi" | "bank_transfer" | "cheque" | "other"
  referenceNumber?: string
  notes?: string
  createdAt: Date
}
