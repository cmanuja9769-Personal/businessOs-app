"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertCircle,
  Users,
  ShoppingCart,
  Package,
  Clock,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Truck,
  IndianRupee,
  CalendarDays,
  TrendingUp,
} from "lucide-react"
import { getDashboardStats } from "./actions"
import type { DashboardStats } from "./_components/dashboard-types"
import { initialStats } from "./_components/dashboard-types"
import { formatCurrency } from "@/lib/format-utils"
import { QuickActions } from "./_components/quick-actions"
import { StatCard } from "./_components/stat-card"
import { RecentInvoices } from "./_components/recent-invoices"
import { RecentPurchases } from "./_components/recent-purchases"
import { LowStockAlert } from "./_components/low-stock-alert"
import { BusinessSummary } from "./_components/business-summary"

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(initialStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null)
      const data = await getDashboardStats()
      setStats(data)
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

      <QuickActions />

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="Today's Sales"
          icon={CalendarDays}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-500/10"
          gradientFrom="from-emerald-500/5"
          value={formatCurrency(stats.todaySales)}
          valueColor="text-emerald-700 dark:text-emerald-400"
          subtitle={`${stats.todayInvoiceCount} invoice${stats.todayInvoiceCount !== 1 ? "s" : ""} today`}
          loading={loading}
        />
        <StatCard
          title="This Month"
          icon={TrendingUp}
          iconColor="text-sky-600"
          iconBg="bg-sky-500/10"
          gradientFrom="from-sky-500/5"
          value={formatCurrency(stats.monthSales)}
          valueColor="text-sky-700 dark:text-sky-400"
          subtitle={`${stats.monthInvoiceCount} invoice${stats.monthInvoiceCount !== 1 ? "s" : ""}`}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Sales"
          icon={IndianRupee}
          iconColor="text-green-600"
          iconBg="bg-green-500/10"
          gradientFrom="from-green-500/5"
          value={formatCurrency(stats.totalSalesAmount)}
          valueColor="text-green-700 dark:text-green-400"
          subtitle={`${stats.totalInvoices} invoice${stats.totalInvoices !== 1 ? "s" : ""}`}
          loading={loading}
        />
        <StatCard
          title="Outstanding"
          icon={AlertCircle}
          iconColor="text-orange-600"
          iconBg="bg-orange-500/10"
          gradientFrom="from-orange-500/5"
          value={formatCurrency(stats.totalOutstanding)}
          valueColor="text-orange-600"
          subtitle={`${stats.pendingInvoices} pending, ${stats.overdueInvoices} overdue`}
          loading={loading}
        />
        <StatCard
          title="Purchases"
          icon={ShoppingCart}
          iconColor="text-blue-600"
          iconBg="bg-blue-500/10"
          gradientFrom="from-blue-500/5"
          value={formatCurrency(stats.totalPurchaseAmount)}
          valueColor="text-blue-700 dark:text-blue-400"
          subtitle={`${stats.totalPurchases} orders • Due: ${formatCurrency(stats.purchasesDue)}`}
          loading={loading}
        />
        <StatCard
          title="Inventory"
          icon={Package}
          iconColor="text-purple-600"
          iconBg="bg-purple-500/10"
          gradientFrom="from-purple-500/5"
          value={`${stats.totalItems.toLocaleString()} items`}
          valueColor="text-purple-700 dark:text-purple-400"
          subtitle={`Value: ${formatCurrency(stats.totalStockValue)}`}
          loading={loading}
        />
      </div>

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

      <div className="grid gap-3 lg:grid-cols-2">
        <RecentInvoices invoices={stats.recentInvoices} loading={loading} />
        <RecentPurchases purchases={stats.recentPurchases} loading={loading} />
        <LowStockAlert
          items={stats.lowStockItemsList}
          lowStockCount={stats.lowStockItems}
          outOfStockCount={stats.outOfStockItems}
          loading={loading}
        />
        <BusinessSummary
          totalSalesAmount={stats.totalSalesAmount}
          totalPurchaseAmount={stats.totalPurchaseAmount}
          totalOutstanding={stats.totalOutstanding}
          purchasesDue={stats.purchasesDue}
          loading={loading}
        />
      </div>
    </div>
  )
}
