"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Warehouse,
  Package,
  AlertTriangle,
  TrendingDown,
  IndianRupee,
  Star,
  ArchiveX,
  Loader2,
  CircleAlert,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getWarehouseStockSummaries,
  getWarehouseLowStockAlerts,
  getDeadStockByWarehouse,
  type WarehouseStockSummary,
} from "@/app/godowns/actions"

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const formatLakhsCrores = (value: number) => {
  if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toFixed(0)
}

interface LowStockAlert {
  itemId: string
  itemName: string
  itemCode: string
  unit: string
  warehouseId: string
  warehouseName: string
  currentQty: number
  minQty: number
}

interface DeadStockItem {
  itemId: string
  itemName: string
  itemCode: string
  unit: string
  warehouseId: string
  warehouseName: string
  quantity: number
  value: number
}

export function WarehouseDashboard() {
  const [summaries, setSummaries] = useState<WarehouseStockSummary[]>([])
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([])
  const [deadStock, setDeadStock] = useState<DeadStockItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [alertWarehouseFilter, setAlertWarehouseFilter] = useState("all")

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [s, alerts, dead] = await Promise.all([
        getWarehouseStockSummaries(),
        getWarehouseLowStockAlerts(),
        getDeadStockByWarehouse(undefined, 90),
      ])
      setSummaries(s)
      setLowStockAlerts(alerts)
      setDeadStock(dead)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
        <CircleAlert className="h-8 w-8" />
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  const activeSummaries = summaries.filter(s => s.isActive)
  const totalValue = activeSummaries.reduce((s, w) => s + w.totalValue, 0)
  const totalItems = activeSummaries.reduce((s, w) => s + w.totalItems, 0)
  const totalQty = activeSummaries.reduce((s, w) => s + w.totalQuantity, 0)
  const totalLowStock = activeSummaries.reduce((s, w) => s + w.lowStockItems, 0)

  const filteredAlerts = alertWarehouseFilter === "all"
    ? lowStockAlerts
    : lowStockAlerts.filter(a => a.warehouseId === alertWarehouseFilter)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Warehouses</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSummaries.length}</div>
            <p className="text-xs text-muted-foreground">{totalItems} unique items stored</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{formatLakhsCrores(totalValue)}</div>
            <p className="text-xs text-muted-foreground">{totalQty.toLocaleString("en-IN")} total units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", totalLowStock > 0 && "text-amber-600")}>
              {totalLowStock}
            </div>
            <p className="text-xs text-muted-foreground">items below minimum level</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dead Stock</CardTitle>
            <ArchiveX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", deadStock.length > 0 && "text-red-600")}>
              {deadStock.length}
            </div>
            <p className="text-xs text-muted-foreground">no movement in 90 days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Value Distribution by Warehouse</CardTitle>
          <CardDescription>Stock value and item count per location</CardDescription>
        </CardHeader>
        <CardContent>
          {activeSummaries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No active warehouses</p>
          ) : (
            <div className="space-y-3">
              {activeSummaries.map(wh => {
                const pct = totalValue > 0 ? (wh.totalValue / totalValue) * 100 : 0
                return (
                  <div key={wh.warehouseId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{wh.warehouseName}</span>
                        <span className="text-xs text-muted-foreground font-mono">{wh.warehouseCode}</span>
                        {wh.isDefault && (
                          <Badge variant="default" className="text-[0.6rem] px-1 py-0">
                            <Star className="h-2.5 w-2.5 mr-0.5" />
                            Default
                          </Badge>
                        )}
                        {!wh.isActive && (
                          <Badge variant="outline" className="text-[0.6rem]">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground">{wh.totalItems} items</span>
                        <span className="font-semibold tabular-nums">{formatCurrency(wh.totalValue)}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{wh.totalQuantity.toLocaleString("en-IN")} units</span>
                      <span>{pct.toFixed(1)}%</span>
                    </div>
                    {wh.lowStockItems > 0 && (
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        {wh.lowStockItems} items below min stock level
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Low Stock Alerts by Location
              </CardTitle>
              <CardDescription>Items needing restock at specific warehouses</CardDescription>
            </div>
            <Select value={alertWarehouseFilter} onValueChange={setAlertWarehouseFilter}>
              <SelectTrigger className="w-[10rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {activeSummaries.map(wh => (
                  <SelectItem key={wh.warehouseId} value={wh.warehouseId}>{wh.warehouseName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {filteredAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No low stock alerts</p>
            ) : (
              <div className="rounded-md border max-h-[20rem] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">Min</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlerts.slice(0, 20).map((alert, idx) => (
                      <TableRow key={`${alert.itemId}-${alert.warehouseId}-${idx}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{alert.itemName}</p>
                            {alert.itemCode && <p className="text-xs text-muted-foreground font-mono">{alert.itemCode}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{alert.warehouseName}</TableCell>
                        <TableCell className={cn(
                          "text-right font-mono text-sm",
                          alert.currentQty === 0 ? "text-red-600 font-bold" : "text-amber-600"
                        )}>
                          {alert.currentQty} {alert.unit}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {alert.minQty}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {filteredAlerts.length > 20 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Showing 20 of {filteredAlerts.length} alerts
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArchiveX className="h-4 w-4 text-red-500" />
              Dead Stock (90+ Days No Movement)
            </CardTitle>
            <CardDescription>
              {deadStock.length > 0
                ? `₹${formatLakhsCrores(deadStock.reduce((s, d) => s + d.value, 0))} value locked`
                : "No dead stock detected"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {deadStock.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">All items have recent movement</p>
            ) : (
              <div className="rounded-md border max-h-[20rem] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deadStock.slice(0, 20).map((item, idx) => (
                      <TableRow key={`${item.itemId}-${item.warehouseId}-${idx}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{item.itemName}</p>
                            {item.itemCode && <p className="text-xs text-muted-foreground font-mono">{item.itemCode}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{item.warehouseName}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-sm text-red-600">
                          {formatCurrency(item.value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {deadStock.length > 20 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Showing 20 of {deadStock.length} items
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
