export const APP_NAME = 'Inventory & Billing';
export const APP_VERSION = '1.0.0';

// API Endpoints
export const API_TIMEOUT = 30000; // 30 seconds

// Pagination
export const ITEMS_PER_PAGE = 20;

// Date Formats
export const DATE_FORMAT = 'DD/MM/YYYY';
export const DATETIME_FORMAT = 'DD/MM/YYYY HH:mm';

// Currency
export const DEFAULT_CURRENCY = '₹';
export const CURRENCY_SYMBOL = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

// Status
export const INVOICE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PAID: 'paid',
  PARTIALLY_PAID: 'partially_paid',
  CANCELLED: 'cancelled',
  OVERDUE: 'overdue',
};

export const STOCK_STATUS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  OUT: 'out',
};

// Units
export const UNITS = [
  'PCS',
  'KG',
  'G',
  'L',
  'ML',
  'M',
  'CM',
  'BOX',
  'PACK',
  'DOZEN',
];

// GST Rates
export const GST_RATES = [0, 5, 12, 18, 28];

// Payment Methods
export const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Cheque', 'Bank Transfer'];
