"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
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

type DeleteResult = { success: boolean; error?: string }

interface DeleteConfirmButtonProps {
  entityId: string
  entityName: string
  onDelete: (id: string) => Promise<DeleteResult>
  title?: string
  description?: string
  successMessage?: string
  errorMessage?: string
  variant?: "ghost" | "outline" | "destructive"
  size?: "icon" | "sm" | "default"
  className?: string
  disabled?: boolean
}

export function DeleteConfirmButton({
  entityId,
  entityName,
  onDelete,
  title = "Are you sure?",
  description,
  successMessage,
  errorMessage,
  variant = "ghost",
  size = "icon",
  className,
  disabled = false,
}: DeleteConfirmButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [open, setOpen] = useState(false)

  const defaultDescription = `This action cannot be undone. This will permanently delete this ${entityName} from the system.`
  const defaultSuccessMsg = `${entityName.charAt(0).toUpperCase() + entityName.slice(1)} deleted successfully`
  const defaultErrorMsg = `Failed to delete ${entityName}`

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await onDelete(entityId)
      if (result.success) {
        toast.success(successMessage || defaultSuccessMsg)
        setOpen(false)
      } else {
        toast.error(result.error || errorMessage || defaultErrorMsg)
      }
    } catch {
      toast.error(errorMessage || defaultErrorMsg)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={className}
          disabled={disabled || isDeleting}
          title={`Delete ${entityName}`}
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 text-destructive" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description || defaultDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
