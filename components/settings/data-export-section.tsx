"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { exportTableAsCSV } from "@/app/settings/export-actions"
import { toast } from "sonner"
import { Download, Loader2, Database, FileSpreadsheet, Users, Package, Truck, CreditCard } from "lucide-react"

type ExportTable = "invoices" | "customers" | "items" | "payments" | "suppliers" | "purchases"

interface ExportOption {
  readonly table: ExportTable
  readonly label: string
  readonly icon: React.ReactNode
  readonly description: string
}

const EXPORT_OPTIONS: readonly ExportOption[] = [
  { table: "invoices", label: "Invoices", icon: <FileSpreadsheet className="h-4 w-4" />, description: "All invoices with amounts and status" },
  { table: "customers", label: "Customers", icon: <Users className="h-4 w-4" />, description: "Customer details and balances" },
  { table: "items", label: "Items", icon: <Package className="h-4 w-4" />, description: "Product catalog with pricing and stock" },
  { table: "suppliers", label: "Suppliers", icon: <Truck className="h-4 w-4" />, description: "Supplier details and balances" },
  { table: "purchases", label: "Purchases", icon: <FileSpreadsheet className="h-4 w-4" />, description: "All purchase orders with amounts" },
  { table: "payments", label: "Payments", icon: <CreditCard className="h-4 w-4" />, description: "Payment transaction records" },
]

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

export function DataExportSection() {
  const [loadingTable, setLoadingTable] = useState<ExportTable | null>(null)

  const handleExport = async (table: ExportTable) => {
    setLoadingTable(table)
    try {
      const result = await exportTableAsCSV(table)

      if (result.success && result.csv) {
        const dateStr = new Date().toISOString().split("T")[0]
        downloadCSV(result.csv, `${table}-export-${dateStr}.csv`)
        toast.success(`${table.charAt(0).toUpperCase() + table.slice(1)} exported successfully`)
      } else {
        toast.error(result.error || "Export failed")
      }
    } catch {
      toast.error("Failed to export data")
    } finally {
      setLoadingTable(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Management & Export
        </CardTitle>
        <CardDescription>Download your business data as CSV files for backup or analysis in Excel/Google Sheets</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EXPORT_OPTIONS.map((option) => (
            <div key={option.table} className="flex items-center justify-between rounded-2xl glass-subtle p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  {option.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{option.description}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleExport(option.table)}
                disabled={loadingTable !== null}
                className="shrink-0 ml-2"
              >
                {loadingTable === option.table ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
