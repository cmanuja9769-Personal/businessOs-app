"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ArrowRightLeft,
  Plus,
  Trash2,
  Loader2,
  Search,
  ChevronDown,
  ChevronRight,
  Package,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { getWarehouses, type Warehouse } from "@/app/godowns/actions"
import {
  getWarehouseItemStock,
  createStockTransfer,
  getStockTransfers,
  type StockTransfer,
} from "@/app/godowns/transfer-actions"
import { toast } from "sonner"

interface TransferLineItem {
  itemId: string
  itemName: string
  itemCode: string
  unit: string
  availableQty: number
  transferQty: number
}

export function StockTransferManager() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [totalTransfers, setTotalTransfers] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const [sourceId, setSourceId] = useState("")
  const [destId, setDestId] = useState("")
  const [transferDate, setTransferDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [notes, setNotes] = useState("")
  const [sourceStock, setSourceStock] = useState<Array<{ itemId: string; quantity: number; itemName: string; itemCode: string; unit: string }>>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [lineItems, setLineItems] = useState<TransferLineItem[]>([])
  const [isLoadingStock, setIsLoadingStock] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [wh, tf] = await Promise.all([
        getWarehouses(),
        getStockTransfers(),
      ])
      setWarehouses(wh)
      setTransfers(tf.transfers)
      setTotalTransfers(tf.total)
    } catch (err) {
      console.error("Failed to load transfer data:", err)
      toast.error("Failed to load warehouses and transfers")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData().catch(() => {}) }, [loadData])

  useEffect(() => {
    if (!sourceId) {
      setSourceStock([])
      setLineItems([])
      return
    }
    let cancelled = false
    setIsLoadingStock(true)
    getWarehouseItemStock(sourceId)
      .then(data => { if (!cancelled) setSourceStock(data) })
      .catch(() => { if (!cancelled) setSourceStock([]) })
      .finally(() => { if (!cancelled) setIsLoadingStock(false) })
    return () => { cancelled = true }
  }, [sourceId])

  const filteredStock = sourceStock.filter(item => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return item.itemName.toLowerCase().includes(q) || item.itemCode.toLowerCase().includes(q)
  })

  const addLineItem = (stock: typeof sourceStock[0]) => {
    if (lineItems.some(li => li.itemId === stock.itemId)) return
    setLineItems(prev => [
      ...prev,
      {
        itemId: stock.itemId,
        itemName: stock.itemName,
        itemCode: stock.itemCode,
        unit: stock.unit,
        availableQty: stock.quantity,
        transferQty: 1,
      },
    ])
  }

  const updateLineQty = (itemId: string, qty: number) => {
    setLineItems(prev =>
      prev.map(li =>
        li.itemId === itemId
          ? { ...li, transferQty: Math.max(1, Math.min(qty, li.availableQty)) }
          : li
      )
    )
  }

  const removeLineItem = (itemId: string) => {
    setLineItems(prev => prev.filter(li => li.itemId !== itemId))
  }

  const addAllItems = () => {
    const newItems: TransferLineItem[] = []
    for (const stock of sourceStock) {
      if (!lineItems.some(li => li.itemId === stock.itemId)) {
        newItems.push({
          itemId: stock.itemId,
          itemName: stock.itemName,
          itemCode: stock.itemCode,
          unit: stock.unit,
          availableQty: stock.quantity,
          transferQty: stock.quantity,
        })
      }
    }
    if (newItems.length > 0) setLineItems(prev => [...prev, ...newItems])
  }

  const fillMaxQty = () => {
    setLineItems(prev => prev.map(li => ({ ...li, transferQty: li.availableQty })))
  }

  const openForm = () => {
    setSourceId("")
    setDestId("")
    setTransferDate(format(new Date(), "yyyy-MM-dd"))
    setNotes("")
    setLineItems([])
    setSearchQuery("")
    setIsFormOpen(true)
  }

  const handleSubmit = async () => {
    if (!sourceId) { toast.error("Select source warehouse"); return }
    if (!destId) { toast.error("Select destination warehouse"); return }
    if (sourceId === destId) { toast.error("Source and destination must be different"); return }
    if (lineItems.length === 0) { toast.error("Add at least one item"); return }

    const invalidItems = lineItems.filter(li => li.transferQty > li.availableQty)
    if (invalidItems.length > 0) { toast.error("Some items exceed available stock"); return }

    setIsSubmitting(true)
    try {
      const res = await createStockTransfer({
        sourceWarehouseId: sourceId,
        destinationWarehouseId: destId,
        transferDate,
        items: lineItems.map(li => ({ itemId: li.itemId, quantity: li.transferQty })),
        notes,
      })

      if (!res.success) throw new Error(res.error)

      toast.success(`Transfer ${res.transferNo} completed`)
      setIsFormOpen(false)
      void loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalTransferQty = lineItems.reduce((s, li) => s + li.transferQty, 0)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Stock Transfers
            </CardTitle>
            <CardDescription>{totalTransfers} total transfers</CardDescription>
          </div>
          <Button onClick={openForm} size="sm" disabled={warehouses.length < 2}>
            <Plus className="h-4 w-4 mr-1" />
            New Transfer
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && transfers.length === 0 && (
            <div className="text-center py-12">
              <ArrowRightLeft className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No stock transfers yet</p>
              {warehouses.length >= 2 && (
                <Button onClick={openForm} variant="outline" className="mt-3" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Create first transfer
                </Button>
              )}
              {warehouses.length < 2 && (
                <p className="text-xs text-muted-foreground mt-2">Need at least 2 active warehouses</p>
              )}
            </div>
          )}
          {!isLoading && transfers.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[2rem]" />
                    <TableHead>Transfer #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map(tf => (
                    <TransferRow
                      key={tf.id}
                      transfer={tf}
                      isExpanded={expandedRows.has(tf.id)}
                      onToggle={() => toggleRow(tf.id)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>New Stock Transfer</DialogTitle>
            <DialogDescription>Move items between warehouse locations</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Source Warehouse</Label>
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="From..." />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => w.id !== destId).map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Destination Warehouse</Label>
                <Select value={destId} onValueChange={setDestId}>
                  <SelectTrigger>
                    <SelectValue placeholder="To..." />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => w.id !== sourceId).map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Transfer Date</Label>
                <Input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                />
              </div>
            </div>

            {sourceId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Select Items from Source</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAllItems}
                    disabled={isLoadingStock || sourceStock.length === 0}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add All Items
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search items..."
                    className="pl-9"
                  />
                </div>

                <ScrollArea className="h-[10rem] border rounded-md">
                  {isLoadingStock && (
                    <div className="flex items-center justify-center h-full p-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!isLoadingStock && filteredStock.length === 0 && (
                    <div className="flex items-center justify-center h-full p-4 text-sm text-muted-foreground">
                      {sourceStock.length === 0 ? "No items with stock in this warehouse" : "No matching items"}
                    </div>
                  )}
                  {!isLoadingStock && filteredStock.length > 0 && (
                    <div className="p-1.5 space-y-1">
                      {filteredStock.map(stock => {
                        const added = lineItems.some(li => li.itemId === stock.itemId)
                        return (
                          <button
                            key={stock.itemId}
                            type="button"
                            onClick={() => addLineItem(stock)}
                            disabled={added}
                            className={cn(
                              "w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                              added
                                ? "bg-primary/10 border border-primary/30"
                                : "hover:bg-muted border border-transparent"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {added ? <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" /> : <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                              <span className="truncate">{stock.itemName}</span>
                              {stock.itemCode && <span className="text-xs text-muted-foreground font-mono">{stock.itemCode}</span>}
                            </div>
                            <Badge variant="outline" className="ml-2 shrink-0 font-mono text-xs">
                              {stock.quantity} {stock.unit}
                            </Badge>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            {lineItems.length > 0 && (
              <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Transfer Items ({lineItems.length} items, {totalTransferQty} total qty)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fillMaxQty}
                  className="h-7 text-xs"
                >
                  Fill Max Qty
                </Button>
              </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right w-[6rem]">Available</TableHead>
                        <TableHead className="text-right w-[7rem]">Transfer Qty</TableHead>
                        <TableHead className="w-[2.5rem]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map(li => (
                        <TableRow key={li.itemId}>
                          <TableCell>
                            <div>
                              <span className="font-medium text-sm">{li.itemName}</span>
                              {li.itemCode && <span className="text-xs text-muted-foreground ml-1">({li.itemCode})</span>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-muted-foreground">
                            {li.availableQty} {li.unit}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={1}
                              max={li.availableQty}
                              value={li.transferQty}
                              onChange={(e) => updateLineQty(li.itemId, parseInt(e.target.value) || 1)}
                              className="h-8 w-[5rem] ml-auto text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLineItem(li.itemId)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for transfer..."
                className="resize-none"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || lineItems.length === 0}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Complete Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function TransferRow({
  transfer,
  isExpanded,
  onToggle,
}: {
  readonly transfer: StockTransfer
  readonly isExpanded: boolean
  readonly onToggle: () => void
}) {
  let statusVariant: "default" | "destructive" | "secondary" = "secondary"
  if (transfer.status === "completed") statusVariant = "default"
  else if (transfer.status === "cancelled") statusVariant = "destructive"

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onToggle}>
        <TableCell>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </TableCell>
        <TableCell className="font-mono text-sm font-medium">{transfer.transferNo}</TableCell>
        <TableCell className="text-sm">
          {transfer.transferDate ? format(new Date(transfer.transferDate + "T00:00:00"), "dd MMM yyyy") : "-"}
        </TableCell>
        <TableCell className="text-sm">{transfer.sourceWarehouseName}</TableCell>
        <TableCell className="text-sm">{transfer.destinationWarehouseName}</TableCell>
        <TableCell className="text-center">
          <Badge variant="outline" className="font-mono">{transfer.items.length}</Badge>
        </TableCell>
        <TableCell className="text-center">
          <Badge
            variant={statusVariant}
            className={cn(
              transfer.status === "completed" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            )}
          >
            {transfer.status}
          </Badge>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30">
            <div className="py-3 px-4">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Transfer Items
              </h4>
              {transfer.notes && (
                <p className="text-xs text-muted-foreground mb-3">Notes: {transfer.notes}</p>
              )}
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {transfer.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-background">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{item.itemName}</p>
                      {item.itemCode && <p className="text-xs text-muted-foreground font-mono">{item.itemCode}</p>}
                    </div>
                    <Badge variant="outline" className="font-mono ml-2 shrink-0">
                      {item.quantity} {item.unit}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
