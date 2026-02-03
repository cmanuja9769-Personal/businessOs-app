"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
  DialogBody,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Minus, Loader2, Package, Info, TrendingUp, TrendingDown } from "lucide-react"
import { modifyStockWithLedger } from "@/app/items/actions"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// Transaction type for stock operations
type StockOperationType = "ADD" | "REDUCE"

interface StockManagementDialogProps {
  item: IItem
  godowns: Array<{ id: string; name: string }>
  trigger?: React.ReactNode
  defaultOperation?: StockOperationType
  onSuccess?: () => void
}

export function AddStockDialog({ item, godowns, trigger, defaultOperation = "ADD", onSuccess }: StockManagementDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [quantity, setQuantity] = useState("")
  const [operationType, setOperationType] = useState<StockOperationType>(defaultOperation)
  const [reason, setReason] = useState("")
  
  // Safely handle godownId - filter out "null" strings and invalid values
  const getInitialWarehouseId = () => {
    if (!item.godownId || item.godownId === "null" || item.godownId === "undefined") {
      return ""
    }
    return item.godownId
  }
  
  const [warehouseId, setWarehouseId] = useState<string>(getInitialWarehouseId())
  const [notes, setNotes] = useState("")

  // Stock is always in packaging units (CTN, BAG, GONI, etc.)
  const packagingUnit = item.packagingUnit || "CTN"
  const baseUnit = item.unit || "PCS"
  const perPackaging = item.perCartonQuantity || 1

  // Calculate base units for display
  const enteredQty = parseFloat(quantity) || 0
  const baseUnitsToModify = enteredQty * perPackaging
  
  // Calculate new stock after operation
  const newStock = operationType === "ADD" 
    ? item.stock + enteredQty 
    : Math.max(0, item.stock - enteredQty)

  // Reduction reasons
  const reductionReasons = [
    { value: "damaged", label: "Damaged Goods" },
    { value: "expired", label: "Expired Stock" },
    { value: "theft", label: "Theft/Lost" },
    { value: "correction", label: "Stock Correction" },
    { value: "return_to_supplier", label: "Return to Supplier" },
    { value: "sample", label: "Sample/Free" },
    { value: "other", label: "Other" },
  ]

  const handleSubmit = async () => {
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error("Please enter a valid quantity")
      return
    }

    // Validate for reduction - cannot reduce more than available
    if (operationType === "REDUCE" && enteredQty > item.stock) {
      toast.error(`Cannot reduce more than available stock (${item.stock} ${packagingUnit})`)
      return
    }

    const normalizedWarehouseId = (warehouseId || "").trim()
    if (!normalizedWarehouseId || normalizedWarehouseId === "null" || normalizedWarehouseId === "undefined") {
      toast.error("Please select a godown")
      return
    }

    // For reductions, reason is required
    if (operationType === "REDUCE" && !reason) {
      toast.error("Please select a reason for stock reduction")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await modifyStockWithLedger(
        item.id,
        normalizedWarehouseId,
        parseFloat(quantity),
        packagingUnit,
        operationType,
        operationType === "REDUCE" ? reason : "stock_in",
        notes || undefined
      )

      if (result.success) {
        const action = operationType === "ADD" ? "added" : "reduced"
        const symbol = operationType === "ADD" ? "+" : "-"
        toast.success(`Stock ${action}: ${symbol}${quantity} ${packagingUnit}. New stock: ${result.newStock || 0} ${packagingUnit}`)
        setOpen(false)
        resetForm()
        
        // Refresh the page data to show updated stock
        router.refresh()
        
        // Call the onSuccess callback if provided
        if (onSuccess) {
          onSuccess()
        }
      } else {
        toast.error(result.error || `Failed to ${operationType === "ADD" ? "add" : "reduce"} stock`)
      }
    } catch (error) {
      toast.error("An error occurred while updating stock")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setQuantity("")
    setNotes("")
    setReason("")
    setOperationType(defaultOperation)
    setWarehouseId(getInitialWarehouseId())
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) resetForm()
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Manage Stock
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Stock Management
          </DialogTitle>
          <DialogDescription>
            Add or reduce stock for <span className="font-medium">{item.name}</span>
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
        <div className="space-y-4 py-4">
          {/* Operation Type Toggle */}
          <div className="space-y-2">
            <Label>Operation Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={operationType === "ADD" ? "default" : "outline"}
                className={cn(
                  "flex-1 gap-2",
                  operationType === "ADD" && "bg-green-600 hover:bg-green-700"
                )}
                onClick={() => setOperationType("ADD")}
              >
                <TrendingUp className="w-4 h-4" />
                Add Stock
              </Button>
              <Button
                type="button"
                variant={operationType === "REDUCE" ? "default" : "outline"}
                className={cn(
                  "flex-1 gap-2",
                  operationType === "REDUCE" && "bg-red-600 hover:bg-red-700"
                )}
                onClick={() => setOperationType("REDUCE")}
              >
                <TrendingDown className="w-4 h-4" />
                Reduce Stock
              </Button>
            </div>
          </div>

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
              Quantity to {operationType === "ADD" ? "Add" : "Reduce"} ({packagingUnit})
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
                max={operationType === "REDUCE" ? item.stock : undefined}
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
                = <span className="font-medium text-primary">{baseUnitsToModify.toLocaleString()}</span> {baseUnit} ({quantity} × {perPackaging})
              </p>
            )}
            {/* Warning if reducing more than available */}
            {operationType === "REDUCE" && enteredQty > item.stock && (
              <p className="text-xs text-red-500 font-medium">
                Cannot reduce more than available stock ({item.stock} {packagingUnit})
              </p>
            )}
          </div>

          {/* Reason Selection (for reductions only) */}
          {operationType === "REDUCE" && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Reduction *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {reductionReasons.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
              placeholder={operationType === "ADD" 
                ? "e.g., Purchase order #123, Supplier name..." 
                : "Additional details about the stock reduction..."
              }
              rows={2}
            />
          </div>

          {/* Summary */}
          {enteredQty > 0 && enteredQty <= (operationType === "REDUCE" ? item.stock : Infinity) && (
            <div className={cn(
              "border p-3 rounded-md",
              operationType === "ADD" 
                ? "bg-green-50 border-green-200" 
                : "bg-red-50 border-red-200"
            )}>
              <p className={cn(
                "text-sm",
                operationType === "ADD" ? "text-green-800" : "text-red-800"
              )}>
                <span className="font-medium">After {operationType === "ADD" ? "adding" : "reducing"}:</span>{" "}
                {newStock.toLocaleString()} {packagingUnit}
                {perPackaging > 1 && (
                  <span className={operationType === "ADD" ? "text-green-600" : "text-red-600"}>
                    {" "}(= {(newStock * perPackaging).toLocaleString()} {baseUnit})
                  </span>
                )}
              </p>
              <p className={cn(
                "text-xs mt-1",
                operationType === "ADD" ? "text-green-600" : "text-red-600"
              )}>
                {operationType === "ADD" ? "+" : "-"}{enteredQty} {packagingUnit} from current {item.stock} {packagingUnit}
              </p>
            </div>
          )}
        </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={
              isSubmitting || 
              !quantity || 
              !warehouseId || 
              (operationType === "REDUCE" && (!reason || enteredQty > item.stock))
            }
            className={cn(
              operationType === "ADD" 
                ? "bg-green-600 hover:bg-green-700" 
                : "bg-red-600 hover:bg-red-700"
            )}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {operationType === "ADD" ? (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Stock
              </>
            ) : (
              <>
                <Minus className="w-4 h-4 mr-2" />
                Reduce Stock
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
