"use server"

import { authorize, orgScope } from "@/lib/authorize"
import { isDemoMode } from "@/app/demo/helpers"
import { getDemoDashboardStats } from "@/app/demo/data"

interface DashboardStats {
  readonly totalInvoices: number
  readonly paidInvoices: number
  readonly pendingInvoices: number
  readonly overdueInvoices: number
  readonly totalSalesAmount: number
  readonly totalOutstanding: number
  readonly totalPurchases: number
  readonly totalPurchaseAmount: number
  readonly purchasesDue: number
  readonly totalItems: number
  readonly lowStockItems: number
  readonly outOfStockItems: number
  readonly totalStockValue: number
  readonly totalCustomers: number
  readonly totalSuppliers: number
  readonly todaySales: number
  readonly todayInvoiceCount: number
  readonly monthSales: number
  readonly monthInvoiceCount: number
  readonly recentInvoices: RecentInvoice[]
  readonly recentPurchases: RecentPurchase[]
  readonly lowStockItemsList: LowStockItem[]
}

interface RecentInvoice {
  readonly id: string
  readonly invoiceNo: string
  readonly customerName: string
  readonly total: number
  readonly status: string
  readonly date: string
}

interface RecentPurchase {
  readonly id: string
  readonly purchaseNo: string
  readonly supplierName: string
  readonly total: number
  readonly status: string
  readonly date: string
}

interface LowStockItem {
  readonly id: string
  readonly name: string
  readonly stock: number
  readonly minStock: number
  readonly unit: string
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (await isDemoMode()) return getDemoDashboardStats()

  const { supabase, organizationId } = await authorize("invoices", "read")

  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]

  const [
    invoicesRes,
    purchasesRes,
    itemsCountRes,
    itemsLowStockRes,
    customersRes,
    suppliersRes,
    stockValueRes,
    todayInvoicesRes,
    monthInvoicesRes,
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, customer_name, total, balance, status, invoice_date, due_date")
      .or(orgScope(organizationId))
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("purchases")
      .select("id, purchase_number, supplier_name, total, balance, status, purchase_date")
      .or(orgScope(organizationId))
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .or(orgScope(organizationId))
      .is("deleted_at", null),
    supabase
      .from("items")
      .select("id, name, current_stock, min_stock, unit, sale_price, purchase_price")
      .or(orgScope(organizationId))
      .is("deleted_at", null)
      .order("current_stock", { ascending: true })
      .limit(500),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .or(orgScope(organizationId))
      .is("deleted_at", null),
    supabase
      .from("suppliers")
      .select("id", { count: "exact", head: true })
      .or(orgScope(organizationId))
      .is("deleted_at", null),
    supabase
      .from("items")
      .select("current_stock, sale_price, purchase_price")
      .or(orgScope(organizationId))
      .is("deleted_at", null)
      .gt("current_stock", 0),
    supabase
      .from("invoices")
      .select("total")
      .or(orgScope(organizationId))
      .is("deleted_at", null)
      .eq("document_type", "invoice")
      .gte("invoice_date", todayStr)
      .lte("invoice_date", todayStr),
    supabase
      .from("invoices")
      .select("total")
      .or(orgScope(organizationId))
      .is("deleted_at", null)
      .eq("document_type", "invoice")
      .gte("invoice_date", monthStart)
      .lte("invoice_date", todayStr),
  ])

  const invoices = invoicesRes.data || []
  const purchases = purchasesRes.data || []
  const itemsData = itemsLowStockRes.data || []

  const todayData = todayInvoicesRes.data || []
  const todaySales = todayData.reduce((sum, inv) => sum + Number(inv.total || 0), 0)

  const monthData = monthInvoicesRes.data || []
  const monthSales = monthData.reduce((sum, inv) => sum + Number(inv.total || 0), 0)

  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)

  const paidInvoices = invoices.filter(inv => inv.status === "paid")
  const pendingInvoices = invoices.filter(inv => inv.status === "pending" || inv.status === "draft")
  const overdueInvoices = invoices.filter(inv => {
    if (inv.status === "paid") return false
    if (!inv.due_date) return false
    return new Date(inv.due_date) < todayDate
  })

  const totalSalesAmount = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0)
  const totalOutstanding = invoices.reduce((sum, inv) => sum + Number(inv.balance || 0), 0)

  const totalPurchaseAmount = purchases.reduce((sum, p) => sum + Number(p.total || 0), 0)
  const purchasesDue = purchases.reduce((sum, p) => sum + Number(p.balance || 0), 0)

  const outOfStockItemsData = itemsData.filter(item => Number(item.current_stock || 0) <= 0)
  const lowStockOnlyItems = itemsData.filter(item => {
    const stock = Number(item.current_stock || 0)
    const minStock = Number(item.min_stock || 0)
    if (stock <= 0) return false
    if (minStock > 0) return stock <= minStock
    return stock < 5
  })

  const allAlertItems = [...outOfStockItemsData, ...lowStockOnlyItems]

  const lowStockItemsList = allAlertItems.slice(0, 5).map(item => ({
    id: item.id,
    name: item.name,
    stock: Number(item.current_stock || 0),
    minStock: Number(item.min_stock || 0),
    unit: item.unit || "PCS",
  }))

  const stockValueItems = stockValueRes.data || []
  const totalStockValue = stockValueItems.reduce((sum, item) => {
    const stock = Number(item.current_stock || 0)
    const price = Number(item.purchase_price || item.sale_price || 0)
    return sum + stock * price
  }, 0)

  const recentInvoices = invoices.slice(0, 5).map(inv => ({
    id: inv.id,
    invoiceNo: inv.invoice_number || "N/A",
    customerName: inv.customer_name || "Walk-in Customer",
    total: Number(inv.total || 0),
    status: inv.status || "draft",
    date: inv.invoice_date || "",
  }))

  const recentPurchases = purchases.slice(0, 5).map(p => ({
    id: p.id,
    purchaseNo: p.purchase_number || "N/A",
    supplierName: p.supplier_name || "Unknown Supplier",
    total: Number(p.total || 0),
    status: p.status || "draft",
    date: p.purchase_date || "",
  }))

  return {
    totalInvoices: invoices.length,
    paidInvoices: paidInvoices.length,
    pendingInvoices: pendingInvoices.length,
    overdueInvoices: overdueInvoices.length,
    totalSalesAmount,
    totalOutstanding,
    totalPurchases: purchases.length,
    totalPurchaseAmount,
    purchasesDue,
    totalItems: itemsCountRes.count || 0,
    lowStockItems: allAlertItems.length,
    outOfStockItems: outOfStockItemsData.length,
    totalStockValue,
    totalCustomers: customersRes.count || 0,
    totalSuppliers: suppliersRes.count || 0,
    todaySales,
    todayInvoiceCount: todayData.length,
    monthSales,
    monthInvoiceCount: monthData.length,
    recentInvoices,
    recentPurchases,
    lowStockItemsList,
  }
}
