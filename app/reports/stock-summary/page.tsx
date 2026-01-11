"use client"

import { Suspense } from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import StockReportComponent from "@/components/reports/stock-summary-report"

export default function StockSummaryPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/reports">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Stock Summary Report</h1>
          <p className="text-sm text-muted-foreground">Current stock levels across all items</p>
        </div>
      </div>

      {/* Use existing comprehensive stock report component */}
      <Suspense fallback={<div>Loading...</div>}>
        <StockReportComponent />
      </Suspense>
    </div>
  )
}
