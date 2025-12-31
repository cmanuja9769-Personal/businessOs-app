"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export function DownloadPdfButton() {
  const handleDownload = () => {
    // Use browser's print to PDF feature
    window.print()
  }

  return (
    <Button variant="outline" className="gap-2 bg-transparent" onClick={handleDownload}>
      <Download className="w-4 h-4" />
      Download PDF
    </Button>
  )
}
