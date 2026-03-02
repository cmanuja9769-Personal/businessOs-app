type ClassValue = string | number | null | undefined | false;

export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).map(String).join(' ');
}

function formatIndianNumber(num: number): string {
  const [intPart, decPart] = num.toFixed(2).split('.');
  const isNegative = intPart.startsWith('-');
  const digits = isNegative ? intPart.slice(1) : intPart;

  if (digits.length <= 3) {
    return `${isNegative ? '-' : ''}${digits}.${decPart}`;
  }

  const last3 = digits.slice(-3);
  const remaining = digits.slice(0, -3);
  const grouped = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${isNegative ? '-' : ''}${grouped},${last3}.${decPart}`;
}

export function formatCurrency(amount: number | null | undefined, currency: string = '₹'): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `${currency}0.00`;
  }
  return `${currency}${formatIndianNumber(amount)}`;
}

export function formatCompactCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN');
}

export function formatRelativeDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-IN');
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('en-IN');
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function validateEmail(email: string): boolean {
  const normalized = email.trim();
  const atIndex = normalized.indexOf('@');
  const lastAtIndex = normalized.lastIndexOf('@');
  if (atIndex <= 0 || atIndex !== lastAtIndex) return false;

  const localPart = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  if (!localPart || !domain || domain.startsWith('.') || domain.endsWith('.')) return false;
  if (!domain.includes('.')) return false;
  return !/\s/.test(normalized);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
}

export function validateGSTIN(gstin: string): boolean {
  const gstinRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  return gstinRegex.test(gstin);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const tempNumber = String(Date.now()).slice(-4).padStart(4, '0');
  return `INV/${year}/${tempNumber}`;
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

export function roundToDecimal(num: number, decimals: number = 2): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
