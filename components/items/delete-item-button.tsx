"use client"

import { deleteItem } from "@/app/items/actions"
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button"

export function DeleteItemButton({ itemId }: { itemId: string }) {
  return (
    <DeleteConfirmButton
      entityId={itemId}
      entityName="item"
      onDelete={deleteItem}
      description="This action cannot be undone. This will permanently delete the item from your inventory."
    />
  )
}
