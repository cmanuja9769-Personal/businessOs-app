// Updated Dashboard with complete summaries

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { TrendingUp, DollarSign, Package, AlertCircle } from "lucide-react"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalPurchases: 0,
    outstanding: 0,
    grossProfit: 0,
    totalItems: 0,
    lowStockItems: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
  })

  useEffect(() => {
    const initStats = async () => {
      setStats({
        totalSales: 500000,
        totalPurchases: 200000,
        outstanding: 75000,
        grossProfit: 300000,
        totalItems: 45,
        lowStockItems: 3,
        totalCustomers: 12,
        totalSuppliers: 8,
      })
    }
    initStats()
  }, [])

  const chartData = [
    { month: "Jan", sales: 45000, purchases: 28000 },
    { month: "Feb", sales: 52000, purchases: 31000 },
    { month: "Mar", sales: 48000, purchases: 29000 },
    { month: "Apr", sales: 61000, purchases: 35000 },
    { month: "May", sales: 55000, purchases: 32000 },
    { month: "Jun", sales: 67000, purchases: 38000 },
  ]

  const profitData = [
    { name: "Gross Profit", value: 300000 },
    { name: "Expenses", value: 80000 },
    { name: "Tax", value: 50000 },
  ]

  const COLORS = ["#10b981", "#f59e0b", "#ef4444"]

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-500">Business overview and key metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(stats.totalSales / 100000).toFixed(1)}L</div>
            <p className="text-xs text-muted-foreground">All-time sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(stats.grossProfit / 100000).toFixed(1)}L</div>
            <p className="text-xs text-muted-foreground">
              {((stats.grossProfit / stats.totalSales) * 100).toFixed(0)}% margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(stats.outstanding / 100000).toFixed(1)}L</div>
            <p className="text-xs text-muted-foreground">Amount due</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <Package className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Items to reorder</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales vs Purchases Trend</CardTitle>
              <CardDescription>Last 6 months comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="purchases" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Profit Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={profitData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ₹${(value / 1000).toFixed(0)}K`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {profitData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Customers</span>
                  <span className="font-bold text-lg">{stats.totalCustomers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Suppliers</span>
                  <span className="font-bold text-lg">{stats.totalSuppliers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Items</span>
                  <span className="font-bold text-lg">{stats.totalItems}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Profit Margin</span>
                  <span className="font-bold text-lg">
                    {((stats.grossProfit / stats.totalSales) * 100).toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Financial Analytics</CardTitle>
              <CardDescription>Key financial metrics and ratios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">Financial analytics data will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Analytics</CardTitle>
              <CardDescription>Stock levels and movement analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">Inventory analytics will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
