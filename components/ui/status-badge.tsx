"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type DocumentStatus = 
  | "draft" 
  | "sent" 
  | "paid" 
  | "unpaid" 
  | "partial" 
  | "overdue" 
  | "accepted" 
  | "rejected" 
  | "converted" 
  | "cancelled" 
  | "delivered"

const statusBadgeVariants = cva("text-xs font-medium", {
  variants: {
    status: {
      draft: "bg-muted text-muted-foreground",
      sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      unpaid: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      partial: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      overdue: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      accepted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      converted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
      delivered: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    },
  },
  defaultVariants: {
    status: "draft",
  },
})

const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  unpaid: "Unpaid",
  partial: "Partial",
  overdue: "Overdue",
  accepted: "Accepted",
  rejected: "Rejected",
  converted: "Converted",
  cancelled: "Cancelled",
  delivered: "Delivered",
}

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  status: DocumentStatus
  className?: string
  label?: string
}

export function StatusBadge({ status, className, label }: StatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(statusBadgeVariants({ status }), className)}
    >
      {label || STATUS_LABELS[status]}
    </Badge>
  )
}
