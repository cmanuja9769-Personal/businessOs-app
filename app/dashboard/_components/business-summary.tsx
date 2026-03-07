import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from "@/components/ui/glass-card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown } from "lucide-react"
import { formatCurrency } from "@/lib/format-utils"
import { cn } from "@/lib/utils"

interface BusinessSummaryProps {
  readonly totalSalesAmount: number
  readonly totalPurchaseAmount: number
  readonly totalOutstanding: number
  readonly purchasesDue: number
  readonly loading: boolean
}

const summaryRows = [
  { key: "revenue", label: "Net Revenue", color: "text-emerald-600 dark:text-emerald-400" },
  { key: "expenses", label: "Total Expenses", color: "text-red-500 dark:text-red-400" },
  { key: "receivable", label: "Receivable", color: "text-amber-600 dark:text-amber-400" },
  { key: "payable", label: "Payable", color: "text-sky-600 dark:text-sky-400" },
] as const

export function BusinessSummary({
  totalSalesAmount,
  totalPurchaseAmount,
  totalOutstanding,
  purchasesDue,
  loading,
}: BusinessSummaryProps) {
  const grossMargin = totalSalesAmount - totalPurchaseAmount
  const values: Record<string, number> = {
    revenue: totalSalesAmount,
    expenses: totalPurchaseAmount,
    receivable: totalOutstanding,
    payable: purchasesDue,
  }

  return (
    <GlassCard glow>
      <GlassCardHeader>
        <GlassCardTitle>Business Summary</GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-5 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            {summaryRows.map((row) => (
              <div
                key={row.key}
                className="flex justify-between items-center py-2.5 border-b border-border/30 last:border-0"
              >
                <span className="text-[0.6875rem] text-muted-foreground/80">{row.label}</span>
                <span className={cn("font-bold text-xs", row.color)}>
                  {formatCurrency(values[row.key])}
                </span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 mt-1">
              <span className="text-xs font-semibold">Gross Margin</span>
              <span className={cn(
                "font-bold text-sm flex items-center gap-1",
                grossMargin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
              )}>
                {grossMargin >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {formatCurrency(Math.abs(grossMargin))}
              </span>
            </div>
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
