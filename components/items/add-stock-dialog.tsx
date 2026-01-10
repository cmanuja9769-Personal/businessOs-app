"use client"

import { useState } from "react"
import type { IItem } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2, Package, Info } from "lucide-react"
import { addStockWithLedger } from "@/app/items/actions"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface AddStockDialogProps {
  item: IItem
  godowns: Array<{ id: string; name: string }>
  trigger?: React.ReactNode
}

export function AddStockDialog({ item, godowns, trigger }: AddStockDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [quantity, setQuantity] = useState("")
  const [warehouseId, setWarehouseId] = useState<string>(item.godownId || "")
  const [notes, setNotes] = useState("")

  // Stock is always in packaging units (CTN, BAG, GONI, etc.)
  const packagingUnit = item.packagingUnit || "CTN"
  const baseUnit = item.unit || "PCS"
  const perPackaging = item.perCartonQuantity || 1

  // Calculate base units for display
  const enteredQty = parseFloat(quantity) || 0
  const baseUnitsToAdd = enteredQty * perPackaging

  const handleSubmit = async () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error("Please enter a valid quantity")
      return
    }

    if (!warehouseId) {
      toast.error("Please select a godown")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await addStockWithLedger(
        item.id,
        warehouseId,
        parseFloat(quantity),
        packagingUnit, // Always in packaging units
        notes || undefined
      )

      if (result.success) {
        toast.success(`Stock added: +${quantity} ${packagingUnit}`)
        setOpen(false)
        setQuantity("")
        setNotes("")
      } else {
        toast.error(result.error || "Failed to add stock")
      }
    } catch (error) {
      toast.error("An error occurred while adding stock")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Stock
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Add Stock
          </DialogTitle>
          <DialogDescription>
            Add stock for <span className="font-medium">{item.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Stock Info */}
          <div className="bg-muted/50 p-3 rounded-md text-sm">
            <p className="text-muted-foreground">Current Stock</p>
            <p className="font-semibold text-lg">
              {item.stock.toLocaleString()} {packagingUnit}
              {perPackaging > 1 && (
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  (= {(item.stock * perPackaging).toLocaleString()} {baseUnit})
                </span>
              )}
            </p>
          </div>

          {/* Packaging Info */}
          {perPackaging > 1 && (
            <div className="text-xs text-muted-foreground bg-primary/5 p-2 rounded-md border border-primary/10">
              <span className="font-medium text-primary">Packaging:</span> 1 {packagingUnit} = {perPackaging} {baseUnit}
            </div>
          )}

          {/* Quantity Input - Always in Packaging Units */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="flex items-center gap-1">
              Quantity to Add ({packagingUnit})
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Stock is maintained in {packagingUnit}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <div className="flex gap-2">
              <Input
                id="quantity"
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
                className="flex-1"
              />
              <div className="h-9 px-3 flex items-center justify-center border rounded-md bg-muted text-muted-foreground min-w-[80px]">
                {packagingUnit}
              </div>
            </div>
            {/* Conversion to base units */}
            {perPackaging > 1 && enteredQty > 0 && (
              <p className="text-xs text-muted-foreground">
                = <span className="font-medium text-primary">{baseUnitsToAdd.toLocaleString()}</span> {baseUnit} ({quantity} × {perPackaging})
              </p>
            )}
          </div>

          {/* Warehouse Selection */}
          <div className="space-y-2">
            <Label htmlFor="warehouse">Godown / Warehouse</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select godown" />
              </SelectTrigger>
              <SelectContent>
                {godowns.map((godown) => (
                  <SelectItem key={godown.id} value={godown.id}>
                    {godown.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Purchase order #123, Supplier name..."
              rows={2}
            />
          </div>

          {/* Summary */}
          {enteredQty > 0 && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-md">
              <p className="text-sm text-green-800">
                <span className="font-medium">After adding:</span>{" "}
                {(item.stock + enteredQty).toLocaleString()} {packagingUnit}
                {perPackaging > 1 && (
                  <span className="text-green-600 ml-1">
                    (= {((item.stock + enteredQty) * perPackaging).toLocaleString()} {baseUnit})
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !quantity || !warehouseId}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
