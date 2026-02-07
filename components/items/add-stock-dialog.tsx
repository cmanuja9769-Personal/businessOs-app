"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
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
import { Plus, Minus, Loader2, Package, Info, TrendingUp, TrendingDown, AlertTriangle, Warehouse, Trash2 } from "lucide-react"
import { modifyStockWithLedger, getItemWarehouseStocks, reduceStockFromMultipleWarehouses, addStockToMultipleWarehouses } from "@/app/items/actions"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog"

type StockOperationType = "ADD" | "REDUCE"

interface WarehouseStock {
  warehouseId: string
  warehouseName: string
  quantity: number
}

interface ReductionEntry {
  warehouseId: string
  quantity: string
}

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
  const [isLoadingStocks, setIsLoadingStocks] = useState(false)
  const [quantity, setQuantity] = useState("")
  const [operationType, setOperationType] = useState<StockOperationType>(defaultOperation)
  const [reason, setReason] = useState("")
  
  const getInitialWarehouseId = () => {
    if (!item.godownId || item.godownId === "null" || item.godownId === "undefined") {
      return ""
    }
    return item.godownId
  }
  
  const [warehouseId, setWarehouseId] = useState<string>(getInitialWarehouseId())
  const [notes, setNotes] = useState("")
  
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([])
  const [multiGodownMode, setMultiGodownMode] = useState(false)
  const [reductionEntries, setReductionEntries] = useState<ReductionEntry[]>([])

  const packagingUnit = item.packagingUnit || "CTN"
  const baseUnit = item.unit || "PCS"
  const perPackaging = item.perCartonQuantity || 1

  const enteredQty = parseFloat(quantity) || 0
  const baseUnitsToModify = enteredQty * perPackaging
  
  const newStock = operationType === "ADD" 
    ? item.stock + enteredQty 
    : Math.max(0, item.stock - enteredQty)

  const selectedWarehouseStock = useMemo(() => {
    if (!warehouseId || operationType !== "REDUCE") return null
    return warehouseStocks.find(ws => ws.warehouseId === warehouseId)
  }, [warehouseId, warehouseStocks, operationType])

  const totalReductionFromEntries = useMemo(() => {
    return reductionEntries.reduce((sum, entry) => sum + (parseFloat(entry.quantity) || 0), 0)
  }, [reductionEntries])

  const multiGodownNewStock = useMemo(() => {
    return Math.max(0, item.stock - totalReductionFromEntries)
  }, [item.stock, totalReductionFromEntries])

  const validationErrors = useMemo(() => {
    const errors: string[] = []
    
    if (operationType === "REDUCE" && !multiGodownMode) {
      if (selectedWarehouseStock && enteredQty > selectedWarehouseStock.quantity) {
        errors.push(`${selectedWarehouseStock.warehouseName} only has ${selectedWarehouseStock.quantity} ${packagingUnit} available`)
      } else if (!selectedWarehouseStock && warehouseId && enteredQty > 0) {
        const ws = warehouseStocks.find(w => w.warehouseId === warehouseId)
        if (!ws) {
          errors.push("No stock available in the selected godown")
        }
      }
    }
    
    if (multiGodownMode) {
      for (const entry of reductionEntries) {
        const qty = parseFloat(entry.quantity) || 0
        if (qty <= 0) continue
        const ws = warehouseStocks.find(w => w.warehouseId === entry.warehouseId)
        if (operationType === "REDUCE") {
          if (!ws) {
            const godown = godowns.find(g => g.id === entry.warehouseId)
            errors.push(`${godown?.name || "Unknown godown"}: No stock available`)
          } else if (qty > ws.quantity) {
            errors.push(`${ws.warehouseName}: Only ${ws.quantity} ${packagingUnit} available (requested ${qty})`)
          }
        }
      }
      if (operationType === "REDUCE" && totalReductionFromEntries > item.stock) {
        errors.push(`Total reduction (${totalReductionFromEntries}) exceeds total stock (${item.stock})`)
      }
    }
    
    return errors
  }, [operationType, multiGodownMode, selectedWarehouseStock, warehouseId, enteredQty, warehouseStocks, reductionEntries, totalReductionFromEntries, item.stock, packagingUnit, godowns])

  const reductionReasons = [
    { value: "damaged", label: "Damaged Goods" },
    { value: "expired", label: "Expired Stock" },
    { value: "theft", label: "Theft/Lost" },
    { value: "correction", label: "Stock Correction" },
    { value: "return_to_supplier", label: "Return to Supplier" },
    { value: "sample", label: "Sample/Free" },
    { value: "other", label: "Other" },
  ]

  useEffect(() => {
    if (open) {
      fetchWarehouseStocks()
    }
  }, [open])

  const fetchWarehouseStocks = async () => {
    setIsLoadingStocks(true)
    try {
      const result = await getItemWarehouseStocks(item.id)
      if (result.success && result.stocks) {
        setWarehouseStocks(result.stocks)
      }
    } catch {
      // Silent fail - will use total stock validation as fallback
    } finally {
      setIsLoadingStocks(false)
    }
  }

  const handleSubmit = async () => {
    if (multiGodownMode) {
      await handleMultiGodownSubmit()
      return
    }
    
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error("Please enter a valid quantity")
      return
    }

    if (operationType === "REDUCE" && enteredQty > item.stock) {
      toast.error(`Cannot reduce more than available stock (${item.stock} ${packagingUnit})`)
      return
    }

    if (operationType === "REDUCE" && selectedWarehouseStock && enteredQty > selectedWarehouseStock.quantity) {
      toast.error(`Cannot reduce more than available in ${selectedWarehouseStock.warehouseName} (${selectedWarehouseStock.quantity} ${packagingUnit})`)
      return
    }

    const normalizedWarehouseId = (warehouseId || "").trim()
    if (!normalizedWarehouseId || normalizedWarehouseId === "null" || normalizedWarehouseId === "undefined") {
      toast.error("Please select a godown")
      return
    }

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
        router.refresh()
        if (onSuccess) {
          onSuccess()
        }
      } else {
        toast.error(result.error || `Failed to ${operationType === "ADD" ? "add" : "reduce"} stock`)
      }
    } catch {
      toast.error("An error occurred while updating stock")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMultiGodownSubmit = async () => {
    const validEntries = reductionEntries.filter(e => {
      const qty = parseFloat(e.quantity) || 0
      return qty > 0 && e.warehouseId
    })

    if (validEntries.length === 0) {
      toast.error(`Please add at least one ${operationType === "ADD" ? "addition" : "reduction"} entry`)
      return
    }

    if (operationType === "REDUCE" && !reason) {
      toast.error("Please select a reason for stock reduction")
      return
    }

    if (validationErrors.length > 0) {
      toast.error(validationErrors[0])
      return
    }

    setIsSubmitting(true)
    try {
      const entries = validEntries.map(e => ({
        warehouseId: e.warehouseId,
        quantity: parseFloat(e.quantity)
      }))

      if (operationType === "ADD") {
        const result = await addStockToMultipleWarehouses(
          item.id,
          entries,
          packagingUnit,
          notes || undefined
        )

        if (result.success) {
          const successCount = result.additionResults?.filter(r => r.success).length || 0
          toast.success(`Stock added to ${successCount} godown(s). New stock: ${result.newStock || 0} ${packagingUnit}`)
          setOpen(false)
          resetForm()
          router.refresh()
          if (onSuccess) {
            onSuccess()
          }
        } else {
          toast.error(result.error || "Failed to add stock")
        }
      } else {
        const result = await reduceStockFromMultipleWarehouses(
          item.id,
          entries,
          packagingUnit,
          reason,
          notes || undefined
        )

        if (result.success) {
          const successCount = result.reductionResults?.filter(r => r.success).length || 0
          toast.success(`Stock reduced from ${successCount} godown(s). New stock: ${result.newStock || 0} ${packagingUnit}`)
          setOpen(false)
          resetForm()
          router.refresh()
          if (onSuccess) {
            onSuccess()
          }
        } else {
          toast.error(result.error || "Failed to reduce stock")
        }
      }
    } catch {
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
    setMultiGodownMode(false)
    setReductionEntries([])
    setWarehouseStocks([])
  }

  const addReductionEntry = () => {
    const unusedGodowns = godowns.filter(g => 
      !reductionEntries.some(e => e.warehouseId === g.id)
    )
    if (unusedGodowns.length === 0) {
      toast.error("All godowns are already added")
      return
    }
    setReductionEntries([...reductionEntries, { warehouseId: unusedGodowns[0].id, quantity: "" }])
  }

  const removeReductionEntry = (index: number) => {
    setReductionEntries(reductionEntries.filter((_, i) => i !== index))
  }

  const updateReductionEntry = (index: number, field: keyof ReductionEntry, value: string) => {
    const updated = [...reductionEntries]
    updated[index] = { ...updated[index], [field]: value }
    setReductionEntries(updated)
  }

  const enableMultiGodownMode = () => {
    setMultiGodownMode(true)
    const godownsWithStock = warehouseStocks.filter(ws => ws.quantity > 0)
    if (godownsWithStock.length > 0) {
      setReductionEntries([{ warehouseId: godownsWithStock[0].warehouseId, quantity: "" }])
    } else if (godowns.length > 0) {
      setReductionEntries([{ warehouseId: godowns[0].id, quantity: "" }])
    }
  }

  const isDirty = useMemo(() => {
    if (multiGodownMode) {
      return reductionEntries.some(e => e.quantity !== "") || notes !== "" || reason !== ""
    }
    return quantity !== "" || notes !== "" || reason !== ""
  }, [quantity, notes, reason, multiGodownMode, reductionEntries])

  const handleCloseDialog = useCallback(() => {
    setOpen(false)
    resetForm()
  }, [])

  const {
    showConfirmDialog,
    handleOpenChange,
    confirmDiscard,
    cancelDiscard,
  } = useUnsavedChanges({
    isDirty,
    onClose: handleCloseDialog,
    setOpen,
  })

  const isSubmitDisabled = useMemo(() => {
    if (isSubmitting) return true
    
    if (multiGodownMode) {
      const hasValidEntry = reductionEntries.some(e => {
        const qty = parseFloat(e.quantity) || 0
        return qty > 0 && e.warehouseId
      })
      const needsReason = operationType === "REDUCE"
      return !hasValidEntry || (needsReason && !reason) || validationErrors.length > 0
    }
    
    if (!quantity || !warehouseId) return true
    if (operationType === "REDUCE") {
      if (!reason) return true
      if (enteredQty > item.stock) return true
      if (selectedWarehouseStock && enteredQty > selectedWarehouseStock.quantity) return true
      if (warehouseStocks.length > 0 && !selectedWarehouseStock && warehouseId) {
        const ws = warehouseStocks.find(w => w.warehouseId === warehouseId)
        if (!ws || ws.quantity === 0) return true
      }
    }
    return false
  }, [isSubmitting, multiGodownMode, reductionEntries, reason, validationErrors, quantity, warehouseId, operationType, enteredQty, item.stock, selectedWarehouseStock, warehouseStocks])

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Manage Stock
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg sm:w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Stock Management
          </DialogTitle>
          <DialogDescription>
            Add or reduce stock for <span className="font-medium">{item.name}</span>
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="overflow-y-auto scrollbar-hide">
        <div className="space-y-4 py-4">
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
                onClick={() => {
                  setOperationType("ADD")
                  setMultiGodownMode(false)
                  setReductionEntries([])
                }}
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

          <div className="bg-muted/50 p-3 rounded-md text-sm">
            <p className="text-muted-foreground">Total Stock</p>
            <p className="font-semibold text-lg">
              {item.stock.toLocaleString()} {packagingUnit}
              {perPackaging > 1 && (
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  (= {(item.stock * perPackaging).toLocaleString()} {baseUnit})
                </span>
              )}
            </p>
          </div>

          {!multiGodownMode && (
            <div className="border rounded-md p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Warehouse className="w-4 h-4" />
                Stock by Godown - Select godown to {operationType === "ADD" ? "add stock" : "reduce stock"}
              </div>
              {isLoadingStocks ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading godown stocks...
                </div>
              ) : warehouseStocks.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {warehouseStocks.map((ws) => (
                    <button
                      key={ws.warehouseId}
                      type="button"
                      onClick={() => setWarehouseId(ws.warehouseId)}
                      className={cn(
                        "flex justify-between p-2 rounded transition-colors cursor-pointer hover:bg-primary/5",
                        ws.warehouseId === warehouseId ? "bg-primary/10 border border-primary/20" : "bg-muted/30 border border-transparent"
                      )}
                    >
                      <span className="text-muted-foreground">{ws.warehouseName}</span>
                      <span className="font-medium">{ws.quantity} {packagingUnit}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {godowns.map((godown) => (
                    <button
                      key={godown.id}
                      type="button"
                      onClick={() => setWarehouseId(godown.id)}
                      className={cn(
                        "flex justify-between p-2 rounded transition-colors cursor-pointer hover:bg-primary/5",
                        godown.id === warehouseId ? "bg-primary/10 border border-primary/20" : "bg-muted/30 border border-transparent"
                      )}
                    >
                      <span className="text-muted-foreground">{godown.name}</span>
                      <span className="font-medium text-xs text-muted-foreground">No stock</span>
                    </button>
                  ))}
                </div>
              )}
              {warehouseId && selectedWarehouseStock && (
                <p className="text-xs text-primary font-medium pt-1">
                  Selected: {selectedWarehouseStock.warehouseName} - {selectedWarehouseStock.quantity} {packagingUnit} available
                </p>
              )}
            </div>
          )}

          {perPackaging > 1 && (
            <div className="text-xs text-muted-foreground bg-primary/5 p-2 rounded-md border border-primary/10">
              <span className="font-medium text-primary">Packaging:</span> 1 {packagingUnit} = {perPackaging} {baseUnit}
            </div>
          )}

          {!multiGodownMode && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={enableMultiGodownMode}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                {operationType === "ADD" ? "Add to" : "Reduce from"} Multiple Godowns
              </Button>
            </div>
          )}

          {!multiGodownMode ? (
            <>
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
                    max={operationType === "REDUCE" ? (selectedWarehouseStock?.quantity ?? item.stock) : undefined}
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                    className="flex-1"
                  />
                  <div className="h-9 px-3 flex items-center justify-center border rounded-md bg-muted text-muted-foreground min-w-[5rem]">
                    {packagingUnit}
                  </div>
                </div>
                {perPackaging > 1 && enteredQty > 0 && (
                  <p className="text-xs text-muted-foreground">
                    = <span className="font-medium text-primary">{baseUnitsToModify.toLocaleString()}</span> {baseUnit} ({quantity} × {perPackaging})
                  </p>
                )}
                
                {operationType === "REDUCE" && selectedWarehouseStock && enteredQty > selectedWarehouseStock.quantity && (
                  <div className="flex items-start gap-2 text-xs text-red-500 font-medium bg-red-50 p-2 rounded">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p>Cannot reduce more than available in {selectedWarehouseStock.warehouseName}</p>
                      <p className="text-red-400">Available: {selectedWarehouseStock.quantity} {packagingUnit}</p>
                    </div>
                  </div>
                )}
                
                {operationType === "REDUCE" && enteredQty > item.stock && (
                  <p className="text-xs text-red-500 font-medium">
                    Cannot reduce more than total stock ({item.stock} {packagingUnit})
                  </p>
                )}
              </div>

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
            </>
          ) : (
            <div className="space-y-4 border rounded-md p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Multi-Godown {operationType === "ADD" ? "Addition" : "Reduction"}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMultiGodownMode(false)
                    setReductionEntries([])
                  }}
                >
                  Cancel
                </Button>
              </div>
              
              <div className="space-y-3">
                {reductionEntries.map((entry, index) => {
                  const ws = warehouseStocks.find(w => w.warehouseId === entry.warehouseId)
                  const entryQty = parseFloat(entry.quantity) || 0
                  const hasError = ws && entryQty > ws.quantity

                  return (
                    <div key={index} className="space-y-2 p-3 border rounded bg-background">
                      <div className="flex items-center gap-2">
                        <Select 
                          value={entry.warehouseId} 
                          onValueChange={(v) => updateReductionEntry(index, "warehouseId", v)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select godown" />
                          </SelectTrigger>
                          <SelectContent>
                            {godowns.map((godown) => {
                              const wsInfo = warehouseStocks.find(w => w.warehouseId === godown.id)
                              const isUsed = reductionEntries.some((e, i) => i !== index && e.warehouseId === godown.id)
                              return (
                                <SelectItem 
                                  key={godown.id} 
                                  value={godown.id}
                                  disabled={isUsed}
                                >
                                  {godown.name} {wsInfo ? `(${wsInfo.quantity} ${packagingUnit})` : "(0)"}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min="0"
                          max={ws?.quantity}
                          value={entry.quantity}
                          onChange={(e) => updateReductionEntry(index, "quantity", e.target.value)}
                          placeholder="Qty"
                          className={cn("w-24", hasError && "border-red-500")}
                        />
                        <span className="text-sm text-muted-foreground w-12">{packagingUnit}</span>
                        {reductionEntries.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeReductionEntry(index)}
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {ws && (
                        <p className={cn("text-xs", hasError ? "text-red-500" : "text-muted-foreground")}>
                          Available: {ws.quantity} {packagingUnit}
                          {hasError && " (exceeded)"}
                        </p>
                      )}
                      {operationType === "REDUCE" && !ws && entry.warehouseId && (
                        <p className="text-xs text-amber-600">No stock in this godown</p>
                      )}
                    </div>
                  )
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addReductionEntry}
                className="w-full"
                disabled={reductionEntries.length >= godowns.length}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Another Godown
              </Button>

              {totalReductionFromEntries > 0 && (
                <div className={cn(
                  "border p-3 rounded-md",
                  operationType === "ADD" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                )}>
                  <p className={cn(
                    "text-sm font-medium",
                    operationType === "ADD" ? "text-green-800" : "text-red-800"
                  )}>
                    Total {operationType === "ADD" ? "Addition" : "Reduction"}: {totalReductionFromEntries} {packagingUnit}
                  </p>
                  <p className={cn(
                    "text-xs mt-1",
                    operationType === "ADD" ? "text-green-600" : "text-red-600"
                  )}>
                    New stock will be: {operationType === "ADD" ? item.stock + totalReductionFromEntries : multiGodownNewStock} {packagingUnit}
                  </p>
                </div>
              )}

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
            </div>
          )}

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

          {!multiGodownMode && enteredQty > 0 && validationErrors.length === 0 && enteredQty <= (operationType === "REDUCE" ? (selectedWarehouseStock?.quantity ?? item.stock) : Infinity) && (
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

          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-md space-y-1">
              {validationErrors.map((error, i) => (
                <p key={i} className="text-xs text-red-600 flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  {error}
                </p>
              ))}
            </div>
          )}
        </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitDisabled}
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
    <UnsavedChangesDialog
      open={showConfirmDialog}
      onConfirm={confirmDiscard}
      onCancel={cancelDiscard}
    />
    </>
  )
}
