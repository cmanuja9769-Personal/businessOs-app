import Link from "next/link"
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from "@/components/ui/glass-card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowRight, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import type { LowStockItem } from "./dashboard-types"

interface LowStockAlertProps {
  readonly items: LowStockItem[]
  readonly lowStockCount: number
  readonly outOfStockCount: number
  readonly loading: boolean
}

export function LowStockAlert({ items, lowStockCount, outOfStockCount, loading }: LowStockAlertProps) {
  return (
    <GlassCard glow>
      <GlassCardHeader>
        <div className="flex items-center gap-1.5 min-w-0">
          <GlassCardTitle>Low Stock</GlassCardTitle>
          {!loading && lowStockCount > 0 && (
            <Badge variant="destructive" className="text-[0.625rem] h-5 rounded-full px-1.5">
              {lowStockCount}
            </Badge>
          )}
        </div>
        <Link
          href="/items"
          className="flex items-center gap-1 text-[0.6875rem] font-medium text-primary hover:underline transition-colors"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </GlassCardHeader>
      <GlassCardContent>
        {loading && (
          <div className="space-y-2.5">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 neo-inset flex items-center justify-center mb-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-xs text-muted-foreground">All items well-stocked!</p>
          </div>
        )}
        {!loading && items.length > 0 && (
          <div className="space-y-1.5">
            {items.map((item) => {
              const isOutOfStock = item.stock === 0
              return (
                <Link
                  key={item.id}
                  href={`/items/${item.id}`}
                  className="flex items-center justify-between p-2.5 rounded-2xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] bg-gradient-to-r from-transparent to-transparent"
                  style={{
                    background: isOutOfStock
                      ? "oklch(0.55 0.25 25 / 0.06)"
                      : "oklch(0.75 0.18 85 / 0.08)",
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs truncate">{item.name}</p>
                    <p className={`text-[0.625rem] mt-0.5 ${isOutOfStock ? "text-red-500" : "text-amber-600 dark:text-amber-400"}`}>
                      {isOutOfStock ? "Out of stock" : `Min: ${item.minStock} ${item.unit}`}
                    </p>
                  </div>
                  <div className="text-right ml-2 flex items-center gap-1.5 flex-shrink-0">
                    {isOutOfStock ? (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    )}
                    <p className={`font-bold text-xs ${isOutOfStock ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {item.stock} {item.unit}
                    </p>
                  </div>
                </Link>
              )
            })}
            {outOfStockCount > 0 && items.length < lowStockCount && (
              <p className="text-[0.625rem] text-center text-muted-foreground/70 pt-1">
                +{lowStockCount - items.length} more items need attention
              </p>
            )}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  )
}
