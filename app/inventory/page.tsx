"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StockAdjustmentForm } from "@/components/inventory/stock-adjustment-form"
import { WarehouseListManager } from "@/components/inventory/warehouse-list-manager"
import { StockTransferManager } from "@/components/inventory/stock-transfer-manager"
import { WarehouseDashboard } from "@/components/inventory/warehouse-dashboard"

type AdjustmentRecord = {
  id: string
  adjustment_type: string
  quantity: number
  reason: string
  status: string
  created_at: string
  items?: { name: string }
}

type ItemRecord = { id: string; name: string; current_stock: number; warehouse_id?: string; unit?: string }

const TABS = ["dashboard", "warehouses", "transfers", "adjustments", "movements"] as const
type TabValue = (typeof TABS)[number]

export default function InventoryPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get("tab")
  const activeTab: TabValue = TABS.includes(tabParam as TabValue) ? (tabParam as TabValue) : "dashboard"

  const [items, setItems] = useState<ItemRecord[]>([])
  const [adjustments, setAdjustments] = useState<AdjustmentRecord[]>([])

  const fetchItems = useCallback(async () => {
    try {
      const response = await fetch("/api/items")
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        console.error("Items API error:", response.status, err)
        return
      }
      const data = await response.json()
      const itemsList = Array.isArray(data) ? data : (data.items || [])
      setItems(itemsList)
    } catch (err) {
      console.error("Items fetch error:", err)
      toast.error("Failed to load items")
    }
  }, [])

  const fetchAdjustments = useCallback(async () => {
    try {
      const response = await fetch("/api/inventory/adjustments")
      if (response.ok) {
        const data = await response.json()
        setAdjustments(data.data || [])
      }
    } catch {
      toast.error("Failed to load adjustments")
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetching pattern, setState is called after await
    fetchItems().catch(() => {})
    fetchAdjustments().catch(() => {})
  }, [fetchItems, fetchAdjustments])

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "dashboard") {
      params.delete("tab")
    } else {
      params.set("tab", value)
    }
    router.replace(`/inventory?${params.toString()}`)
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Inventory & Warehouses</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage warehouses, stock transfers, adjustments, and movement history
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
          <TabsTrigger value="transfers">Stock Transfers</TabsTrigger>
          <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <WarehouseDashboard />
        </TabsContent>

        <TabsContent value="warehouses">
          <WarehouseListManager />
        </TabsContent>

        <TabsContent value="transfers">
          <StockTransferManager />
        </TabsContent>

        <TabsContent value="adjustments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Stock Adjustments</CardTitle>
                <CardDescription>Increase or decrease stock with reasons</CardDescription>
              </div>
              <StockAdjustmentForm items={items} onSuccess={fetchAdjustments} />
            </CardHeader>
            <CardContent>
              {adjustments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No adjustments yet. Create your first adjustment above.
                </p>
              ) : (
                <div className="space-y-2">
                  {adjustments.map((adj) => (
                    <div key={adj.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{adj.items?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {adj.adjustment_type === "increase" ? "+" : "-"}
                          {adj.quantity} - {adj.reason}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(adj.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-medium ${adj.status === "approved" ? "text-green-600" : "text-yellow-600"}`}
                      >
                        {adj.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>Stock Movement History</CardTitle>
              <CardDescription>Complete audit trail of all stock changes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Movement history will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
