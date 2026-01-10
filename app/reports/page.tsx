import { getInvoices } from "@/app/invoices/actions"
import { getPurchases } from "@/app/purchases/actions"
import { getItems } from "@/app/items/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, DollarSign, ShoppingCart, Package, FileText, AlertTriangle } from "lucide-react"
import { format, startOfMonth, endOfMonth, startOfYear } from "date-fns"

export default async function ReportsPage() {
  const invoices = await getInvoices()
  const purchases = await getPurchases()
  const items = await getItems()

  // Date filters
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const yearStart = startOfYear(now)

  // Sales Analytics
  const thisMonthInvoices = invoices.filter((inv) => {
    const invDate = new Date(inv.invoiceDate)
    return invDate >= monthStart && invDate <= monthEnd
  })

  const thisYearInvoices = invoices.filter((inv) => {
    const invDate = new Date(inv.invoiceDate)
    return invDate >= yearStart
  })

  const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0)
  const monthSales = thisMonthInvoices.reduce((sum, inv) => sum + inv.total, 0)
  const yearSales = thisYearInvoices.reduce((sum, inv) => sum + inv.total, 0)

  const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0)
  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balance, 0)

  // Purchase Analytics
  const totalPurchases = purchases.reduce((sum, pur) => sum + pur.total, 0)
  const totalPurchasePaid = purchases.reduce((sum, pur) => sum + pur.paidAmount, 0)
  const totalPurchaseOutstanding = purchases.reduce((sum, pur) => sum + pur.balance, 0)

  // GST Analytics
  const totalCGST = invoices.reduce((sum, inv) => sum + inv.cgst, 0)
  const totalSGST = invoices.reduce((sum, inv) => sum + inv.sgst, 0)
  const totalIGST = invoices.reduce((sum, inv) => sum + inv.igst, 0)
  const totalGST = totalCGST + totalSGST + totalIGST

  // Stock Analytics
  const lowStockItems = items.filter((item) => item.stock <= item.minStock)
  const outOfStockItems = items.filter((item) => item.stock === 0)
  const totalStockValue = items.reduce((sum, item) => sum + item.stock * item.purchasePrice, 0)

  // Top performing items by sales quantity
  const itemSalesMap = new Map<string, { item: any; quantity: number; revenue: number }>()

  invoices.forEach((invoice) => {
    invoice.items.forEach((invItem) => {
      const existing = itemSalesMap.get(invItem.itemId) || {
        item: items.find((i) => i.id === invItem.itemId),
        quantity: 0,
        revenue: 0,
      }
      existing.quantity += invItem.quantity
      existing.revenue += invItem.amount
      itemSalesMap.set(invItem.itemId, existing)
    })
  })

  const topItems = Array.from(itemSalesMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Track business performance and insights</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalSales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{invoices.length} invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            <ShoppingCart className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalPurchases.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{purchases.length} purchase orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(totalSales - totalPurchases).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {(((totalSales - totalPurchases) / totalSales) * 100).toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <Package className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalStockValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{items.length} items</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Different Reports */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="purchases">Purchase Report</TabsTrigger>
          <TabsTrigger value="gst">GST Report</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Report</TabsTrigger>
        </TabsList>

        {/* Sales Report */}
        <TabsContent value="sales" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{monthSales.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{thisMonthInvoices.length} invoices</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">This Year</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{yearSales.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{thisYearInvoices.length} invoices</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">₹{totalOutstanding.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {invoices.filter((i) => i.status !== "paid").length} unpaid
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Top Performing Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Quantity Sold</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No sales data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    topItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.item?.name || "Unknown Item"}</TableCell>
                        <TableCell>{item.quantity} units</TableCell>
                        <TableCell className="text-right font-semibold">₹{item.revenue.toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.slice(0, 10).map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono">{invoice.invoiceNo}</TableCell>
                      <TableCell>{invoice.customerName}</TableCell>
                      <TableCell>{format(new Date(invoice.invoiceDate), "dd MMM yyyy")}</TableCell>
                      <TableCell className="font-semibold">₹{invoice.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            invoice.status === "paid"
                              ? "bg-green-500/10 text-green-700"
                              : invoice.status === "partial"
                                ? "bg-yellow-500/10 text-yellow-700"
                                : "bg-red-500/10 text-red-700"
                          }
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Report */}
        <TabsContent value="purchases" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Purchases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalPurchases.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{purchases.length} orders</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Amount Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">₹{totalPurchasePaid.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {((totalPurchasePaid / totalPurchases) * 100).toFixed(1)}% paid
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">₹{totalPurchaseOutstanding.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {purchases.filter((p) => p.status !== "paid").length} pending
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Purchase Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.slice(0, 10).map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-mono">{purchase.purchaseNo}</TableCell>
                      <TableCell>{purchase.supplierName}</TableCell>
                      <TableCell>{format(new Date(purchase.date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="font-semibold">₹{purchase.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            purchase.status === "paid"
                              ? "bg-green-500/10 text-green-700"
                              : purchase.status === "partial"
                                ? "bg-yellow-500/10 text-yellow-700"
                                : "bg-red-500/10 text-red-700"
                          }
                        >
                          {purchase.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GST Report */}
        <TabsContent value="gst" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CGST Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalCGST.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">SGST Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalSGST.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">IGST Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalIGST.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total GST</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">₹{totalGST.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>GST Summary by Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Taxable Value</TableHead>
                    <TableHead>CGST</TableHead>
                    <TableHead>SGST</TableHead>
                    <TableHead>IGST</TableHead>
                    <TableHead>Total GST</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices
                    .filter((inv) => inv.gstEnabled)
                    .slice(0, 10)
                    .map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono">{invoice.invoiceNo}</TableCell>
                        <TableCell>{invoice.customerName}</TableCell>
                        <TableCell>₹{invoice.subtotal.toFixed(2)}</TableCell>
                        <TableCell>₹{invoice.cgst.toFixed(2)}</TableCell>
                        <TableCell>₹{invoice.sgst.toFixed(2)}</TableCell>
                        <TableCell>₹{invoice.igst.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">
                          ₹{(invoice.cgst + invoice.sgst + invoice.igst).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Report */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{items.length}</div>
                <p className="text-xs text-muted-foreground">Active inventory items</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Low Stock Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</div>
                <p className="text-xs text-muted-foreground">Below minimum stock</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Out of Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{outOfStockItems.length}</div>
                <p className="text-xs text-muted-foreground">Need restocking</p>
              </CardContent>
            </Card>
          </div>

          {lowStockItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  Low Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Min Stock</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.stock}</TableCell>
                        <TableCell>{item.minStock}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              item.stock === 0 ? "bg-red-500/10 text-red-700" : "bg-yellow-500/10 text-yellow-700"
                            }
                          >
                            {item.stock === 0 ? "Out of Stock" : "Low Stock"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Stock Value by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead className="text-right">Stock Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.slice(0, 15).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category || "-"}</TableCell>
                      <TableCell>{item.stock}</TableCell>
                      <TableCell>₹{item.purchasePrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{(item.stock * item.purchasePrice).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
