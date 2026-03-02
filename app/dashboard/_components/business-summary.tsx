import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown } from "lucide-react"
import { formatCurrency } from "@/lib/format-utils"

interface BusinessSummaryProps {
  readonly totalSalesAmount: number
  readonly totalPurchaseAmount: number
  readonly totalOutstanding: number
  readonly purchasesDue: number
  readonly loading: boolean
}

export function BusinessSummary({
  totalSalesAmount,
  totalPurchaseAmount,
  totalOutstanding,
  purchasesDue,
  loading,
}: BusinessSummaryProps) {
  const grossMargin = totalSalesAmount - totalPurchaseAmount

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/30 dark:to-slate-800/20">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold">Business Summary</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Net Revenue</span>
              <span className="font-semibold text-xs text-green-600">{formatCurrency(totalSalesAmount)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Total Expenses</span>
              <span className="font-semibold text-xs text-red-600">{formatCurrency(totalPurchaseAmount)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Receivable</span>
              <span className="font-semibold text-xs text-orange-600">{formatCurrency(totalOutstanding)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Payable</span>
              <span className="font-semibold text-xs text-blue-600">{formatCurrency(purchasesDue)}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-xs font-medium">Gross Margin</span>
              <span className={`font-bold text-sm ${grossMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
                {grossMargin >= 0 ? (
                  <TrendingUp className="inline h-3.5 w-3.5 mr-0.5" />
                ) : (
                  <TrendingDown className="inline h-3.5 w-3.5 mr-0.5" />
                )}
                {formatCurrency(Math.abs(grossMargin))}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
