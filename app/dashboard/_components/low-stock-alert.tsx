import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
    <Card className={lowStockCount > 0 ? "border-orange-200/50 dark:border-orange-900/50" : ""}>
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
        <div className="flex items-center gap-1.5 min-w-0">
          <CardTitle className="text-sm font-semibold">Low Stock</CardTitle>
          {!loading && lowStockCount > 0 && (
            <Badge variant="destructive" className="text-[0.625rem] h-5">
              {lowStockCount}
            </Badge>
          )}
        </div>
        <Link href="/items">
          <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2">
            View all
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {loading && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-center py-6">
            <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-xs text-muted-foreground">All items well-stocked!</p>
          </div>
        )}
        {!loading && items.length > 0 && (
          <div className="space-y-2">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/items/${item.id}`}
                className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                  item.stock === 0
                    ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40"
                    : "border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/40"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-xs truncate">{item.name}</p>
                  <p className={`text-[0.625rem] ${item.stock === 0 ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400"}`}>
                    {item.stock === 0 ? "Out of stock" : `Min: ${item.minStock} ${item.unit}`}
                  </p>
                </div>
                <div className="text-right ml-2 flex items-center gap-1.5 flex-shrink-0">
                  {item.stock === 0 ? (
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                  )}
                  <div>
                    <p className={`font-semibold text-xs ${item.stock === 0 ? "text-red-700 dark:text-red-300" : "text-orange-700 dark:text-orange-300"}`}>
                      {item.stock} {item.unit}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
            {outOfStockCount > 0 && items.length < lowStockCount && (
              <p className="text-[0.625rem] text-center text-muted-foreground">
                +{lowStockCount - items.length} more items need attention
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
