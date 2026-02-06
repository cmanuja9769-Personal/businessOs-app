const DEFAULT_CURRENCY = "₹"
const DEFAULT_LOCALE = "en-IN"

export function formatCurrency(
  amount: number,
  options?: {
    currency?: string
    locale?: string
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  }
): string { 
  const {
    currency = DEFAULT_CURRENCY,
    locale = DEFAULT_LOCALE,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options || {}

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount)

  return `${currency}${formatted}`
}

export function formatNumber(
  value: number,
  options?: {
    locale?: string
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  }
): string {
  const {
    locale = DEFAULT_LOCALE,
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
  } = options || {}

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value)
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d.-]/g, "")
  return parseFloat(cleaned) || 0
}
