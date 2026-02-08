"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { ICustomer } from "@/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import { CustomerForm } from "@/components/customers/customer-form"
import { DeleteButton } from "@/components/customers/delete-button"
import { BulkDeleteButton } from "@/components/ui/bulk-delete-button"
import { bulkDeleteCustomers } from "@/app/customers/actions"
import Link from "next/link"

interface CustomersTableProps {
  readonly customers: ICustomer[]
}

export function CustomersTable({ customers }: CustomersTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const router = useRouter()

  const allSelected = customers.length > 0 && selectedIds.size === customers.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < customers.length

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
      if (prev.size === customers.length) return new Set()
      return new Set(customers.map((c) => c.id))
    })
  }, [customers])

  const handleBulkDeleteComplete = useCallback(() => {
    setSelectedIds(new Set())
    router.refresh()
  }, [router])

  const selectAllChecked: boolean | "indeterminate" = (() => {
    if (allSelected) return true
    if (someSelected) return "indeterminate"
    return false
  })()

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b shrink-0">
          <span className="text-sm font-medium">
            {selectedIds.size} {selectedIds.size === 1 ? "row" : "rows"} selected
          </span>
          <BulkDeleteButton
            selectedIds={Array.from(selectedIds)}
            entityName="customers"
            deleteAction={bulkDeleteCustomers}
            onDeleteComplete={handleBulkDeleteComplete}
          />
        </div>
      )}
      <Table containerClassName="flex-1 min-h-0 max-h-full" className="table-fixed w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[2.75rem] min-w-[2.75rem] pl-4">
              <Checkbox
                checked={selectAllChecked}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all rows"
              />
            </TableHead>
            <TableHead resizable className="w-[12.5rem] min-w-[9.375rem]">Name</TableHead>
            <TableHead resizable className="w-[6.25rem] min-w-[5rem]">Contact</TableHead>
            <TableHead resizable className="w-[9.375rem] min-w-[6.25rem]">Email</TableHead>
            <TableHead resizable className="w-[11.25rem] min-w-[7.5rem]">Address</TableHead>
            <TableHead resizable className="w-[6.25rem] min-w-[5rem]">GSTIN</TableHead>
            <TableHead resizable className="w-[6.25rem] min-w-[5rem] text-right">Opening Balance</TableHead>
            <TableHead className="w-[5rem] min-w-[4.375rem] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => {
            const checked = selectedIds.has(customer.id)
            return (
              <TableRow
                key={customer.id}
                data-state={checked ? "selected" : undefined}
                className={checked ? "bg-muted/50" : undefined}
              >
                <TableCell className="pl-4">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleSelect(customer.id)}
                    aria-label={`Select ${customer.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium truncate" title={customer.name}>
                  <Link
                    href={`/customers/${customer.id}`}
                    className="hover:underline hover:text-primary text-xs sm:text-sm"
                  >
                    {customer.name}
                  </Link>
                </TableCell>
                <TableCell className="text-xs sm:text-sm" title={customer.contactNo || ""}>
                  {customer.contactNo}
                </TableCell>
                <TableCell className="text-xs sm:text-sm truncate" title={customer.email || ""}>
                  {customer.email || "-"}
                </TableCell>
                <TableCell className="text-xs sm:text-sm truncate max-w-[9.375rem]" title={customer.address || ""}>
                  {customer.address || "-"}
                </TableCell>
                <TableCell>
                  {customer.gstinNo ? (
                    <Badge variant="outline" className="font-mono text-xs">
                      {customer.gstinNo.slice(0, 8)}...
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell
                  className="font-semibold text-right text-xs sm:text-sm"
                  title={`₹${customer.openingBalance.toFixed(2)}`}
                >
                  ₹{customer.openingBalance.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <CustomerForm
                      customer={customer}
                      trigger={
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit Customer">
                          <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      }
                    />
                    <DeleteButton customerId={customer.id} />
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
