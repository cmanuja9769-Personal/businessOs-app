import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  BarChart3,
  Receipt,
  UserCheck,
  BoxesIcon,
  FileBarChart,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  FileText,
  ShoppingCart,
  RotateCcw,
  CreditCard,
  Users,
  AlertTriangle,
  IndianRupee,
  Package,
  ClipboardList,
  Calculator,
  BookOpen,
  PiggyBank,
  Scale,
} from "lucide-react"

// Report Groups Configuration
const reportGroups = [
  {
    id: "transactions",
    title: "Transaction Reports",
    description: "Sales, purchases, returns and expenses",
    icon: Receipt,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-500/20 hover:border-blue-500/40",
    reports: [
      {
        name: "Sales Report",
        href: "/reports/sales",
        description: "Date-wise sales with payment status filters",
        icon: TrendingUp,
        badge: "Popular",
      },
      {
        name: "Purchase Report",
        href: "/reports/purchases",
        description: "Vendor bills and purchase orders",
        icon: ShoppingCart,
      },
      {
        name: "Returns Report",
        href: "/reports/returns",
        description: "Credit notes & debit notes summary",
        icon: RotateCcw,
      },
      {
        name: "Expense Report",
        href: "/reports/expenses",
        description: "Categorized business expenses",
        icon: CreditCard,
      },
    ],
  },
  {
    id: "party",
    title: "Party/Customer Reports",
    description: "Customer & supplier relationship insights",
    icon: UserCheck,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    borderColor: "border-purple-500/20 hover:border-purple-500/40",
    reports: [
      {
        name: "Party Ledger",
        href: "/reports/party-ledger",
        description: "Detailed debit/credit history per party",
        icon: BookOpen,
        badge: "Essential",
      },
      {
        name: "Outstanding Report",
        href: "/reports/outstanding",
        description: "Receivables & payables with aging analysis",
        icon: AlertTriangle,
        badge: "Popular",
      },
      {
        name: "Party-wise Profit",
        href: "/reports/party-profit",
        description: "Profit analysis by customer/supplier",
        icon: IndianRupee,
      },
    ],
  },
  {
    id: "inventory",
    title: "Inventory/Stock Reports",
    description: "Stock levels, movement and valuation",
    icon: BoxesIcon,
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    borderColor: "border-orange-500/20 hover:border-orange-500/40",
    reports: [
      {
        name: "Stock Summary",
        href: "/reports/stock-summary",
        description: "Current stock quantity and value overview",
        icon: Package,
        badge: "Essential",
      },
      {
        name: "Stock Detail Report",
        href: "/reports/stock-detail",
        description: "Opening + Inward - Outward = Closing",
        icon: ClipboardList,
      },
      {
        name: "Low Stock Alert",
        href: "/reports/low-stock",
        description: "Items below reorder level",
        icon: TrendingDown,
        badge: "Alert",
      },
      {
        name: "Item-wise P&L",
        href: "/reports/item-profit",
        description: "Margin analysis per product",
        icon: Calculator,
      },
    ],
  },
  {
    id: "gst",
    title: "GST/Statutory Reports",
    description: "Tax compliance and filing reports",
    icon: FileBarChart,
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
    borderColor: "border-green-500/20 hover:border-green-500/40",
    reports: [
      {
        name: "GSTR-1 (Sales)",
        href: "/reports/gstr-1",
        description: "Sales register for GST filing",
        icon: FileText,
        badge: "GST",
      },
      {
        name: "GSTR-2 (Purchase)",
        href: "/reports/gstr-2",
        description: "Purchase register format",
        icon: FileText,
      },
      {
        name: "GSTR-3B Summary",
        href: "/reports/gstr-3b",
        description: "Monthly tax summary report",
        icon: FileBarChart,
        badge: "GST",
      },
    ],
  },
  {
    id: "financial",
    title: "Financial Health",
    description: "Cash flow and profitability analysis",
    icon: Wallet,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-500/20 hover:border-emerald-500/40",
    reports: [
      {
        name: "Day Book",
        href: "/reports/day-book",
        description: "Daily cash/bank movement",
        icon: BookOpen,
      },
      {
        name: "Cash Flow",
        href: "/reports/cash-flow",
        description: "Inflow vs outflow analysis",
        icon: PiggyBank,
      },
      {
        name: "Profit & Loss",
        href: "/reports/profit-loss",
        description: "Net income calculation",
        icon: Scale,
        badge: "Key",
      },
    ],
  },
]

function getBadgeVariant(badge: string): "default" | "secondary" | "destructive" | "outline" {
  switch (badge) {
    case "Popular":
      return "default"
    case "Essential":
      return "secondary"
    case "Alert":
      return "destructive"
    case "GST":
    case "Key":
      return "outline"
    default:
      return "secondary"
  }
}

export default function ReportsDashboard() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            Reports Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Access all business reports and analytics in one place
          </p>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <QuickStatCard
          title="Total Reports"
          value={reportGroups.reduce((acc, g) => acc + g.reports.length, 0).toString()}
          description="Available reports"
          icon={FileText}
        />
        <QuickStatCard
          title="Transaction"
          value={reportGroups.find(g => g.id === "transactions")?.reports.length.toString() || "0"}
          description="Sales & purchase"
          icon={Receipt}
        />
        <QuickStatCard
          title="Party/CRM"
          value={reportGroups.find(g => g.id === "party")?.reports.length.toString() || "0"}
          description="Customer insights"
          icon={Users}
        />
        <QuickStatCard
          title="Inventory"
          value={reportGroups.find(g => g.id === "inventory")?.reports.length.toString() || "0"}
          description="Stock reports"
          icon={Package}
        />
        <QuickStatCard
          title="Financial"
          value={(
            (reportGroups.find(g => g.id === "gst")?.reports.length || 0) +
            (reportGroups.find(g => g.id === "financial")?.reports.length || 0)
          ).toString()}
          description="GST & finance"
          icon={Wallet}
        />
      </div>

      {/* Report Groups */}
      <div className="space-y-6">
        {reportGroups.map((group) => (
          <Card key={group.id} className={`border-2 ${group.borderColor} transition-colors`}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${group.color}`}>
                  <group.icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{group.title}</CardTitle>
                  <CardDescription>{group.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {group.reports.map((report) => (
                  <Link
                    key={report.href}
                    href={report.href}
                    className="group flex flex-col p-4 rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className={`p-1.5 rounded-md ${group.color}`}>
                        <report.icon className="h-4 w-4" />
                      </div>
                      {report.badge && (
                        <Badge variant={getBadgeVariant(report.badge)} className="text-[0.625rem] px-1.5 py-0">
                          {report.badge}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
                      {report.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {report.description}
                    </p>
                    <div className="mt-auto pt-3 flex items-center text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>View Report</span>
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Access Footer */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">Need a custom report?</h3>
              <p className="text-sm text-muted-foreground">
                Contact support for specialized reporting requirements
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/reports/stock-summary"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Package className="h-4 w-4" />
                Stock Summary
              </Link>
              <Link
                href="/reports/outstanding"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-background text-sm font-medium hover:bg-accent transition-colors"
              >
                <AlertTriangle className="h-4 w-4" />
                Outstanding
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function QuickStatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-[0.625rem] text-muted-foreground">{description}</p>
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
