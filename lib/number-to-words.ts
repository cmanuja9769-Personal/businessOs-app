const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
]

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
]

function convertChunk(n: number): string {
  if (n === 0) return ""
  if (n < 20) return ONES[n]
  if (n < 100) {
    const remainder = n % 10
    return TENS[Math.floor(n / 10)] + (remainder ? " " + ONES[remainder] : "")
  }
  const remainder = n % 100
  return ONES[Math.floor(n / 100)] + " Hundred" + (remainder ? " and " + convertChunk(remainder) : "")
}

function convertIndianNumber(n: number): string {
  const crore = Math.floor(n / 10000000)
  const lakh = Math.floor((n % 10000000) / 100000)
  const thousand = Math.floor((n % 100000) / 1000)
  const hundred = n % 1000

  const parts: string[] = []
  if (crore > 0) parts.push(convertChunk(crore) + " Crore")
  if (lakh > 0) parts.push(convertChunk(lakh) + " Lakh")
  if (thousand > 0) parts.push(convertChunk(thousand) + " Thousand")
  if (hundred > 0) parts.push(convertChunk(hundred))

  return parts.join(" ")
}

export function numberToWords(amount: number): string {
  if (amount === 0) return "Zero Rupees Only"

  const isNegative = amount < 0
  const absAmount = Math.abs(amount)
  const rupees = Math.floor(absAmount)
  const paise = Math.round((absAmount - rupees) * 100)

  if (rupees === 0 && paise === 0) return "Zero Rupees Only"

  const parts: string[] = []
  if (rupees > 0) parts.push(convertIndianNumber(rupees) + " Rupees")
  if (paise > 0) parts.push(convertChunk(paise) + " Paise")

  const result = parts.join(" and ")
  return (isNegative ? "Minus " : "") + result + " Only"
}
