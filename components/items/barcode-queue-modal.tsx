"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Plus,
  Trash2,
  Printer,
  Download,
  Loader2,
  Package,
  X,
  RotateCcw,
} from "lucide-react"
import type { IItem } from "@/types"
import { searchItems } from "@/app/items/actions"
import {
  useBarcodeQueueStore,
} from "@/store/use-barcode-queue-store"
import {
  LABEL_LAYOUTS,
  getLayoutById,
} from "@/lib/label-layouts"
import { translateToHindi } from "@/lib/translate"
import { pdf } from "@react-pdf/renderer"
import { BarcodePDFDocument } from "@/components/pdf/barcode-pdf-document"
import { cn } from "@/lib/utils"
import { logBarcodePrint } from "@/app/barcode-logs/actions"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog"

interface BarcodeQueueModalProps {
  readonly logoUrl?: string
}

function getItemStock(item: IItem): number {
  const stock = item.stock ?? (item as unknown as { currentStock?: number }).currentStock
  return Math.max(0, Number(stock) || 0)
}

export function BarcodeQueueModal({ logoUrl }: BarcodeQueueModalProps) {
  const {
    queue,
    isModalOpen,
    closeModal,
    openModal,
    addToQueue,
    removeFromQueue,
    updateQuantity,
    clearQueue,
    totalLabels,
  } = useBarcodeQueueStore()

  const handleDiscardAndClose = useCallback(() => {
    clearQueue()
    closeModal()
  }, [clearQueue, closeModal])

  const setModalOpen = useCallback(
    (open: boolean) => {
      if (open) openModal()
    },
    [openModal]
  )

  const {
    showConfirmDialog,
    handleOpenChange,
    confirmDiscard,
    cancelDiscard,
  } = useUnsavedChanges({
    isDirty: queue.length > 0,
    onClose: handleDiscardAndClose,
    setOpen: setModalOpen,
  })

  const [searchResults, setSearchResults] = useState<IItem[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [useStockQty, setUseStockQty] = useState(true)
  const [manualQty, setManualQty] = useState(1)
  const [layoutId, setLayoutId] = useState("xl")
  const [startPosition, setStartPosition] = useState(1)
  const [showPrice, setShowPrice] = useState(false)
  const [showPerCartonQty, setShowPerCartonQty] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  const selectedLayout = getLayoutById(layoutId)
  const labelsPerPage = selectedLayout.columns * selectedLayout.rows
  const total = totalLabels()
  const placeholders = Math.max(0, startPosition - 1)
  const totalSlots = placeholders + total
  const fullPages = Math.floor(totalSlots / labelsPerPage)
  const remainder = totalSlots % labelsPerPage

  useEffect(() => {
    if (!isModalOpen) return
    let cancelled = false
    setIsLoadingItems(true)
    searchItems("", 20)
      .then((items) => {
        if (!cancelled) setSearchResults(items)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingItems(false)
      })
    return () => { cancelled = true }
  }, [isModalOpen])

  useEffect(() => {
    if (!isModalOpen) return
    const timer = setTimeout(() => {
      setIsLoadingItems(true)
      searchItems(searchQuery, 30)
        .then((items) => setSearchResults(items))
        .finally(() => setIsLoadingItems(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, isModalOpen])

  const queueItemIds = useMemo(
    () => new Set(queue.map((e) => e.item.id)),
    [queue]
  )

  const getAddQuantity = useCallback(
    (item: IItem): number => {
      if (useStockQty) {
        const stock = getItemStock(item)
        return stock > 0 ? stock : 1
      }
      return Math.max(1, manualQty)
    },
    [useStockQty, manualQty]
  )

  const handleAddItem = useCallback(
    async (item: IItem) => {
      const qty = getAddQuantity(item)
      let hindiName: string | undefined
      try {
        hindiName = await translateToHindi(item.name)
      } catch {
        hindiName = undefined
      }
      addToQueue({ item, quantity: qty, hindiName })
    },
    [getAddQuantity, addToQueue]
  )

  const handleFillStockQty = useCallback(() => {
    for (const entry of queue) {
      const stock = getItemStock(entry.item)
      if (stock > 0) updateQuantity(entry.item.id, stock)
    }
  }, [queue, updateQuantity])

  const handleDownloadPDF = async () => {
    if (queue.length === 0) return
    setIsGenerating(true)
    try {
      const blob = await pdf(
        <BarcodePDFDocument
          queue={queue}
          layout={selectedLayout}
          startPosition={startPosition}
          showPrice={showPrice}
          showPerCartonQty={showPerCartonQty}
          logoUrl={logoUrl}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Barcode Labels - Batch ${new Date().toLocaleDateString("en-IN")}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      await logBarcodePrint(
        queue.map((entry) => ({
          itemId: entry.item.id,
          itemName: entry.item.name,
          barcodeNo: entry.item.barcodeNo ?? null,
          stockAtPrint: entry.item.stock ?? 0,
          labelsPrinted: entry.quantity,
          printType: "batch" as const,
          layoutId,
        }))
      )
    } catch (error) {
      console.error("PDF generation failed:", error)
      const { toast } = await import("sonner")
      toast.error("Failed to generate PDF. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePrintPDF = async () => {
    if (queue.length === 0) return
    setIsGenerating(true)
    try {
      const blob = await pdf(
        <BarcodePDFDocument
          queue={queue}
          layout={selectedLayout}
          startPosition={startPosition}
          showPrice={showPrice}
          showPerCartonQty={showPerCartonQty}
          logoUrl={logoUrl}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
      setTimeout(() => URL.revokeObjectURL(url), 60000)

      await logBarcodePrint(
        queue.map((entry) => ({
          itemId: entry.item.id,
          itemName: entry.item.name,
          barcodeNo: entry.item.barcodeNo ?? null,
          stockAtPrint: entry.item.stock ?? 0,
          labelsPrinted: entry.quantity,
          printType: "batch" as const,
          layoutId,
        }))
      )
    } catch (error) {
      console.error("PDF print failed:", error)
      const { toast } = await import("sonner")
      toast.error("Failed to generate PDF for printing. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const gridSlots = useMemo(() => {
    const slots: Array<{ type: "placeholder" | "label"; itemName?: string; color?: string }> = []
    for (let i = 0; i < placeholders; i++) {
      slots.push({ type: "placeholder" })
    }
    const colors = [
      "bg-blue-100 border-blue-300",
      "bg-green-100 border-green-300",
      "bg-purple-100 border-purple-300",
      "bg-orange-100 border-orange-300",
      "bg-pink-100 border-pink-300",
      "bg-teal-100 border-teal-300",
      "bg-yellow-100 border-yellow-300",
      "bg-red-100 border-red-300",
    ]
    queue.forEach((entry, idx) => {
      const color = colors[idx % colors.length]
      for (let i = 0; i < entry.quantity; i++) {
        slots.push({ type: "label", itemName: entry.item.name, color })
      }
    })
    return slots
  }, [queue, placeholders])

  const previewSlots = gridSlots.slice(0, labelsPerPage * 2)

  return (
    <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-6xl max-h-[95vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Barcode Print Queue
          </DialogTitle>
          <DialogDescription>
            Add items to print barcode labels. When &quot;Auto-fill stock qty&quot; is on, labels default to current stock.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="flex flex-col gap-5 md:flex-row">
            {/* -------- LEFT: SEARCH + QUEUE -------- */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Search bar */}
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items by name, code, barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <Label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={useStockQty}
                      onCheckedChange={(c) => setUseStockQty(c === true)}
                      className="h-4 w-4"
                    />
                    Auto-fill stock qty
                  </Label>
                  {!useStockQty && (
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground whitespace-nowrap">Labels per item:</Label>
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        value={manualQty}
                        onChange={(e) => setManualQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-8 w-20 text-sm text-center"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Search results */}
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">
                  Items {searchResults.length > 0 && <span className="text-muted-foreground font-normal">({searchResults.length})</span>}
                </Label>
                <ScrollArea className="h-52 md:h-60 rounded-md border">
                  {(() => {
                    if (isLoadingItems) return (
                    <div className="flex items-center justify-center h-40 p-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                    )
                    if (searchResults.length === 0) return (
                    <div className="flex items-center justify-center h-40 p-6 text-sm text-muted-foreground">
                      {searchQuery ? "No items found" : "No items available"}
                    </div>
                    )
                    return (
                    <div className="p-2 space-y-1">
                      {searchResults.map((item) => {
                        const inQueue = queueItemIds.has(item.id)
                        const stockQty = getItemStock(item)
                        const noBarcode = !item.barcodeNo && !item.itemCode
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleAddItem(item)}
                            disabled={noBarcode}
                            className={cn(
                              "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                              inQueue
                                ? "bg-primary/10 border border-primary/30"
                                : "hover:bg-muted border border-transparent",
                              noBarcode && "opacity-40 cursor-not-allowed"
                            )}
                          >
                            <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{item.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {item.itemCode || "No code"} {item.barcodeNo ? `• ${item.barcodeNo}` : ""}
                              </p>
                            </div>
                            <Badge variant="outline" className="shrink-0 font-mono text-xs tabular-nums">
                              {stockQty} {item.packagingUnit || item.unit || "PCS"}
                            </Badge>
                            {inQueue && (
                              <Badge variant="secondary" className="shrink-0 text-xs">Added</Badge>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    )
                  })()}
                </ScrollArea>
              </div>

              {/* Queue */}
              {queue.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-sm font-semibold">
                      Print Queue — {queue.length} {queue.length === 1 ? "item" : "items"}, {total} labels
                    </Label>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleFillStockQty}
                        className="h-7 text-xs gap-1"
                        title="Set all label counts to current stock quantity"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Fill Stock Qty
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearQueue}
                        className="h-7 text-xs text-destructive hover:text-destructive gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Clear
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-44 md:h-52 rounded-md border">
                    <div className="p-2 space-y-1.5">
                      {queue.map((entry) => {
                        const stockQty = getItemStock(entry.item)
                        return (
                          <div
                            key={entry.item.id}
                            className="flex items-center gap-2 rounded-lg border px-3 py-2 bg-background"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{entry.item.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {entry.item.barcodeNo || entry.item.itemCode} • Stock: {stockQty}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Input
                                type="number"
                                min={1}
                                max={500}
                                value={entry.quantity}
                                onChange={(e) =>
                                  updateQuantity(entry.item.id, Math.max(1, parseInt(e.target.value) || 1))
                                }
                                className="w-16 h-8 text-sm text-center"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFromQueue(entry.item.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>

            {/* -------- RIGHT: SETTINGS + PREVIEW -------- */}
            <div className="w-full md:w-72 lg:w-80 shrink-0 space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Print Settings</Label>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Label Layout</Label>
                  <Select value={layoutId} onValueChange={setLayoutId}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LABEL_LAYOUTS.map((layout) => (
                        <SelectItem key={layout.id} value={layout.id}>
                          {layout.name}{layout.recommended ? " ★" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {selectedLayout.description} — {selectedLayout.columns}×{selectedLayout.rows} grid
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Start Position (1–{labelsPerPage})
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={labelsPerPage}
                    value={startPosition}
                    onChange={(e) =>
                      setStartPosition(Math.max(1, Math.min(labelsPerPage, parseInt(e.target.value) || 1)))
                    }
                    className="h-10"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="queue-show-price"
                      checked={showPrice}
                      onCheckedChange={(c) => setShowPrice(c === true)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="queue-show-price" className="text-sm font-normal cursor-pointer">
                      Show price on label
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="queue-show-carton"
                      checked={showPerCartonQty}
                      onCheckedChange={(c) => setShowPerCartonQty(c === true)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="queue-show-carton" className="text-sm font-normal cursor-pointer">
                      Show per carton qty
                    </Label>
                  </div>
                </div>
              </div>

              <GridPreview
                slots={previewSlots}
                columns={selectedLayout.columns}
                rows={selectedLayout.rows}
                labelsPerPage={labelsPerPage}
              />

              <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total labels:</span>
                  <span className="font-semibold">{total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pages needed:</span>
                  <span className="font-semibold">{fullPages + (remainder > 0 ? 1 : 0)}</span>
                </div>
                {remainder > 0 && fullPages > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last page:</span>
                    <span className="font-semibold">{remainder}/{labelsPerPage} slots</span>
                  </div>
                )}
                {startPosition > 1 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Skipped slots:</span>
                    <span className="font-semibold">{placeholders}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} className="h-10">
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={queue.length === 0 || isGenerating}
            className="h-10"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
            Download PDF
          </Button>
          <Button
            onClick={handlePrintPDF}
            disabled={queue.length === 0 || isGenerating}
            className="h-10"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Printer className="w-4 h-4 mr-1.5" />}
            Print
          </Button>
        </DialogFooter>
      </DialogContent>

      <UnsavedChangesDialog
        open={showConfirmDialog}
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
      />
    </Dialog>
  )
}

interface GridPreviewProps {
  readonly slots: Array<{ type: "placeholder" | "label"; itemName?: string; color?: string }>
  readonly columns: number
  readonly rows: number
  readonly labelsPerPage: number
}

function GridPreview({ slots, columns, rows: _rows, labelsPerPage }: GridPreviewProps) {
  const pageOneSlots = slots.slice(0, labelsPerPage)
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">Sheet Preview</Label>
      <div
        className="border rounded-lg bg-white p-2"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: "3px",
          aspectRatio: "210 / 297",
          maxHeight: "12rem",
        }}
      >
        {Array.from({ length: labelsPerPage }).map((_, idx) => {
          const slot = pageOneSlots[idx]
          if (!slot) {
            return <div key={idx} className="border border-dashed border-gray-200 rounded-sm" />
          }
          if (slot.type === "placeholder") {
            return (
              <div key={idx} className="border border-dashed border-gray-300 bg-gray-50 rounded-sm flex items-center justify-center">
                <span className="text-[7px] text-gray-400">skip</span>
              </div>
            )
          }
          return (
            <div
              key={idx}
              className={cn("border rounded-sm flex items-center justify-center overflow-hidden", slot.color || "bg-blue-100 border-blue-300")}
              title={slot.itemName}
            >
              <span className="text-[6px] leading-tight text-center px-0.5 truncate">{slot.itemName}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
