"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Printer, Loader2 } from "lucide-react"
import { pdf } from "@react-pdf/renderer"
import { InvoicePDFDocument } from "@/components/pdf/invoice-pdf-document"
import type { IInvoice } from "@/types"
import type { ISettings } from "@/app/settings/actions"

interface InvoicePDFButtonsProps {
  invoice: IInvoice
  settings: ISettings
}

export function InvoicePDFButtons({ invoice, settings }: InvoicePDFButtonsProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownloadPDF = async () => {
    setIsGenerating(true)
    try {
      const blob = await pdf(
        <InvoicePDFDocument invoice={invoice} settings={settings} />
      ).toBlob()
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Invoice ${invoice.invoiceNo} - ${invoice.customerName.replace(/[^a-zA-Z0-9 ]/g, "")}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("PDF generation failed:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePrintPDF = async () => {
    setIsGenerating(true)
    try {
      const blob = await pdf(
        <InvoicePDFDocument invoice={invoice} settings={settings} />
      ).toBlob()
      
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
    } catch (error) {
      console.error("PDF print failed:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <Button 
        onClick={handleDownloadPDF} 
        disabled={isGenerating}
        variant="outline"
        className="gap-2"
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        Download PDF
      </Button>
      <Button 
        onClick={handlePrintPDF} 
        disabled={isGenerating}
        className="gap-2"
      >
        {isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Printer className="w-4 h-4" />
        )}
        Print
      </Button>
    </>
  )
}
