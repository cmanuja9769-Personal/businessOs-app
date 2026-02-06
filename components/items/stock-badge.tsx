"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { type StockStatus, STOCK_STATUS_LABELS } from "@/lib/stock-utils"

const stockBadgeVariants = cva("text-[0.625rem] px-1.5", {
  variants: {
    status: {
      low: "bg-orange-500 text-background",
      high: "",
      normal: "bg-green-500/10 text-green-700 dark:text-green-400",
    },
  },
  defaultVariants: {
    status: "normal",
  },
})

const BADGE_VARIANT_MAP: Readonly<Record<StockStatus, "destructive" | "secondary">> = {
  low: "destructive",
  high: "secondary",
  normal: "secondary",
}

interface StockBadgeProps extends VariantProps<typeof stockBadgeVariants> {
  status: StockStatus
  className?: string
}

export function StockBadge({ status, className }: StockBadgeProps) {
  return (
    <Badge
      variant={BADGE_VARIANT_MAP[status]}
      className={cn(stockBadgeVariants({ status }), className)}
    >
      {STOCK_STATUS_LABELS[status]}
    </Badge>
  )
}
