/**
 * E-Invoice Generation Dialog with validation and step-by-step process
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card } from "@/components/ui/card"
import { Loader2, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { eInvoiceService } from "@/lib/e-invoice-service"
import { generateEInvoice } from "@/app/invoices/actions"
import type { IInvoice } from "@/types"
import { toast } from "sonner"

interface EInvoiceGenerationDialogProps {
  invoice: IInvoice
  open: boolean
  onOpenChange: (open: boolean) => void
}

type GenerationStep = "validation" | "processing" | "success" | "error"

export function EInvoiceGenerationDialog({ invoice, open, onOpenChange }: EInvoiceGenerationDialogProps) {
  const router = useRouter()
  const [step, setStep] = useState<GenerationStep>("validation")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [generatedIRN, setGeneratedIRN] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)

  // Poll job status if processing
  useEffect(() => {
    if (step === "processing" && jobId && pollCount < 30) {
      const timer = setTimeout(async () => {
        try {
          const status = await eInvoiceService.getJobStatus(jobId)

          if (status.status === "success") {
            setGeneratedIRN(status.irn || null)
            setStep("success")
          } else if (status.status === "failed") {
            setError(status.error || "Failed to generate IRN")
            setStep("error")
          } else {
            setPollCount((prev) => prev + 1)
          }
        } catch {
          setError("Failed to check job status")
          setStep("error")
        }
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [step, jobId, pollCount])

  const handleGenerateEInvoice = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Validate GST
      const gstValidation = await eInvoiceService.validateGST(invoice.customerGst || "")
      if (!gstValidation.valid) {
        throw new Error(gstValidation.error || "Invalid customer GST number")
      }

      // Queue e-invoice generation
      const job = await eInvoiceService.queueEInvoiceGeneration(invoice.id)
      setJobId(job.id)
      setStep("processing")
      setPollCount(0)

      toast.info("E-invoice generation queued. Processing...")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue e-invoice")
      setStep("error")
      toast.error("Failed to queue e-invoice generation")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuccess = async () => {
    // Refresh invoice data
    try {
      // Call the server action to update invoice with IRN
      await generateEInvoice(invoice.id, "default-org")
      toast.success("E-Invoice generated successfully!")
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error("Failed to refresh invoice:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate E-Invoice</DialogTitle>
          <DialogDescription>Create a government-registered e-invoice with IRN</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Validation Step */}
          {step === "validation" && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will register your invoice with the government e-invoice portal (IRP). This process is
                  irreversible.
                </AlertDescription>
              </Alert>

              <Card className="p-4 space-y-3 bg-muted/50">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Invoice Summary</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Invoice No:</p>
                      <p className="font-mono">{invoice.invoiceNo}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Customer:</p>
                      <p>{invoice.customerName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Amount:</p>
                      <p className="font-semibold">₹{invoice.total.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">GSTIN:</p>
                      <p className="font-mono text-xs">{invoice.customerGst}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="space-y-2">
                <p className="text-sm font-medium">You will receive:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>64-character Invoice Reference Number (IRN)</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Digitally signed QR code for verification</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>Auto-filing to GST portal (GSTR-1)</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {step === "processing" && (
            <div className="space-y-4 py-8 text-center">
              <div className="flex justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
              </div>
              <div className="space-y-2">
                <p className="font-medium">Generating E-Invoice...</p>
                <p className="text-sm text-muted-foreground">
                  Sending to government portal. This may take a few moments.
                </p>
                <p className="text-xs text-muted-foreground">Attempt {pollCount}/30</p>
              </div>

              <div className="pt-4 space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-600">Processing</span>
                </div>
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === "success" && (
            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <CheckCircle2 className="w-16 h-16 text-green-600" />
              </div>
              <div className="space-y-2 text-center">
                <p className="font-semibold text-lg">E-Invoice Generated!</p>
                <p className="text-sm text-muted-foreground">Your invoice has been registered with the government</p>
              </div>

              {generatedIRN && (
                <Card className="p-4 bg-green-50 border-green-200 space-y-2">
                  <p className="text-sm font-medium text-green-900">Invoice Reference Number (IRN)</p>
                  <div className="flex items-center justify-between p-2 bg-white rounded border border-green-300">
                    <code className="text-xs font-mono text-green-800 break-all">{generatedIRN}</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedIRN)
                        toast.success("IRN copied to clipboard")
                      }}
                      className="text-xs text-green-600 hover:text-green-800 ml-2 flex-shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-green-700">
                    Save this IRN for your records. You can download the invoice with QR code below.
                  </p>
                </Card>
              )}

              <Alert className="bg-blue-50 border-blue-200">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  Invoice data has been auto-filed to the GST portal. GSTR-1 will be updated shortly.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Error Step */}
          {step === "error" && (
            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Please verify the following before retrying:</p>
                <ul className="text-sm list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Customer GST number is valid</li>
                  <li>Invoice is in &quot;sent&quot; status</li>
                  <li>All invoice details are correct</li>
                  <li>Customer has GST registration</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {step === "success" ? "Close" : "Cancel"}
          </Button>
          {step === "validation" && (
            <Button onClick={handleGenerateEInvoice} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Generate E-Invoice"
              )}
            </Button>
          )}
          {step === "success" && <Button onClick={handleSuccess}>Done</Button>}
          {step === "error" && (
            <Button variant="outline" onClick={() => setStep("validation")}>
              Retry
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
