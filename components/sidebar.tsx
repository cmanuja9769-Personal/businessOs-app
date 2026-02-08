"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Settings,
  Menu,
  X,
  ShoppingCart,
  Truck,
  Warehouse,
  Building2,
  BarChart3,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Receipt,
  UserCheck,
  BoxesIcon,
  FileBarChart,
  Wallet,
  Printer,
  ArrowLeftRight,
  ClipboardList,
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

// Main navigation items
const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Organizations", href: "/organizations", icon: Building2 },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Suppliers", href: "/suppliers", icon: Truck },
  { name: "Items", href: "/items", icon: Package },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "E-Way Bills", href: "/ewaybills", icon: Truck },
  { name: "Purchases", href: "/purchases", icon: ShoppingCart },
  { name: "Barcode Logs", href: "/barcode-logs", icon: Printer },
]

const inventorySubNav = [
  { name: "Dashboard", href: "/inventory", icon: TrendingUp },
  { name: "Warehouses", href: "/inventory?tab=warehouses", icon: Warehouse },
  { name: "Stock Transfers", href: "/inventory?tab=transfers", icon: ArrowLeftRight },
  { name: "Adjustments", href: "/inventory?tab=adjustments", icon: ClipboardList },
  { name: "Movements", href: "/inventory?tab=movements", icon: Activity },
]

// Reports sub-navigation
const reportsNavigation = [
  { 
    group: "Transactions", 
    icon: Receipt,
    items: [
      { name: "Sales Report", href: "/reports/sales" },
      { name: "Purchase Report", href: "/reports/purchases" },
      { name: "Returns Report", href: "/reports/returns" },
      { name: "Expense Report", href: "/reports/expenses" },
    ]
  },
  { 
    group: "Party/CRM", 
    icon: UserCheck,
    items: [
      { name: "Party Ledger", href: "/reports/party-ledger" },
      { name: "Outstanding Report", href: "/reports/outstanding" },
      { name: "Party-wise Profit", href: "/reports/party-profit" },
    ]
  },
  { 
    group: "Inventory", 
    icon: BoxesIcon,
    items: [
      { name: "Stock Summary", href: "/reports/stock-summary" },
      { name: "Stock Detail", href: "/reports/stock-detail" },
      { name: "Low Stock Alert", href: "/reports/low-stock" },
      { name: "Item-wise P&L", href: "/reports/item-profit" },
    ]
  },
  { 
    group: "GST/Statutory", 
    icon: FileBarChart,
    items: [
      { name: "GSTR-1 (Sales)", href: "/reports/gstr-1" },
      { name: "GSTR-2 (Purchase)", href: "/reports/gstr-2" },
      { name: "GSTR-3B Summary", href: "/reports/gstr-3b" },
    ]
  },
  { 
    group: "Financial", 
    icon: Wallet,
    items: [
      { name: "Day Book", href: "/reports/day-book" },
      { name: "Cash Flow", href: "/reports/cash-flow" },
      { name: "Profit & Loss", href: "/reports/profit-loss" },
    ]
  },
]

const bottomNavigation = [
  { name: "Users", href: "/users", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(pathname.startsWith("/reports"))
  const [inventoryOpen, setInventoryOpen] = useState(pathname.startsWith("/inventory"))
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    pathname.startsWith("/reports") 
      ? reportsNavigation.filter(g => g.items.some(i => pathname === i.href)).map(g => g.group)
      : []
  )

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => 
      prev.includes(group) 
        ? prev.filter(g => g !== group) 
        : [...prev, group]
    )
  }

  const isReportsActive = pathname.startsWith("/reports")
  const isInventoryActive = pathname.startsWith("/inventory")

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border px-3 py-2 flex items-center justify-between h-16 gap-2">
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="text-sidebar-foreground flex-shrink-0">
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Package className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-base text-sidebar-foreground">BusinessOS</span>
        </div>
        <div className="flex-1" />
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-transform md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "w-64",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="hidden md:flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg text-sidebar-foreground">BusinessOS</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 mt-20 md:mt-0 overflow-y-auto">
            {/* Main Navigation */}
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </Link>
              )
            })}

            {/* Inventory Section - Collapsible */}
            <Collapsible open={inventoryOpen} onOpenChange={setInventoryOpen} suppressHydrationWarning>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isInventoryActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  )}
                  suppressHydrationWarning
                >
                  <div className="flex items-center gap-3">
                    <BoxesIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">Inventory</span>
                  </div>
                  {inventoryOpen ? (
                    <ChevronDown className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 space-y-0.5 mt-1" suppressHydrationWarning>
                {inventorySubNav.map((item) => {
                  const currentSearch = searchParams.toString()
                  const fullPath = currentSearch ? `${pathname}?${currentSearch}` : pathname
                  const isActive = item.href === "/inventory"
                    ? pathname === "/inventory" && !searchParams.has("tab")
                    : fullPath === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                      )}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>

            {/* Reports Section - Collapsible */}
            <Collapsible open={reportsOpen} onOpenChange={setReportsOpen} suppressHydrationWarning>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isReportsActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  )}
                  suppressHydrationWarning
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">Reports</span>
                  </div>
                  {reportsOpen ? (
                    <ChevronDown className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 space-y-1 mt-1" suppressHydrationWarning>
                {/* All Reports Link */}
                <Link
                  href="/reports"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname === "/reports"
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                  )}
                >
                  <TrendingUp className="w-4 h-4 flex-shrink-0" />
                  <span>Dashboard</span>
                </Link>

                {/* Report Groups */}
                {reportsNavigation.map((group) => (
                  <Collapsible 
                    key={group.group} 
                    open={expandedGroups.includes(group.group)}
                    onOpenChange={() => toggleGroup(group.group)}
                    suppressHydrationWarning
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        suppressHydrationWarning
                        className={cn(
                          "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                          group.items.some(i => pathname === i.href)
                            ? "bg-primary/5 text-primary"
                            : "text-muted-foreground hover:bg-sidebar-accent/30 hover:text-sidebar-foreground",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <group.icon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{group.group}</span>
                        </div>
                        {expandedGroups.includes(group.group) ? (
                          <ChevronDown className="w-3 h-3 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-3 h-3 flex-shrink-0" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-3 space-y-0.5 mt-0.5" suppressHydrationWarning>
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors",
                            pathname === item.href
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-sidebar-accent/30 hover:text-sidebar-foreground",
                          )}
                        >
                          <span className="w-1 h-1 rounded-full bg-current opacity-50" />
                          <span>{item.name}</span>
                        </Link>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Separator */}
            <div className="my-2 border-t border-sidebar-border" />

            {/* Bottom Navigation */}
            {bottomNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-sidebar-border">
            <p className="text-xs text-muted-foreground">v1.0.0 • Professional Edition</p>
          </div>
        </div>
      </aside>
    </>
  )
}
