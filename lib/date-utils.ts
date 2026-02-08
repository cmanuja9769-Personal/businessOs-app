import { format, formatRelative, formatDistance, parseISO } from "date-fns"

export type DateInput = Date | string | null | undefined

export const DATE_FORMATS = {
  short: "dd MMM yyyy",
  medium: "dd MMMM yyyy",
  long: "EEEE, dd MMMM yyyy",
  input: "yyyy-MM-dd",
  month: "MMMM yyyy",
  monthShort: "MMM yyyy",
  time: "hh:mm a",
  datetime: "dd MMM yyyy, hh:mm a",
  gst: "dd/MM/yyyy",
  gstShort: "dd/MM/yy",
} as const

export type DateFormatKey = keyof typeof DATE_FORMATS

export function formatDate(
  date: DateInput,
  formatKey: DateFormatKey = "short"
): string {
  if (!date) return "-"
  
  const dateObj = typeof date === "string" ? parseISO(date) : date
  return format(dateObj, DATE_FORMATS[formatKey])
}

export function formatDateCustom(
  date: DateInput,
  formatString: string
): string {
  if (!date) return "-"
  
  const dateObj = typeof date === "string" ? parseISO(date) : date
  return format(dateObj, formatString)
}

export function formatRelativeDate(
  date: DateInput,
  baseDate: Date = new Date()
): string {
  if (!date) return "-"
  
  const dateObj = typeof date === "string" ? parseISO(date) : date
  return formatRelative(dateObj, baseDate)
}

export function formatTimeAgo(
  date: DateInput,
  options?: { addSuffix?: boolean }
): string {
  if (!date) return "-"
  
  const dateObj = typeof date === "string" ? parseISO(date) : date
  return formatDistance(dateObj, new Date(), { addSuffix: options?.addSuffix ?? true })
}

export function toInputDateString(date: DateInput): string {
  if (!date) return ""
  
  const dateObj = typeof date === "string" ? parseISO(date) : date
  return format(dateObj, DATE_FORMATS.input)
}

export function toMonthString(date: DateInput): string {
  if (!date) return ""
  
  const dateObj = typeof date === "string" ? parseISO(date) : date
  return format(dateObj, "yyyy-MM")
}
