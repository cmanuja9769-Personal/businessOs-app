/**
 * E-Invoice Status Card
 * Displays IRN, QR code, and filing status
 */

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Download, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { eInvoiceService } from "@/lib/e-invoice-service"
import type { IInvoice } from "@/types"

interface EInvoiceStatusCardProps {
  invoice: IInvoice
}

interface FilingStatus {
  status: string
  gstr1Status?: string
  gstr3bStatus?: string
  error?: string
}

export function EInvoiceStatusCard({ invoice }: EInvoiceStatusCardProps) {
  const [loading, setLoading] = useState(false)
  const [filingStatus, setFilingStatus] = useState<FilingStatus | null>(null)

  useEffect(() => {
    if (invoice.irn) {
      loadFilingStatus()
    }
  }, [invoice.id, invoice.irn])

  const loadFilingStatus = async () => {
    try {
      const status = await eInvoiceService.getFilingStatus(invoice.id)
      setFilingStatus(status)
    } catch (error) {
      console.error("Failed to load filing status:", error)
    }
  }

  const handleDownloadPDF = async () => {
    setLoading(true)
    try {
      const blob = await eInvoiceService.downloadEInvoicePDF(invoice.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `einvoice-${invoice.invoiceNo}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Failed to download PDF:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!invoice.irn) {
    return null
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "filed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case "failed":
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-amber-600" />
    }
  }

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <CardTitle>E-Invoice Details</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            E-Invoiced
          </Badge>
        </div>
        <CardDescription>Government-registered e-invoice with IRN</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* IRN Section */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Invoice Reference Number (IRN)</p>
            <div className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
              <code className="text-xs font-mono text-gray-600 break-all">{invoice.irn}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(invoice.irn || "")
                }}
                className="text-xs text-blue-600 hover:text-blue-800 ml-2"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-600">
              Generated: {invoice.eInvoiceDate && new Date(invoice.eInvoiceDate).toLocaleString()}
            </p>
          </div>

          {/* QR Code Section */}
          {invoice.qrCode && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">QR Code</p>
              <div className="p-2 bg-white rounded border border-gray-200 flex items-center justify-center">
                <img src={invoice.qrCode} alt="E-Invoice QR Code" className="w-32 h-32" />
              </div>
              <p className="text-xs text-gray-600">Scan for invoice verification</p>
            </div>
          )}
        </div>

        {/* Filing Status */}
        {filingStatus && (
          <div className="mt-4 p-3 bg-white rounded border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">GST Filing Status</p>
              <div className="flex items-center gap-2">
                {getStatusIcon(filingStatus.status)}
                <Badge
                  variant={(() => {
                    if (filingStatus.status === "filed") return "default" as const
                    if (filingStatus.status === "failed") return "destructive" as const
                    return "secondary" as const
                  })()}
                >
                  {filingStatus.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            {filingStatus.gstr1Status && (
              <p className="text-xs text-gray-600">
                <span className="font-medium">GSTR-1:</span> {filingStatus.gstr1Status}
              </p>
            )}
            {filingStatus.gstr3bStatus && (
              <p className="text-xs text-gray-600">
                <span className="font-medium">GSTR-3B:</span> {filingStatus.gstr3bStatus}
              </p>
            )}
            {filingStatus.error && <p className="text-xs text-red-600">{filingStatus.error}</p>}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={loading}
            className="gap-2 bg-transparent"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download E-Invoice PDF
          </Button>
        </div>

        {/* Information */}
        <div className="p-3 bg-blue-50 rounded border border-blue-200 text-xs text-blue-700 space-y-1">
          <p className="font-medium">What&apos;s included?</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Digital IRN signature for authenticity</li>
            <li>Auto-filed to GST portal (GSTR-1)</li>
            <li>QR code for instant verification</li>
            <li>Tamper-proof invoice record</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
