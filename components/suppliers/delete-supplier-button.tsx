"use client"

import { deleteSupplier } from "@/app/suppliers/actions"
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button"

interface DeleteSupplierButtonProps {
  id: string
  name: string
}

export function DeleteSupplierButton({ id, name }: DeleteSupplierButtonProps) {
  return (
    <DeleteConfirmButton
      entityId={id}
      entityName="supplier"
      onDelete={deleteSupplier}
      title="Delete Supplier"
      description={`Are you sure you want to delete ${name}? This action cannot be undone.`}
      variant="outline"
      size="sm"
    />
  )
}
