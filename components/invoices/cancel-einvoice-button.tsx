"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, XCircle } from "lucide-react"
import { cancelEInvoice } from "@/app/invoices/actions"
import { toast } from "sonner"

interface CancelEInvoiceButtonProps {
  readonly invoiceId: string
  readonly irn: string
  readonly eInvoiceDate?: Date
}

export function CancelEInvoiceButton({ invoiceId, irn, eInvoiceDate }: CancelEInvoiceButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [isPending, setIsPending] = useState(false)

  if (!irn) return null

  if (eInvoiceDate) {
    const hoursSince = (Date.now() - new Date(eInvoiceDate).getTime()) / (1000 * 60 * 60)
    if (hoursSince > 24) return null
  }

  const handleCancel = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for cancellation")
      return
    }
    setIsPending(true)
    try {
      const result = await cancelEInvoice(invoiceId, reason.trim())
      if (result.success) {
        toast.success("E-Invoice cancelled successfully")
        setOpen(false)
        window.location.reload()
      } else {
        toast.error(result.error || "Failed to cancel e-invoice")
      }
    } catch {
      toast.error("Failed to cancel e-invoice")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <XCircle className="w-4 h-4" />
          Cancel E-Invoice
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel E-Invoice?</AlertDialogTitle>
          <AlertDialogDescription>
            This will cancel the IRN for this invoice on the GST portal. E-Invoices can only be cancelled within 24 hours of generation.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          placeholder="Reason for cancellation..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="min-h-[5rem]"
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Keep E-Invoice</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleCancel()
            }}
            disabled={isPending || !reason.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Cancel E-Invoice
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
