export interface RecentInvoice {
  id: string
  invoiceNo: string
  customerName: string
  total: number
  status: string
  date: string
}

export interface RecentPurchase {
  id: string
  purchaseNo: string
  supplierName: string
  total: number
  status: string
  date: string
}

export interface LowStockItem {
  id: string
  name: string
  stock: number
  minStock: number
  unit: string
}

export interface DashboardStats {
  totalInvoices: number
  paidInvoices: number
  pendingInvoices: number
  overdueInvoices: number
  totalSalesAmount: number
  totalOutstanding: number

  totalPurchases: number
  totalPurchaseAmount: number
  purchasesDue: number

  totalItems: number
  lowStockItems: number
  outOfStockItems: number
  totalStockValue: number

  totalCustomers: number
  totalSuppliers: number

  todaySales: number
  todayInvoiceCount: number
  monthSales: number
  monthInvoiceCount: number

  recentInvoices: RecentInvoice[]
  recentPurchases: RecentPurchase[]
  lowStockItemsList: LowStockItem[]
}

export const initialStats: DashboardStats = {
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
  todaySales: 0,
  todayInvoiceCount: 0,
  monthSales: 0,
  monthInvoiceCount: 0,
  recentInvoices: [],
  recentPurchases: [],
  lowStockItemsList: [],
}

export function dashboardFormatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
}

export function dashboardFormatDate(dateStr: string) {
  if (!dateStr) return "N/A"
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })
}
