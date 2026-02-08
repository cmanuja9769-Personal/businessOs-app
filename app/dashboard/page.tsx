"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { 
  TrendingUp, 
  TrendingDown,
  Package, 
  AlertCircle, 
  Users, 
  FileText, 
  ShoppingCart,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Truck,
  IndianRupee,
  BarChart3,
  AlertTriangle
} from "lucide-react"

interface DashboardStats {
  // Invoices
  totalInvoices: number
  paidInvoices: number
  pendingInvoices: number
  overdueInvoices: number
  totalSalesAmount: number
  totalOutstanding: number
  
  // Purchases
  totalPurchases: number
  totalPurchaseAmount: number
  purchasesDue: number
  
  // Inventory
  totalItems: number
  lowStockItems: number
  outOfStockItems: number
  totalStockValue: number
  
  // Contacts
  totalCustomers: number
  totalSuppliers: number
  
  // Recent Activity
  recentInvoices: Array<{
    id: string
    invoiceNo: string
    customerName: string
    total: number
    status: string
    date: string
  }>
  recentPurchases: Array<{
    id: string
    purchaseNo: string
    supplierName: string
    total: number
    status: string
    date: string
  }>
  lowStockItemsList: Array<{
    id: string
    name: string
    stock: number
    minStock: number
    unit: string
  }>
}

const initialStats: DashboardStats = {
  totalInvoices: 0,
  paidInvoices: 0,
  pendingInvoices: 0,
  overdueInvoices: 0,
  totalSalesAmount: 0,
  totalOutstanding: 0,
  totalPurchases: 0,
  totalPurchaseAmount: 0,
  purchasesDue: 0,
  totalItems: 0,
  lowStockItems: 0,
  outOfStockItems: 0,
  totalStockValue: 0,
  totalCustomers: 0,
  totalSuppliers: 0,
  recentInvoices: [],
  recentPurchases: [],
  lowStockItemsList: [],
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(initialStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null)
      const supabase = createClient()

      // Fetch all data in parallel for efficiency
      const [
        invoicesRes,
        purchasesRes,
        itemsCountRes,
        itemsLowStockRes,
        customersRes,
        suppliersRes,
        stockValueRes,
      ] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, invoice_number, customer_name, total, balance, status, invoice_date, due_date")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("purchases")
          .select("id, purchase_number, supplier_name, total, balance, status, purchase_date")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("items")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("items")
          .select("id, name, current_stock, min_stock, unit, sale_price, purchase_price")
          .order("current_stock", { ascending: true })
          .limit(500),
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("suppliers")
          .select("id", { count: "exact", head: true }),
        // Fetch items with stock > 0 for stock value calculation
        supabase
          .from("items")
          .select("current_stock, sale_price, purchase_price")
          .gt("current_stock", 0),
      ])

      const invoices = invoicesRes.data || []
      const purchases = purchasesRes.data || []
      const totalItemsCount = itemsCountRes.count || 0
      const itemsData = itemsLowStockRes.data || []

      // Calculate invoice stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const paidInvoices = invoices.filter(inv => inv.status === "paid")
      const pendingInvoices = invoices.filter(inv => inv.status === "pending" || inv.status === "draft")
      const overdueInvoices = invoices.filter(inv => {
        if (inv.status === "paid") return false
        const dueDate = new Date(inv.due_date)
        return dueDate < today
      })
      
      const totalSalesAmount = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0)
      const totalOutstanding = invoices.reduce((sum, inv) => sum + Number(inv.balance || 0), 0)

      // Calculate purchase stats
      const totalPurchaseAmount = purchases.reduce((sum, p) => sum + Number(p.total || 0), 0)
      const purchasesDue = purchases.reduce((sum, p) => sum + Number(p.balance || 0), 0)

      // Calculate inventory stats from items data (for stock value and low stock)
      // Get out of stock items first (stock = 0)
      const outOfStockItemsData = itemsData.filter(item => Number(item.current_stock || 0) <= 0)
      
      // Low stock: items where stock > 0 AND (stock <= min_stock OR stock < 5)
      const lowStockOnlyItems = itemsData.filter(item => {
        const stock = Number(item.current_stock || 0)
        const minStock = Number(item.min_stock || 0)
        if (stock <= 0) return false // Out of stock handled separately
        if (minStock > 0) return stock <= minStock
        return stock < 5
      })
      
      // Combine: out of stock items first, then low stock items
      const allAlertItems = [...outOfStockItemsData, ...lowStockOnlyItems]
      
      const lowStockItemsList = allAlertItems.slice(0, 5).map(item => ({
        id: item.id,
        name: item.name,
        stock: Number(item.current_stock || 0),
        minStock: Number(item.min_stock || 0),
        unit: item.unit || "PCS"
      }))

      // Calculate total stock value from items with stock > 0
      const stockValueItems = stockValueRes.data || []
      const totalStockValue = stockValueItems.reduce((sum, item) => {
        const stock = Number(item.current_stock || 0)
        const price = Number(item.purchase_price || item.sale_price || 0)
        return sum + (stock * price)
      }, 0)

      // Format recent invoices
      const recentInvoices = invoices.slice(0, 5).map(inv => ({
        id: inv.id,
        invoiceNo: inv.invoice_number || "N/A",
        customerName: inv.customer_name || "Walk-in Customer",
        total: Number(inv.total || 0),
        status: inv.status || "draft",
        date: inv.invoice_date || ""
      }))

      // Format recent purchases
      const recentPurchases = purchases.slice(0, 5).map(p => ({
        id: p.id,
        purchaseNo: p.purchase_number || "N/A",
        supplierName: p.supplier_name || "Unknown Supplier",
        total: Number(p.total || 0),
        status: p.status || "draft",
        date: p.purchase_date || ""
      }))

      setStats({
        totalInvoices: invoices.length,
        paidInvoices: paidInvoices.length,
        pendingInvoices: pendingInvoices.length,
        overdueInvoices: overdueInvoices.length,
        totalSalesAmount,
        totalOutstanding,
        totalPurchases: purchases.length,
        totalPurchaseAmount,
        purchasesDue,
        totalItems: totalItemsCount,
        lowStockItems: allAlertItems.length,
        outOfStockItems: outOfStockItemsData.length,
        totalStockValue,
        totalCustomers: customersRes.count || 0,
        totalSuppliers: suppliersRes.count || 0,
        recentInvoices,
        recentPurchases,
        lowStockItemsList,
      })
    } catch (err) {
      console.error("[Dashboard] Error fetching data:", err)
      setError("Failed to load dashboard data. Please refresh the page.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchDashboardData()
  }

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A"
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short"
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      paid: { variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
      pending: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
      draft: { variant: "outline", icon: <FileText className="h-3 w-3" /> },
      cancelled: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
      overdue: { variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
    }
    const config = statusConfig[status] || statusConfig.draft
    return (
      <Badge variant={config.variant} className="text-xs gap-1">
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 py-3 flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground text-center">{error}</p>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-4" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Welcome back! Here&apos;s what&apos;s happening with your business.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
          suppressHydrationWarning
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-primary/5 via-background to-primary/5 border-primary/20">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/invoices/new">
              <Button size="sm" className="gap-1.5 text-xs h-8">
                <Plus className="h-3.5 w-3.5" />
                New Invoice
              </Button>
            </Link>
            <Link href="/purchases/new">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                <ShoppingCart className="h-3.5 w-3.5" />
                Purchase
              </Button>
            </Link>
            <Link href="/customers/new">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                <Users className="h-3.5 w-3.5" />
                Customer
              </Button>
            </Link>
            <Link href="/items/new">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                <Package className="h-3.5 w-3.5" />
                Item
              </Button>
            </Link>
            <Link href="/reports">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                <BarChart3 className="h-3.5 w-3.5" />
                Reports
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Sales */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 relative">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Sales</CardTitle>
            <div className="p-1.5 rounded-full bg-green-500/10">
              <IndianRupee className="h-3.5 w-3.5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 relative">
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <div className="text-xl sm:text-2xl font-bold truncate text-green-700 dark:text-green-400">{formatCurrency(stats.totalSalesAmount)}</div>
                <p className="text-[0.625rem] text-muted-foreground truncate">
                  {stats.totalInvoices} invoice{stats.totalInvoices !== 1 ? "s" : ""}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Outstanding */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 relative">
            <CardTitle className="text-xs font-medium text-muted-foreground">Outstanding</CardTitle>
            <div className="p-1.5 rounded-full bg-orange-500/10">
              <AlertCircle className="h-3.5 w-3.5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 relative">
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <div className="text-xl sm:text-2xl font-bold text-orange-600 truncate">{formatCurrency(stats.totalOutstanding)}</div>
                <p className="text-[0.625rem] text-muted-foreground truncate">
                  {stats.pendingInvoices} pending, {stats.overdueInvoices} overdue
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Purchases */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 relative">
            <CardTitle className="text-xs font-medium text-muted-foreground">Purchases</CardTitle>
            <div className="p-1.5 rounded-full bg-blue-500/10">
              <ShoppingCart className="h-3.5 w-3.5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 relative">
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <div className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400 truncate">{formatCurrency(stats.totalPurchaseAmount)}</div>
                <p className="text-[0.625rem] text-muted-foreground truncate">
                  {stats.totalPurchases} orders • Due: {formatCurrency(stats.purchasesDue)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Inventory */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 relative">
            <CardTitle className="text-xs font-medium text-muted-foreground">Inventory</CardTitle>
            <div className="p-1.5 rounded-full bg-purple-500/10">
              <Package className="h-3.5 w-3.5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 relative">
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <div className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-400 truncate">{stats.totalItems.toLocaleString()} items</div>
                <p className="text-[0.625rem] text-muted-foreground truncate">
                  Value: {formatCurrency(stats.totalStockValue)}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200/50 dark:border-green-800/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-green-500/20">
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-green-700 dark:text-green-400">{loading ? "-" : stats.paidInvoices}</p>
                <p className="text-[0.625rem] text-green-600/80 dark:text-green-500 truncate">Paid Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/30 dark:to-yellow-900/20 border-yellow-200/50 dark:border-yellow-800/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-yellow-500/20">
                <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{loading ? "-" : stats.pendingInvoices}</p>
                <p className="text-[0.625rem] text-yellow-600/80 dark:text-yellow-500 truncate">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-800/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-blue-500/20">
                <Users className="h-4 w-4 text-blue-600 flex-shrink-0" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{loading ? "-" : stats.totalCustomers}</p>
                <p className="text-[0.625rem] text-blue-600/80 dark:text-blue-500 truncate">Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200/50 dark:border-purple-800/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-purple-500/20">
                <Truck className="h-4 w-4 text-purple-600 flex-shrink-0" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-purple-700 dark:text-purple-400">{loading ? "-" : stats.totalSuppliers}</p>
                <p className="text-[0.625rem] text-purple-600/80 dark:text-purple-500 truncate">Suppliers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold">Recent Invoices</CardTitle>
            </div>
            <Link href="/invoices">
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2">
                View all
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {loading && (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            )}
            {!loading && stats.recentInvoices.length === 0 && (
              <div className="text-center py-6">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">No invoices yet</p>
                <Link href="/invoices/new">
                  <Button size="sm" className="mt-2 text-xs h-7">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Create Invoice
                  </Button>
                </Link>
              </div>
            )}
            {!loading && stats.recentInvoices.length > 0 && (
              <div className="space-y-2">
                {stats.recentInvoices.map((invoice) => (
                  <Link 
                    key={invoice.id} 
                    href={`/invoices/${invoice.id}`}
                    className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-xs truncate max-w-[7.5rem]">{invoice.invoiceNo}</span>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <p className="text-[0.625rem] text-muted-foreground truncate">{invoice.customerName}</p>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="font-semibold text-xs">{formatCurrency(invoice.total)}</p>
                      <p className="text-[0.625rem] text-muted-foreground">{formatDate(invoice.date)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Purchases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold">Recent Purchases</CardTitle>
            </div>
            <Link href="/purchases">
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2">
                View all
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {loading && (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            )}
            {!loading && stats.recentPurchases.length === 0 && (
              <div className="text-center py-6">
                <ShoppingCart className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">No purchases yet</p>
                <Link href="/purchases/new">
                  <Button size="sm" className="mt-2 text-xs h-7">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Purchase
                  </Button>
                </Link>
              </div>
            )}
            {!loading && stats.recentPurchases.length > 0 && (
              <div className="space-y-2">
                {stats.recentPurchases.map((purchase) => (
                  <Link 
                    key={purchase.id} 
                    href={`/purchases/${purchase.id}`}
                    className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-xs truncate max-w-[7.5rem]">{purchase.purchaseNo}</span>
                        {getStatusBadge(purchase.status)}
                      </div>
                      <p className="text-[0.625rem] text-muted-foreground truncate">{purchase.supplierName}</p>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="font-semibold text-xs">{formatCurrency(purchase.total)}</p>
                      <p className="text-[0.625rem] text-muted-foreground">{formatDate(purchase.date)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className={stats.lowStockItems > 0 ? "border-orange-200/50 dark:border-orange-900/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
            <div className="flex items-center gap-1.5 min-w-0">
              <CardTitle className="text-sm font-semibold">Low Stock</CardTitle>
              {!loading && stats.lowStockItems > 0 && (
                <Badge variant="destructive" className="text-[0.625rem] h-5">
                  {stats.lowStockItems}
                </Badge>
              )}
            </div>
            <Link href="/items">
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2">
                View all
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {loading && (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            )}
            {!loading && stats.lowStockItemsList.length === 0 && (
              <div className="text-center py-6">
                <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-xs text-muted-foreground">All items well-stocked!</p>
              </div>
            )}
            {!loading && stats.lowStockItemsList.length > 0 && (
              <div className="space-y-2">
                {stats.lowStockItemsList.map((item) => (
                  <Link 
                    key={item.id} 
                    href={`/items/${item.id}`}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                      item.stock === 0 
                        ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40"
                        : "border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/40"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs truncate">{item.name}</p>
                      <p className={`text-[0.625rem] ${item.stock === 0 ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400"}`}>
                        {item.stock === 0 ? "Out of stock" : `Min: ${item.minStock} ${item.unit}`}
                      </p>
                    </div>
                    <div className="text-right ml-2 flex items-center gap-1.5 flex-shrink-0">
                      {item.stock === 0 ? (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                      )}
                      <div>
                        <p className={`font-semibold text-xs ${item.stock === 0 ? "text-red-700 dark:text-red-300" : "text-orange-700 dark:text-orange-300"}`}>
                          {item.stock} {item.unit}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
                {stats.outOfStockItems > 0 && stats.lowStockItemsList.length < stats.lowStockItems && (
                  <p className="text-[0.625rem] text-center text-muted-foreground">
                    +{stats.lowStockItems - stats.lowStockItemsList.length} more items need attention
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Summary */}
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900/30 dark:to-slate-800/20">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold">Business Summary</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">Net Revenue</span>
                  <span className="font-semibold text-xs text-green-600">{formatCurrency(stats.totalSalesAmount)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">Total Expenses</span>
                  <span className="font-semibold text-xs text-red-600">{formatCurrency(stats.totalPurchaseAmount)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">Receivable</span>
                  <span className="font-semibold text-xs text-orange-600">{formatCurrency(stats.totalOutstanding)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-xs text-muted-foreground">Payable</span>
                  <span className="font-semibold text-xs text-blue-600">{formatCurrency(stats.purchasesDue)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs font-medium">Gross Margin</span>
                  <span className={`font-bold text-sm ${stats.totalSalesAmount - stats.totalPurchaseAmount >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {stats.totalSalesAmount - stats.totalPurchaseAmount >= 0 ? (
                      <TrendingUp className="inline h-3.5 w-3.5 mr-0.5" />
                    ) : (
                      <TrendingDown className="inline h-3.5 w-3.5 mr-0.5" />
                    )}
                    {formatCurrency(Math.abs(stats.totalSalesAmount - stats.totalPurchaseAmount))}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
