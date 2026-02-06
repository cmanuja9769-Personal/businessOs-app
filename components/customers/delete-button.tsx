"use client"

import { deleteCustomer } from "@/app/customers/actions"
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button"

export function DeleteButton({ customerId }: { customerId: string }) {
  return (
    <DeleteConfirmButton
      entityId={customerId}
      entityName="customer"
      onDelete={deleteCustomer}
      description="This action cannot be undone. This will permanently delete the customer and all associated data."
    />
  )
}
