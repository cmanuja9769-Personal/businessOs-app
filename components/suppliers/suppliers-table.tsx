"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { ISupplier } from "@/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Phone, Mail, MapPin } from "lucide-react"
import { SupplierForm } from "@/components/suppliers/supplier-form"
import { DeleteSupplierButton } from "@/components/suppliers/delete-supplier-button"
import { BulkDeleteButton } from "@/components/ui/bulk-delete-button"
import { bulkDeleteSuppliers } from "@/app/suppliers/actions"

interface SuppliersTableProps {
  readonly suppliers: ISupplier[]
}

export function SuppliersTable({ suppliers }: SuppliersTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const router = useRouter()

  const allSelected = suppliers.length > 0 && selectedIds.size === suppliers.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < suppliers.length

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
      if (prev.size === suppliers.length) return new Set()
      return new Set(suppliers.map((s) => s.id))
    })
  }, [suppliers])

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
            entityName="suppliers"
            deleteAction={bulkDeleteSuppliers}
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
            <TableHead resizable className="w-[12.5rem] min-w-[9.375rem]">Name</TableHead>
            <TableHead resizable className="w-[9.375rem] min-w-[6.25rem]">Contact</TableHead>
            <TableHead resizable className="w-[12.5rem] min-w-[9.375rem]">Address</TableHead>
            <TableHead resizable className="w-[9.375rem] min-w-[6.25rem]">GSTIN</TableHead>
            <TableHead className="w-[6.25rem] min-w-[5rem] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => {
            const checked = selectedIds.has(supplier.id)
            return (
              <TableRow
                key={supplier.id}
                data-state={checked ? "selected" : undefined}
                className={checked ? "bg-muted/50" : undefined}
              >
                <TableCell className="pl-4">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleSelect(supplier.id)}
                    aria-label={`Select ${supplier.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      <span>{supplier.contactNo}</span>
                    </div>
                    {supplier.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span>{supplier.email}</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {supplier.address ? (
                    <div className="flex items-start gap-2 text-sm max-w-xs">
                      <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{supplier.address}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {supplier.gstinNo ? (
                    <Badge variant="outline" className="font-mono text-xs">
                      {supplier.gstinNo}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <SupplierForm supplier={supplier}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </SupplierForm>
                    <DeleteSupplierButton id={supplier.id} name={supplier.name} />
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
