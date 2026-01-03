"use client"

import { useState } from "react"
import { Trash2, AlertTriangle, Loader2 } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface DeleteAllButtonProps {
  entityName: string // "items", "customers", "suppliers", etc.
  entityCount?: number // Optional: show count in UI
  deleteAction: () => Promise<{ success: boolean; error?: string; message?: string; deleted?: number }>
  onDeleteComplete?: () => void
  requireConfirmation?: boolean // Require typing confirmation text
}

export function DeleteAllButton({ 
  entityName, 
  entityCount,
  deleteAction,
  onDeleteComplete,
  requireConfirmation = true
}: DeleteAllButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")

  const confirmationPhrase = `DELETE ALL ${entityName.toUpperCase()}`
  const isConfirmed = !requireConfirmation || confirmText === confirmationPhrase

  const handleDelete = async () => {
    if (requireConfirmation && !isConfirmed) {
      toast.error("Please type the confirmation phrase")
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteAction()
      
      if (result.success) {
        toast.success(result.message || `Successfully deleted all ${entityName}`)
        setOpen(false)
        setConfirmText("")
        onDeleteComplete?.()
      } else {
        toast.error(result.error || `Failed to delete all ${entityName}`)
      }
    } catch (error) {
      console.error(`Error deleting all ${entityName}:`, error)
      toast.error(`Failed to delete all ${entityName}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) setConfirmText("")
    }}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Delete All {entityName}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>Delete ALL {entityName}?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p className="font-semibold text-destructive">
              ⚠️ WARNING: This action is IRREVERSIBLE!
            </p>
            <p>
              This will permanently delete ALL {entityName}
              {entityCount !== undefined && ` (${entityCount} total)`} from your database. 
              This action cannot be undone.
            </p>
            {requireConfirmation && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="confirm-text" className="text-foreground">
                  Type <code className="bg-muted px-2 py-1 rounded text-sm font-mono">{confirmationPhrase}</code> to confirm:
                </Label>
                <Input
                  id="confirm-text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={confirmationPhrase}
                  disabled={isDeleting}
                  className="font-mono"
                  autoComplete="off"
                />
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isDeleting || !isConfirmed}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All {entityName}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
