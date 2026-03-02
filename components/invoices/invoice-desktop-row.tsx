"use client"

import { memo } from "react"
import { Badge } from "@/components/ui/badge"
import { StatusBadge, type DocumentStatus } from "@/components/ui/status-badge"
import { Checkbox } from "@/components/ui/checkbox"
import { TableCell, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { format } from "date-fns"
import { formatCurrency } from "@/lib/format-utils"

interface InvoiceDesktopRowProps {
  readonly id: string
  readonly invoiceNo: string
  readonly customerName: string
  readonly amount: number
  readonly date: Date
  readonly dueDate: Date
  readonly status: DocumentStatus
  readonly documentType: string
  readonly paidAmount: number
  readonly balance: number
  readonly selected?: boolean
  readonly onSelectChange?: (id: string) => void
}

export const InvoiceDesktopRow = memo(function InvoiceDesktopRow({
  id,
  invoiceNo,
  customerName,
  amount,
  date,
  dueDate,
  status,
  documentType,
  paidAmount,
  balance,
  selected,
  onSelectChange,
}: InvoiceDesktopRowProps) {
  const isOverdue = new Date() > dueDate && status !== "paid"
  const effectiveStatus = isOverdue ? "overdue" : status

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50">
      {onSelectChange && (
        <TableCell className="pl-4 w-[2.75rem]">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onSelectChange(id)}
            aria-label={`Select ${invoiceNo}`}
          />
        </TableCell>
      )}
      <TableCell>
        <Link href={`/invoices/${id}`} className="font-mono font-medium text-sm hover:text-primary hover:underline">
          {invoiceNo}
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-[0.625rem]">{documentType}</Badge>
      </TableCell>
      <TableCell className="max-w-[12.5rem] truncate">{customerName}</TableCell>
      <TableCell>{format(date, "dd MMM yyyy")}</TableCell>
      <TableCell className={isOverdue ? "text-destructive font-medium" : ""}>
        {format(dueDate, "dd MMM yyyy")}
      </TableCell>
      <TableCell className="text-right font-semibold">{formatCurrency(amount)}</TableCell>
      <TableCell className="text-right">{formatCurrency(paidAmount)}</TableCell>
      <TableCell className="text-right font-medium">
        {balance > 0 ? (
          <span className="text-orange-600">{formatCurrency(balance)}</span>
        ) : (
          <span className="text-green-600">{formatCurrency(0)}</span>
        )}
      </TableCell>
      <TableCell>
        <StatusBadge status={effectiveStatus} className="text-xs" />
      </TableCell>
    </TableRow>
  )
})
