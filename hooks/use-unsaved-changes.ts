"use client"

import { useState, useCallback } from "react"

interface UseUnsavedChangesOptions {
  isDirty: boolean
  onClose: () => void
  setOpen: (open: boolean) => void
}

interface UseUnsavedChangesReturn {
  showConfirmDialog: boolean
  handleOpenChange: (open: boolean) => void
  confirmDiscard: () => void
  cancelDiscard: () => void
}

export function useUnsavedChanges({
  isDirty,
  onClose,
  setOpen,
}: UseUnsavedChangesOptions): UseUnsavedChangesReturn {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setOpen(true)
      } else if (isDirty) {
        setShowConfirmDialog(true)
      } else {
        onClose()
      }
    },
    [isDirty, onClose, setOpen]
  )

  const confirmDiscard = useCallback(() => {
    setShowConfirmDialog(false)
    onClose()
  }, [onClose])

  const cancelDiscard = useCallback(() => {
    setShowConfirmDialog(false)
  }, [])

  return {
    showConfirmDialog,
    handleOpenChange,
    confirmDiscard,
    cancelDiscard,
  }
}
