"use client"

import { memo } from "react"
import { Badge } from "@/components/ui/badge"
import { StatusBadge, type DocumentStatus } from "@/components/ui/status-badge"
import { FileText, Calendar, IndianRupee } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { formatCurrency } from "@/lib/format-utils"

interface InvoiceMobileCardProps {
  readonly id: string
  readonly invoiceNo: string
  readonly customerName: string
  readonly amount: number
  readonly date: Date
  readonly dueDate: Date
  readonly status: DocumentStatus
  readonly documentType: string
}

export const InvoiceMobileCard = memo(function InvoiceMobileCard({
  id,
  invoiceNo,
  customerName,
  amount,
  date,
  dueDate,
  status,
  documentType,
}: InvoiceMobileCardProps) {
  const isOverdue = new Date() > dueDate && status !== "paid"
  const effectiveStatus = isOverdue ? "overdue" : status

  return (
    <Link href={`/invoices/${id}`} className="block">
      <div className="p-3 rounded-2xl glass-subtle neo-shadow-sm transition-colors">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="font-mono font-medium text-sm truncate">{invoiceNo}</span>
              <Badge variant="outline" className="text-[0.625rem] shrink-0">
                {documentType}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{customerName}</p>
          </div>
          <StatusBadge status={effectiveStatus} className="text-xs shrink-0" />
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <div>
              <span className="text-muted-foreground block">Date</span>
              <span className="font-medium">{format(date, "dd MMM yy")}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <div>
              <span className="text-muted-foreground block">Due</span>
              <span className={`font-medium ${isOverdue ? "text-destructive" : ""}`}>
                {format(dueDate, "dd MMM yy")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <IndianRupee className="w-3 h-3 text-muted-foreground" />
            <div>
              <span className="text-muted-foreground block">Amount</span>
              <span className="font-semibold">{formatCurrency(amount)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
})
