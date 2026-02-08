export interface ApiInvoiceResponse {
  readonly id: string
  readonly invoiceNo: string
  readonly invoiceDate: string
  readonly dueDate?: string
  readonly documentType?: string
  readonly customerId?: string
  readonly customerName: string
  readonly customerPhone?: string
  readonly customerEmail?: string
  readonly customerGst?: string
  readonly customerGstin?: string
  readonly placeOfSupply?: string
  readonly stateCode?: string
  readonly subtotal: number
  readonly total: number
  readonly cgst: number
  readonly sgst: number
  readonly igst: number
  readonly cess: number
  readonly totalTax?: number
  readonly discount: number
  readonly paidAmount: number
  readonly balance: number
  readonly status: string
  readonly gstEnabled: boolean
  readonly state?: string
  readonly notes?: string
  readonly items?: ApiInvoiceItemResponse[]
}

export interface ApiInvoiceItemResponse {
  readonly itemId: string
  readonly itemName: string
  readonly quantity: number
  readonly rate: number
  readonly amount: number
  readonly unit?: string
  readonly gstRate?: number
  readonly hsnCode?: string
  readonly name?: string
  readonly sku?: string
  readonly category?: string
  readonly price?: number
  readonly purchasePrice?: number
  readonly costPrice?: number
}

export interface ApiPurchaseResponse {
  readonly id: string
  readonly purchaseNo: string
  readonly date: string
  readonly dueDate?: string
  readonly supplierId?: string
  readonly supplierName: string
  readonly supplierPhone?: string
  readonly supplierGst?: string
  readonly supplierGstin?: string
  readonly placeOfSupply?: string
  readonly stateCode?: string
  readonly subtotal: number
  readonly total: number
  readonly cgst: number
  readonly sgst: number
  readonly igst: number
  readonly cess?: number
  readonly totalTax?: number
  readonly discount: number
  readonly paidAmount: number
  readonly balance: number
  readonly status: string
  readonly gstEnabled: boolean
  readonly state?: string
  readonly items?: ApiPurchaseItemResponse[]
}

export interface ApiPurchaseItemResponse {
  readonly itemId: string
  readonly name: string
  readonly quantity: number
  readonly rate: number
  readonly amount: number
  readonly taxRate?: number
  readonly hsn?: string
}

export interface ApiPaymentResponse {
  readonly id: string
  readonly paymentNo?: string
  readonly referenceNo?: string
  readonly paymentDate?: string
  readonly date?: string
  readonly type: string
  readonly amount: number
  readonly paymentMode?: string
  readonly paymentMethod?: string
  readonly partyName?: string
  readonly customerName?: string
  readonly supplierName?: string
  readonly invoiceId?: string
  readonly purchaseId?: string
  readonly notes?: string
}
