// Inventory Dashboard

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GodownsManager } from "@/components/inventory/godowns-manager"
import { StockAdjustmentForm } from "@/components/inventory/stock-adjustment-form"
import { AlertCircle, Package, TrendingDown, Warehouse } from "lucide-react"

export default function InventoryPage() {
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    expiringBatches: 0,
    totalStockValue: 0,
  })
  const [items, setItems] = useState<Array<{ id: string; name: string; current_stock: number }>>([])
  const [adjustments, setAdjustments] = useState<any[]>([])

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items?limit=1000')
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Error fetching items:', error)
    }
  }

  const fetchAdjustments = async () => {
    try {
      const response = await fetch('/api/inventory/adjustments')
      if (response.ok) {
        const data = await response.json()
        setAdjustments(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching adjustments:', error)
    }
  }

  useEffect(() => {
    fetchItems()
    fetchAdjustments()
  }, [])

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Inventory Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Track stock, batches, serials, and adjustments</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">items in catalog</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">below minimum level</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiringBatches}</div>
            <p className="text-xs text-muted-foreground">within 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalStockValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">total inventory value</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Inventory Tabs */}
      <Tabs defaultValue="batches" className="space-y-4">
        <TabsList>
          <TabsTrigger value="batches">Batch Tracking</TabsTrigger>
          <TabsTrigger value="serials">Serial Numbers</TabsTrigger>
          <TabsTrigger value="adjustments">Stock Adjustments</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
        </TabsList>

        <TabsContent value="batches">
          <Card>
            <CardHeader>
              <CardTitle>Batch Tracking</CardTitle>
              <CardDescription>Manage product batches with expiry dates</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Batch tracking components will be added here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="serials">
          <Card>
            <CardHeader>
              <CardTitle>Serial Number Tracking</CardTitle>
              <CardDescription>Track individual units by serial number</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Serial tracking components will be added here</p>
            </CardContent>
          </Card>
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
                <p className="text-sm text-muted-foreground">No adjustments yet. Create your first adjustment above.</p>
              ) : (
                <div className="space-y-2">
                  {adjustments.map((adj: any) => (
                    <div key={adj.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{adj.items?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {adj.adjustment_type === 'increase' ? '+' : '-'}{adj.quantity} - {adj.reason}
                        </p>
                        <p className="text-xs text-muted-foreground">{new Date(adj.created_at).toLocaleString()}</p>
                      </div>
                      <span className={`text-sm font-medium ${adj.status === 'approved' ? 'text-green-600' : 'text-yellow-600'}`}>
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

        <TabsContent value="warehouses">
          <Card>
            <CardHeader>
              <CardTitle>Warehouse Management</CardTitle>
              <CardDescription>Manage multiple warehouse locations</CardDescription>
            </CardHeader>
              <CardContent>
                <GodownsManager />
              </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
