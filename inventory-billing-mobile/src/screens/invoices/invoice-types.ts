import { Ionicons } from '@expo/vector-icons';

export type DocumentType = 'invoice' | 'sales_order' | 'quotation' | 'proforma' | 'delivery_challan' | 'credit_note' | 'debit_note';

export interface DocumentTypeConfig {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  description: string;
}

export interface StepConfig {
  key: 'type' | 'customer' | 'items' | 'review';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const DOCUMENT_TYPES: Record<DocumentType, DocumentTypeConfig> = {
  invoice: { label: 'Invoice', icon: 'receipt-outline', gradient: ['#4F46E5', '#6366F1'], description: 'Standard tax invoice' },
  sales_order: { label: 'Sales Order', icon: 'cart-outline', gradient: ['#059669', '#10B981'], description: 'Confirm customer order' },
  quotation: { label: 'Quotation', icon: 'document-text-outline', gradient: ['#D97706', '#F59E0B'], description: 'Price estimate for customer' },
  proforma: { label: 'Proforma', icon: 'clipboard-outline', gradient: ['#7C3AED', '#8B5CF6'], description: 'Preliminary invoice' },
  delivery_challan: { label: 'Delivery Challan', icon: 'car-outline', gradient: ['#0369A1', '#0EA5E9'], description: 'Goods delivery document' },
  credit_note: { label: 'Credit Note', icon: 'arrow-down-circle-outline', gradient: ['#DC2626', '#EF4444'], description: 'Refund or credit' },
  debit_note: { label: 'Debit Note', icon: 'arrow-up-circle-outline', gradient: ['#EA580C', '#F97316'], description: 'Additional charge' },
};

export const STEPS: StepConfig[] = [
  { key: 'type', label: 'Type', icon: 'document-outline' },
  { key: 'customer', label: 'Customer', icon: 'person-outline' },
  { key: 'items', label: 'Items', icon: 'cube-outline' },
  { key: 'review', label: 'Review', icon: 'checkmark-circle-outline' },
];

export type PricingMode = 'sale' | 'wholesale' | 'quantity';
export type BillingMode = 'gst' | 'non-gst';
export type PackingType = 'loose' | 'carton';

export interface Customer {
  id: string;
  name: string;
  email?: string;
  gstin?: string;
  phone?: string;
  address?: string;
}

export interface Item {
  id: string;
  name: string;
  item_code?: string;
  category?: string;
  sale_price?: number;
  wholesale_price?: number;
  quantity_price?: number;
  purchase_price?: number;
  tax_rate?: number;
  hsn?: string;
  barcode_no?: string;
  current_stock?: number;
  per_carton_quantity?: number;
}

export interface CreateInvoiceRouteParams {
  invoiceId?: string;
  customerId?: string;
}

export interface InvoiceRow {
  document_type?: DocumentType;
  invoice_number?: string | null;
  invoice_date?: string;
  notes?: string | null;
  pricing_mode?: PricingMode;
  billing_mode?: BillingMode;
  gst_enabled?: boolean;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_gst?: string | null;
  customer_phone?: string | null;
  items?: unknown;
}

export interface InvoiceItemRow {
  item_id?: string | null;
  item_name?: string | null;
  quantity?: number;
  unit?: string | null;
  rate?: number;
  amount?: number;
  tax_rate?: number;
  gst_rate?: number;
  cess_rate?: number;
  discount?: number;
  hsn?: string | null;
}

export function getItemPrice(item: Item, pricingMode: PricingMode): number {
  switch (pricingMode) {
    case 'wholesale':
      return item.wholesale_price ?? item.sale_price ?? 0;
    case 'quantity':
      return item.quantity_price ?? item.sale_price ?? 0;
    default:
      return item.sale_price ?? 0;
  }
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

export function getPricingModeLabel(pricingMode: PricingMode): string {
  switch (pricingMode) {
    case 'wholesale': return 'Wholesale Price';
    case 'quantity': return 'Quantity Price (Bulk)';
    default: return 'Sale Price (MRP)';
  }
}
