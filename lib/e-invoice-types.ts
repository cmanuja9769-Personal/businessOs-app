/**
 * E-Invoicing Type Definitions
 * Complete type system for e-invoice operations
 */

export interface EInvoiceRequest {
  invoiceId: string
  organizationId: string
  businessGSTIN: string
  businessName: string
  businessAddress: string
  businessEmail?: string
  businessPhone?: string
  customerGSTIN: string
  customerName: string
  customerAddress: string
  items: EInvoiceLineItem[]
  totalAmount: number
  cgst: number
  sgst: number
  igst: number
  cess: number
  invoiceNo: string
  invoiceDate: string
  notes?: string
}

export interface EInvoiceLineItem {
  itemName: string
  hsnCode: string
  quantity: number
  unit: string
  rate: number
  amount: number
  gstRate: number
  cessRate: number
  discount?: number
}

export interface IRNValidation {
  valid: boolean
  irn: string
  ackNo: string
  ackDate: string
  qrCode: string
  message?: string
}

export interface EInvoiceError {
  code: string
  message: string
  field?: string
}

export interface EInvoiceStatus {
  invoiceId: string
  irn?: string
  status: "pending" | "generated" | "filed" | "cancelled" | "failed"
  generatedAt?: Date
  filedAt?: Date
  error?: EInvoiceError
  gstr1Status?: "pending" | "filed" | "failed"
  gstr3bStatus?: "pending" | "filed" | "failed"
}

export interface GSTPoratalConfig {
  username: string
  password: string
  otp: string
}

export interface EInvoiceConfig {
  enabled: boolean
  provider: "government" | "thirdparty" // government = NIC IRP, thirdparty = private API
  apiKey?: string
  username?: string
  sandbox: boolean // test mode
  autoFile: boolean // auto-file GSTR-1
}
