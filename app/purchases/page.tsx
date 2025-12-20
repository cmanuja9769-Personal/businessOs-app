import { getPurchases } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, ShoppingCart, Eye } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { DeletePurchaseButton } from "@/components/purchases/delete-purchase-button"

export default async function PurchasesPage() {
  const purchases = await getPurchases()

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "partial":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
      case "unpaid":
        return "bg-red-500/10 text-red-700 dark:text-red-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
          <p className="text-muted-foreground mt-1">Manage and track all your purchase orders</p>
        </div>
        <Link href="/purchases/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Purchase
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              All Purchases ({purchases.length})
            </CardTitle>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="search" placeholder="Search purchases..." className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No purchases yet</h3>
              <p className="text-muted-foreground mb-4">Create your first purchase order to get started</p>
              <Link href="/purchases/new">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Purchase
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-mono font-medium">{purchase.purchaseNo}</TableCell>
                    <TableCell>{purchase.supplierName}</TableCell>
                    <TableCell>{format(new Date(purchase.date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-semibold">₹{purchase.total.toFixed(2)}</TableCell>
                    <TableCell className="text-green-600">₹{purchase.paidAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-red-600">₹{purchase.balance.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(purchase.status)}>
                        {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/purchases/${purchase.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <DeletePurchaseButton purchaseId={purchase.id} purchaseNo={purchase.purchaseNo} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
