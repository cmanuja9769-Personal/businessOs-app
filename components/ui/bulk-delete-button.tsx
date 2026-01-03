"use client"

import { useState } from "react"
import { Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface BulkDeleteButtonProps {
  selectedIds: string[]
  entityName: string // "items", "customers", "suppliers", etc.
  deleteAction: (ids: string[]) => Promise<{ success: boolean; error?: string; message?: string }>
  onDeleteComplete?: () => void
}

export function BulkDeleteButton({ 
  selectedIds, 
  entityName, 
  deleteAction,
  onDeleteComplete 
}: BulkDeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [open, setOpen] = useState(false)

  const handleDelete = async () => {
    if (selectedIds.length === 0) {
      toast.error("No items selected")
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteAction(selectedIds)
      
      if (result.success) {
        toast.success(result.message || `Successfully deleted ${selectedIds.length} ${entityName}`)
        setOpen(false)
        onDeleteComplete?.()
      } else {
        toast.error(result.error || `Failed to delete ${entityName}`)
      }
    } catch (error) {
      console.error(`Error deleting ${entityName}:`, error)
      toast.error(`Failed to delete ${entityName}`)
    } finally {
      setIsDeleting(false)
    }
  }

  if (selectedIds.length === 0) {
    return null
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Delete Selected ({selectedIds.length})
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {selectedIds.length} {entityName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the selected {entityName} from the database.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
