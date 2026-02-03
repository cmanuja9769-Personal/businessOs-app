"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Minus } from "lucide-react"
import { toast } from "sonner"

const adjustmentSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  adjustmentType: z.enum(["increase", "decrease"]),
  reason: z.enum(["damage", "theft", "found", "correction", "opening_balance", "expired", "other"]),
  notes: z.string().optional(),
})

type AdjustmentFormData = z.infer<typeof adjustmentSchema>

interface StockAdjustmentFormProps {
  items: Array<{ id: string; name: string; current_stock: number }>
  onSuccess?: () => void
}

export function StockAdjustmentForm({ items, onSuccess }: StockAdjustmentFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      adjustmentType: "increase",
      reason: "correction",
    },
  })

  const adjustmentType = form.watch("adjustmentType")
  const selectedItemId = form.watch("itemId")
  const selectedItem = items.find(item => item.id === selectedItemId)

  const onSubmit = async (data: AdjustmentFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/inventory/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create adjustment")
      }

      const result = await response.json()
      const action = data.adjustmentType === "increase" ? "increased" : "decreased"
      
      toast.success(
        `Stock ${action} successfully. New stock: ${result.newStock || 'updated'}`
      )
      
      setOpen(false)
      form.reset()
      
      // Refresh the page data to show updated stock
      router.refresh()
      
      // Call the onSuccess callback if providede)
      form.reset()
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create adjustment")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Adjustment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Stock Adjustment</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="itemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} (Current: {item.current_stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedItem && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  <span className="font-medium">Current Stock:</span> {selectedItem.current_stock}
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="adjustmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjustment Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="increase">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4 text-green-600" />
                          <span>Increase Stock</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="decrease">
                        <div className="flex items-center gap-2">
                          <Minus className="w-4 h-4 text-red-600" />
                          <span>Decrease Stock</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Enter quantity"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {adjustmentType === "increase" ? (
                        <>
                          <SelectItem value="found">Found/Recovered</SelectItem>
                          <SelectItem value="correction">Stock Correction</SelectItem>
                          <SelectItem value="opening_balance">Opening Balance</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="damage">Damage/Breakage</SelectItem>
                          <SelectItem value="theft">Theft/Loss</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="correction">Stock Correction</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Adjustment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
