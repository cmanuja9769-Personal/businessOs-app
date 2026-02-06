"use client"

import { deletePurchase } from "@/app/purchases/actions"
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button"

interface DeletePurchaseButtonProps {
  purchaseId: string
  purchaseNo: string
}

export function DeletePurchaseButton({ purchaseId, purchaseNo }: DeletePurchaseButtonProps) {
  return (
    <DeleteConfirmButton
      entityId={purchaseId}
      entityName="purchase"
      onDelete={deletePurchase}
      title="Delete Purchase"
      description={`Are you sure you want to delete purchase ${purchaseNo}? This will also reverse the stock added from this purchase.`}
    />
  )
}
