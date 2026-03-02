"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateInvoiceStatus } from "@/app/invoices/actions"
import type { DocumentStatus } from "@/components/ui/status-badge"
import { toast } from "sonner"

const STATUS_OPTIONS: { value: DocumentStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
]

interface UpdateInvoiceStatusProps {
  readonly invoiceId: string
  readonly currentStatus: DocumentStatus
}

export function UpdateInvoiceStatus({ invoiceId, currentStatus }: UpdateInvoiceStatusProps) {
  const [isPending, setIsPending] = useState(false)

  const handleChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return
    setIsPending(true)
    try {
      const result = await updateInvoiceStatus(invoiceId, newStatus as DocumentStatus)
      if (result.success) {
        toast.success(`Status updated to ${newStatus}`)
        window.location.reload()
      } else {
        toast.error(result.error || "Failed to update status")
      }
    } catch {
      toast.error("Failed to update status")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Select value={currentStatus} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-[8rem] h-8 text-xs" title="Update invoice status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
