"use client"

import type React from "react"
import { useState, useTransition, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { paymentSchema, type PaymentFormData } from "@/lib/schemas"
import { createPayment } from "@/app/payments/actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DollarSign } from "lucide-react"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog"

interface PaymentFormProps {
  children: React.ReactNode
  invoiceId?: string
  purchaseId?: string
  maxAmount: number
}

export function PaymentForm({ children, invoiceId, purchaseId, maxAmount }: PaymentFormProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      invoiceId: invoiceId || "",
      purchaseId: purchaseId || "",
      paymentDate: new Date().toISOString().split("T")[0],
      amount: maxAmount,
      paymentMethod: "cash",
      referenceNumber: "",
      notes: "",
    },
  })

  const handleCloseDialog = useCallback(() => {
    setOpen(false)
    form.reset()
  }, [form])

  const {
    showConfirmDialog,
    handleOpenChange,
    confirmDiscard,
    cancelDiscard,
  } = useUnsavedChanges({
    isDirty: form.formState.isDirty,
    onClose: handleCloseDialog,
    setOpen,
  })

  function onSubmit(data: PaymentFormData) {
    startTransition(async () => {
      const result = await createPayment(data)

      if (result.success) {
        toast.success("Payment recorded successfully")
        setOpen(false)
        form.reset()
      } else {
        toast.error(result.error || "Failed to record payment")
      }
    })
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>Enter payment details to update the balance</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date *</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      value={(() => {
                        if (typeof field.value === 'string') return field.value
                        if (field.value instanceof Date) return field.value.toISOString().split('T')[0]
                        return ''
                      })()}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount *</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0.01" max={maxAmount} placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">Outstanding: ₹{maxAmount.toFixed(2)}</p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="referenceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Transaction ID, Cheque No, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any additional notes..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    <UnsavedChangesDialog
      open={showConfirmDialog}
      onConfirm={confirmDiscard}
      onCancel={cancelDiscard}
    />
    </>
  )
}
