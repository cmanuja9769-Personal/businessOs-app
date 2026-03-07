"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/glass-card"
import { BentoGrid, BentoTile } from "@/components/ui/bento-grid"
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
import { cn } from "@/lib/utils"

interface MiniKpiProps {
  readonly icon: React.ElementType
  readonly value: string | number
  readonly label: string
  readonly iconColor: string
  readonly iconBg: string
  readonly loading: boolean
  readonly className?: string
}

function MiniKpi({ icon: Icon, value, label, iconColor, iconBg, loading, className }: MiniKpiProps) {
  return (
    <GlassCard intensity="subtle" className={cn("p-3", className)}>
      <div className="flex items-center gap-2.5">
        <div className={cn("p-2 rounded-2xl neo-inset flex-shrink-0", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight truncate">
            {loading ? "-" : value}
          </p>
          <p className="text-[0.625rem] text-muted-foreground/70 truncate">{label}</p>
        </div>
      </div>
    </GlassCard>
  )
}

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
        <div className="w-16 h-16 rounded-3xl glass neo-shadow flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <p className="text-muted-foreground text-center text-sm">{error}</p>
        <Button onClick={handleRefresh} variant="outline" className="rounded-2xl">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-4" suppressHydrationWarning>
      <div className="animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-xs sm:text-sm text-muted-foreground/80">
          Welcome back! Here&apos;s what&apos;s happening with your business.
        </p>
      </div>

      <div className="animate-fade-in-up anim-delay-1">
        <QuickActions />
      </div>

      <BentoGrid>
        <BentoTile span="1x1" className="animate-fade-in-up anim-delay-2">
          <StatCard
            title="Today's Sales"
            icon={CalendarDays}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-500/10"
            accentColor="bg-emerald-500"
            value={formatCurrency(stats.todaySales)}
            valueColor="text-emerald-700 dark:text-emerald-400"
            subtitle={`${stats.todayInvoiceCount} invoice${stats.todayInvoiceCount !== 1 ? "s" : ""} today`}
            loading={loading}
          />
        </BentoTile>
        <BentoTile span="1x1" className="animate-fade-in-up anim-delay-3">
          <StatCard
            title="This Month"
            icon={TrendingUp}
            iconColor="text-sky-600"
            iconBg="bg-sky-500/10"
            accentColor="bg-sky-500"
            value={formatCurrency(stats.monthSales)}
            valueColor="text-sky-700 dark:text-sky-400"
            subtitle={`${stats.monthInvoiceCount} invoice${stats.monthInvoiceCount !== 1 ? "s" : ""}`}
            loading={loading}
          />
        </BentoTile>
        <BentoTile span="1x1" className="animate-fade-in-up anim-delay-4">
          <StatCard
            title="Total Sales"
            icon={IndianRupee}
            iconColor="text-green-600"
            iconBg="bg-green-500/10"
            accentColor="bg-green-500"
            value={formatCurrency(stats.totalSalesAmount)}
            valueColor="text-green-700 dark:text-green-400"
            subtitle={`${stats.totalInvoices} invoice${stats.totalInvoices !== 1 ? "s" : ""}`}
            loading={loading}
          />
        </BentoTile>
        <BentoTile span="1x1" className="animate-fade-in-up anim-delay-5">
          <StatCard
            title="Outstanding"
            icon={AlertCircle}
            iconColor="text-amber-600"
            iconBg="bg-amber-500/10"
            accentColor="bg-amber-500"
            value={formatCurrency(stats.totalOutstanding)}
            valueColor="text-amber-600 dark:text-amber-400"
            subtitle={`${stats.pendingInvoices} pending, ${stats.overdueInvoices} overdue`}
            loading={loading}
          />
        </BentoTile>

        <BentoTile span="1x1" className="animate-fade-in-up anim-delay-5">
          <StatCard
            title="Purchases"
            icon={ShoppingCart}
            iconColor="text-blue-600"
            iconBg="bg-blue-500/10"
            accentColor="bg-blue-500"
            value={formatCurrency(stats.totalPurchaseAmount)}
            valueColor="text-blue-700 dark:text-blue-400"
            subtitle={`${stats.totalPurchases} orders`}
            loading={loading}
          />
        </BentoTile>
        <BentoTile span="1x1" className="animate-fade-in-up anim-delay-6">
          <StatCard
            title="Inventory"
            icon={Package}
            iconColor="text-purple-600"
            iconBg="bg-purple-500/10"
            accentColor="bg-purple-500"
            value={`${stats.totalItems.toLocaleString()} items`}
            valueColor="text-purple-700 dark:text-purple-400"
            subtitle={`Value: ${formatCurrency(stats.totalStockValue)}`}
            loading={loading}
          />
        </BentoTile>
      </BentoGrid>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in-up anim-delay-6">
        <MiniKpi
          icon={CheckCircle2}
          value={stats.paidInvoices}
          label="Paid Invoices"
          iconColor="text-emerald-600"
          iconBg="bg-emerald-500/10"
          loading={loading}
        />
        <MiniKpi
          icon={Clock}
          value={stats.pendingInvoices}
          label="Pending"
          iconColor="text-amber-600"
          iconBg="bg-amber-500/10"
          loading={loading}
        />
        <MiniKpi
          icon={Users}
          value={stats.totalCustomers}
          label="Customers"
          iconColor="text-sky-600"
          iconBg="bg-sky-500/10"
          loading={loading}
        />
        <MiniKpi
          icon={Truck}
          value={stats.totalSuppliers}
          label="Suppliers"
          iconColor="text-violet-600"
          iconBg="bg-violet-500/10"
          loading={loading}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2 animate-fade-in-up anim-delay-7">
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

      <div className="flex justify-center animate-fade-in-up anim-delay-8">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-2xl"
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
    </div>
  )
}
