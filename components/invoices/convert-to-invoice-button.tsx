"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FileText, Loader2 } from "lucide-react"
import { convertDocumentToInvoice } from "@/app/invoices/actions"
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
import { DOCUMENT_TYPE_CONFIG, DocumentType } from "@/types"

interface ConvertToInvoiceButtonProps {
  documentId: string
  documentType: DocumentType
  documentNo: string
}

export function ConvertToInvoiceButton({
  documentId,
  documentType,
  documentNo,
}: ConvertToInvoiceButtonProps) {
  const router = useRouter()
  const [isConverting, setIsConverting] = useState(false)

  const config = DOCUMENT_TYPE_CONFIG[documentType]

  // Only show button if document can be converted
  if (!config.canConvertToInvoice) {
    return null
  }

  const handleConvert = async () => {
    setIsConverting(true)
    try {
      const result = await convertDocumentToInvoice(documentId)
      
      if (result.success) {
        const invoiceId = "invoiceId" in result ? result.invoiceId : null
        toast.success(`${config.label} converted to invoice successfully`)
        if (invoiceId) {
          router.push(`/invoices/${invoiceId}`)
        } else {
          router.push("/invoices")
        }
      } else {
        const error = "error" in result ? result.error : "Failed to convert document"
        toast.error(error || "Failed to convert document")
      }
    } catch (error) {
      toast.error("An error occurred during conversion")
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="gap-2" disabled={isConverting}>
          {isConverting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          Convert to Invoice
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Convert to Invoice?</AlertDialogTitle>
          <AlertDialogDescription>
            This will create a new invoice from this {config.label.toLowerCase()} ({documentNo}).
            The original document will be marked as "converted" and linked to the new invoice.
            <br />
            <br />
            All items, customer details, and amounts will be copied to the new invoice.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConvert}>
            Convert to Invoice
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
