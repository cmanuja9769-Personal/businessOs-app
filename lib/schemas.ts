import { z } from "zod"

// Customer validation schema
export const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  contactNo: z.string().regex(/^[0-9]{10,15}$/, "Contact number must be 10-15 digits"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  address: z.string().max(500, "Address must be less than 500 characters").optional().or(z.literal("")),
  openingBalance: z.coerce.number().default(0),
  openingDate: z.coerce.date(),
  gstinNo: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format")
    .optional()
    .or(z.literal(""))
    .transform((val) => val?.toUpperCase()),
})

export type CustomerFormData = z.infer<typeof customerSchema>

// Item validation schema
export const itemSchema = z
  .object({
    itemCode: z.string().optional().or(z.literal("")), // Added itemCode field
    name: z.string().min(2, "Item name must be at least 2 characters"),
    description: z.string().optional().or(z.literal("")), // Item description
    category: z.string().optional().or(z.literal("")), // Added category field
    hsnCode: z.string().optional().or(z.literal("")), // Made HSN optional
    barcodeNo: z.string().optional().or(z.literal("")),
    unit: z
      .string()
      .min(1, "Unit is required")
      .transform((val) => val.toUpperCase())
      .refine(
        (val) => ["PCS", "KG", "LTR", "MTR", "BOX", "DOZEN", "PKT", "BAG"].includes(val),
        { message: "Please select a valid unit" }
      ),
    conversionRate: z.coerce.number().min(1, "Conversion rate must be at least 1"),
    alternateUnit: z.string().optional().or(z.literal("")),
    purchasePrice: z.coerce.number().min(0, "Purchase price cannot be negative"),
    salePrice: z.coerce.number().min(0, "Sale price cannot be negative"),
    wholesalePrice: z.coerce.number().min(0, "Wholesale price cannot be negative").optional(), // Added wholesale price
    quantityPrice: z.coerce.number().min(0, "Quantity price cannot be negative").optional(), // Added quantity price
    mrp: z.coerce.number().min(0, "MRP cannot be negative").optional(),
    discountType: z.enum(["percentage", "flat"]).optional(), // Added discount type
    saleDiscount: z.coerce.number().min(0, "Discount cannot be negative").optional(), // Added sale discount
    stock: z.coerce.number().min(0, "Stock cannot be negative").default(0),
    minStock: z.coerce.number().min(0, "Minimum stock cannot be negative").default(0),
    maxStock: z.coerce.number().min(0, "Maximum stock cannot be negative").default(0),
    itemLocation: z.string().optional().or(z.literal("")), // Added item location
    perCartonQuantity: z.coerce.number().min(1, "Per carton quantity must be at least 1").optional(), // Added per carton quantity - optional for bulk uploads
    gstRate: z.coerce.number().min(0).max(100, "GST rate must be between 0-100"),
    taxRate: z.coerce.number().min(0).max(100, "Tax rate must be between 0-100").optional(), // Added tax rate
    cessRate: z.coerce.number().min(0).max(100, "Cess rate must be between 0-100").default(0),
    inclusiveOfTax: z.coerce.boolean().optional().default(false), // Added inclusive of tax flag
    godownId: z.string().uuid().optional().nullable(),
  })
  .refine((data) => data.salePrice >= data.purchasePrice, {
    message: "Sale price should be greater than or equal to purchase price",
    path: ["salePrice"],
  })
  .refine((data) => data.maxStock >= data.minStock, {
    message: "Maximum stock should be greater than or equal to minimum stock",
    path: ["maxStock"],
  })

export type ItemFormData = z.infer<typeof itemSchema>

// Invoice item validation schema
export const invoiceItemSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  itemName: z.string(),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  unit: z.string(),
  rate: z.coerce.number().min(0, "Rate cannot be negative"),
  gstRate: z.coerce.number().min(0).max(100),
  cessRate: z.coerce.number().min(0).max(100).default(0),
  discount: z.coerce.number().min(0).max(100, "Discount must be between 0-100").default(0),
  customField1Value: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val ? val : undefined)),
  customField2Value: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number().optional(),
  ),
  amount: z.coerce.number(),
})

export type InvoiceItemFormData = z.infer<typeof invoiceItemSchema>

// Invoice validation schema
export const invoiceSchema = z.object({
  invoiceNo: z.string().min(1, "Invoice number is required"),
  documentType: z.enum([
    "invoice",
    "sales_order",
    "quotation",
    "proforma",
    "delivery_challan",
    "credit_note",
    "debit_note",
  ]).default("invoice"),
  customerId: z.string().min(1, "Customer is required"),
  customerName: z.string(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  customerGst: z.string().optional(),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  validityDate: z.coerce.date().optional(), // For quotations/proforma
  billingMode: z.enum(["gst", "non-gst"]),
  pricingMode: z.enum(["sale", "wholesale", "quantity"]).default("sale"),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  subtotal: z.coerce.number(),
  cgst: z.coerce.number(),
  sgst: z.coerce.number(),
  igst: z.coerce.number(),
  cess: z.coerce.number(),
  discount: z.coerce.number(),
  discountType: z.enum(["percentage", "flat"]).default("percentage"),
  total: z.coerce.number(),
  paidAmount: z.coerce.number().default(0),
  balance: z.coerce.number(),
  status: z.enum([
    "draft",
    "sent",
    "paid",
    "overdue",
    "unpaid",
    "partial",
    "accepted",
    "rejected",
    "converted",
    "cancelled",
    "delivered",
  ]).default("draft"),
  gstEnabled: z.coerce.boolean(),
  notes: z.string().optional().or(z.literal("")),
  // E-invoice fields
  irn: z.string().optional(),
  qrCode: z.string().optional(),
  eInvoiceDate: z.coerce.date().optional(),
  // Document linking fields
  parentDocumentId: z.string().optional(),
  convertedToInvoiceId: z.string().optional(),
})

export type InvoiceFormData = z.infer<typeof invoiceSchema>

// Supplier validation schema
export const supplierSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  contactNo: z.string().regex(/^[0-9]{10,15}$/, "Contact number must be 10-15 digits"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  address: z.string().max(500, "Address must be less than 500 characters").optional().or(z.literal("")),
  gstinNo: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format")
    .optional()
    .or(z.literal(""))
    .transform((val) => val?.toUpperCase()),
})

export type SupplierFormData = z.infer<typeof supplierSchema>

// Purchase item validation schema
export const purchaseItemSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  name: z.string(),
  hsn: z.string().optional(),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  rate: z.coerce.number().min(0, "Rate cannot be negative"),
  discount: z.coerce.number().min(0, "Discount cannot be negative").default(0),
  discountType: z.enum(["percentage", "flat"]).default("percentage"),
  taxRate: z.coerce.number().min(0).max(100),
  amount: z.coerce.number(),
})

export type PurchaseItemFormData = z.infer<typeof purchaseItemSchema>

// Purchase validation schema
export const purchaseSchema = z.object({
  purchaseNo: z.string().min(1, "Purchase number is required"),
  supplierId: z.string().min(1, "Supplier is required"),
  supplierName: z.string(),
  supplierPhone: z.string().optional(),
  supplierAddress: z.string().optional(),
  supplierGst: z.string().optional(),
  date: z.coerce.date(),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required"),
  subtotal: z.coerce.number(),
  discount: z.coerce.number(),
  discountType: z.enum(["percentage", "flat"]).default("percentage"),
  cgst: z.coerce.number(),
  sgst: z.coerce.number(),
  igst: z.coerce.number(),
  total: z.coerce.number(),
  paidAmount: z.coerce.number().default(0),
  balance: z.coerce.number(),
  status: z.enum(["paid", "unpaid", "partial"]).default("unpaid"),
  gstEnabled: z.coerce.boolean(),
  notes: z.string().optional().or(z.literal("")),
})

export type PurchaseFormData = z.infer<typeof purchaseSchema>

// Payment validation schema
export const paymentSchema = z.object({
  invoiceId: z.string().optional(),
  purchaseId: z.string().optional(),
  paymentDate: z.string().or(z.coerce.date()),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  paymentMethod: z.enum(["cash", "card", "upi", "bank_transfer", "cheque", "other"]),
  referenceNumber: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
})

export type PaymentFormData = z.infer<typeof paymentSchema>
