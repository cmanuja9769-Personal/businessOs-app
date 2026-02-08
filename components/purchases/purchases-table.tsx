"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { IPurchase } from "@/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { BulkDeleteButton } from "@/components/ui/bulk-delete-button"
import { DeletePurchaseButton } from "@/components/purchases/delete-purchase-button"
import { bulkDeletePurchases } from "@/app/purchases/actions"
import { Eye } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

interface PurchasesTableProps {
  readonly purchases: IPurchase[]
}

export function PurchasesTable({ purchases }: PurchasesTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const router = useRouter()

  const allSelected = purchases.length > 0 && selectedIds.size === purchases.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < purchases.length

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === purchases.length) return new Set()
      return new Set(purchases.map((p) => p.id))
    })
  }, [purchases])

  const handleBulkDeleteComplete = useCallback(() => {
    setSelectedIds(new Set())
    router.refresh()
  }, [router])

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b shrink-0">
          <span className="text-sm font-medium">
            {selectedIds.size} {selectedIds.size === 1 ? "row" : "rows"} selected
          </span>
          <BulkDeleteButton
            selectedIds={Array.from(selectedIds)}
            entityName="purchases"
            deleteAction={bulkDeletePurchases}
            onDeleteComplete={handleBulkDeleteComplete}
          />
        </div>
      )}
      <Table containerClassName="flex-1 min-h-0 max-h-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[2.75rem] min-w-[2.75rem] pl-4">
              <Checkbox
                checked={(() => {
                  if (allSelected) return true
                  if (someSelected) return "indeterminate"
                  return false
                })()}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all rows"
              />
            </TableHead>
            <TableHead resizable className="w-[6.25rem] min-w-[5rem]">PO Number</TableHead>
            <TableHead resizable className="w-[12.5rem] min-w-[9.375rem]">Supplier</TableHead>
            <TableHead resizable className="w-[5.625rem] min-w-[5rem]">Date</TableHead>
            <TableHead resizable className="w-[5.625rem] min-w-[4.375rem] text-right">Amount</TableHead>
            <TableHead resizable className="w-[5rem] min-w-[3.75rem] text-right">Paid</TableHead>
            <TableHead resizable className="w-[5rem] min-w-[3.75rem] text-right">Balance</TableHead>
            <TableHead resizable className="w-[4.375rem] min-w-[3.75rem]">Status</TableHead>
            <TableHead className="w-[5rem] min-w-[4.375rem] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchases.map((purchase) => {
            const checked = selectedIds.has(purchase.id)
            return (
              <TableRow
                key={purchase.id}
                data-state={checked ? "selected" : undefined}
                className={checked ? "bg-muted/50" : undefined}
              >
                <TableCell className="pl-4">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleSelect(purchase.id)}
                    aria-label={`Select ${purchase.purchaseNo}`}
                  />
                </TableCell>
                <TableCell className="font-mono font-medium text-xs sm:text-sm">{purchase.purchaseNo}</TableCell>
                <TableCell className="text-xs sm:text-sm truncate">{purchase.supplierName}</TableCell>
                <TableCell className="text-xs sm:text-sm">
                  {format(new Date(purchase.date), "dd MMM yyyy")}
                </TableCell>
                <TableCell className="font-semibold text-right text-xs sm:text-sm">
                  ₹{purchase.total.toFixed(2)}
                </TableCell>
                <TableCell className="text-green-600 text-right text-xs sm:text-sm">
                  ₹{purchase.paidAmount.toFixed(2)}
                </TableCell>
                <TableCell className="text-red-600 text-right text-xs sm:text-sm">
                  ₹{purchase.balance.toFixed(2)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={purchase.status as "paid" | "partial" | "unpaid"} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/purchases/${purchase.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </Link>
                    <DeletePurchaseButton purchaseId={purchase.id} purchaseNo={purchase.purchaseNo} />
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
