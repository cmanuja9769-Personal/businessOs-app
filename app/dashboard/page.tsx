"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Building2,
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
        itemsRes,
        customersRes,
        suppliersRes,
      ] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, invoice_number, customer_name, total, balance, status, invoice_date, due_date")
          .order("created_at", { ascending: false }),
        supabase
          .from("purchases")
          .select("id, purchase_number, supplier_name, total, balance, status, purchase_date")
          .order("created_at", { ascending: false }),
        supabase
          .from("items")
          .select("id, name, stock, min_stock, unit, sale_price, purchase_price")
          .order("created_at", { ascending: false }),
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("suppliers")
          .select("id", { count: "exact", head: true }),
      ])

      const invoices = invoicesRes.data || []
      const purchases = purchasesRes.data || []
      const items = itemsRes.data || []

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

      // Calculate inventory stats
      const lowStockItemsList = items.filter(item => {
        const stock = Number(item.stock || 0)
        const minStock = Number(item.min_stock || 0)
        return stock > 0 && stock <= minStock
      }).map(item => ({
        id: item.id,
        name: item.name,
        stock: Number(item.stock || 0),
        minStock: Number(item.min_stock || 0),
        unit: item.unit || "PCS"
      })).slice(0, 5)

      const outOfStockItems = items.filter(item => Number(item.stock || 0) <= 0)
      const totalStockValue = items.reduce((sum, item) => {
        const stock = Number(item.stock || 0)
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
        totalItems: items.length,
        lowStockItems: lowStockItemsList.length + outOfStockItems.length,
        outOfStockItems: outOfStockItems.length,
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
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
    return `₹${amount.toFixed(0)}`
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
      <div className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[50vh] gap-4">
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
    <div className="p-4 sm:p-6 space-y-6" suppressHydrationWarning>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/invoices/new">
              <Button size="sm" className="gap-2 text-xs sm:text-sm">
                <Plus className="h-4 w-4" />
                Invoice
              </Button>
            </Link>
            <Link href="/purchases/new">
              <Button size="sm" variant="outline" className="gap-2 text-xs sm:text-sm">
                <Plus className="h-4 w-4" />
                Purchase
              </Button>
            </Link>
            <Link href="/customers/new">
              <Button size="sm" variant="outline" className="gap-2 text-xs sm:text-sm">
                <Users className="h-4 w-4" />
                Add Customer
              </Button>
            </Link>
            <Link href="/items/new">
              <Button size="sm" variant="outline" className="gap-2 text-xs sm:text-sm">
                <Package className="h-4 w-4" />
                Add Item
              </Button>
            </Link>
            <Link href="/reports">
              <Button size="sm" variant="outline" className="gap-2 text-xs sm:text-sm">
                <BarChart3 className="h-4 w-4" />
                Reports
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Total Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Sales</CardTitle>
            <IndianRupee className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            {loading ? (
              <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" />
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-bold truncate">{formatCurrency(stats.totalSalesAmount)}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  From {stats.totalInvoices} invoice{stats.totalInvoices !== 1 ? "s" : ""}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Outstanding */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            {loading ? (
              <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" />
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-bold text-orange-600 truncate">{formatCurrency(stats.totalOutstanding)}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {stats.pendingInvoices} pending, {stats.overdueInvoices} overdue
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Purchases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Purchases</CardTitle>
            <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            {loading ? (
              <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" />
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-bold truncate">{formatCurrency(stats.totalPurchaseAmount)}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  <span className="hidden sm:inline">{stats.totalPurchases} purchase{stats.totalPurchases !== 1 ? "s" : ""} • </span>Due: {formatCurrency(stats.purchasesDue)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Inventory */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Inventory</CardTitle>
            <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            {loading ? (
              <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" />
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-bold truncate">{stats.totalItems} items</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  <span className="hidden sm:inline">Stock value: </span>{formatCurrency(stats.totalStockValue)}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
          <CardContent className="p-3 sm:pt-4 sm:p-6">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-green-700 dark:text-green-400">{loading ? "-" : stats.paidInvoices}</p>
                <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-500 truncate">Paid Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
          <CardContent className="p-3 sm:pt-4 sm:p-6">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-yellow-700 dark:text-yellow-400">{loading ? "-" : stats.pendingInvoices}</p>
                <p className="text-[10px] sm:text-xs text-yellow-600 dark:text-yellow-500 truncate">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <CardContent className="p-3 sm:pt-4 sm:p-6">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-blue-700 dark:text-blue-400">{loading ? "-" : stats.totalCustomers}</p>
                <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-500 truncate">Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900">
          <CardContent className="p-3 sm:pt-4 sm:p-6">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-purple-700 dark:text-purple-400">{loading ? "-" : stats.totalSuppliers}</p>
                <p className="text-[10px] sm:text-xs text-purple-600 dark:text-purple-500 truncate">Suppliers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6">
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base">Recent Invoices</CardTitle>
              <CardDescription className="text-xs sm:text-sm hidden sm:block">Latest sales transactions</CardDescription>
            </div>
            <Link href="/invoices">
              <Button variant="ghost" size="sm" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                <span className="hidden sm:inline">View all</span>
                <span className="sm:hidden">All</span>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            {loading ? (
              <div className="space-y-2 sm:space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-14 sm:h-12 w-full" />
                ))}
              </div>
            ) : stats.recentInvoices.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <FileText className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs sm:text-sm text-muted-foreground">No invoices yet</p>
                <Link href="/invoices/new">
                  <Button size="sm" className="mt-2 text-xs sm:text-sm">
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> Create Invoice
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {stats.recentInvoices.map((invoice) => (
                  <Link 
                    key={invoice.id} 
                    href={`/invoices/${invoice.id}`}
                    className="flex items-center justify-between p-2 sm:p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="font-medium text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">{invoice.invoiceNo}</span>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{invoice.customerName}</p>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="font-semibold text-xs sm:text-sm">{formatCurrency(invoice.total)}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{formatDate(invoice.date)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Purchases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6">
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base">Recent Purchases</CardTitle>
              <CardDescription className="text-xs sm:text-sm hidden sm:block">Latest purchase orders</CardDescription>
            </div>
            <Link href="/purchases">
              <Button variant="ghost" size="sm" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                <span className="hidden sm:inline">View all</span>
                <span className="sm:hidden">All</span>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            {loading ? (
              <div className="space-y-2 sm:space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-14 sm:h-12 w-full" />
                ))}
              </div>
            ) : stats.recentPurchases.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs sm:text-sm text-muted-foreground">No purchases yet</p>
                <Link href="/purchases/new">
                  <Button size="sm" className="mt-2 text-xs sm:text-sm">
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> Add Purchase
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {stats.recentPurchases.map((purchase) => (
                  <Link 
                    key={purchase.id} 
                    href={`/purchases/${purchase.id}`}
                    className="flex items-center justify-between p-2 sm:p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="font-medium text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">{purchase.purchaseNo}</span>
                        {getStatusBadge(purchase.status)}
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{purchase.supplierName}</p>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="font-semibold text-xs sm:text-sm">{formatCurrency(purchase.total)}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{formatDate(purchase.date)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className={stats.lowStockItems > 0 ? "border-orange-200 dark:border-orange-900" : ""}>
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <CardTitle className="text-sm sm:text-base">Low Stock</CardTitle>
              {!loading && stats.lowStockItems > 0 && (
                <Badge variant="destructive" className="text-[10px] sm:text-xs">
                  {stats.lowStockItems}
                </Badge>
              )}
            </div>
            <Link href="/items">
              <Button variant="ghost" size="sm" className="gap-1 text-xs sm:text-sm px-2 sm:px-3">
                <span className="hidden sm:inline">View all</span>
                <span className="sm:hidden">All</span>
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            {loading ? (
              <div className="space-y-2 sm:space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-14 sm:h-12 w-full" />
                ))}
              </div>
            ) : stats.lowStockItemsList.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-green-500 mb-2" />
                <p className="text-xs sm:text-sm text-muted-foreground">All items well-stocked!</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {stats.lowStockItemsList.map((item) => (
                  <Link 
                    key={item.id} 
                    href={`/items/${item.id}`}
                    className="flex items-center justify-between p-2 sm:p-3 rounded-lg border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs sm:text-sm truncate">{item.name}</p>
                      <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400">
                        Min: {item.minStock} {item.unit}
                      </p>
                    </div>
                    <div className="text-right ml-2 flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                      <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
                      <div>
                        <p className="font-semibold text-xs sm:text-sm text-orange-700 dark:text-orange-300">
                          {item.stock} {item.unit}
                        </p>
                        <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400">Now</p>
                      </div>
                    </div>
                  </Link>
                ))}
                {stats.outOfStockItems > 0 && (
                  <p className="text-[10px] sm:text-xs text-center text-destructive">
                    +{stats.outOfStockItems} out of stock
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Summary */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-base">Business Summary</CardTitle>
            <CardDescription className="text-xs sm:text-sm hidden sm:block">Key metrics at a glance</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            {loading ? (
              <div className="space-y-3 sm:space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-5 sm:h-6 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-4">
                <div className="flex justify-between items-center py-1.5 sm:py-2 border-b">
                  <span className="text-xs sm:text-sm text-muted-foreground">Net Revenue</span>
                  <span className="font-semibold text-xs sm:text-sm text-green-600">{formatCurrency(stats.totalSalesAmount)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 sm:py-2 border-b">
                  <span className="text-xs sm:text-sm text-muted-foreground">Total Expenses</span>
                  <span className="font-semibold text-xs sm:text-sm text-red-600">{formatCurrency(stats.totalPurchaseAmount)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 sm:py-2 border-b">
                  <span className="text-xs sm:text-sm text-muted-foreground">Receivable</span>
                  <span className="font-semibold text-xs sm:text-sm text-orange-600">{formatCurrency(stats.totalOutstanding)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 sm:py-2 border-b">
                  <span className="text-xs sm:text-sm text-muted-foreground">Payable</span>
                  <span className="font-semibold text-xs sm:text-sm text-blue-600">{formatCurrency(stats.purchasesDue)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 sm:py-2">
                  <span className="text-xs sm:text-sm font-medium">Gross Margin</span>
                  <span className={`font-bold text-sm sm:text-lg ${stats.totalSalesAmount - stats.totalPurchaseAmount >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {stats.totalSalesAmount - stats.totalPurchaseAmount >= 0 ? (
                      <TrendingUp className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                    ) : (
                      <TrendingDown className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
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
