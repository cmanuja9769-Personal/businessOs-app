"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { FileDown, FileSpreadsheet, Loader2 } from "lucide-react"
import { ExportOverlay } from "@/components/ui/export-overlay"
import { yieldToMain } from "@/lib/export-utils"

interface ReportActionBarProps {
  readonly onExportPDF: () => Promise<void>
  readonly onExportCSV: () => void
  readonly disabled?: boolean
  readonly pdfLabel?: string
  readonly csvLabel?: string
}

export function ReportActionBar({
  onExportPDF,
  onExportCSV,
  disabled = false,
  pdfLabel = "PDF",
  csvLabel = "CSV",
}: ReportActionBarProps) {
  const [pdfGenerating, setPdfGenerating] = useState(false)

  const handlePDF = useCallback(async () => {
    setPdfGenerating(true)
    await yieldToMain()
    try {
      await onExportPDF()
    } catch (error) {
      console.error("PDF generation failed:", error)
    } finally {
      setPdfGenerating(false)
    }
  }, [onExportPDF])

  return (
    <>
      <ExportOverlay visible={pdfGenerating} />
      <div className="flex gap-2">
        <Button
          onClick={handlePDF}
          variant="outline"
          size="sm"
          disabled={disabled || pdfGenerating}
        >
          {pdfGenerating ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4 mr-1" />
          )}
          {pdfGenerating ? "Generating..." : pdfLabel}
        </Button>
        <Button
          onClick={onExportCSV}
          variant="outline"
          size="sm"
          disabled={disabled}
        >
          <FileSpreadsheet className="h-4 w-4 mr-1" />
          {csvLabel}
        </Button>
      </div>
    </>
  )
}
