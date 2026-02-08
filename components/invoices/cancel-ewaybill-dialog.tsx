/**
 * Cancel E-Way Bill Dialog
 * Dialog for cancelling E-Way Bill within 24 hours
 */

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertCircle, Loader2, XCircle } from "lucide-react"
import { eWayBillService } from "@/lib/e-waybill-service"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"

interface CancelEWayBillDialogProps {
  ewbNo: number
  invoiceNo: string
  onSuccess?: () => void
}

export function CancelEWayBillDialog({ ewbNo, invoiceNo, onSuccess }: CancelEWayBillDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    cancelRsnCode: "3" as "1" | "2" | "3" | "4",
    cancelRmrk: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.cancelRmrk || formData.cancelRmrk.length < 20) {
      toast.error("Please provide a detailed reason (minimum 20 characters)")
      return
    }

    try {
      setLoading(true)

      await eWayBillService.cancelEWayBill({
        ewbNo,
        cancelRsnCode: formData.cancelRsnCode,
        cancelRmrk: formData.cancelRmrk,
      })

      toast.success("E-Way Bill cancelled successfully")
      setOpen(false)
      onSuccess?.()
    } catch (error: unknown) {
      console.error("Failed to cancel E-Way Bill:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes("2008") || errorMessage.includes("24 hours")) {
        toast.error("E-Way Bill can only be cancelled within 24 hours of generation")
      } else if (errorMessage.includes("2015") || errorMessage.includes("already cancelled")) {
        toast.error("E-Way Bill has already been cancelled")
      } else {
        toast.error(errorMessage || "Failed to cancel E-Way Bill")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <XCircle className="w-3 h-3 mr-1" />
          Cancel E-Way Bill
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Cancel E-Way Bill
            </DialogTitle>
            <DialogDescription>
              Cancel E-Way Bill for invoice {invoiceNo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-1">
                <p className="font-medium">Important:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>E-Way Bill can only be cancelled within 24 hours of generation</li>
                  <li>This action cannot be undone</li>
                  <li>Goods should not have been moved</li>
                </ul>
              </div>
            </div>

            {/* Cancellation Reason */}
            <div className="space-y-2">
              <Label htmlFor="cancelRsnCode">
                Cancellation Reason <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.cancelRsnCode}
                onValueChange={(value: "1" | "2" | "3" | "4") => setFormData({ ...formData, cancelRsnCode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Duplicate</SelectItem>
                  <SelectItem value="2">Order Cancelled</SelectItem>
                  <SelectItem value="3">Data Entry Mistake</SelectItem>
                  <SelectItem value="4">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label htmlFor="cancelRmrk">
                Detailed Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="cancelRmrk"
                placeholder="Provide a detailed reason for cancellation (minimum 20 characters)..."
                value={formData.cancelRmrk}
                onChange={(e) => setFormData({ ...formData, cancelRmrk: e.target.value })}
                rows={4}
                required
                minLength={20}
              />
              <p className="text-xs text-muted-foreground">
                {formData.cancelRmrk.length}/20 characters minimum
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Close
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel E-Way Bill
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
