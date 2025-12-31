"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { exportItemsToExcel } from "@/lib/excel-parser"
import { toast } from "sonner"
import type { IItem } from "@/types"

interface ItemBulkExportBtnProps {
  items: IItem[]
  godownNames: string[]
}

export function ItemBulkExportBtn({ items, godownNames }: ItemBulkExportBtnProps) {
  const handleExport = async () => {
    try {
      await exportItemsToExcel(items, `items_bulk_edit_${new Date().toISOString().split('T')[0]}.xlsx`, godownNames)
      toast.success(`Exported ${items.length} items. You can edit and re-upload this file.`)
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export items")
    }
  }

  return (
    <Button onClick={handleExport} variant="outline" size="default">
      <Download className="w-4 h-4 mr-2" />
      Bulk Edit Items
    </Button>
  )
}
