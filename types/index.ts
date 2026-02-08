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

// Valid packaging units for master cartons/bundles
export type PackagingUnit = 'CTN' | 'GONI' | 'BAG' | 'BUNDLE' | 'PKT' | 'BOX' | 'CASE' | 'ROLL' | 'DRUM'
export const PACKAGING_UNITS: { value: PackagingUnit; label: string }[] = [
  { value: 'CTN', label: 'Carton (CTN)' },
  { value: 'GONI', label: 'Goni/Sack (GONI)' },
  { value: 'BAG', label: 'Bag (BAG)' },
  { value: 'BUNDLE', label: 'Bundle (BUNDLE)' },
  { value: 'PKT', label: 'Packet (PKT)' },
  { value: 'BOX', label: 'Box (BOX)' },
  { value: 'CASE', label: 'Case (CASE)' },
  { value: 'ROLL', label: 'Roll (ROLL)' },
  { value: 'DRUM', label: 'Drum (DRUM)' },
]

// Base units of measurement
export type BaseUnit = 'PCS' | 'KG' | 'LTR' | 'MTR' | 'BOX' | 'DOZEN' | 'PKT' | 'BAG'
export const BASE_UNITS: { value: BaseUnit; label: string }[] = [
  { value: 'PCS', label: 'Pieces (PCS)' },
  { value: 'KG', label: 'Kilogram (KG)' },
  { value: 'LTR', label: 'Liter (LTR)' },
  { value: 'MTR', label: 'Meter (MTR)' },
  { value: 'BOX', label: 'Box' },
  { value: 'DOZEN', label: 'Dozen' },
  { value: 'PKT', label: 'Packet (PKT)' },
  { value: 'BAG', label: 'Bag' },
]

// Stock ledger transaction types
export type StockTransactionType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'SALE' | 'PURCHASE' | 'RETURN' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'OPENING' | 'CORRECTION'

export interface IItem {
  id: string
  itemCode?: string // Added optional item code/SKU
  name: string
  description?: string // Item description
  category?: string // Added category field
  hsnCode?: string // Made HSN optional
  barcodeNo?: string
  unit: string // Base unit (PCS, KG, etc.)
  conversionRate: number
  alternateUnit?: string
  packagingUnit?: PackagingUnit // Master packaging unit (CTN, GONI, BAG, etc.)
  perCartonQuantity?: number // Conversion factor: 1 packaging_unit = X base units
  purchasePrice: number
  salePrice: number
  wholesalePrice?: number // Added wholesale price
  quantityPrice?: number // Added quantity/bulk price
  mrp?: number
  discountType?: "percentage" | "flat" // Added discount type
  saleDiscount?: number // Added sale discount
  stock: number // Total stock (sum of all warehouses)
  minStock: number
  maxStock: number
  itemLocation?: string // Added item location/rack number
  gstRate: number
  taxRate?: number // Added tax rate field
  cessRate: number
  inclusiveOfTax?: boolean // Added inclusive of tax flag
  createdAt: Date
  updatedAt: Date
  godownId?: string | null // Primary warehouse (for backward compatibility)
  godownName?: string | null
  // Multi-warehouse support
  warehouseStocks?: IItemWarehouseStock[]
}

// Multi-warehouse stock tracking
export interface IItemWarehouseStock {
  id: string
  itemId: string
  warehouseId: string
  warehouseName?: string
  quantity: number
  minQuantity?: number
  maxQuantity?: number
  location?: string // Rack/Shelf location within warehouse
}

// Stock ledger entry for audit trail
export interface IStockLedgerEntry {
  id: string
  organizationId: string
  itemId: string
  itemName?: string
  warehouseId?: string
  warehouseName?: string
  transactionType: StockTransactionType
  transactionDate: Date
  quantityBefore: number
  quantityChange: number
  quantityAfter: number
  entryQuantity: number // Original quantity entered by user
  entryUnit: string // Unit selected by user (PCS, CTN, etc.)
  baseQuantity: number // Converted quantity in base units
  ratePerUnit?: number
  totalValue?: number
  referenceType?: string // invoice, purchase, adjustment, transfer, opening
  referenceId?: string
  referenceNo?: string
  partyId?: string
  partyName?: string
  notes?: string
  createdBy?: string
  createdAt: Date
}

// Item invoice usage record
export interface IItemInvoiceUsage {
  invoiceId: string
  invoiceNo: string
  documentType: string
  invoiceDate: Date
  customerName: string
  quantity: number
  unit: string
  rate: number
  amount: number
}

export interface IInvoiceItem {
  itemId: string
  itemName: string
  hsnCode?: string
  quantity: number
  unit: string
  rate: number
  gstRate: number
  cessRate: number
  discount: number
  amount: number
  customField1Value?: string
  customField2Value?: number
  // Packaging display fields (optional, for PDF display)
  packagingUnit?: PackagingUnit
  perCartonQuantity?: number
  displayAsPackaging?: boolean // Whether to show quantity as CTN/packaging unit on PDF
}

export interface IInvoice {
  id: string
  invoiceNo: string
  documentType: DocumentType // Type of document
  customerId: string
  customerName: string
  customerPhone?: string
  customerAddress?: string
  customerGst?: string
  invoiceDate: Date
  dueDate: Date
  validityDate?: Date // For quotations/proforma invoices
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
  status: DocumentStatus
  gstEnabled: boolean
  notes?: string
  // E-invoice specific fields
  irn?: string // Invoice Reference Number
  qrCode?: string // QR code data
  eInvoiceDate?: Date // E-invoice generation date
  // E-Way Bill specific fields
  ewaybillNo?: number | null // E-Way Bill Number (12-digit)
  ewaybillDate?: string | null // E-Way Bill generation date
  ewaybillValidUpto?: string | null // E-Way Bill validity expiry date
  ewaybillStatus?: string | null // E-Way Bill status (active/cancelled/expired)
  vehicleNumber?: string | null // Vehicle number for transportation
  transportMode?: string | null // Transport mode (1=Road, 2=Rail, 3=Air, 4=Ship)
  distance?: number | null // Distance in KM for E-Way Bill calculation
  // Document linking fields
  parentDocumentId?: string // Reference to parent document (for credit notes, conversions)
  convertedToInvoiceId?: string // Reference to invoice created from this document
  createdAt: Date
  updatedAt: Date
}

export type BillingMode = "gst" | "non-gst"
export type PricingMode = "sale" | "wholesale" | "quantity" // Added pricing mode type
export type PackingType = "loose" | "carton" // Packing type for invoice items

// Document types for different invoice variations
export type DocumentType =
  | "invoice" // Standard sale invoice (can be e-invoiced)
  | "sales_order" // Sales order (customer intent to buy)
  | "quotation" // Quotation/Estimate
  | "proforma" // Proforma invoice
  | "delivery_challan" // Delivery challan
  | "credit_note" // Credit note (sale return)
  | "debit_note" // Debit note

// Extended status types for different document types
export type DocumentStatus =
  | "draft" // Initial draft state
  | "sent" // Sent to customer
  | "paid" // Fully paid
  | "unpaid" // Not paid
  | "partial" // Partially paid
  | "overdue" // Payment overdue
  | "accepted" // Quotation accepted
  | "rejected" // Quotation rejected
  | "converted" // Converted to another document (e.g., quotation → invoice)
  | "cancelled" // Cancelled document
  | "delivered" // Goods delivered (for delivery challans)

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

// Document type configurations
export const DOCUMENT_TYPE_CONFIG: Record<
  DocumentType,
  {
    label: string
    description: string
    numberPrefix: string
    canConvertToInvoice: boolean
    canLinkToInvoice: boolean
    requiresValidity: boolean
    canBeEInvoiced: boolean // Can this document type be e-invoiced?
  }
> = {
  invoice: {
    label: "Sale Invoice",
    description: "Standard invoice for billing customers",
    numberPrefix: "INV",
    canConvertToInvoice: false,
    canLinkToInvoice: false,
    requiresValidity: false,
    canBeEInvoiced: true, // Sale invoices can be e-invoiced
  },
  sales_order: {
    label: "Sales Order",
    description: "Record customer's intent to buy before billing",
    numberPrefix: "SO",
    canConvertToInvoice: true,
    canLinkToInvoice: false,
    requiresValidity: false,
    canBeEInvoiced: false,
  },
  quotation: {
    label: "Quotation",
    description: "Price estimate for customer negotiations",
    numberPrefix: "QUO",
    canConvertToInvoice: true,
    canLinkToInvoice: false,
    requiresValidity: true,
    canBeEInvoiced: false,
  },
  proforma: {
    label: "Proforma Invoice",
    description: "Preliminary invoice before sale finalization",
    numberPrefix: "PRO",
    canConvertToInvoice: true,
    canLinkToInvoice: false,
    requiresValidity: true,
    canBeEInvoiced: false,
  },
  delivery_challan: {
    label: "Delivery Challan",
    description: "Track goods during shipment",
    numberPrefix: "DC",
    canConvertToInvoice: true,
    canLinkToInvoice: false,
    requiresValidity: false,
    canBeEInvoiced: false,
  },
  credit_note: {
    label: "Credit Note",
    description: "Issue refund or discount for returned goods",
    numberPrefix: "CN",
    canConvertToInvoice: false,
    canLinkToInvoice: true,
    requiresValidity: false,
    canBeEInvoiced: true, // Credit notes can also be e-invoiced
  },
  debit_note: {
    label: "Debit Note",
    description: "Request additional payment for under-billing",
    numberPrefix: "DN",
    canConvertToInvoice: false,
    canLinkToInvoice: true,
    requiresValidity: false,
    canBeEInvoiced: true, // Debit notes can also be e-invoiced
  },
}

export interface IBarcodePrintLog {
  id: string
  itemId: string
  itemName: string
  barcodeNo: string | null
  stockAtPrint: number
  labelsPrinted: number
  printType: "individual" | "batch"
  layoutId: string
  printedAt: Date
  createdAt: Date
}
