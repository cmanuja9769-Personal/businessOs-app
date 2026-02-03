import { getPurchases } from "./actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, ShoppingCart, Eye } from "lucide-react"
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
    <div className="p-4 sm:p-6 space-y-4 h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Purchases</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage and track all your purchase orders</p>
        </div>
        <Link href="/purchases/new">
          <Button className="w-full sm:w-auto gap-2 text-xs sm:text-sm">
            <Plus className="w-4 h-4" />
            New Purchase
          </Button>
        </Link>
      </div>

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 shrink-0">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <ShoppingCart className="w-5 h-5" />
            <span className="hidden sm:inline">All Purchases</span>
            <span className="sm:hidden">Purchases</span>
            <span className="text-muted-foreground">({purchases.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-hidden p-0 sm:px-6 sm:pb-6">
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
            <Table containerClassName="flex-1 min-h-0 max-h-full">
              <TableHeader>
                <TableRow>
                  <TableHead resizable className="w-[100px] min-w-[80px]">PO Number</TableHead>
                  <TableHead resizable className="w-[200px] min-w-[150px]">Supplier</TableHead>
                  <TableHead resizable className="w-[90px] min-w-[80px]">Date</TableHead>
                  <TableHead resizable className="w-[90px] min-w-[70px] text-right">Amount</TableHead>
                  <TableHead resizable className="w-[80px] min-w-[60px] text-right">Paid</TableHead>
                  <TableHead resizable className="w-[80px] min-w-[60px] text-right">Balance</TableHead>
                  <TableHead resizable className="w-[70px] min-w-[60px]">Status</TableHead>
                  <TableHead className="w-[80px] min-w-[70px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-mono font-medium text-xs sm:text-sm">{purchase.purchaseNo}</TableCell>
                    <TableCell className="text-xs sm:text-sm truncate">{purchase.supplierName}</TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {format(new Date(purchase.date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="font-semibold text-right text-xs sm:text-sm">
                      ₹{purchase.total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-green-600 text-right text-xs sm:text-sm">
                      ₹{purchase.paidAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-red-600 text-right text-xs sm:text-sm">
                      ₹{purchase.balance.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`${getStatusColor(purchase.status)} text-xs`}>
                        {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/purchases/${purchase.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
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
