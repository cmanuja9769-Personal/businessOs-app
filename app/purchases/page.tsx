import { getPurchases } from "./actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/ui/page-header"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { CardTitleWithCount } from "@/components/ui/card-title-with-count"
import { Plus, ShoppingCart, Eye } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { DeletePurchaseButton } from "@/components/purchases/delete-purchase-button"

export default async function PurchasesPage() {
  const purchases = await getPurchases()

  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 h-full flex flex-col overflow-hidden">
      <PageHeader
        title="Purchases"
        description="Manage and track all your purchase orders"
        actions={
          <Link href="/purchases/new">
            <Button className="w-full sm:w-auto gap-2 h-9 text-sm">
              <Plus className="w-4 h-4" />
              New Purchase
            </Button>
          </Link>
        }
      />

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="py-3 px-4 shrink-0">
          <CardTitleWithCount
            icon={<ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />}
            title="All Purchases"
            mobileTitle="Purchases"
            count={purchases.length}
          />
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-hidden px-4 pb-4 pt-0">
          {purchases.length === 0 ? (
            <DataEmptyState
              icon={<ShoppingCart className="w-12 h-12" />}
              title="No purchases yet"
              description="Create your first purchase order to get started"
              action={
                <Link href="/purchases/new">
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Purchase
                  </Button>
                </Link>
              }
            />
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
                      <StatusBadge status={purchase.status as "paid" | "partial" | "unpaid"} />
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
