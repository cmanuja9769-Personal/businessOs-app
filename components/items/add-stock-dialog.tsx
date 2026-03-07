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
import { modifyStockWithLedger, getItemWarehouseStocks, reduceStockFromMultipleWarehouses, addStockToMultipleWarehouses } from "@/app/items/stock-actions"
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

const ADD_OPERATION: StockOperationType = "ADD"
const REDUCE_OPERATION: StockOperationType = "REDUCE"
const ADD_SURFACE_CLASS = "bg-green-50 border-green-200"
const REDUCE_SURFACE_CLASS = "bg-red-50 border-red-200"
const ADD_TEXT_CLASS = "text-green-800"
const REDUCE_TEXT_CLASS = "text-red-800"
const ADD_ACCENT_TEXT_CLASS = "text-green-600"
const REDUCE_ACCENT_TEXT_CLASS = "text-red-600"

function isValidWarehouseId(value: string | null | undefined) {
  return !!value && value !== "null" && value !== "undefined"
}

function getInitialWarehouseIdFromItem(item: IItem): string {
  const id = item.godownId
  if (!id || id === "null" || id === "undefined") return ""
  return id
}

function getSingleGodownValidationErrors({
  operationType,
  selectedWarehouseStock,
  enteredQty,
  warehouseId,
  warehouseStocks,
  packagingUnit,
}: {
  operationType: StockOperationType
  selectedWarehouseStock: WarehouseStock | null
  enteredQty: number
  warehouseId: string
  warehouseStocks: WarehouseStock[]
  packagingUnit: string
}) {
  if (operationType !== REDUCE_OPERATION) {
    return [] as string[]
  }

  if (selectedWarehouseStock && enteredQty > selectedWarehouseStock.quantity) {
    return [`${selectedWarehouseStock.warehouseName} only has ${selectedWarehouseStock.quantity} ${packagingUnit} available`]
  }

  if (!selectedWarehouseStock && warehouseId && enteredQty > 0) {
    const selectedStock = warehouseStocks.find((stock) => stock.warehouseId === warehouseId)
    if (!selectedStock) {
      return ["No stock available in the selected godown"]
    }
  }

  return [] as string[]
}

function getMultiGodownValidationErrors({
  operationType,
  reductionEntries,
  warehouseStocks,
  godowns,
  totalReductionFromEntries,
  stock,
  packagingUnit,
}: {
  operationType: StockOperationType
  reductionEntries: ReductionEntry[]
  warehouseStocks: WarehouseStock[]
  godowns: Array<{ id: string; name: string }>
  totalReductionFromEntries: number
  stock: number
  packagingUnit: string
}) {
  if (operationType !== REDUCE_OPERATION) {
    return [] as string[]
  }

  const errors: string[] = []
  for (const entry of reductionEntries) {
    const quantity = parseFloat(entry.quantity) || 0
    if (quantity <= 0) {
      continue
    }

    const warehouseStock = warehouseStocks.find((stock) => stock.warehouseId === entry.warehouseId)
    if (!warehouseStock) {
      const godown = godowns.find((g) => g.id === entry.warehouseId)
      errors.push(`${godown?.name || "Unknown godown"}: No stock available`)
      continue
    }

    if (quantity > warehouseStock.quantity) {
      errors.push(`${warehouseStock.warehouseName}: Only ${warehouseStock.quantity} ${packagingUnit} available (requested ${quantity})`)
    }
  }

  if (totalReductionFromEntries > stock) {
    errors.push(`Total reduction (${totalReductionFromEntries}) exceeds total stock (${stock})`)
  }

  return errors
}

function hasValidReductionEntry(reductionEntries: ReductionEntry[]) {
  return reductionEntries.some((entry) => {
    const quantity = parseFloat(entry.quantity) || 0
    return quantity > 0 && !!entry.warehouseId
  })
}

function isSingleGodownSubmitDisabled({
  quantity,
  warehouseId,
  operationType,
  reason,
  enteredQty,
  stock,
  selectedWarehouseStock,
  warehouseStocks,
}: {
  quantity: string
  warehouseId: string
  operationType: StockOperationType
  reason: string
  enteredQty: number
  stock: number
  selectedWarehouseStock: WarehouseStock | null
  warehouseStocks: WarehouseStock[]
}) {
  if (!quantity || !warehouseId) {
    return true
  }

  if (operationType !== REDUCE_OPERATION) {
    return false
  }

  if (!reason || enteredQty > stock) {
    return true
  }

  if (selectedWarehouseStock && enteredQty > selectedWarehouseStock.quantity) {
    return true
  }

  if (warehouseStocks.length === 0 || selectedWarehouseStock || !warehouseId) {
    return false
  }

  const stockInWarehouse = warehouseStocks.find((stockItem) => stockItem.warehouseId === warehouseId)
  return !stockInWarehouse || stockInWarehouse.quantity === 0
}

function getValidMultiGodownEntries(reductionEntries: ReductionEntry[]) {
  return reductionEntries
    .filter((entry) => {
      const quantity = parseFloat(entry.quantity) || 0
      return quantity > 0 && !!entry.warehouseId
    })
    .map((entry) => ({
      warehouseId: entry.warehouseId,
      quantity: parseFloat(entry.quantity),
    }))
}

function getSingleSubmitValidationError({
  quantity,
  isReduceOperation,
  enteredQty,
  stock,
  packagingUnit,
  selectedWarehouseStock,
  warehouseId,
  reason,
}: {
  quantity: string
  isReduceOperation: boolean
  enteredQty: number
  stock: number
  packagingUnit: string
  selectedWarehouseStock: WarehouseStock | null
  warehouseId: string
  reason: string
}): string | undefined {
  if (!quantity || parseFloat(quantity) <= 0) {
    return "Please enter a valid quantity"
  }

  if (isReduceOperation && enteredQty > stock) {
    return `Cannot reduce more than available stock (${stock} ${packagingUnit})`
  }

  if (isReduceOperation && selectedWarehouseStock && enteredQty > selectedWarehouseStock.quantity) {
    return `Cannot reduce more than available in ${selectedWarehouseStock.warehouseName} (${selectedWarehouseStock.quantity} ${packagingUnit})`
  }

  const normalizedWarehouseId = (warehouseId || "").trim()
  if (!isValidWarehouseId(normalizedWarehouseId)) {
    return "Please select a godown"
  }

  if (isReduceOperation && !reason) {
    return "Please select a reason for stock reduction"
  }

  return undefined
}

function getMultiGodownSubmitError({
  entries,
  isAddOperation,
  isReduceOperation,
  reason,
  validationErrors,
}: {
  entries: Array<{ warehouseId: string; quantity: number }>
  isAddOperation: boolean
  isReduceOperation: boolean
  reason: string
  validationErrors: string[]
}): string | undefined {
  if (entries.length === 0) {
    return `Please add at least one ${isAddOperation ? "addition" : "reduction"} entry`
  }
  if (isReduceOperation && !reason) {
    return "Please select a reason for stock reduction"
  }
  if (validationErrors.length > 0) {
    return validationErrors[0]
  }
  return undefined
}

function getInitialReductionEntries(
  warehouseStocks: WarehouseStock[],
  godowns: Array<{ id: string; name: string }>
): ReductionEntry[] {
  const godownsWithStock = warehouseStocks.filter(ws => ws.quantity > 0)
  if (godownsWithStock.length > 0) {
    return [{ warehouseId: godownsWithStock[0].warehouseId, quantity: "" }]
  }
  if (godowns.length > 0) {
    return [{ warehouseId: godowns[0].id, quantity: "" }]
  }
  return []
}

function computeIsDirty(
  multiGodownMode: boolean,
  reductionEntries: ReductionEntry[],
  quantity: string,
  notes: string,
  reason: string
): boolean {
  if (multiGodownMode) {
    return reductionEntries.some(e => e.quantity !== "") || notes !== "" || reason !== ""
  }
  return quantity !== "" || notes !== "" || reason !== ""
}

function buildStockSuccessMessage(isAddOperation: boolean, quantity: string, packagingUnit: string, newStock: number): string {
  const action = isAddOperation ? "added" : "reduced"
  const symbol = isAddOperation ? "+" : "-"
  return `Stock ${action}: ${symbol}${quantity} ${packagingUnit}. New stock: ${newStock} ${packagingUnit}`
}

function buildStockErrorMessage(isAddOperation: boolean, error?: string): string {
  return error || `Failed to ${isAddOperation ? "add" : "reduce"} stock`
}

function buildMultiAddSuccessMessage(
  additionResults: Array<{ success: boolean }> | undefined,
  newStock: number,
  packagingUnit: string
): string {
  const successCount = additionResults?.filter(r => r.success).length || 0
  return `Stock added to ${successCount} godown(s). New stock: ${newStock} ${packagingUnit}`
}

function buildMultiReduceSuccessMessage(
  reductionResults: Array<{ success: boolean }> | undefined,
  newStock: number,
  packagingUnit: string
): string {
  const successCount = reductionResults?.filter(r => r.success).length || 0
  return `Stock reduced from ${successCount} godown(s). New stock: ${newStock} ${packagingUnit}`
}

function computeIsSubmitDisabled({
  isSubmitting,
  multiGodownMode,
  isReduceOperation,
  reductionEntries,
  reason,
  validationErrors,
  quantity,
  warehouseId,
  operationType,
  enteredQty,
  stock,
  selectedWarehouseStock,
  warehouseStocks,
}: {
  isSubmitting: boolean
  multiGodownMode: boolean
  isReduceOperation: boolean
  reductionEntries: ReductionEntry[]
  reason: string
  validationErrors: string[]
  quantity: string
  warehouseId: string
  operationType: StockOperationType
  enteredQty: number
  stock: number
  selectedWarehouseStock: WarehouseStock | null
  warehouseStocks: WarehouseStock[]
}): boolean {
  if (isSubmitting) return true
  if (multiGodownMode) {
    return !hasValidReductionEntry(reductionEntries) || (isReduceOperation && !reason) || validationErrors.length > 0
  }
  return isSingleGodownSubmitDisabled({
    quantity,
    warehouseId,
    operationType,
    reason,
    enteredQty,
    stock,
    selectedWarehouseStock,
    warehouseStocks,
  })
}

function WarehouseStockGrid({
  isLoadingStocks,
  warehouseStocks,
  godowns,
  warehouseId,
  packagingUnit,
  onSelectWarehouse,
}: Readonly<{
  isLoadingStocks: boolean
  warehouseStocks: WarehouseStock[]
  godowns: Array<{ id: string; name: string }>
  warehouseId: string
  packagingUnit: string
  onSelectWarehouse: (id: string) => void
}>) {
  if (isLoadingStocks) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading godown stocks...
      </div>
    )
  }

  if (warehouseStocks.length > 0) {
    return (
      <div className="grid grid-cols-2 gap-2 text-sm">
        {warehouseStocks.map((ws) => (
          <button
            key={ws.warehouseId}
            type="button"
            onClick={() => onSelectWarehouse(ws.warehouseId)}
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
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      {godowns.map((godown) => (
        <button
          key={godown.id}
          type="button"
          onClick={() => onSelectWarehouse(godown.id)}
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
  )
}

function MultiGodownEntryList({
  entries,
  warehouseStocks,
  godowns,
  packagingUnit,
  operationType,
  onUpdate,
  onRemove,
}: Readonly<{
  entries: ReductionEntry[]
  warehouseStocks: WarehouseStock[]
  godowns: Array<{ id: string; name: string }>
  packagingUnit: string
  operationType: StockOperationType
  onUpdate: (index: number, field: keyof ReductionEntry, value: string) => void
  onRemove: (index: number) => void
}>) {
  return (
    <div className="space-y-3">
      {entries.map((entry, index) => {
        const ws = warehouseStocks.find(w => w.warehouseId === entry.warehouseId)
        const entryQty = parseFloat(entry.quantity) || 0
        const hasError = ws && entryQty > ws.quantity

        return (
          <div key={index} className="space-y-2 p-3 rounded-lg glass-subtle">
            <div className="flex items-center gap-2">
              <Select 
                value={entry.warehouseId} 
                onValueChange={(v) => onUpdate(index, "warehouseId", v)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select godown" />
                </SelectTrigger>
                <SelectContent>
                  {godowns.map((godown) => {
                    const wsInfo = warehouseStocks.find(w => w.warehouseId === godown.id)
                    const isUsed = entries.some((e, i) => i !== index && e.warehouseId === godown.id)
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
                onChange={(e) => onUpdate(index, "quantity", e.target.value)}
                placeholder="Qty"
                className={cn("w-24", hasError && "border-red-500")}
              />
              <span className="text-sm text-muted-foreground w-12">{packagingUnit}</span>
              {entries.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(index)}
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
            {operationType === REDUCE_OPERATION && !ws && entry.warehouseId && (
              <p className="text-xs text-amber-600">No stock in this godown</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

const REDUCTION_REASONS = [
  { value: "damaged", label: "Damaged Goods" },
  { value: "expired", label: "Expired Stock" },
  { value: "theft", label: "Theft/Lost" },
  { value: "correction", label: "Stock Correction" },
  { value: "return_to_supplier", label: "Return to Supplier" },
  { value: "sample", label: "Sample/Free" },
  { value: "other", label: "Other" },
]

function ReductionReasonSelect({ value, onChange }: Readonly<{ value: string; onChange: (v: string) => void }>) {
  return (
    <div className="space-y-2">
      <Label htmlFor="reason">Reason for Reduction *</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select reason" />
        </SelectTrigger>
        <SelectContent>
          {REDUCTION_REASONS.map((r) => (
            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function OperationTypeButtons({
  operationType,
  onSelectAdd,
  onSelectReduce,
}: Readonly<{
  operationType: StockOperationType
  onSelectAdd: () => void
  onSelectReduce: () => void
}>) {
  return (
    <div className="space-y-2">
      <Label>Operation Type</Label>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={operationType === ADD_OPERATION ? "default" : "outline"}
          className={cn("flex-1 gap-2", operationType === ADD_OPERATION && "bg-green-600 hover:bg-green-700")}
          onClick={onSelectAdd}
        >
          <TrendingUp className="w-4 h-4" />Add Stock
        </Button>
        <Button
          type="button"
          variant={operationType === REDUCE_OPERATION ? "default" : "outline"}
          className={cn("flex-1 gap-2", operationType === REDUCE_OPERATION && "bg-red-600 hover:bg-red-700")}
          onClick={onSelectReduce}
        >
          <TrendingDown className="w-4 h-4" />Reduce Stock
        </Button>
      </div>
    </div>
  )
}

function TotalStockDisplay({ stock, packagingUnit, perPackaging, baseUnit }: Readonly<{
  stock: number
  packagingUnit: string
  perPackaging: number
  baseUnit: string
}>) {
  return (
    <div className="bg-muted/50 p-3 rounded-md text-sm">
      <p className="text-muted-foreground">Total Stock</p>
      <p className="font-semibold text-lg">
        {stock.toLocaleString()} {packagingUnit}
        {perPackaging > 1 && (
          <span className="text-muted-foreground font-normal text-sm ml-2">
            (= {(stock * perPackaging).toLocaleString()} {baseUnit})
          </span>
        )}
      </p>
    </div>
  )
}

function QuantityInput({
  quantity,
  onChange,
  packagingUnit,
  maxQuantity,
  operationType,
  perPackaging,
  baseUnit,
  enteredQty,
  baseUnitsToModify,
}: Readonly<{
  quantity: string
  onChange: (v: string) => void
  packagingUnit: string
  maxQuantity?: number
  operationType: StockOperationType
  perPackaging: number
  baseUnit: string
  enteredQty: number
  baseUnitsToModify: number
}>) {
  return (
    <div className="space-y-2">
      <Label htmlFor="quantity" className="flex items-center gap-1">
        Quantity to {operationType === ADD_OPERATION ? "Add" : "Reduce"} ({packagingUnit})
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3 h-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent><p>Stock is maintained in {packagingUnit}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Label>
      <div className="flex gap-2">
        <Input
          id="quantity"
          type="number"
          min="0"
          max={maxQuantity}
          step="any"
          value={quantity}
          onChange={(e) => onChange(e.target.value)}
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
    </div>
  )
}

function StockPreview({
  operationType,
  enteredQty,
  newStock,
  packagingUnit,
  perPackaging,
  baseUnit,
  currentStock,
}: Readonly<{
  operationType: StockOperationType
  enteredQty: number
  newStock: number
  packagingUnit: string
  perPackaging: number
  baseUnit: string
  currentStock: number
}>) {
  const isAdd = operationType === ADD_OPERATION
  return (
    <div className={cn("border p-3 rounded-md", isAdd ? ADD_SURFACE_CLASS : REDUCE_SURFACE_CLASS)}>
      <p className={cn("text-sm", isAdd ? ADD_TEXT_CLASS : REDUCE_TEXT_CLASS)}>
        <span className="font-medium">After {isAdd ? "adding" : "reducing"}:</span>{" "}
        {newStock.toLocaleString()} {packagingUnit}
        {perPackaging > 1 && (
          <span className={isAdd ? ADD_ACCENT_TEXT_CLASS : REDUCE_ACCENT_TEXT_CLASS}>
            {" "}(= {(newStock * perPackaging).toLocaleString()} {baseUnit})
          </span>
        )}
      </p>
      <p className={cn("text-xs mt-1", isAdd ? ADD_ACCENT_TEXT_CLASS : REDUCE_ACCENT_TEXT_CLASS)}>
        {isAdd ? "+" : "-"}{enteredQty} {packagingUnit} from current {currentStock} {packagingUnit}
      </p>
    </div>
  )
}

function ValidationErrorList({ errors }: Readonly<{ errors: string[] }>) {
  return (
    <div className="bg-red-50 border border-red-200 p-3 rounded-md space-y-1">
      {errors.map((error, i) => (
        <p key={i} className="text-xs text-red-600 flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />{error}
        </p>
      ))}
    </div>
  )
}

function useStockDialog(
  item: IItem,
  godowns: Array<{ id: string; name: string }>,
  defaultOperation: StockOperationType,
  onSuccess?: () => void
) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingStocks, setIsLoadingStocks] = useState(false)
  const [quantity, setQuantity] = useState("")
  const [operationType, setOperationType] = useState<StockOperationType>(defaultOperation)
  const [reason, setReason] = useState("")
  const [warehouseId, setWarehouseId] = useState<string>(getInitialWarehouseIdFromItem(item))
  const [notes, setNotes] = useState("")
  const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>([])
  const [multiGodownMode, setMultiGodownMode] = useState(false)
  const [reductionEntries, setReductionEntries] = useState<ReductionEntry[]>([])

  const isAddOperation = operationType === ADD_OPERATION
  const isReduceOperation = operationType === REDUCE_OPERATION
  const packagingUnit = item.packagingUnit || "CTN"
  const baseUnit = item.unit || "PCS"
  const perPackaging = item.perCartonQuantity || 1
  const enteredQty = parseFloat(quantity) || 0
  const baseUnitsToModify = enteredQty * perPackaging
  const newStock = isAddOperation ? item.stock + enteredQty : Math.max(0, item.stock - enteredQty)

  const selectedWarehouseStock = useMemo(() => {
    if (!warehouseId || !isReduceOperation) return null
    return warehouseStocks.find(ws => ws.warehouseId === warehouseId) ?? null
  }, [warehouseId, warehouseStocks, isReduceOperation])

  const totalReductionFromEntries = useMemo(() => {
    return reductionEntries.reduce((sum, entry) => sum + (parseFloat(entry.quantity) || 0), 0)
  }, [reductionEntries])

  const multiGodownNewStock = useMemo(() => Math.max(0, item.stock - totalReductionFromEntries), [item.stock, totalReductionFromEntries])

  const validationErrors = useMemo(() => {
    if (multiGodownMode) {
      return getMultiGodownValidationErrors({ operationType, reductionEntries, warehouseStocks, godowns, totalReductionFromEntries, stock: item.stock, packagingUnit })
    }
    return getSingleGodownValidationErrors({ operationType, selectedWarehouseStock, enteredQty, warehouseId, warehouseStocks, packagingUnit })
  }, [multiGodownMode, operationType, reductionEntries, warehouseStocks, godowns, totalReductionFromEntries, item.stock, packagingUnit, selectedWarehouseStock, enteredQty, warehouseId])

  const fetchWarehouseStocks = useCallback(async () => {
    setIsLoadingStocks(true)
    const result = await getItemWarehouseStocks(item.id).catch(() => null)
    if (result?.success && result.stocks) setWarehouseStocks(result.stocks)
    setIsLoadingStocks(false)
  }, [item.id])

  useEffect(() => { if (open) void fetchWarehouseStocks() }, [open, fetchWarehouseStocks])

  const resetForm = useCallback(() => {
    setQuantity(""); setNotes(""); setReason(""); setOperationType(defaultOperation)
    setWarehouseId(getInitialWarehouseIdFromItem(item)); setMultiGodownMode(false)
    setReductionEntries([]); setWarehouseStocks([])
  }, [defaultOperation, item])

  const completeSuccessfulSubmit = useCallback((message: string) => {
    toast.success(message); setOpen(false); resetForm(); router.refresh(); onSuccess?.()
  }, [onSuccess, resetForm, router])

  const handleMultiGodownSubmit = useCallback(async () => {
    const entries = getValidMultiGodownEntries(reductionEntries)
    const error = getMultiGodownSubmitError({ entries, isAddOperation, isReduceOperation, reason, validationErrors })
    if (error) { toast.error(error); return }
    setIsSubmitting(true)
    try {
      if (isAddOperation) {
        const result = await addStockToMultipleWarehouses(item.id, entries, packagingUnit, notes || undefined)
        if (result.success) { completeSuccessfulSubmit(buildMultiAddSuccessMessage(result.additionResults, result.newStock || 0, packagingUnit)) }
        else { toast.error(result.error || "Failed to add stock") }
      } else {
        const result = await reduceStockFromMultipleWarehouses(item.id, entries, packagingUnit, reason, notes || undefined)
        if (result.success) { completeSuccessfulSubmit(buildMultiReduceSuccessMessage(result.reductionResults, result.newStock || 0, packagingUnit)) }
        else { toast.error(result.error || "Failed to reduce stock") }
      }
    } catch { toast.error("An error occurred while updating stock") }
    finally { setIsSubmitting(false) }
  }, [reductionEntries, isAddOperation, isReduceOperation, reason, validationErrors, item.id, packagingUnit, notes, completeSuccessfulSubmit])

  const handleSingleGodownSubmit = useCallback(async () => {
    const submitError = getSingleSubmitValidationError({ quantity, isReduceOperation, enteredQty, stock: item.stock, packagingUnit, selectedWarehouseStock, warehouseId, reason })
    if (submitError) { toast.error(submitError); return }
    setIsSubmitting(true)
    try {
      const result = await modifyStockWithLedger(item.id, warehouseId.trim(), parseFloat(quantity), packagingUnit, operationType, isReduceOperation ? reason : "stock_in", notes || undefined)
      if (!result.success) { toast.error(buildStockErrorMessage(isAddOperation, result.error)); return }
      completeSuccessfulSubmit(buildStockSuccessMessage(isAddOperation, quantity, packagingUnit, result.newStock || 0))
    } catch { toast.error("An error occurred while updating stock") }
    finally { setIsSubmitting(false) }
  }, [quantity, isReduceOperation, enteredQty, item.stock, packagingUnit, selectedWarehouseStock, warehouseId, reason, item.id, operationType, notes, isAddOperation, completeSuccessfulSubmit])

  const handleSubmit = useCallback(() => {
    if (multiGodownMode) { void handleMultiGodownSubmit(); return }
    void handleSingleGodownSubmit()
  }, [multiGodownMode, handleMultiGodownSubmit, handleSingleGodownSubmit])

  const addReductionEntry = useCallback(() => {
    const unusedGodowns = godowns.filter(g => !reductionEntries.some(e => e.warehouseId === g.id))
    if (unusedGodowns.length === 0) { toast.error("All godowns are already added"); return }
    setReductionEntries([...reductionEntries, { warehouseId: unusedGodowns[0].id, quantity: "" }])
  }, [godowns, reductionEntries])

  const removeReductionEntry = useCallback((index: number) => setReductionEntries(reductionEntries.filter((_, i) => i !== index)), [reductionEntries])
  const updateReductionEntry = useCallback((index: number, field: keyof ReductionEntry, value: string) => {
    const updated = [...reductionEntries]; updated[index] = { ...updated[index], [field]: value }; setReductionEntries(updated)
  }, [reductionEntries])

  const enableMultiGodownMode = useCallback(() => {
    setMultiGodownMode(true); setReductionEntries(getInitialReductionEntries(warehouseStocks, godowns))
  }, [warehouseStocks, godowns])

  const isDirty = useMemo(() => computeIsDirty(multiGodownMode, reductionEntries, quantity, notes, reason), [quantity, notes, reason, multiGodownMode, reductionEntries])
  const handleCloseDialog = useCallback(() => { setOpen(false); resetForm() }, [resetForm])

  const isSubmitDisabled = useMemo(() => computeIsSubmitDisabled({
    isSubmitting, multiGodownMode, isReduceOperation, reductionEntries, reason, validationErrors,
    quantity, warehouseId, operationType, enteredQty, stock: item.stock, selectedWarehouseStock, warehouseStocks,
  }), [isSubmitting, multiGodownMode, isReduceOperation, reductionEntries, reason, validationErrors, quantity, warehouseId, operationType, enteredQty, item.stock, selectedWarehouseStock, warehouseStocks])

  const selectAddOperation = useCallback(() => { setOperationType(ADD_OPERATION); setMultiGodownMode(false); setReductionEntries([]) }, [])
  const selectReduceOperation = useCallback(() => setOperationType(REDUCE_OPERATION), [])
  const cancelMultiGodown = useCallback(() => { setMultiGodownMode(false); setReductionEntries([]) }, [])

  return {
    open, setOpen, isSubmitting, isLoadingStocks, quantity, setQuantity, operationType,
    reason, setReason, warehouseId, setWarehouseId, notes, setNotes, warehouseStocks,
    multiGodownMode, reductionEntries, isAddOperation, isReduceOperation, packagingUnit,
    baseUnit, perPackaging, enteredQty, baseUnitsToModify, newStock, selectedWarehouseStock,
    totalReductionFromEntries, multiGodownNewStock, validationErrors, handleSubmit, isDirty,
    handleCloseDialog, isSubmitDisabled, addReductionEntry, removeReductionEntry,
    updateReductionEntry, enableMultiGodownMode, selectAddOperation, selectReduceOperation, cancelMultiGodown,
  }
}

export function AddStockDialog({ item, godowns, trigger, defaultOperation = "ADD", onSuccess }: StockManagementDialogProps) {
  const state = useStockDialog(item, godowns, defaultOperation, onSuccess)
  const { showConfirmDialog, handleOpenChange, confirmDiscard, cancelDiscard } = useUnsavedChanges({
    isDirty: state.isDirty, onClose: state.handleCloseDialog, setOpen: state.setOpen,
  })

  return (
    <>
    <Dialog open={state.open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (<Button><Plus className="w-4 h-4 mr-2" />Manage Stock</Button>)}
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg sm:w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />Stock Management
          </DialogTitle>
          <DialogDescription>
            Add or reduce stock for <span className="font-medium">{item.name}</span>
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="overflow-y-auto scrollbar-hide">
        <div className="space-y-4 py-4">
          <OperationTypeButtons
            operationType={state.operationType}
            onSelectAdd={state.selectAddOperation}
            onSelectReduce={state.selectReduceOperation}
          />

          <TotalStockDisplay
            stock={item.stock}
            packagingUnit={state.packagingUnit}
            perPackaging={state.perPackaging}
            baseUnit={state.baseUnit}
          />

          <SingleGodownSection
            state={state}
            godowns={godowns}
            item={item}
          />

          <MultiGodownSection
            state={state}
            godowns={godowns}
            item={item}
          />

          <NotesInput value={state.notes} onChange={state.setNotes} operationType={state.operationType} />

          {!state.multiGodownMode && state.enteredQty > 0 && state.validationErrors.length === 0 && state.enteredQty <= (state.isReduceOperation ? (state.selectedWarehouseStock?.quantity ?? item.stock) : Infinity) && (
            <StockPreview
              operationType={state.operationType}
              enteredQty={state.enteredQty}
              newStock={state.newStock}
              packagingUnit={state.packagingUnit}
              perPackaging={state.perPackaging}
              baseUnit={state.baseUnit}
              currentStock={item.stock}
            />
          )}

          {state.validationErrors.length > 0 && <ValidationErrorList errors={state.validationErrors} />}
        </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={state.isSubmitting}>Cancel</Button>
          <SubmitButton state={state} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <UnsavedChangesDialog open={showConfirmDialog} onConfirm={confirmDiscard} onCancel={cancelDiscard} />
    </>
  )
}

type StockDialogState = ReturnType<typeof useStockDialog>

function SingleGodownSection({ state, godowns, item }: Readonly<{ state: StockDialogState; godowns: Array<{ id: string; name: string }>; item: IItem }>) {
  if (state.multiGodownMode) return null
  return (
    <>
      <div className="border rounded-md p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Warehouse className="w-4 h-4" />
          Stock by Godown - Select godown to {state.isAddOperation ? "add stock" : "reduce stock"}
        </div>
        <WarehouseStockGrid
          isLoadingStocks={state.isLoadingStocks}
          warehouseStocks={state.warehouseStocks}
          godowns={godowns}
          warehouseId={state.warehouseId}
          packagingUnit={state.packagingUnit}
          onSelectWarehouse={state.setWarehouseId}
        />
        {state.warehouseId && state.selectedWarehouseStock && (
          <p className="text-xs text-primary font-medium pt-1">
            Selected: {state.selectedWarehouseStock.warehouseName} - {state.selectedWarehouseStock.quantity} {state.packagingUnit} available
          </p>
        )}
      </div>

      {state.perPackaging > 1 && (
        <div className="text-xs text-muted-foreground bg-primary/5 p-2 rounded-md border border-primary/10">
          <span className="font-medium text-primary">Packaging:</span> 1 {state.packagingUnit} = {state.perPackaging} {state.baseUnit}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={state.enableMultiGodownMode} className="text-xs">
          <Plus className="w-3 h-3 mr-1" />{state.isAddOperation ? "Add to" : "Reduce from"} Multiple Godowns
        </Button>
      </div>

      <QuantityInput
        quantity={state.quantity}
        onChange={state.setQuantity}
        packagingUnit={state.packagingUnit}
        maxQuantity={state.isReduceOperation ? (state.selectedWarehouseStock?.quantity ?? item.stock) : undefined}
        operationType={state.operationType}
        perPackaging={state.perPackaging}
        baseUnit={state.baseUnit}
        enteredQty={state.enteredQty}
        baseUnitsToModify={state.baseUnitsToModify}
      />

      {state.isReduceOperation && state.selectedWarehouseStock && state.enteredQty > state.selectedWarehouseStock.quantity && (
        <div className="flex items-start gap-2 text-xs text-red-500 font-medium bg-red-50 p-2 rounded">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p>Cannot reduce more than available in {state.selectedWarehouseStock.warehouseName}</p>
            <p className="text-red-400">Available: {state.selectedWarehouseStock.quantity} {state.packagingUnit}</p>
          </div>
        </div>
      )}

      {state.isReduceOperation && state.enteredQty > item.stock && (
        <p className="text-xs text-red-500 font-medium">Cannot reduce more than total stock ({item.stock} {state.packagingUnit})</p>
      )}

      {state.isReduceOperation && <ReductionReasonSelect value={state.reason} onChange={state.setReason} />}
    </>
  )
}

function MultiGodownSection({ state, godowns, item }: Readonly<{ state: StockDialogState; godowns: Array<{ id: string; name: string }>; item: IItem }>) {
  if (!state.multiGodownMode) return null
  return (
    <div className="space-y-4 border rounded-md p-4 bg-muted/20">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Multi-Godown {state.isAddOperation ? "Addition" : "Reduction"}</Label>
        <Button type="button" variant="ghost" size="sm" onClick={state.cancelMultiGodown}>Cancel</Button>
      </div>

      <MultiGodownEntryList
        entries={state.reductionEntries}
        warehouseStocks={state.warehouseStocks}
        godowns={godowns}
        packagingUnit={state.packagingUnit}
        operationType={state.operationType}
        onUpdate={state.updateReductionEntry}
        onRemove={state.removeReductionEntry}
      />

      <Button type="button" variant="outline" size="sm" onClick={state.addReductionEntry} className="w-full" disabled={state.reductionEntries.length >= godowns.length}>
        <Plus className="w-4 h-4 mr-1" />Add Another Godown
      </Button>

      {state.totalReductionFromEntries > 0 && (
        <div className={cn("border p-3 rounded-md", state.isAddOperation ? ADD_SURFACE_CLASS : REDUCE_SURFACE_CLASS)}>
          <p className={cn("text-sm font-medium", state.isAddOperation ? ADD_TEXT_CLASS : REDUCE_TEXT_CLASS)}>
            Total {state.isAddOperation ? "Addition" : "Reduction"}: {state.totalReductionFromEntries} {state.packagingUnit}
          </p>
          <p className={cn("text-xs mt-1", state.isAddOperation ? ADD_ACCENT_TEXT_CLASS : REDUCE_ACCENT_TEXT_CLASS)}>
            New stock will be: {state.isAddOperation ? item.stock + state.totalReductionFromEntries : state.multiGodownNewStock} {state.packagingUnit}
          </p>
        </div>
      )}

      {state.isReduceOperation && <ReductionReasonSelect value={state.reason} onChange={state.setReason} />}
    </div>
  )
}

function NotesInput({ value, onChange, operationType }: Readonly<{ value: string; onChange: (v: string) => void; operationType: StockOperationType }>) {
  return (
    <div className="space-y-2">
      <Label htmlFor="notes">Notes (Optional)</Label>
      <Textarea
        id="notes"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={operationType === ADD_OPERATION ? "e.g., Purchase order #123, Supplier name..." : "Additional details about the stock reduction..."}
        rows={2}
      />
    </div>
  )
}

function SubmitButton({ state }: Readonly<{ state: StockDialogState }>) {
  return (
    <Button
      onClick={state.handleSubmit}
      disabled={state.isSubmitDisabled}
      className={cn(state.isAddOperation ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700")}
    >
      {state.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {state.isAddOperation ? (<><Plus className="w-4 h-4 mr-2" />Add Stock</>) : (<><Minus className="w-4 h-4 mr-2" />Reduce Stock</>)}
    </Button>
  )
}
