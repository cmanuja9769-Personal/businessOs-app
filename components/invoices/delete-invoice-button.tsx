"use client"

import { deleteInvoice } from "@/app/invoices/actions"
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button"

export function DeleteInvoiceButton({ invoiceId }: { invoiceId: string }) {
  return (
    <DeleteConfirmButton
      entityId={invoiceId}
      entityName="invoice"
      onDelete={deleteInvoice}
      description="This action cannot be undone. This will permanently delete the invoice."
    />
  )
}
