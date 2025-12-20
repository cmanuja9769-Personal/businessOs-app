import { ArrowUpRight, Users, Package, FileText, TrendingUp, AlertTriangle, Calendar } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getCustomers } from "./customers/actions"
import { getItems } from "./items/actions"
import { getInvoices } from "./invoices/actions"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"

export default async function DashboardPage() {
  const [customers, items, invoices] = await Promise.all([getCustomers(), getItems(), getInvoices()])

  // Calculate statistics
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0)
  const paidInvoices = invoices.filter((inv) => inv.status === "paid")
  const pendingInvoices = invoices.filter((inv) => inv.status === "sent" || inv.status === "draft")
  const overdueInvoices = invoices.filter((inv) => inv.status === "overdue")

  const lowStockItems = items.filter((item) => item.stock <= item.minStock)
  const outOfStockItems = items.filter((item) => item.stock === 0)

  // Recent invoices
  const recentInvoices = invoices.slice(-5).reverse()

  // Monthly revenue (last 6 months)
  const monthlyRevenue = invoices.reduce(
    (acc, inv) => {
      const month = format(new Date(inv.invoiceDate), "MMM yyyy")
      acc[month] = (acc[month] || 0) + inv.total
      return acc
    },
    {} as Record<string, number>,
  )

  const stats = [
    {
      title: "Total Customers",
      value: customers.length.toString(),
      icon: Users,
      trend: "+0%",
      href: "/customers",
      description: "Active customers",
    },
    {
      title: "Total Items",
      value: items.length.toString(),
      icon: Package,
      trend: `${lowStockItems.length} low stock`,
      href: "/items",
      description: "In inventory",
      alert: lowStockItems.length > 0,
    },
    {
      title: "Total Invoices",
      value: invoices.length.toString(),
      icon: FileText,
      trend: `${pendingInvoices.length} pending`,
      href: "/invoices",
      description: "All time",
    },
    {
      title: "Total Revenue",
      value: `₹${totalRevenue.toFixed(0)}`,
      icon: TrendingUp,
      trend: `${paidInvoices.length} paid`,
      href: "/invoices",
      description: "Lifetime earnings",
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening with your business today.</p>
        </div>
        <Link href="/invoices/new">
          <Button size="lg" className="gap-2">
            <FileText className="w-4 h-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`w-4 h-4 ${stat.alert ? "text-orange-500" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  <span className={stat.alert ? "text-orange-600 font-medium" : "text-muted-foreground"}>
                    {stat.trend}
                  </span>{" "}
                  {stat.description}
                </p>
                <Link href={stat.href}>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                    View
                    <ArrowUpRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {(lowStockItems.length > 0 || overdueInvoices.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {lowStockItems.length > 0 && (
            <Card className="border-orange-500/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="w-5 h-5" />
                  Low Stock Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lowStockItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <span className="font-medium">{item.name}</span>
                      <Badge variant="destructive" className="bg-orange-500 text-background">
                        {item.stock} {item.unit}
                      </Badge>
                    </div>
                  ))}
                  {lowStockItems.length > 3 && (
                    <Link href="/items">
                      <Button variant="link" size="sm" className="p-0 h-auto text-orange-600">
                        View all {lowStockItems.length} items
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {overdueInvoices.length > 0 && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Calendar className="w-5 h-5" />
                  Overdue Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overdueInvoices.slice(0, 3).map((invoice) => (
                    <div key={invoice.id} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="font-medium">{invoice.invoiceNo}</span>
                        <span className="text-muted-foreground ml-2">{invoice.customerName}</span>
                      </div>
                      <Badge variant="destructive">₹{invoice.total.toFixed(0)}</Badge>
                    </div>
                  ))}
                  {overdueInvoices.length > 3 && (
                    <Link href="/invoices">
                      <Button variant="link" size="sm" className="p-0 h-auto text-destructive">
                        View all {overdueInvoices.length} invoices
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Invoices */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Invoices</CardTitle>
              <Link href="/invoices">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All
                  <ArrowUpRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentInvoices.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <p className="text-sm">No invoices yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-sm">{invoice.invoiceNo}</TableCell>
                      <TableCell className="font-medium">{invoice.customerName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(invoice.invoiceDate), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="font-semibold">₹{invoice.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            invoice.status === "paid"
                              ? "bg-green-500/10 text-green-700 dark:text-green-400"
                              : invoice.status === "overdue"
                                ? "bg-red-500/10 text-red-700 dark:text-red-400"
                                : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                          }
                        >
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
            <Link href="/customers">
              <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                <Users className="w-4 h-4" />
                Add Customer
              </Button>
            </Link>
            <Link href="/items">
              <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                <Package className="w-4 h-4" />
                Add Item
              </Button>
            </Link>
            <Link href="/invoices/new">
              <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                <FileText className="w-4 h-4" />
                Create Invoice
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                <TrendingUp className="w-4 h-4" />
                View Reports
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
