/**
 * Generate E-Way Bill Button
 * Button component for generating E-Way Bill from invoice
 */

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Truck, Loader2 } from "lucide-react"
import { eWayBillService, EWayBillUtils } from "@/lib/e-waybill-service"
import { toast } from "sonner"
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
import { Badge } from "@/components/ui/badge"

interface GenerateEWayBillButtonProps {
  invoiceId: string
  invoiceNo: string
  total: number
  status: string
  ewaybillNo?: number | null
  customerName: string
  gstEnabled: boolean
  onSuccess?: () => void
}

export function GenerateEWayBillButton({
  invoiceId,
  invoiceNo,
  total,
  status,
  ewaybillNo,
  customerName,
  gstEnabled,
  onSuccess,
}: GenerateEWayBillButtonProps) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  // Check if E-Way Bill is required
  const isRequired = EWayBillUtils.isEWayBillRequired(total)

  // Don't show button if already generated or if it's a draft
  if (ewaybillNo || status === "draft") {
    return null
  }

  const handleGenerate = async (e: React.MouseEvent) => {
    e.preventDefault() // Prevent default dialog close behavior
    console.log('🚛 Generate E-Way Bill clicked for invoice:', invoiceId)
    try {
      setLoading(true)
      console.log('🔄 Calling eWayBillService.generateEWayBill...')
      const response = await eWayBillService.generateEWayBill(invoiceId)
      console.log('✅ E-Way Bill generated:', response)
      
      toast.success(
        <div>
          <p className="font-medium">E-Way Bill Generated Successfully!</p>
          <p className="text-sm text-muted-foreground mt-1">
            E-Way Bill No: {EWayBillUtils.formatEWayBillNo(response.data.ewbNo)}
          </p>
        </div>
      )

      setOpen(false)
      onSuccess?.()
    } catch (error: any) {
      console.error("❌ Failed to generate E-Way Bill:", error)
      
      // Handle specific error codes
      const errorMessage = error.message || "Failed to generate E-Way Bill"
      
      if (errorMessage.includes("2003") || errorMessage.includes("threshold")) {
        toast.error("E-Way Bill not required for invoices below ₹50,000")
      } else if (errorMessage.includes("2010") || errorMessage.includes("GSTIN")) {
        toast.error("Invalid GSTIN. Please check customer GST details.")
      } else if (errorMessage.includes("2002") || errorMessage.includes("already exists")) {
        toast.error("E-Way Bill already exists for this invoice")
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={isRequired ? "default" : "outline"}
          className="gap-2"
          disabled={!gstEnabled}
        >
          <Truck className="w-4 h-4" />
          Generate E-Way Bill
          {!isRequired && <Badge variant="secondary" className="ml-2 text-xs">Optional</Badge>}
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            Generate E-Way Bill
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-900">
                  This will generate an E-Way Bill for transportation of goods from the Government E-Way Bill portal.
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice:</span>
                  <span className="font-medium">{invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium">{customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">₹{total.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Required:</span>
                  <Badge variant={isRequired ? "default" : "secondary"}>
                    {isRequired ? "Yes (>₹50,000)" : "No (<₹50,000)"}
                  </Badge>
                </div>
              </div>

              {!isRequired && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-xs text-amber-900">
                    <strong>Note:</strong> E-Way Bill is optional for invoices below ₹50,000. 
                    However, you can still generate it if required for inter-state transportation.
                  </p>
                </div>
              )}

              {!gstEnabled && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-xs text-red-900">
                    <strong>GST Required:</strong> E-Way Bill can only be generated for GST-enabled invoices.
                  </p>
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <p>✓ Vehicle details can be updated later</p>
                <p>✓ Valid for transportation based on distance</p>
                <p>✓ Can be cancelled within 24 hours</p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <Button onClick={handleGenerate} disabled={loading || !gstEnabled}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Truck className="w-4 h-4 mr-2" />
                Generate E-Way Bill
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
